import * as cdk from "aws-cdk-lib";
import * as rds from "aws-cdk-lib/aws-rds";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

interface DataStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  dbSecurityGroup: ec2.SecurityGroup;
  environment: string;
}

export class DataStack extends cdk.Stack {
  public readonly dbUrl: cdk.CfnOutput;
  public readonly dbSecretArn: cdk.CfnOutput;
  public readonly dbSecretName: cdk.CfnOutput;
  public readonly authSessionSecretArn: cdk.CfnOutput;
  public readonly authSessionSecretName: cdk.CfnOutput;
  public readonly dbSecurityGroupId: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    const dbName = "bhcaptureco";

    // Import existing database secret
    const dbSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      "DbSecret",
      `bhcaptureco/db/${props.environment}`
    );

    // Create RDS Postgres instance using imported secret with explicit dynamic references
    const database = new rds.DatabaseInstance(this, "Database", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        ec2.InstanceSize.MICRO
      ),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [props.dbSecurityGroup],
      databaseName: dbName,
      credentials: rds.Credentials.fromSecret(dbSecret),
      allocatedStorage: 20,
      storageType: rds.StorageType.GP3,
      backupRetention: cdk.Duration.days(7),
      multiAz: props.environment === "production",
      deletionProtection: props.environment === "production",
      removalPolicy:
        props.environment === "production"
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
    });

    this.dbUrl = new cdk.CfnOutput(this, "DatabaseUrl", {
      value: `postgresql://***:***@${database.dbInstanceEndpointAddress}:5432/${dbName}`,
      description: "Database connection URL (credentials in Secrets Manager)",
    });

    this.dbSecretArn = new cdk.CfnOutput(this, "DbSecretArn", {
      value: dbSecret.secretArn,
      description: "ARN of the database secret",
      exportName: `BhCaptureCo-DbSecretArn-${props.environment}`,
    });

    this.dbSecretName = new cdk.CfnOutput(this, "DbSecretName", {
      value: dbSecret.secretName,
      description: "Name of the database secret",
      exportName: `BhCaptureCo-DbSecretName-${props.environment}`,
    });

    // Import existing auth session secret
    const authSessionSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      "AuthSessionSecret",
      `bhcaptureco/auth-session-secret/${props.environment}`
    );

    this.authSessionSecretArn = new cdk.CfnOutput(this, "AuthSessionSecretArn", {
      value: authSessionSecret.secretArn,
      description: "ARN of the auth session secret",
      exportName: `BhCaptureCo-AuthSessionSecretArn-${props.environment}`,
    });

    this.authSessionSecretName = new cdk.CfnOutput(this, "AuthSessionSecretName", {
      value: authSessionSecret.secretName,
      description: "Name of the auth session secret",
      exportName: `BhCaptureCo-AuthSessionSecretName-${props.environment}`,
    });

    // Export DB security group ID for App Runner ingress
    this.dbSecurityGroupId = new cdk.CfnOutput(this, "DbSecurityGroupId", {
      value: props.dbSecurityGroup.securityGroupId,
      description: "Security group ID for database",
      exportName: `BhCaptureCo-DbSecurityGroupId-${props.environment}`,
    });
  }
}
