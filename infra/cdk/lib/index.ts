import * as cdk from "aws-cdk-lib";
import { NetworkStack } from "./network-stack";
import { DataStack } from "./data-stack";
import { AppStack } from "./app-stack";
import { StorageStack } from "./storage-stack";
import { IamStack } from "./iam-stack";

const app = new cdk.App();

const environment = app.node.tryGetContext("environment") || "staging";
const platformDomain =
  app.node.tryGetContext("platformDomain") || "app.example.com";
const gitHubOwner = app.node.tryGetContext("gitHubOwner") || "your-org";
const gitHubRepo = app.node.tryGetContext("gitHubRepo") || "bhcaptureco-marketable";

const networkStack = new NetworkStack(app, `NetworkStack-${environment}`, {
  environment,
  description: "Network infrastructure for BhCaptureCo",
});

const dataStack = new DataStack(app, `DataStack-${environment}`, {
  vpc: networkStack.vpc,
  dbSecurityGroup: networkStack.dbSecurityGroup,
  environment,
  description: "Database infrastructure for BhCaptureCo",
});

const appStack = new AppStack(app, `AppStack-${environment}`, {
  vpc: networkStack.vpc,
  environment,
  platformDomain,
  databaseUrl: "postgresql://user:pass@host:5432/bhcaptureco",
  description: "Application infrastructure for BhCaptureCo",
});

const storageStack = new StorageStack(app, `StorageStack-${environment}`, {
  environment,
  description: "Storage infrastructure for BhCaptureCo",
});

const iamStack = new IamStack(app, "IamStack", {
  gitHubOwner,
  gitHubRepo,
  description: "IAM roles for GitHub Actions CI/CD",
});

// Use stacks to prevent unused variable warnings
dataStack.node.addDependency(networkStack);
appStack.node.addDependency(networkStack);
storageStack.node.addDependency(networkStack);
iamStack.node.addDependency(networkStack);

app.synth();
