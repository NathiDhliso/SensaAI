# Build stage
FROM node:20-alpine AS builder

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ cairo-dev pango-dev jpeg-dev giflib-dev

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --ignore-scripts || npm install --ignore-scripts

# Copy source code
COPY . .

# Build the application (skip native module rebuilds)
# Build the application (skip native module rebuilds)
# Accept build arguments for environment variables
ARG VITE_API_URL=/api
ARG VITE_AWS_REGION=us-east-1
ARG VITE_COGNITO_IDENTITY_POOL_ID
ARG VITE_COGNITO_USER_POOL_ID
ARG VITE_AWS_S3_BUCKET_NAME
ARG VITE_AWS_DYNAMODB_TABLE_NAME

# Set as environment variables for the build process
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_AWS_REGION=$VITE_AWS_REGION
ENV VITE_COGNITO_IDENTITY_POOL_ID=$VITE_COGNITO_IDENTITY_POOL_ID
ENV VITE_COGNITO_USER_POOL_ID=$VITE_COGNITO_USER_POOL_ID
ENV VITE_AWS_S3_BUCKET_NAME=$VITE_AWS_S3_BUCKET_NAME
ENV VITE_AWS_DYNAMODB_TABLE_NAME=$VITE_AWS_DYNAMODB_TABLE_NAME

RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
