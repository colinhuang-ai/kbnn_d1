# Test cases — màn hình `index.html`

## 1. Phạm vi

| Hạng mục | Nội dung |
| --- | --- |
| Màn hình | [index.html](../index.html) — tiêu đề "👋 Welcome docker", nút `#greet-btn`, vùng kết quả `#greeting` |
| Logic | [app.js](../app.js) — `buildGreetingMessage`, `renderGreeting`, `attachGreeting` |
| Dữ liệu | [api/user.json](../api/user.json) — mặc định `{"name": "hoang"}` |
| Ngoài phạm vi | Backend thật (không có), đăng nhập, đa ngôn ngữ |

## 2. Môi trường & tiền điều kiện chung

| Mã | Nội dung |
| --- | --- |
| ENV-1 | Site được serve qua HTTP (`npx http-server .` hoặc container nginx), **không** mở bằng `file://` vì ES module sẽ bị CORS chặn |
| ENV-2 | Trình duyệt hỗ trợ ES module: Chrome/Edge ≥ 61, Firefox ≥ 60, Safari ≥ 11 |
| ENV-3 | Trước mỗi ca kiểm thử: hard reload (Ctrl+Shift+R) để tránh cache `app.js` |
| ENV-4 | Các ca DT-*/ER-* cần chỉnh `api/user.json` hoặc dùng DevTools → Network → Block/Override request |

## 3. Hiển thị ban đầu

| ID | Mục tiêu | Bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- |
| UI-01 | Tiêu đề tab | Mở trang | Tab hiển thị `Welcome docker` | Cao |
| UI-02 | Heading | Quan sát nội dung trang | Thấy `👋 Welcome docker`, emoji nằm trước chữ | Cao |
| UI-03 | Nút mặc định | Quan sát nút | Nút hiển thị chữ `Say hello`, ở trạng thái enabled | Cao |
| UI-04 | Vùng kết quả trống | Quan sát dưới nút | `<p id="greeting">` rỗng, không chiếm chỗ nội dung | Cao |
| UI-05 | Không lỗi console | Mở DevTools → Console, load trang | Không có error/warning đỏ, `app.js` trả 200 | Cao |
| UI-06 | Animation bàn tay | Quan sát emoji 👋 trong ~3 giây | Emoji lắc qua lại, lặp vô hạn, chu kỳ 2.2s | Trung bình |
| UI-07 | Tôn trọng reduced-motion | Bật OS/DevTools `prefers-reduced-motion: reduce`, reload | Emoji **đứng yên**, không animation | Trung bình |
| UI-08 | Thứ tự tải module | Load trang rồi click nút ngay lập tức | Nút vẫn hoạt động (script `type="module"` được defer, DOM đã sẵn sàng) | Cao |

## 4. Chức năng chính

| ID | Mục tiêu | Tiền điều kiện | Bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- | --- |
| FN-01 | Happy path | `user.json` = `{"name":"hoang"}` | Click `Say hello` | `#greeting` hiển thị `Hello hoang ^^` | Cao |
| FN-02 | Gọi đúng endpoint | — | Mở tab Network → click nút | Có 1 request `GET api/user.json`, status 200 | Cao |
| FN-03 | Click lặp lại | — | Click nút 3 lần liên tiếp | Mỗi lần 1 request mới, nội dung `#greeting` vẫn là `Hello hoang ^^` (ghi đè, không nối chuỗi) | Cao |
| FN-04 | Đổi dữ liệu không cần build lại | — | Sửa `user.json` thành `{"name":"mai"}` → click nút | Hiển thị `Hello mai ^^` (có thể cần bỏ cache) | Trung bình |
| FN-05 | Ghi đè thông báo lỗi | Đã có lỗi trên `#greeting` | Sửa dữ liệu về hợp lệ → click nút | Chuỗi `Error: ...` bị thay bằng lời chào hợp lệ | Trung bình |
| FN-06 | Không submit/reload trang | — | Click nút, quan sát URL và Network | Trang không reload, không có navigation (nút nằm ngoài form) | Trung bình |

