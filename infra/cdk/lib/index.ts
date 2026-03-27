import * as cdk from "aws-cdk-lib";
import { NetworkStack } from "./network-stack";
import { DataStack } from "./data-stack";
import { StorageStack } from "./storage-stack";
import { AppRunnerStack } from "./apprunner-stack";
import { IamStack } from "./iam-stack";

const app = new cdk.App();

// Derive environment from context or default to staging
const deployEnv = app.node.tryGetContext("env") ?? "staging";
if (!["staging", "production"].includes(deployEnv)) {
  throw new Error("env context must be 'staging' or 'production'");
}

const stackPrefix = `bhcaptureco-${deployEnv}`;

// Create CDK environment from process env
const cleanEnv = (value?: string) => value?.trim() || undefined;
const env: cdk.Environment = {
  account: cleanEnv(process.env.CDK_DEFAULT_ACCOUNT),
  region: cleanEnv(process.env.CDK_DEFAULT_REGION),
};

const platformDomain =
  app.node.tryGetContext("platformDomain") ||
  (deployEnv === "production"
    ? "bmsfsguypd.us-east-2.awsapprunner.com"
    : "ks8mw3ayss.us-east-2.awsapprunner.com");

// Environment-aware Cognito values for AppRunnerStack props
const cognitoAppClientId =
  deployEnv === "production"
    ? "1kkke5rvc85fdjsdst4kka0snv"
    : "57cm0lk54oqbh3ei6j93ig9529";
const cognitoUserPoolId =
  deployEnv === "production"
    ? "us-east-2_Siu3cMDCX"
    : "us-east-2_3R8foJYj2";
const platformS3Bucket = "bhcaptureco-assets-staging-031277186672";

const gitHubOwner = app.node.tryGetContext("gitHubOwner") || "your-org";
const gitHubRepo = app.node.tryGetContext("gitHubRepo") || "bhcaptureco-marketable";

// Network Stack
const networkStack = new NetworkStack(app, `${stackPrefix}-network`, {
  environment: deployEnv,
  env,
  stackName: deployEnv === "staging" ? "NetworkStack-staging" : undefined,
  description: `Network infrastructure for BhCaptureCo (${deployEnv})`,
});

// Data Stack
const dataStack = new DataStack(app, `${stackPrefix}-data`, {
  vpc: networkStack.vpc,
  dbSecurityGroup: networkStack.dbSecurityGroup,
  environment: deployEnv,
  env,
  stackName: deployEnv === "staging" ? "DataStack-staging" : undefined,
  description: `Database infrastructure for BhCaptureCo (${deployEnv})`,
});

// App Runner Stack (replaces AppStack for staging)
const appRunnerStack = new AppRunnerStack(app, `${stackPrefix}-apprunner`, {
  vpc: networkStack.vpc,
  environment: deployEnv,
  env,
  mainDomain: platformDomain,
  cognitoAppClientId,
  cognitoUserPoolId,
  platformS3Bucket,
  stackName: deployEnv === "staging" ? "AppRunnerStack-staging" : undefined,
  description: `App Runner infrastructure for BhCaptureCo (${deployEnv})`,
});

// Storage Stack
const storageStack = new StorageStack(app, `${stackPrefix}-storage`, {
  environment: deployEnv,
  env,
  stackName: deployEnv === "staging" ? "StorageStack-staging" : undefined,
  description: `Storage infrastructure for BhCaptureCo (${deployEnv})`,
});

// IAM Stack (shared across environments)
const iamStack = new IamStack(app, "BhCaptureCoIam", {
  gitHubOwner,
  gitHubRepo,
  env,
  stackName: deployEnv === "staging" ? "IamStack-staging" : undefined,
  description: "IAM roles for GitHub Actions CI/CD",
});

// Add dependencies
dataStack.node.addDependency(networkStack);
appRunnerStack.node.addDependency(networkStack);
storageStack.node.addDependency(networkStack);

app.synth();
