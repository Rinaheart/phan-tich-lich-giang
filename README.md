 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/README.md b/README.md
index c5d94f73d41bab278d432f4ebdc406e6fb48d7c3..92e525704cfdb4f264a157b3d6f7b3a2ef49e8a5 100644
--- a/README.md
+++ b/README.md
@@ -1,2 +1,27 @@
-# phan-tich-lich-giang
-Phân tích Lịch trình Giảng dạy từ file HTML-CĐYT
+# Timetable Analyzer
+
+Ứng dụng web một trang giúp phân tích lịch trình giảng dạy từ file HTML do CĐYT xuất ra. Sau khi tải file lên, hệ thống tự động gom nhóm dữ liệu theo tuần, ngày và toàn học kỳ, đồng thời cung cấp nhiều công cụ lọc và xuất dữ liệu nhằm phục vụ việc theo dõi giảng dạy.
+
+## Tính năng chính
+- **Tải/ kéo thả file HTML**: hỗ trợ nhập tệp lịch giảng định dạng `.html`/`.htm`.
+- **Bộ lọc nâng cao**: lọc theo tuần, ngày cụ thể, giảng viên, tên học phần, mã lớp, phòng và buổi (sáng/ chiều/ tối).
+- **Tìm kiếm tức thời**: nhập từ khóa để tìm theo tên học phần, mã lớp, phòng hoặc giảng viên.
+- **Chế độ xem linh hoạt**: chuyển đổi giữa các tab Tuần, Ngày và Toàn kỳ.
+- **Bảng chi tiết**: click vào lớp để xem thông tin chi tiết và sao chép nhanh dữ liệu.
+- **Đánh dấu trùng tiết**: bật công cụ phát hiện lớp bị trùng thời gian.
+- **Tô màu theo mã lớp**: dễ dàng phân biệt các lớp cùng mã.
+- **Xuất dữ liệu**: hỗ trợ xuất JSON, CSV và in PDF.
+- **Chuyển đổi giao diện sáng/tối**: tùy chỉnh theme để phù hợp môi trường làm việc.
+
+## Cách sử dụng
+1. Mở file `index.html` trong trình duyệt hiện đại (Chrome, Edge, Firefox, …).
+2. Nhấn **Tải file HTML** hoặc kéo thả tệp lịch giảng vào khu vực màn hình.
+3. Chờ hệ thống phân tích dữ liệu. Các bộ lọc và tab sẽ tự động được kích hoạt.
+4. Sử dụng thanh tìm kiếm hoặc các bộ lọc để thu hẹp kết quả.
+5. Nhấn vào một lớp để xem chi tiết, sao chép nội dung hoặc bật tính năng đánh dấu trùng tiết/tô màu.
+6. Sau khi hoàn tất, có thể xuất dữ liệu ra JSON, CSV hoặc sử dụng nút In PDF.
+
+## Phát triển
+Dự án được xây dựng bằng HTML, CSS và JavaScript thuần (`script.js`). Không cần cài đặt phụ thuộc; chỉ cần mở trực tiếp file `index.html` trên trình duyệt để phát triển và kiểm thử.
+
+Đóng góp hoặc mở issue nếu bạn phát hiện lỗi hoặc cần thêm tính năng.
 
EOF
)
