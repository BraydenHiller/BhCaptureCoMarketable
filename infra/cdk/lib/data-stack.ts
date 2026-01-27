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

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    const dbName = "bhcaptureco";
    const dbUser = "postgres";

    // Create database secret
    const dbSecret = new secretsmanager.Secret(this, "DbSecret", {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: dbUser }),
        generateStringKey: "password",
        excludeCharacters: '"@/\\',
        passwordLength: 32,
      },
    });

    // Create RDS Postgres instance
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

    // Store credentials in Secrets Manager
    dbSecret.attach(database);

    this.dbUrl = new cdk.CfnOutput(this, "DatabaseUrl", {
      value: `postgresql://${dbUser}:***@${database.dbInstanceEndpointAddress}:5432/${dbName}`,
      description: "Database connection URL (password stored in Secrets Manager)",
    });
  }
}
