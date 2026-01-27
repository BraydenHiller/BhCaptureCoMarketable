import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

interface StorageStackProps extends cdk.StackProps {
  environment: string;
}

export class StorageStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    this.bucket = new s3.Bucket(this, "AssetBucket", {
      bucketName: `bhcaptureco-assets-${props.environment}-${cdk.Stack.of(this).account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      enforceSSL: true,
      removalPolicy:
        props.environment === "production"
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
    });

    new cdk.CfnOutput(this, "BucketName", {
      value: this.bucket.bucketName,
      description: "S3 bucket for platform assets",
    });
  }
}
