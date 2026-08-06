# CI trên Jenkins

[Jenkinsfile](Jenkinsfile) là bản chuyển đổi 1-1 của [.github/workflows/submit-code.yml](.github/workflows/submit-code.yml).

## Ánh xạ GitHub Actions → Jenkins

| GitHub Actions | Jenkins |
| --- | --- |
| `on: push` / `on: pull_request` | Multibranch Pipeline (tự scan branch + PR) |
| `runs-on: ubuntu-latest` | `agent { label 'linux' }` |
| `actions/checkout@v4` | `checkout scm` |
| `actions/setup-node@v4` | stage chạy trong container `node:20-alpine` |
| `semgrep/semgrep-action@v1` | container `semgrep/semgrep` + `semgrep scan --config auto --error` |
| `browser-actions/setup-chrome@v1` | container `zenika/alpine-chrome:with-node` |
| `python3 -m http.server` | `npx http-server` (bên trong container Chrome) |
| `docker/login-action@v3` + `secrets.DOCKERHUB_*` | `withCredentials(usernamePassword('dockerhub-credentials'))` |
| `docker/metadata-action@v5` | tự sinh tag `latest` + `sha-<short>` trong `env.IMAGE_TAGS` |
| `docker/build-push-action@v6` | `docker buildx build --push` |
| `cache-from/to: type=gha` | `type=registry,ref=hoangpt/kbnn:buildcache` |
| `if: github.event_name == 'push'` | `when { not { changeRequest() }; expression { GIT_REF in main/master } }` |

## Chuẩn bị một lần

1. **Plugins**: Docker Pipeline, Pipeline: Declarative, Git, JUnit, Workspace Cleanup.
2. **Agent** có label `linux`, cài Docker CLI và user `jenkins` thuộc group `docker`
   (các stage verify chạy bằng `docker run`, stage publish cần `docker buildx`).
3. **Credential** (scope Global), ID `dockerhub-credentials`, kiểu *Username with password*:
   - Username: user Docker Hub
   - Password: Docker Hub **access token** (không dùng mật khẩu tài khoản)
4. **Job**: *New Item → Multibranch Pipeline* → thêm source Git của repo →
   Build Configuration: *by Jenkinsfile*, script path `Jenkinsfile`.
   Multibranch là bắt buộc nếu muốn CI chạy cho PR như GitHub; job Pipeline
   thường vẫn chạy được (stage publish dựa vào `GIT_BRANCH` để nhận ra main/master).

## Kết quả mỗi build

- Test report JUnit trong tab **Tests** (`test-results.xml`).
- Artifacts: `semgrep.sarif`, `lighthouse-report.html`, `lighthouse-report.json`.
- Trên `main`/`master`: push `hoangpt/kbnn:latest` và `hoangpt/kbnn:sha-<short-sha>`.
- **Deploy**: Kéo Docker image mới nhất về và chạy trên localhost tại cổng 82 (`http://localhost:82`).

## Chạy thử nhanh

```bash
# lint Jenkinsfile trước khi commit (cần Jenkins CLI + quyền truy cập controller)
curl -u "$JENKINS_USER:$JENKINS_TOKEN" -X POST \
  -F "jenkinsfile=<Jenkinsfile" "$JENKINS_URL/pipeline-model-converter/validate"
```

## Ghi chú

- `semgrep --config auto` cần Internet và **không** dùng chung với `--metrics off`.
  Nếu agent chạy offline, đổi sang ruleset local: `--config .semgrep/`.
- Nếu agent không cho phép Docker-in-Docker, thay các `agent { docker { ... } }`
  bằng `tools { nodejs 'node20' }` (NodeJS plugin) và cài Chromium sẵn trên agent.
- Muốn 4 bước verify chạy song song: đổi `stages` trong stage `Verify` thành `parallel`.
  Khi đó mỗi nhánh cần `checkout scm` riêng vì không còn dùng chung workspace tuần tự.
