import * as cdk from "aws-cdk-lib";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as logs from "aws-cdk-lib/aws-logs";
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

    // Create Fargate service with ALB
    const fargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      "FargateService",
      {
        cluster,
        memoryLimitMiB: 512,
        desiredCount: props.environment === "production" ? 2 : 1,
        cpu: 256,
        taskImageOptions: {
          image: ecs.ContainerImage.fromRegistry("public.ecr.aws/docker/library/nginx:latest"),
          containerPort: 3000,
          logDriver: ecs.LogDriver.awsLogs({
            streamPrefix: "ecs",
            logGroup,
          }),
          environment: {
            NEXT_PUBLIC_MAIN_DOMAIN: props.platformDomain,
            NODE_ENV: props.environment,
          },
          secrets: {
            DATABASE_URL: ecs.Secret.fromSecretsManager(
              cdk.SecretValue.secretsManager("bhcaptureco/db").toJSON()
            ),
            AUTH_SESSION_SECRET: ecs.Secret.fromSecretsManager(
              cdk.SecretValue.secretsManager("bhcaptureco/auth-session-secret").toJSON()
            ),
          },
        },
        publicLoadBalancer: true,
      }
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
