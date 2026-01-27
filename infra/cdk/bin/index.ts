import * as cdk from "aws-cdk-lib";
import { NetworkStack } from "../lib/network-stack";
import { DataStack } from "../lib/data-stack";
import { AppStack } from "../lib/app-stack";
import { StorageStack } from "../lib/storage-stack";
import { IamStack } from "../lib/iam-stack";

const app = new cdk.App();

// Get deployment environment from context or env var
const deployEnv = app.node.tryGetContext("environment") || process.env.DEPLOY_ENV || "staging";
if (!["staging", "production"].includes(deployEnv)) {
  throw new Error("DEPLOY_ENV must be 'staging' or 'production'");
}

const stackPrefix = deployEnv === "staging" ? "bhc-staging" : "bhc-prod";
const platformDomain =
  app.node.tryGetContext("platformDomain") || "app.example.com";
const gitHubOwner = app.node.tryGetContext("gitHubOwner") || "your-org";
const gitHubRepo = app.node.tryGetContext("gitHubRepo") || "bhcaptureco-marketable";

// Network Stack
const networkStack = new NetworkStack(app, `${stackPrefix}-network`, {
  environment: deployEnv,
  description: `Network infrastructure for BhCaptureCo (${deployEnv})`,
});

// Data Stack
const dataStack = new DataStack(app, `${stackPrefix}-data`, {
  vpc: networkStack.vpc,
  dbSecurityGroup: networkStack.dbSecurityGroup,
  environment: deployEnv,
  description: `Database infrastructure for BhCaptureCo (${deployEnv})`,
});

// App Stack
const appStack = new AppStack(app, `${stackPrefix}-app`, {
  vpc: networkStack.vpc,
  environment: deployEnv,
  platformDomain,
  databaseUrl: "postgresql://user:pass@host:5432/bhcaptureco",
  description: `Application infrastructure for BhCaptureCo (${deployEnv})`,
});

// Storage Stack
const storageStack = new StorageStack(app, `${stackPrefix}-storage`, {
  environment: deployEnv,
  description: `Storage infrastructure for BhCaptureCo (${deployEnv})`,
});

// IAM Stack (shared across environments)
const iamStack = new IamStack(app, "BhCaptureCoIam", {
  gitHubOwner,
  gitHubRepo,
  description: "IAM roles for GitHub Actions CI/CD",
});

// Add dependencies
dataStack.node.addDependency(networkStack);
appStack.node.addDependency(networkStack);
storageStack.node.addDependency(networkStack);

app.synth();
