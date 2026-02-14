# ---- deps ----
FROM node:20-alpine AS deps
WORKDIR /app

# Only copy manifests first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time placeholders (runtime values are injected by AWS/AppRunner later)
ARG DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
ARG AUTH_SESSION_SECRET="build-time-placeholder"
ARG AWS_REGION="us-east-2"
ARG COGNITO_APP_CLIENT_ID="build-time-placeholder"
ARG NEXT_PUBLIC_MAIN_DOMAIN="localhost"

ENV DATABASE_URL=$DATABASE_URL
ENV AUTH_SESSION_SECRET=$AUTH_SESSION_SECRET
ENV AWS_REGION=$AWS_REGION
ENV COGNITO_APP_CLIENT_ID=$COGNITO_APP_CLIENT_ID
ENV NEXT_PUBLIC_MAIN_DOMAIN=$NEXT_PUBLIC_MAIN_DOMAIN

# Generate Prisma client after full source (including schema) is present
RUN npx prisma generate --schema prisma/schema.prisma

# Build Next.js
RUN npm run build

# Remove dev dependencies for smaller runtime image
RUN npm prune --omit=dev

# ---- runtime ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy only what we need to run
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public

# Copy Next.js config (next.config.ts)
COPY --from=build /app/next.config.ts ./next.config.ts

EXPOSE 3000
CMD ["npm", "start"]