## 5. Ma trận dữ liệu biên (`api/user.json`)

| ID | Dữ liệu trả về | Kết quả mong đợi trên `#greeting` | Ưu tiên |
| --- | --- | --- | --- |
| DT-01 | `{"name":"hoang"}` | `Hello hoang ^^` | Cao |
| DT-02 | `{"name":"mai"}` | `Hello mai ^^` | Cao |
| DT-03 | `{}` (thiếu `name`) | `Error: Missing user name` | Cao |
| DT-04 | `{"name":""}` | `Error: Missing user name` | Cao |
| DT-05 | `{"name":"   "}` (toàn khoảng trắng) | `Error: Missing user name` | Cao |
| DT-06 | `{"name":null}` | `Error: Missing user name` | Cao |
| DT-07 | `{"name":123}` (số) | `Error: Missing user name` | Cao |
| DT-08 | `{"name":["a"]}` (array) | `Error: Missing user name` | Trung bình |
| DT-09 | `{"name":" mai "}` (có khoảng trắng 2 đầu) | Text thực tế là `Hello  mai  ^^` — code **không** trim; trình duyệt gộp khoảng trắng khi render nên nhìn như `Hello mai ^^`. Ghi nhận là hành vi hiện tại | Thấp |
| DT-10 | `{"name":"Nguyễn Thị Hoà"}` | `Hello Nguyễn Thị Hoà ^^`, không lỗi font/encoding (trang khai báo `charset=utf-8`) | Cao |
| DT-11 | `{"name":"😀🎉"}` | `Hello 😀🎉 ^^`, emoji không bị vỡ | Thấp |
| DT-12 | `name` dài 500 ký tự | Hiển thị đầy đủ, tự xuống dòng, không tràn ngang gây scroll ngang | Trung bình |
| DT-13 | `{"name":"a","role":"admin"}` (thừa field) | `Hello a ^^`, field lạ bị bỏ qua | Thấp |
| DT-14 | Body không phải JSON (ví dụ `hello`) | Hiển thị `Error: <thông báo parse JSON của trình duyệt>`, không crash trang | Cao |
| DT-15 | Body rỗng (0 byte), status 200 | Hiển thị `Error: ...` (JSON parse thất bại), không crash | Trung bình |

## 6. Trường hợp lỗi

| ID | Mục tiêu | Cách tạo | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- |
| ER-01 | 404 Not Found | Xoá/đổi tên `api/user.json` → click nút | `#greeting` = `Error: HTTP 404` | Cao |
| ER-02 | 500 Internal Error | DevTools override response status 500 | `#greeting` = `Error: HTTP 500` | Cao |
| ER-03 | 503 Service Unavailable | Override status 503 | `#greeting` = `Error: HTTP 503` | Cao |
| ER-04 | Mất mạng | DevTools → Network → Offline → click nút | Hiển thị `Error: Failed to fetch` (hoặc thông báo network tương đương), trang không trắng | Cao |
| ER-05 | Request timeout / rất chậm | Throttle "Slow 3G" hoặc delay 30s | Không có trạng thái loading (hạn chế hiện tại): nút vẫn click được, `#greeting` giữ nội dung cũ đến khi có phản hồi | Trung bình |
| ER-06 | Double click khi mạng chậm | Throttle Slow 3G → click 2 lần nhanh | Cả 2 request được gửi; kết quả cuối cùng ghi lên `#greeting` — cần xác nhận không hiển thị lẫn lộn | Trung bình |
| ER-07 | Lỗi rồi thử lại thành công | Gây 404 → khôi phục file → click lại | Thông báo lỗi được thay bằng lời chào, không cần reload trang | Cao |
| ER-08 | `app.js` tải thất bại | Chặn `app.js` trong DevTools → reload → click nút | Trang vẫn hiển thị heading/nút; click không có tác dụng và không phát sinh JS error mới cho người dùng | Trung bình |

