# CI trên GitLab

[.gitlab-ci.yml](.gitlab-ci.yml) là bản chuyển đổi của [.github/workflows/submit-code.yml](.github/workflows/submit-code.yml)
(bản Jenkins tương ứng: [Jenkinsfile](Jenkinsfile), xem [JENKINS.md](JENKINS.md)).

## Ánh xạ GitHub Actions → GitLab CI

| GitHub Actions | GitLab CI |
| --- | --- |
| `on: push` / `on: pull_request` | `workflow.rules` (branch pipeline + `merge_request_event`, chặn trùng) |
| `jobs.<id>.steps` | mỗi bước tách thành 1 job, gom theo `stages` |
| `needs: verify` | `stages: [test, verify, publish]` — stage sau chờ stage trước |
| `runs-on: ubuntu-latest` | GitLab Runner executor `docker` |
| `actions/checkout@v4` | runner tự clone (`GIT_DEPTH: 20`) |
| `actions/setup-node@v4` | `image: node:20-alpine` (template `.node`) |
| `semgrep/semgrep-action@v1` | `semgrep scan --config auto --error --gitlab-sast` → `reports:sast` |
| `browser-actions/setup-chrome@v1` | `image: zenika/alpine-chrome:with-node` |
| `python3 -m http.server` | `npx http-server` |
| `secrets.DOCKERHUB_*` | CI/CD Variables `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` |
| `docker/login-action@v3` | `docker login --password-stdin` trong `before_script` |
| `docker/metadata-action@v5` | tag thủ công: `latest` + `sha-$CI_COMMIT_SHORT_SHA` |
| `docker/build-push-action@v6` | `docker buildx build --push` + service `docker:dind` |
| `cache-from/to: type=gha` | `type=registry,ref=hoangpt/kbnn:buildcache` |
| `if: github.event_name == 'push'` | `rules: $CI_PIPELINE_SOURCE == "push" && branch in (main, master)` |
| huỷ run cũ khi push mới | `default.interruptible: true` |

## Chuẩn bị một lần

1. **Runner** với executor `docker`. Job `publish-docker-image` cần `docker:dind`, nên
   runner phải bật privileged mode (`privileged = true` trong `config.toml`).
   Nếu không được phép privileged, xem phần Ghi chú bên dưới.
2. **Variables** tại *Settings → CI/CD → Variables*:
   - `DOCKERHUB_USERNAME` — Masked
   - `DOCKERHUB_TOKEN` — Masked + Protected (dùng access token, không dùng mật khẩu)
   Vì job publish chỉ chạy trên `main`/`master`, hãy đảm bảo branch đó là **protected branch**
   nếu bạn bật Protected cho biến.

## Kết quả mỗi pipeline

- Unit test hiện trong tab **Tests** của pipeline (`reports:junit`).
- Semgrep xuất `gl-sast-report.json`; widget SAST trong MR cần GitLab Ultimate,
  còn artifact thì tier nào cũng tải được.
- `lighthouse-report.report.html` / `.json` tải từ artifacts của job `lighthouse`.
- Trên `main`/`master`: push `hoangpt/kbnn:latest` và `hoangpt/kbnn:sha-<short-sha>`.

## Chạy thử nhanh

```bash
# validate cú pháp bằng CI Lint API
curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  --header "Content-Type: application/json" \
  --data "$(jq -Rn --rawfile c .gitlab-ci.yml '{content:$c}')" \
  "https://gitlab.com/api/v4/projects/$PROJECT_ID/ci/lint" | jq .

# chạy 1 job ngay trên máy (cần gitlab-runner cài local)
gitlab-runner exec docker unit-test
```

## Ghi chú

- `semgrep --config auto` cần Internet và **không** dùng chung với `--metrics off`.
  Offline thì đổi sang ruleset local: `--config .semgrep/`.
- Không dùng được dind privileged: thay job publish bằng
  [Kaniko](https://docs.gitlab.com/ee/ci/docker/using_kaniko.html) hoặc `buildah`,
  hoặc mount `/var/run/docker.sock` vào runner (kém an toàn hơn).
- Muốn push lên GitLab Container Registry thay Docker Hub: đổi
  `IMAGE_NAME: $CI_REGISTRY_IMAGE` và login bằng `$CI_REGISTRY_USER` / `$CI_REGISTRY_PASSWORD`
  (biến có sẵn, không cần khai báo).
- 3 job trong stage `verify` đã chạy song song sẵn. Muốn tuần tự như GitHub thì thêm
  `needs:` giữa chúng.
