import * as cdk from "aws-cdk-lib";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as apprunner from "aws-cdk-lib/aws-apprunner";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

interface AppRunnerStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  environment: string;
  region?: string;
  mainDomain?: string;
  cognitoAppClientId?: string;
  cognitoUserPoolId?: string;
  platformS3Bucket?: string;
}

export class AppRunnerStack extends cdk.Stack {
  public readonly ecrRepoUri: cdk.CfnOutput;
  public readonly appRunnerServiceArn: cdk.CfnOutput;
  public readonly appRunnerServiceUrl: cdk.CfnOutput;
  public readonly vpcConnectorSecurityGroupId: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props: AppRunnerStackProps) {
    super(scope, id, props);

    // Read context to determine if we should deploy the App Runner service
    const deployService = (this.node.tryGetContext("deployService") ?? "true") === "true";

    // Use existing ECR repository for app images
    const ecrRepo = ecr.Repository.fromRepositoryName(
      this,
      "AppRepository",
      "bhcaptureco-apprunner"
    );

    // Create security group for VPC connector
    const connectorSecurityGroup = new ec2.SecurityGroup(this, "AppRunnerConnectorSecurityGroup", {
      vpc: props.vpc,
      description: "Security group for App Runner VPC connector",
      allowAllOutbound: true,
    });

    // Create VPC Connector for App Runner to access private resources
    const vpcConnector = new apprunner.CfnVpcConnector(this, "VpcConnector", {
      subnets: props.vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }).subnetIds,
      securityGroups: [connectorSecurityGroup.securityGroupId],
      vpcConnectorName: `bhcaptureco-connector-${props.environment}`,
    });

    // Import secrets from DataStack exports
    const dbSecretArn = cdk.Fn.importValue(
      `BhCaptureCo-DbSecretArn-${props.environment}`
    );
    const databaseUrlSecretArn = cdk.Fn.importValue(
      `BhCaptureCo-DatabaseUrlV2-SecretArn-${props.environment}`
    );

    const dbSecret = secretsmanager.Secret.fromSecretCompleteArn(
      this,
      "DbSecret",
      dbSecretArn
    );
    const databaseUrlSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      "DatabaseUrlSecret",
      `bhcaptureco/database-url-v2/${props.environment}`
    );
    const authSessionSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      "AuthSessionSecret",
      `bhcaptureco/auth-session-secret/${props.environment}`
    );
    const stripeSecretKey = secretsmanager.Secret.fromSecretNameV2(
      this,
      "StripeSecretKey",
      `bhcaptureco/stripe-secret-key/${props.environment}`
    );

    // Create IAM role for App Runner instance
    const instanceRole = new iam.Role(this, "AppRunnerInstanceRole", {
      assumedBy: new iam.ServicePrincipal("tasks.apprunner.amazonaws.com"),
    });

    // Create IAM role for App Runner to access ECR
    const accessRole = new iam.Role(this, "AppRunnerAccessRole", {
      assumedBy: new iam.ServicePrincipal("build.apprunner.amazonaws.com"),
    });
    ecrRepo.grantPull(accessRole);
    accessRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["ecr:GetAuthorizationToken"],
        resources: ["*"],
      })
    );

    // Grant instance role permission to read secrets
    authSessionSecret.grantRead(instanceRole);
    databaseUrlSecret.grantRead(instanceRole);
    stripeSecretKey.grantRead(instanceRole);

    // Grant instance role permission to manage Cognito users
    instanceRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminSetUserPassword",
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminDeleteUser",
        ],
        resources: [
          `arn:aws:cognito-idp:${this.region}:${this.account}:userpool/${props.cognitoUserPoolId}`,
        ],
      })
    );

    // Conditionally create App Runner Service
    if (deployService) {
      // Create App Runner Service
      // Environment variables:
      //   - NODE_ENV, AWS_REGION, COGNITO_APP_CLIENT_ID, NEXT_PUBLIC_MAIN_DOMAIN, MAIN_DOMAIN, PLATFORM_S3_BUCKET, APP_ENV: plain text
      //   - DATABASE_URL, AUTH_SESSION_SECRET: from Secrets Manager (via instanceRole)
      const appRunnerService = new apprunner.CfnService(this, "AppRunnerService", {
        serviceName: `bhcaptureco-${props.environment}`,
        sourceConfiguration: {
          autoDeploymentsEnabled: false,
          authenticationConfiguration: {
            accessRoleArn: accessRole.roleArn,
          },
          imageRepository: {
            imageIdentifier: `${ecrRepo.repositoryUri}:latest`,
            imageRepositoryType: "ECR",
            imageConfiguration: {
              port: "3000",
              runtimeEnvironmentVariables: [
                {
                  name: "NODE_ENV",
                  value: "production",
                },
                {
                  name: "AWS_REGION",
                  value: this.region,
                },
                {
                  name: "COGNITO_APP_CLIENT_ID",
                  value: props.cognitoAppClientId || "not-set",
                },
                {
                  name: "COGNITO_USER_POOL_ID",
                  value: props.cognitoUserPoolId || "not-set",
                },
                {
                  name: "NEXT_PUBLIC_MAIN_DOMAIN",
                  value: props.mainDomain || "not-set",
                },
                {
                  name: "MAIN_DOMAIN",
                  value: props.mainDomain || "not-set",
                },
                {
                  name: "PLATFORM_S3_BUCKET",
                  value: props.platformS3Bucket || "not-set",
                },
                {
                  name: "APP_ENV",
                  value: "production",
                },
                {
                  name: "APP_CONFIG_REV",
                  value: "2",
                },
              ],
              runtimeEnvironmentSecrets: [
                {
                  name: "DATABASE_URL",
                  value: databaseUrlSecretArn,
                },
                {
                  name: "AUTH_SESSION_SECRET",
                  value: authSessionSecret.secretArn,
                },
                {
                  name: "STRIPE_SECRET_KEY",
                  value: stripeSecretKey.secretArn,
                },
              ],
            },
          },
        },
        instanceConfiguration: {
          cpu: "1 vCPU",
          memory: "2 GB",
          instanceRoleArn: instanceRole.roleArn,
        },
        networkConfiguration: {
          egressConfiguration: {
            egressType: "VPC",
            vpcConnectorArn: vpcConnector.attrVpcConnectorArn,
          },
        },
        healthCheckConfiguration: {
          protocol: "HTTP",
          path: "/",
          interval: 10,
          timeout: 5,
          healthyThreshold: 1,
          unhealthyThreshold: 5,
        },
      });

      // Outputs for App Runner service
      this.appRunnerServiceArn = new cdk.CfnOutput(this, "AppRunnerServiceArn", {
        value: appRunnerService.attrServiceArn,
        description: "App Runner service ARN",
        exportName: `BhCaptureCo-AppRunnerServiceArn-${props.environment}`,
      });

      this.appRunnerServiceUrl = new cdk.CfnOutput(this, "AppRunnerServiceUrl", {
        value: appRunnerService.attrServiceUrl,
        description: "App Runner service URL",
        exportName: `BhCaptureCo-AppRunnerServiceUrl-${props.environment}`,
      });
    }

    // Outputs
    this.ecrRepoUri = new cdk.CfnOutput(this, "EcrRepoUri", {
      value: ecrRepo.repositoryUri,
      description: "ECR repository URI for app images",
      exportName: `BhCaptureCo-EcrRepoUri-${props.environment}`,
    });

    new cdk.CfnOutput(this, "EcrRepoName", {
      value: ecrRepo.repositoryName,
      description: "ECR repository name for app images",
      exportName: `BhCaptureCo-AppRepoName-${props.environment}`,
    });

    this.vpcConnectorSecurityGroupId = new cdk.CfnOutput(this, "VpcConnectorSecurityGroupId", {
      value: connectorSecurityGroup.securityGroupId,
      description: "Security group ID for VPC connector",
      exportName: `BhCaptureCo-VpcConnectorSgId-${props.environment}`,
    });

    // Import DB security group and allow inbound from connector (staging only)
    if (props.environment === "staging") {
      const dbSecurityGroupId = cdk.Fn.importValue(
        `BhCaptureCo-DbSecurityGroupId-${props.environment}`
      );
      const dbSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
        this,
        "DbSecurityGroup",
        dbSecurityGroupId
      );
      dbSecurityGroup.addIngressRule(
        ec2.Peer.securityGroupId(connectorSecurityGroup.securityGroupId),
        ec2.Port.tcp(5432),
        "Allow Postgres from App Runner"
      );
    }
  }
}
