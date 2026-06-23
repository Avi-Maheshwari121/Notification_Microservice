pipeline {
    agent {
        kubernetes {
            yaml '''
            apiVersion: v1
            kind: Pod
            spec:
              containers:
              - name: docker
                image: docker:cli
                command: ['cat']
                tty: true
                env:
                - name: DOCKER_HOST
                  value: tcp://localhost:2375
              - name: dind
                image: docker:dind
                args: ["--insecure-registry=192.168.41.90:8082"]
                securityContext:
                  privileged: true
                env:
                - name: DOCKER_TLS_CERTDIR
                  value: ""
            '''
        }
    }
    
    environment {
        REGISTRY_URL = "192.168.41.90:8082" 
        IMAGE_NAME = "alumni-notification" 
        IMAGE_TAG = "v${BUILD_NUMBER}"
        NEXUS_CREDS = credentials('nexus-creds')
    }

    stages {
        stage('Prepare') {
            steps{ sh "git config --global --add safe.directory '*'" }
        }
        stage('Checkout') {
            steps { checkout scm }
        }
        stage('Build Docker Image') {
            steps {
                container('docker') {
                    sh "sleep 10" 
                    sh "docker build -f dockerfile -t ${REGISTRY_URL}/${IMAGE_NAME}:${IMAGE_TAG} ."
                }
            }
        }
        stage('Push to Nexus') {
            steps {
                container('docker') {
                    script {
                        sh 'echo $NEXUS_CREDS_PSW | docker login $REGISTRY_URL -u $NEXUS_CREDS_USR --password-stdin'
                        sh 'docker push $REGISTRY_URL/$IMAGE_NAME:$IMAGE_TAG'
                    }
                }
            }
        }
        stage('GitOps: Update ArgoCD Dev Manifest') {
            steps {
                script {
                    dir('infra-repo-tmp') {
                        withCredentials([usernamePassword(credentialsId: 'github-pat', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')]) {
                            sh 'git clone https://$GIT_USER:$GIT_PASS@github.com/kanishkpandey18/git-infra-repo.git .'
                        }
                        
                        sh "git config user.email 'jenkins@alumnilab.local'"
                        sh "git config user.name 'Jenkins Pipeline'"
                        
                        // ONLY changing the dev configuration file
                        def devFile = "argocd/dev/values/notification-dev.yaml"
                        
                        sh """
                           sed -i 's/tag: .*/tag: \"${IMAGE_TAG}\"/' ${devFile}
                        """
                        
                        sh """
                           git add ${devFile}
                           git commit -m "Automated CI/CD: Update notification dev ArgoCD tag to ${IMAGE_TAG}"
                           git push origin main
                        """
                    }
                }
            }
        }
    }
    post {
        always {
            container('docker') { sh "docker logout ${REGISTRY_URL} || true" }
            deleteDir()
        }
    }
}