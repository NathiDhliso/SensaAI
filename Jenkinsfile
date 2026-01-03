pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 1, unit: 'HOURS')
        buildDiscarder(logRotator(numToKeepStr: '30', artifactNumToKeepStr: '10'))
        skipDefaultCheckout()
    }

    parameters {
        choice(name: 'ENVIRONMENT', choices: ['dev', 'staging', 'production'], description: 'Deployment environment')
        booleanParam(name: 'SKIP_TESTS', defaultValue: false, description: 'Skip test stage for quick iterations')
        booleanParam(name: 'DEPLOY_ONLY', defaultValue: false, description: 'Deploy without rebuilding images')
    }

    environment {
        AWS_REGION = 'us-east-1'
        ECR_REGISTRY = '311964231104.dkr.ecr.us-east-1.amazonaws.com'
        FRONTEND_IMAGE = 'sensapbl-pilot-frontend'
        BACKEND_IMAGE = 'sensapbl-pilot-backend'
        BUILD_VERSION = "${BUILD_NUMBER}-${GIT_COMMIT.take(7)}"
        DOCKER_BUILDKIT = '1'
        REGISTRY_CREDS = credentials('aws-ecr-credentials')
    }

    stages {
        stage('Checkout') {
            steps {
                script {
                    echo "=== Starting Pipeline Build ${BUILD_VERSION} ==="
                    checkout scm
                    sh "git log --oneline -5"
                }
            }
        }

        stage('Setup & Lint') {
            steps {
                script {
                    echo "=== Running Code Quality Checks ==="
                    docker.image('node:20-alpine').inside {
                        sh '''
                            echo "Installing dependencies..."
                            npm ci
                            
                            echo "Running ESLint..."
                            npm run lint || echo "Linting warnings detected"
                            
                            echo "Checking TypeScript..."
                            npx tsc --noEmit
                        '''
                    }
                }
            }
        }

        stage('Test') {
            when {
                expression { return !params.SKIP_TESTS }
            }
            steps {
                script {
                    echo "=== Running Unit Tests ==="
                    docker.image('node:20-alpine').inside {
                        sh 'npm run test -- --run --coverage'
                    }
                }
            }
        }

        stage('SAST Security Scan') {
            steps {
                script {
                    echo "=== Running Security Analysis ==="
                    docker.image('node:20-alpine').inside {
                        sh '''
                            echo "Running npm audit..."
                            npm audit --audit-level=moderate || true
                            
                            echo "Checking for vulnerable dependencies..."
                            npx snyk test --severity-threshold=high || true
                        '''
                    }
                }
            }
        }

        stage('Build & Push Images') {
            when {
                expression { return !params.DEPLOY_ONLY }
            }
            parallel {
                stage('Frontend Build & Push') {
                    steps {
                        script {
                            echo "=== Building Frontend Image ==="
                            try {
                                def secretsJson = sh(
                                    script: "aws secretsmanager get-secret-value --secret-id sensapbl/${params.ENVIRONMENT}/config --query SecretString --output text --region ${AWS_REGION}",
                                    returnStdout: true
                                ).trim()
                                
                                def identityPoolId = sh(script: "echo '${secretsJson}' | jq -r .VITE_COGNITO_IDENTITY_POOL_ID", returnStdout: true).trim()
                                def userPoolId = sh(script: "echo '${secretsJson}' | jq -r .VITE_COGNITO_USER_POOL_ID", returnStdout: true).trim()
                                def s3Bucket = sh(script: "echo '${secretsJson}' | jq -r .VITE_AWS_S3_BUCKET_NAME", returnStdout: true).trim()
                                def ddbTable = sh(script: "echo '${secretsJson}' | jq -r .VITE_AWS_DYNAMODB_TABLE_NAME", returnStdout: true).trim()
                                def apiUrl = sh(script: "echo '${secretsJson}' | jq -r .VITE_API_URL", returnStdout: true).trim()

                                sh '''
                                    echo "Logging into ECR..."
                                    aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}
                                    
                                    echo "Building frontend image: ${FRONTEND_IMAGE}:${BUILD_VERSION}"
                                    docker build \
                                        --build-arg VITE_COGNITO_IDENTITY_POOL_ID=''' + identityPoolId + ''' \
                                        --build-arg VITE_COGNITO_USER_POOL_ID=''' + userPoolId + ''' \
                                        --build-arg VITE_AWS_S3_BUCKET_NAME=''' + s3Bucket + ''' \
                                        --build-arg VITE_AWS_DYNAMODB_TABLE_NAME=''' + ddbTable + ''' \
                                        --build-arg VITE_API_URL=''' + apiUrl + ''' \
                                        --cache-from ${ECR_REGISTRY}/${FRONTEND_IMAGE}:latest \
                                        -t ${ECR_REGISTRY}/${FRONTEND_IMAGE}:${BUILD_VERSION} \
                                        -t ${ECR_REGISTRY}/${FRONTEND_IMAGE}:latest \
                                        .
                                    
                                    echo "Pushing frontend image..."
                                    docker push ${ECR_REGISTRY}/${FRONTEND_IMAGE}:${BUILD_VERSION}
                                    docker push ${ECR_REGISTRY}/${FRONTEND_IMAGE}:latest
                                '''
                            } catch (Exception e) {
                                echo "Frontend build failed: ${e.message}"
                                throw e
                            }
                        }
                    }
                }

                stage('Backend Build & Push') {
                    steps {
                        script {
                            echo "=== Building Backend Image ==="
                            try {
                                def secretsJson = sh(
                                    script: "aws secretsmanager get-secret-value --secret-id sensapbl/${params.ENVIRONMENT}/backend-config --query SecretString --output text --region ${AWS_REGION}",
                                    returnStdout: true
                                ).trim()

                                sh '''
                                    echo "Logging into ECR..."
                                    aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}
                                    
                                    echo "Building backend image: ${BACKEND_IMAGE}:${BUILD_VERSION}"
                                    docker build \
                                        --cache-from ${ECR_REGISTRY}/${BACKEND_IMAGE}:latest \
                                        -t ${ECR_REGISTRY}/${BACKEND_IMAGE}:${BUILD_VERSION} \
                                        -t ${ECR_REGISTRY}/${BACKEND_IMAGE}:latest \
                                        -f backend/Dockerfile \
                                        backend/
                                    
                                    echo "Pushing backend image..."
                                    docker push ${ECR_REGISTRY}/${BACKEND_IMAGE}:${BUILD_VERSION}
                                    docker push ${ECR_REGISTRY}/${BACKEND_IMAGE}:latest
                                '''
                            } catch (Exception e) {
                                echo "Backend build failed: ${e.message}"
                                throw e
                            }
                        }
                    }
                }
            }
        }

        stage('Container Security Scan') {
            when {
                expression { return !params.DEPLOY_ONLY }
            }
            steps {
                script {
                    echo "=== Scanning Container Images for Vulnerabilities ==="
                    sh '''
                        echo "Scanning frontend image..."
                        trivy image --severity HIGH,CRITICAL ${ECR_REGISTRY}/${FRONTEND_IMAGE}:${BUILD_VERSION} || true
                        
                        echo "Scanning backend image..."
                        trivy image --severity HIGH,CRITICAL ${ECR_REGISTRY}/${BACKEND_IMAGE}:${BUILD_VERSION} || true
                    '''
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                script {
                    echo "=== Deploying to ${params.ENVIRONMENT} ==="
                    try {
                        sh '''
                            # Update image references in K8s manifests
                            sed -i "s|IMAGE_TAG|${BUILD_VERSION}|g" k8s/deployment.yaml
                            sed -i "s|REGISTRY|${ECR_REGISTRY}|g" k8s/deployment.yaml
                            sed -i "s|ENVIRONMENT|${ENVIRONMENT}|g" k8s/deployment.yaml
                            
                            # Apply configurations
                            kubectl apply -f k8s/config.yaml -n sensapbl
                            kubectl apply -f k8s/deployment.yaml -n sensapbl
                            
                            echo "Waiting for rollout..."
                            kubectl rollout status deployment/sensapbl-frontend -n sensapbl --timeout=5m
                            kubectl rollout status deployment/sensapbl-backend -n sensapbl --timeout=5m
                            
                            echo "Deployment successful!"
                            kubectl get pods -n sensapbl
                        '''
                    } catch (Exception e) {
                        echo "Deployment failed: ${e.message}"
                        sh "kubectl rollout undo deployment/sensapbl-frontend -n sensapbl || true"
                        sh "kubectl rollout undo deployment/sensapbl-backend -n sensapbl || true"
                        throw e
                    }
                }
            }
        }

        stage('Smoke Tests') {
            steps {
                script {
                    echo "=== Running Smoke Tests ==="
                    sh '''
                        echo "Testing frontend health..."
                        curl -f http://sensapbl-frontend.sensapbl.svc.cluster.local/health || exit 1
                        
                        echo "Testing backend health..."
                        curl -f http://sensapbl-backend.sensapbl.svc.cluster.local/health || exit 1
                        
                        echo "Smoke tests passed!"
                    '''
                }
            }
        }

        stage('Archive Artifacts') {
            steps {
                script {
                    echo "=== Archiving Build Artifacts ==="
                    sh '''
                        mkdir -p build-artifacts
                        echo "Build Version: ${BUILD_VERSION}" > build-artifacts/build-info.txt
                        echo "Environment: ${ENVIRONMENT}" >> build-artifacts/build-info.txt
                        echo "Timestamp: $(date)" >> build-artifacts/build-info.txt
                        echo "Frontend Image: ${ECR_REGISTRY}/${FRONTEND_IMAGE}:${BUILD_VERSION}" >> build-artifacts/build-info.txt
                        echo "Backend Image: ${ECR_REGISTRY}/${BACKEND_IMAGE}:${BUILD_VERSION}" >> build-artifacts/build-info.txt
                    '''
                    archiveArtifacts artifacts: 'build-artifacts/**', allowEmptyArchive: true
                }
            }
        }
    }

    post {
        always {
            script {
                echo "=== Pipeline Cleanup ==="
                sh "docker logout ${ECR_REGISTRY} || true"
                cleanWs()
            }
        }
        success {
            script {
                echo "✓ Pipeline succeeded!"
                // Add notification (Slack, email, etc.)
                // slackSend(channel: '#deployments', message: "Deployment successful: ${BUILD_VERSION}")
            }
        }
        failure {
            script {
                echo "✗ Pipeline failed!"
                // Add notification
                // slackSend(channel: '#deployments', color: 'danger', message: "Deployment failed: ${BUILD_VERSION}")
            }
        }
        unstable {
            script {
                echo "⚠ Pipeline unstable - review logs"
            }
        }
    }
}
