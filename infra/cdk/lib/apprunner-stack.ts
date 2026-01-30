import * as cdk from "aws-cdk-lib";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as apprunner from "aws-cdk-lib/aws-apprunner";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface AppRunnerStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  environment: string;
}

export class AppRunnerStack extends cdk.Stack {
  public readonly ecrRepoUri: cdk.CfnOutput;
  public readonly appRunnerServiceArn: cdk.CfnOutput;
  public readonly appRunnerServiceUrl: cdk.CfnOutput;
  public readonly vpcConnectorSecurityGroupId: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props: AppRunnerStackProps) {
    super(scope, id, props);

    // Create ECR repository for app images
    const ecrRepo = new ecr.Repository(this, "AppRepository", {
      repositoryName: `bhcaptureco-app-${props.environment}`,
      removalPolicy: props.environment === "production" 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      imageScanOnPush: true,
    });

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

    // Create IAM role for App Runner instance
    const instanceRole = new iam.Role(this, "AppRunnerInstanceRole", {
      assumedBy: new iam.ServicePrincipal("tasks.apprunner.amazonaws.com"),
    });

    // Create IAM role for App Runner to access ECR
    const accessRole = new iam.Role(this, "AppRunnerAccessRole", {
      assumedBy: new iam.ServicePrincipal("build.apprunner.amazonaws.com"),
    });
    ecrRepo.grantPull(accessRole);

    // Create App Runner Service
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
                value: props.environment,
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

    // Outputs
    this.ecrRepoUri = new cdk.CfnOutput(this, "EcrRepoUri", {
      value: ecrRepo.repositoryUri,
      description: "ECR repository URI for app images",
      exportName: `BhCaptureCo-EcrRepoUri-${props.environment}`,
    });

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