## 7. Accessibility

| ID | Mục tiêu | Bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- |
| A11Y-01 | Điều hướng bàn phím | Nhấn Tab từ đầu trang | Focus tới nút `Say hello`, có viền focus rõ ràng | Cao |
| A11Y-02 | Kích hoạt bằng Enter | Focus nút → Enter | Chạy như click chuột, hiện lời chào | Cao |
| A11Y-03 | Kích hoạt bằng Space | Focus nút → Space | Chạy như click chuột | Cao |
| A11Y-04 | Nhãn cho emoji | Dùng screen reader (NVDA/VoiceOver) đọc heading | Đọc "waving hand Welcome docker" — emoji có `role="img"` + `aria-label` | Trung bình |
| A11Y-05 | Thông báo kết quả | Screen reader đang bật → click nút | **Kỳ vọng**: lời chào được đọc lên. Hiện tại `#greeting` không có `aria-live` nên không được announce → xem DEF-01 | Trung bình |
| A11Y-06 | Cấu trúc heading | Kiểm tra bằng axe DevTools / Lighthouse | **Kỳ vọng**: trang có `<h1>`. Hiện tại chỉ có `<h2>` → xem DEF-02 | Thấp |
| A11Y-07 | Zoom 200% | Ctrl+`+` tới 200% | Nội dung không bị cắt, không mất nút | Thấp |
| A11Y-08 | Độ tương phản | Lighthouse Accessibility | Không có finding về contrast | Thấp |

## 8. Tương thích & responsive

| ID | Mục tiêu | Bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- |
| CB-01 | Chrome/Edge mới nhất | Chạy FN-01, UI-06 | Đạt | Cao |
| CB-02 | Firefox mới nhất | Chạy FN-01, UI-06 | Đạt | Trung bình |
| CB-03 | Safari (macOS/iOS) | Chạy FN-01 | Đạt; kiểm tra thêm animation `transform-origin` | Trung bình |
| CB-04 | Mobile 375×667 | DevTools device mode → click nút | Nút đủ lớn để bấm, chữ không tràn. **Lưu ý**: thiếu `<meta name="viewport">` nên trang bị scale nhỏ → xem DEF-03 | Cao |
| CB-05 | Mở bằng `file://` | Double click `index.html` từ Explorer | Module bị CORS chặn, nút không hoạt động — đây là hành vi mong đợi, phải serve qua HTTP | Trung bình |
| CB-06 | Serve ở đường dẫn con | Truy cập `http://host/app/index.html` | `fetch('api/user.json')` giải tương đối thành `/app/api/user.json` → vẫn hoạt động | Trung bình |

## 9. Bảo mật

| ID | Mục tiêu | Dữ liệu | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- |
| SEC-01 | Chống XSS qua tên | `{"name":"<script>alert(1)</script>"}` | Hiển thị nguyên văn chuỗi `Hello <script>alert(1)</script> ^^`, **không** có alert (code dùng `textContent`) | Cao |
| SEC-02 | Chống HTML injection | `{"name":"<img src=x onerror=alert(1)>"}` | Hiển thị nguyên văn, không request tới `x`, không alert | Cao |
| SEC-03 | Template injection | `{"name":"${alert(1)}"}` | Hiển thị nguyên văn `Hello ${alert(1)} ^^` | Trung bình |
| SEC-04 | Không lộ thông tin nhạy cảm | Xem source + Network | Không có token/secret trong `index.html`, `app.js`, `user.json` | Cao |
| SEC-05 | Semgrep sạch | Chạy job security scan của CI | Không có finding blocking | Cao |

## 10. Triển khai Docker / nginx

