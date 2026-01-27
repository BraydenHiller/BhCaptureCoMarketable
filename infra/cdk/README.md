# BhCaptureCo AWS CDK Infrastructure

AWS CDK infrastructure for BhCaptureCo platform (staging and production environments).

## Prerequisites

- AWS CLI configured with appropriate credentials
- AWS CDK CLI installed: `npm install -g aws-cdk`
- Node.js 18+
- Docker (for building Next.js container)

## Required Configuration

### AWS Account & Region
Set AWS_REGION environment variable or use AWS CLI profile:
```bash
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=123456789012
```

### Platform Domain
The platform domain must be configured via CDK context:
```bash
cdk deploy --context platformDomain=app.example.com
```

### Hosted Zone
Before deployment, ensure your domain is hosted on Route53 with:
- Hosted zone created in AWS
- Domain registered or delegated to Route53

### Database Credentials
Database credentials are automatically generated and stored in AWS Secrets Manager.
Retrieve with:
```bash
aws secretsmanager get-secret-value --secret-id bhcaptureco/db
```

## Deployment

### Bootstrap CDK (first time only)
```bash
npm run cdk:bootstrap
```

### Staging Deployment
```bash
npm run cdk:deploy:staging
```

### Production Deployment (requires approval)
```bash
npm run cdk:deploy:prod
```

## Environment Separation

- **Staging**: Single-AZ RDS, 1 ECS task, automatic rollback enabled
- **Production**: Multi-AZ RDS with backups, 2 ECS tasks, deletion protection enabled

## Database Migrations

Migrations are applied manually post-deployment:
1. Get RDS endpoint from CloudFormation outputs
2. Retrieve DATABASE_URL from Secrets Manager
3. Run: `npx prisma migrate deploy`

For future: automate via CDK custom resource or ECS task on deployment.

## GitHub Actions CI/CD Setup

### OIDC Configuration
The IAM stack creates a GitHub OIDC provider and deployment role for CI/CD.

Deploy with GitHub context:
```bash
cdk deploy --context gitHubOwner=your-org --context gitHubRepo=bhcaptureco-marketable
```

### GitHub Secrets
Configure these in GitHub repository settings:

**Settings > Secrets and variables > Actions:**
- `AWS_ACCOUNT_ID`: Your AWS account ID
- `AWS_REGION`: AWS region (e.g., us-east-1)
- `STAGING_DOMAIN`: Staging domain (e.g., app-staging.example.com)
- `PROD_DOMAIN`: Production domain (e.g., app.example.com)

The role ARN is automatically exported and should be used in `.github/workflows/deploy.yml`:
```yaml
role-to-assume: arn:aws:iam::123456789012:role/BhCaptureCoGitHubDeployRole
```

## Cleanup

Destroy infrastructure (staging only):
```bash
cdk destroy --context environment=staging
```

**Note**: Production stacks have deletion protection enabled.

## Troubleshooting

- **VPC/Subnet errors**: Ensure AWS account has sufficient capacity for 2 AZs
- **RDS connection fails**: Check security group ingress rules and VPC routing
- **ECS task fails to start**: Check CloudWatch logs in `/ecs/bhcaptureco-{env}`
