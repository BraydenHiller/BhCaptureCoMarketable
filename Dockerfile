# ---- deps ----
FROM node:20-alpine AS deps
WORKDIR /app

# Only copy manifests first for better layer caching
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm config set fetch-retries 5 \
 && npm config set fetch-retry-factor 2 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set fetch-timeout 600000 \
 && npm config set registry https://registry.npmjs.org/ \
 && npm ci --ignore-scripts

# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time placeholders (runtime values are injected by AWS/AppRunner later)
ARG DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
ARG AWS_REGION="us-east-2"

ENV DATABASE_URL=$DATABASE_URL
ENV AWS_REGION=$AWS_REGION

# Install CA certs + RDS bundle so Prisma generate can reach the DB if needed
RUN apk add --no-cache ca-certificates curl
RUN curl -fsSL -o /usr/local/share/ca-certificates/aws-rds-us-east-2-bundle.crt \
      https://truststore.pki.rds.amazonaws.com/us-east-2/us-east-2-bundle.pem
RUN update-ca-certificates

ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/aws-rds-us-east-2-bundle.crt

# Generate Prisma client after full source (including schema) is present
RUN npx prisma generate --schema prisma/schema.prisma

# Build Next.js (inline env vars are build-only placeholders, not persisted in the image)
RUN AUTH_SESSION_SECRET=0123456789abcdef0123456789abcdef PLATFORM_S3_BUCKET=placeholder-bucket MAIN_DOMAIN=example.com COGNITO_APP_CLIENT_ID=placeholder-client NEXT_PUBLIC_APP_URL=http://localhost:3000 STRIPE_SECRET_KEY=sk_placeholder STRIPE_WEBHOOK_SECRET=whsec_placeholder npm run build

# Remove dev dependencies for smaller runtime image
RUN npm prune --omit=dev

# ---- runtime ----
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache ca-certificates curl
RUN curl -fsSL -o /usr/local/share/ca-certificates/aws-rds-us-east-2-bundle.crt \
      https://truststore.pki.rds.amazonaws.com/us-east-2/us-east-2-bundle.pem
RUN update-ca-certificates

ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/aws-rds-us-east-2-bundle.crt
ENV NODE_ENV=production
ENV PORT=3000

# Copy only what we need to run
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public

# Copy Next.js config (next.config.ts)
COPY --from=build /app/next.config.ts ./next.config.ts

# Copy Prisma config (prisma.config.ts)
COPY --from=build /app/prisma.config.ts ./prisma.config.ts

# Copy Prisma schema + migrations (needed for `prisma migrate deploy`)
COPY --from=build /app/prisma ./prisma

EXPOSE 3000
CMD ["npm", "start"]
