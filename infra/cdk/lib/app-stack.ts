import * as cdk from "aws-cdk-lib";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as logs from "aws-cdk-lib/aws-logs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface AppStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  environment: string;
  platformDomain: string;
  databaseUrl: string;
}

export class AppStack extends cdk.Stack {
  public readonly alb: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    // Create ECS cluster
    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc: props.vpc,
      containerInsights: true,
    });

    // Create CloudWatch log group
    const logGroup = new logs.LogGroup(this, "LogGroup", {
      logGroupName: `/ecs/bhcaptureco-${props.environment}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Import database secret by ARN from DataStack export
    const dbSecretArn = cdk.Fn.importValue(
      `BhCaptureCo-DbSecretArn-${props.environment}`
    );
    const dbSecret = secretsmanager.Secret.fromSecretCompleteArn(
      this,
      "DbSecret",
      dbSecretArn
    );

    // Import auth session secret by ARN from DataStack export
    const authSessionSecretArn = cdk.Fn.importValue(
      `BhCaptureCo-AuthSessionSecretArn-${props.environment}`
    );
    const authSessionSecret = secretsmanager.Secret.fromSecretCompleteArn(
      this,
      "AuthSessionSecret",
      authSessionSecretArn
    );

    // Import secret names for wildcard ARN policy
    const dbSecretName = cdk.Fn.importValue(
      `BhCaptureCo-DbSecretName-${props.environment}`
    );
    const authSessionSecretName = cdk.Fn.importValue(
      `BhCaptureCo-AuthSessionSecretName-${props.environment}`
    );

    // Create Fargate service with ALB
    const fargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      "FargateService",
      {
        cluster,
        memoryLimitMiB: 512,
        desiredCount: props.environment === "production" ? 2 : 1,
        cpu: 256,
        assignPublicIp: true,
        vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
        taskImageOptions: {
          image: ecs.ContainerImage.fromRegistry("public.ecr.aws/docker/library/nginx:latest"),
          containerPort: 80,
          logDriver: ecs.LogDriver.awsLogs({
            streamPrefix: "ecs",
            logGroup,
          }),
          environment: {
            NEXT_PUBLIC_MAIN_DOMAIN: props.platformDomain,
            NODE_ENV: props.environment,
          },
          secrets: {
            DATABASE_URL: ecs.Secret.fromSecretsManager(dbSecret),
            AUTH_SESSION_SECRET: ecs.Secret.fromSecretsManager(authSessionSecret),
          },
        },
        publicLoadBalancer: true,
      }
    );

    // Grant ECS task execution role read permission to Secrets Manager secrets
    dbSecret.grantRead(fargateService.taskDefinition.executionRole!);
    authSessionSecret.grantRead(fargateService.taskDefinition.executionRole!);

    // Add explicit policy with wildcard ARNs for secret names
    fargateService.taskDefinition.executionRole!.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
        ],
        resources: [
          cdk.Stack.of(this).formatArn({
            service: "secretsmanager",
            resource: `secret:${dbSecretName}-*`,
          }),
          cdk.Stack.of(this).formatArn({
            service: "secretsmanager",
            resource: `secret:${authSessionSecretName}-*`,
          }),
        ],
      })
    );

    // Add target group health check
    fargateService.targetGroup.configureHealthCheck({
      path: "/",
      healthyHttpCodes: "200-399",
    });

    this.alb = new cdk.CfnOutput(this, "LoadBalancerDns", {
      value: fargateService.loadBalancer.loadBalancerDnsName,
      description: "Load Balancer DNS Name",
    });
  }
}
