pipeline {
    agent any

    environment {
        AWS_REGION = 'us-east-1'
        ECR_REGISTRY = '311964231104.dkr.ecr.us-east-1.amazonaws.com'
        IMAGE_NAME = 'sensapbl-pilot-frontend'
        IMAGE_TAG = "latest"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Test') {
            steps {
                // Run tests using a lightweight node image before building the full artifact
                docker.image('node:20-alpine').inside {
                    sh 'npm ci'
                    sh 'npm run test -- --run' // Single run, no watch mode
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    // INDUSTRY STANDARD: Fetch secrets dynamically from AWS Secrets Manager
                    // This avoids storing secrets in Jenkins and allows rotation
                    def secretsJson = sh(script: "aws secretsmanager get-secret-value --secret-id sensapbl/prod/config --query SecretString --output text", returnStdout: true).trim()
                    
                    // Parse secrets (requires jq installed on agent)
                    def identityPoolId = sh(script: "echo '${secretsJson}' | jq -r .VITE_COGNITO_IDENTITY_POOL_ID", returnStdout: true).trim()
                    def userPoolId = sh(script: "echo '${secretsJson}' | jq -r .VITE_COGNITO_USER_POOL_ID", returnStdout: true).trim()
                    def s3Bucket = sh(script: "echo '${secretsJson}' | jq -r .VITE_AWS_S3_BUCKET_NAME", returnStdout: true).trim()
                    def ddbTable = sh(script: "echo '${secretsJson}' | jq -r .VITE_AWS_DYNAMODB_TABLE_NAME", returnStdout: true).trim()

                    sh """
                        docker build \
                        --build-arg VITE_COGNITO_IDENTITY_POOL_ID=${identityPoolId} \
                        --build-arg VITE_COGNITO_USER_POOL_ID=${userPoolId} \
                        --build-arg VITE_AWS_S3_BUCKET_NAME=${s3Bucket} \
                        --build-arg VITE_AWS_DYNAMODB_TABLE_NAME=${ddbTable} \
                        -t ${ECR_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} .
                    """
                }
            }
        }

        stage('Push to ECR') {
            steps {
                script {
                    sh "aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}"
                    sh "docker push ${ECR_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
                }
            }
        }

        stage('Deploy to K8s') {
            steps {
                // Assuming kubeconfig is configured on the agent
                sh "kubectl rollout restart deployment/sensapbl-frontend -n sensapbl"
            }
        }
    }
}
