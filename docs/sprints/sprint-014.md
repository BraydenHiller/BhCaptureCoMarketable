# Sprint-014: AWS deployment baseline (prod + staging)

## Purpose
Stand up AWS infrastructure so the platform is runnable outside localhost, with repeatable environments.

## Includes
- Define AWS target: app hosting (ECS/Fargate or Amplify), RDS Postgres, S3, CloudFront (if used).
- Environment separation: staging and production.
- CI/CD deployment pipeline (build + deploy) with env var management.
- Domain for the platform itself (e.g., app.) and HTTPS via ACM.

## Explicitly Excludes
- Tenant custom domains
- Tenant-provided S3 buckets

## Exit Criteria (Definition of Done)
- [ ] Staging environment is deployed and usable end-to-end.
- [ ] Production environment can be deployed repeatably.
- [ ] Migrations are applied safely in CI/CD or documented release steps.