| ID | Mục tiêu | Bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- |
| OPS-01 | Build image | `docker build -t kbnn:test .` | Build thành công | Cao |
| OPS-02 | Chạy container | `docker run --rm -p 8080:80 kbnn:test` → mở `http://localhost:8080` | Trang hiển thị đúng như UI-01..UI-04 | Cao |
| OPS-03 | Đủ 3 file trong image | `docker run --rm kbnn:test ls -R /usr/share/nginx/html` | Có `index.html`, `app.js`, `api/user.json` | Cao |
| OPS-04 | Chức năng trong container | Trong container đang chạy, click `Say hello` | `Hello hoang ^^` | Cao |
| OPS-05 | Content-Type đúng | `curl -I http://localhost:8080/app.js` | `Content-Type: text/javascript` (nếu là `text/plain`, module sẽ bị chặn) | Cao |
| OPS-06 | Root path | `curl -fsS http://localhost:8080/` | Trả về `index.html` (nginx index mặc định) | Trung bình |
| OPS-07 | Không lọt file thừa | Kiểm tra image không chứa `LICENSE`, `Dockerfile`, `.git` | Đúng theo [.dockerignore](../.dockerignore) | Thấp |
| OPS-08 | Tag image từ CI | Sau khi CI chạy trên `main` | Registry có `latest` và `sha-<short-sha>` | Trung bình |

## 11. Hiệu năng

| ID | Mục tiêu | Bước thực hiện | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- |
| PERF-01 | Lighthouse Performance | Job `lighthouse` trong CI | Điểm ≥ 90 (trang tĩnh rất nhỏ) | Trung bình |
| PERF-02 | Lighthouse Best Practices / SEO | Cùng report | Ghi nhận finding thiếu `meta description`, `viewport` → DEF-03, DEF-04 | Thấp |
| PERF-03 | HTMLHint | Job `htmlhint` trong CI | Không có lỗi lint | Trung bình |
| PERF-04 | Thời gian phản hồi khi click | Click nút trên mạng bình thường | Lời chào xuất hiện < 500 ms | Thấp |

## 12. Truy vết với unit test hiện có

| Test trong [tests/greeting.test.mjs](../tests/greeting.test.mjs) | Bao phủ test case UI |
| --- | --- |
| `buildGreetingMessage formats the expected greeting` | DT-01, DT-02, FN-01 |
| `buildGreetingMessage rejects a missing name` | DT-03 |
| `renderGreeting uses a mocked fetch response` | FN-01, FN-02 |
| `renderGreeting surfaces non-OK responses` | ER-03 |
| *(chưa có)* | DT-04..DT-15, ER-04, SEC-01..03 → nên bổ sung unit test cho các nhánh này |

## 13. Phát hiện tiềm ẩn cần xác nhận với dev

| ID | Mô tả | Test case liên quan | Đề xuất |
| --- | --- | --- | --- |
| DEF-01 | `#greeting` không có `aria-live` nên screen reader không đọc kết quả sau khi click | A11Y-05 | Thêm `aria-live="polite"` vào `<p id="greeting">` |
| DEF-02 | Trang không có `<h1>`, heading đầu tiên là `<h2>` | A11Y-06 | Đổi `<h2>` thành `<h1>` |
| DEF-03 | Thiếu `<meta name="viewport">` → trang bị thu nhỏ trên mobile | CB-04, PERF-02 | Thêm `<meta name="viewport" content="width=device-width, initial-scale=1">` |
| DEF-04 | Thiếu `<meta name="description">` | PERF-02 | Thêm meta description |
| DEF-05 | Không có trạng thái loading, nút không bị disable khi đang fetch → double click gửi 2 request | ER-05, ER-06 | Disable nút trong lúc chờ, hiển thị "Loading..." |
| DEF-06 | `buildGreetingMessage` kiểm tra `trim()` nhưng trả về `user.name` chưa trim | DT-09 | Trả về `user.name.trim()` cho nhất quán |
| DEF-07 | Lỗi parse JSON hiển thị nguyên message của trình duyệt (khác nhau giữa Chrome/Firefox), khó test và không thân thiện | DT-14, DT-15 | Bọc lỗi thành message thống nhất, ví dụ `Error: Invalid response` |
