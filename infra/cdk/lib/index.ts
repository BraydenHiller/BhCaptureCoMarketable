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
const env: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const platformDomain =
  app.node.tryGetContext("platformDomain") || "app.example.com";
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
