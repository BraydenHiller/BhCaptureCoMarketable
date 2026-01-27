import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface IamStackProps extends cdk.StackProps {
  gitHubOwner: string;
  gitHubRepo: string;
}

export class IamStack extends cdk.Stack {
  public readonly deployRoleArn: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props: IamStackProps) {
    super(scope, id, props);

    // Get or create GitHub OIDC provider
    const provider = new iam.OpenIdConnectProvider(this, "GitHubProvider", {
      url: "https://token.actions.githubusercontent.com",
      clientIds: ["sts.amazonaws.com"],
      thumbprints: ["6938fd4d98bab03faadb97b34396831e3780aea1"],
    });

    // Create deployment role
    const deployRole = new iam.Role(this, "GitHubDeployRole", {
      roleName: "BhCaptureCoGitHubDeployRole",
      assumedBy: new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
        StringEquals: {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
        },
        StringLike: {
          "token.actions.githubusercontent.com:sub": [
            `repo:${props.gitHubOwner}/${props.gitHubRepo}:environment:staging`,
            `repo:${props.gitHubOwner}/${props.gitHubRepo}:environment:production`,
          ],
        },
      }),
    });

    // Add permissions for CI/CD deployment
    // NOTE: This is a wide policy for Sprint-014 MVP. Should be tightened in future sprints.
    deployRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "cloudformation:*",
          "ecs:*",
          "elasticloadbalancing:*",
          "ec2:*",
          "logs:*",
          "rds:*",
          "s3:*",
          "secretsmanager:*",
          "acm:*",
          "route53:*",
        ],
        resources: ["*"],
      })
    );

    // Allow PassRole for ECS task execution
    deployRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["iam:PassRole"],
        resources: [`arn:aws:iam::${this.account}:role/*`],
        conditions: {
          StringEquals: {
            "iam:PassedToService": [
              "ecs-tasks.amazonaws.com",
              "ec2.amazonaws.com",
            ],
          },
        },
      })
    );

    this.deployRoleArn = new cdk.CfnOutput(this, "DeployRoleArn", {
      value: deployRole.roleArn,
      description: "GitHub Actions deployment role ARN",
      exportName: "BhCaptureCoGitHubDeployRoleArn",
    });
  }
}
