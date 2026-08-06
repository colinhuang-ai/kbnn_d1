// CI/CD cho Jenkins Pipeline
// verify:  unit test -> semgrep -> htmlhint -> lighthouse
// publish: build + push Docker image (chỉ khi push vào main/master, bỏ qua pull request)
// deploy:  kéo Docker image về và chạy tại cổng 82 trên server localhost
//
// Yêu cầu trên Jenkins agent (label 'linux'):
//   - Docker CLI + quyền dùng /var/run/docker.sock (mỗi stage verify chạy trong 1 container)
//   - Plugin: Docker Pipeline, Git, JUnit
//   - Credential kiểu "Username with password", ID: dockerhub-credentials
//     (username = Docker Hub user, password = access token)

pipeline {
  agent { label 'linux' }

  triggers {
    // Kiểm tra Git mỗi 1 phút, chỉ kích hoạt build khi phát hiện commit mới
    pollSCM('* * * * *')
  }

  options {
    timestamps()
    timeout(time: 30, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '10'))
    disableConcurrentBuilds(abortPrevious: true)
    skipDefaultCheckout(true)
  }

  environment {
    IMAGE_NAME   = 'hoangpt/kbnn'
    NODE_IMAGE   = 'node:20-alpine'
    // zenika/alpine-chrome đã có sẵn Chromium + Node, dùng cho Lighthouse
    CHROME_IMAGE = 'zenika/alpine-chrome:with-node'
    SITE_PORT    = '8080'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        script {
          env.GIT_SHA_SHORT = sh(script: 'git rev-parse --short=7 HEAD', returnStdout: true).trim()
          env.GIT_REF = (env.BRANCH_NAME ?: env.GIT_BRANCH ?: '').replaceFirst(/^origin\//, '')
          currentBuild.displayName = "#${env.BUILD_NUMBER} ${env.GIT_REF} @ ${env.GIT_SHA_SHORT}"
        }
      }
    }

    stage('Verify') {
      stages {
        stage('Unit tests with mocks') {
          agent {
            docker {
              image "${NODE_IMAGE}"
              reuseNode true
            }
          }
          environment {
            HOME = "${WORKSPACE}"
            npm_config_cache = "${WORKSPACE}/.npm"
          }
          steps {
            sh '''
              set -eu
              node --version
              node --test \
                --test-reporter=spec --test-reporter-destination=stdout \
                --test-reporter=junit --test-reporter-destination=test-results.xml \
                tests/greeting.test.mjs
            '''
          }
          post {
            always {
              junit allowEmptyResults: true, testResults: 'test-results.xml'
            }
          }
        }

        stage('Security scan with Semgrep') {
          agent {
            docker {
              // --entrypoint= : image semgrep có ENTRYPOINT riêng, phải xoá để agent giữ container sống
              image 'semgrep/semgrep:latest'
              args '--entrypoint='
              reuseNode true
            }
          }
          environment {
            HOME = "${WORKSPACE}"
          }
          steps {
            // --error: fail build khi có finding (giống hành vi của semgrep-action).
            // Lưu ý: --config auto không dùng được cùng --metrics off.
            sh '''
              set -eu
              semgrep scan \
                --config auto \
                --error \
                --sarif --output semgrep.sarif
            '''
          }
          post {
            always {
              archiveArtifacts artifacts: 'semgrep.sarif', allowEmptyArchive: true, fingerprint: true
            }
          }
        }

        stage('Code quality with HTMLHint') {
          agent {
            docker {
              image "${NODE_IMAGE}"
              reuseNode true
            }
          }
          environment {
            HOME = "${WORKSPACE}"
            npm_config_cache = "${WORKSPACE}/.npm"
          }
          steps {
            sh 'npx -y htmlhint index.html'
          }
        }

        stage('Performance scan with Lighthouse') {
          agent {
            docker {
              image "${CHROME_IMAGE}"
              args '--entrypoint='
              reuseNode true
            }
          }
          environment {
            HOME = "${WORKSPACE}"
            npm_config_cache = "${WORKSPACE}/.npm"
            CHROME_PATH = '/usr/bin/chromium-browser'
          }
          steps {
            sh '''
              set -eu

              npx -y http-server . -p "${SITE_PORT}" -a 127.0.0.1 --silent > site.log 2>&1 &
              SITE_PID=$!
              trap 'kill "${SITE_PID}" 2>/dev/null || true' EXIT

              for i in $(seq 1 15); do
                if wget -q -O /dev/null "http://127.0.0.1:${SITE_PORT}/index.html"; then
                  break
                fi
                sleep 1
              done

              npx -y lighthouse "http://127.0.0.1:${SITE_PORT}/index.html" \
                --chrome-flags="--headless --no-sandbox --disable-dev-shm-usage" \
                --output=html \
                --output=json \
                --output-path=./lighthouse-report \
                --quiet
            '''
          }
          post {
            always {
              archiveArtifacts artifacts: 'lighthouse-report*,site.log', allowEmptyArchive: true
            }
          }
        }
      }
    }

    stage('Publish Docker image') {
      when {
        beforeAgent true
        allOf {
          not { changeRequest() }                                     // bỏ qua pull request
          expression { env.GIT_REF in ['main', 'master'] }             // chỉ push trên main/master
        }
      }
      steps {
        script {
          env.IMAGE_TAGS = "${env.IMAGE_NAME}:latest ${env.IMAGE_NAME}:sha-${env.GIT_SHA_SHORT}"
        }
        withCredentials([usernamePassword(
          credentialsId: 'dockerhub-credentials',
          usernameVariable: 'DOCKERHUB_USERNAME',
          passwordVariable: 'DOCKERHUB_TOKEN'
        )]) {
          sh '''
            set -eu

            echo "${DOCKERHUB_TOKEN}" | docker login -u "${DOCKERHUB_USERNAME}" --password-stdin

            # Buildx thay cho docker/build-push-action; cache đẩy lên registry
            # vì Jenkins không có GitHub Actions cache (type=gha).
            docker buildx inspect kbnn-builder >/dev/null 2>&1 \
              || docker buildx create --name kbnn-builder --driver docker-container
            docker buildx use kbnn-builder

            TAG_ARGS=""
            for tag in ${IMAGE_TAGS}; do
              TAG_ARGS="${TAG_ARGS} --tag ${tag}"
            done

            docker buildx build . \
              --file ./Dockerfile \
              ${TAG_ARGS} \
              --label "org.opencontainers.image.revision=${GIT_COMMIT:-}" \
              --label "org.opencontainers.image.source=${GIT_URL:-}" \
              --label "org.opencontainers.image.version=${GIT_SHA_SHORT}" \
              --cache-from "type=registry,ref=${IMAGE_NAME}:buildcache" \
              --cache-to "type=registry,ref=${IMAGE_NAME}:buildcache,mode=max" \
              --push
          '''
        }
      }
      post {
        always {
          sh 'docker logout || true'
        }
        success {
          echo "Đã push: ${env.IMAGE_TAGS}"
        }
      }
    }

    stage('Deploy to Localhost') {
      when {
        beforeAgent true
        allOf {
          not { changeRequest() }                                     // bỏ qua pull request
          expression { env.GIT_REF in ['main', 'master'] }             // chỉ deploy trên main/master
        }
      }
      environment {
        CONTAINER_NAME = 'kbnn-app'
        HOST_PORT      = '82'
        CONTAINER_PORT = '80'
      }
      steps {
        sh '''
          set -eu

          echo "=== Kéo image Docker mới nhất từ Docker Hub ==="
          docker pull "${IMAGE_NAME}:latest"

          echo "=== Gỡ bỏ container cũ nếu đang chạy ==="
          docker rm -f "${CONTAINER_NAME}" 2>/dev/null || true

          echo "=== Chạy container mới tại cổng ${HOST_PORT} ==="
          docker run -d \
            --name "${CONTAINER_NAME}" \
            --restart always \
            -p "${HOST_PORT}:${CONTAINER_PORT}" \
            "${IMAGE_NAME}:latest"

          echo "=== Kiểm tra ứng dụng sau khi deploy ==="
          sleep 2
          docker ps -f name="${CONTAINER_NAME}"
          curl -fsS "http://localhost:${HOST_PORT}/" >/dev/null && echo "Deploy thành công tại http://localhost:${HOST_PORT}/"
        '''
      }
      post {
        success {
          echo "Đã deploy thành công ứng dụng tại cổng ${HOST_PORT} trên localhost!"
        }
        failure {
          echo "Deploy thất bại! Kiểm tra log container..."
          sh 'docker logs "${CONTAINER_NAME}" --tail 50 || true'
        }
      }
    }
  }

  post {
    cleanup {
      cleanWs(deleteDirs: true, notFailBuild: true)
    }
  }
}
