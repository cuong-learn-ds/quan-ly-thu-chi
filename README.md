# Quản lý thu chi cá nhân và lập kế hoạch tài chính (website)

Đồ án môn Phân tích thiết kế hướng đối tượng. Sản phẩm là **website**: backend REST API và giao diện chạy trên trình duyệt, phục vụ chung từ một cổng.

## Chức năng chính

- Tài khoản, ví (tiền mặt / ngân hàng / ví điện tử), danh mục thu chi, giao dịch (tìm kiếm, lọc, xuất Excel).
- Quét hóa đơn từ ảnh tải lên, tạo giao dịch chi nháp rồi người dùng xác nhận.
- Ngân sách theo danh mục có cảnh báo; mục tiêu tiết kiệm có theo dõi tiến độ.
- **Kế hoạch tài chính tháng** (trang Kế hoạch, quy tắc R13): hệ thống gợi ý thu nhập dự kiến, tiền để dành và hạn mức từng danh mục theo một trong hai cách: theo thói quen chi 3 tháng trước (làm tròn lên 50.000đ, không thấp hơn khoản định kỳ) hoặc theo quy tắc 50/30/20; người dùng sửa rồi áp dụng một lần để tạo ngân sách cả tháng; trong tháng theo dõi kế hoạch so với thực tế, dự báo chi cả tháng và nhận xét.
- **Chuyển tiền giữa các ví** (trang Ví): trừ ví nguồn, cộng ví đích, ghi lịch sử; không tính vào thu chi.
- **Lịch chi tiêu** (trang Lịch): lịch tháng hiện tổng thu/chi từng ngày, ô càng đậm càng chi nhiều; tổng thu, tổng chi, chi trung bình/ngày, ngày chi nhiều nhất; bấm ngày để xem và thêm giao dịch.
- **Nhập giao dịch từ Excel/CSV** (nút "Nhập từ file" ở trang Giao dịch): tải file mẫu, xem trước và báo lỗi từng dòng, đánh dấu dòng có thể trùng, nhập tất cả trong một lần (lỗi một dòng thì không ghi dòng nào). File xuất từ trang Báo cáo nhập lại được.
- **Giao dịch định kỳ** (trang Định kỳ): lịch thu/chi hằng tháng vào một ngày cố định (1–28), bộ hẹn giờ tự tạo giao dịch mỗi tháng một lần.
- **Dashboard Tổng quan:** thẻ thu/chi/chênh lệch/tổng số dư (kèm so sánh với tháng trước), nút thao tác nhanh, biểu đồ tròn chi theo danh mục, số dư theo ví, ngân sách sắp vượt, mục tiêu tiết kiệm, biểu đồ cột thu chi 12 tháng và 5 giao dịch gần nhất, lời chào theo giờ và mục "Nhận xét nhanh" (dự báo chi cả tháng, cảnh báo chi vượt thu, ngân sách vượt, mục tiêu chậm tiến độ).
- **Dùng trên điện thoại:** giao diện tối ưu cho màn hình nhỏ (thanh điều hướng dưới, nút + thêm giao dịch nhanh, hộp thoại dạng bảng trượt từ dưới, có thể "Thêm vào màn hình chính"). Bấm nút ▦ ở thanh trên cùng (hoặc trang đăng nhập) để mở trang **Điện thoại**: mã QR, nút chép/in địa chỉ, chọn địa chỉ mạng khác và hướng dẫn 4 bước; quét bằng camera điện thoại (cùng Wi-Fi với máy chạy server) là mở được web. Nếu không mở được, cho phép Node.js qua tường lửa Windows.
- **Giao diện sáng/tối:** tông màu chủ đạo xanh lá; nút đổi chế độ ở thanh trên cùng (và trang đăng nhập), nhớ lựa chọn trong trình duyệt; mặc định theo hệ thống.
- **Thống kê quản trị:** thêm số người dùng mới trong tháng, tổng số giao dịch và tỷ lệ tài khoản hoạt động (Quản trị viên, Kiểm toán viên).
- Báo cáo, thông báo nhắc nhở; quản trị viên, nhân viên hỗ trợ, kiểm toán viên có màn hình riêng.

## Chạy demo

Yêu cầu:

- **Node.js ≥ 22.13** (đã thử với 24).
- **Microsoft SQL Server** (đã thử với SQL Server 2025 Express), dịch vụ đang chạy trên máy, đăng nhập bằng tài khoản Windows.
- **ODBC Driver 18 for SQL Server** (driver `msnodesqlv8` kết nối qua ODBC).

```bash
cd server
npm install
npm start
```

Mở http://localhost:5080. Lần chạy đầu tự tạo CSDL `QuanLyThuChi` trên SQL Server (chạy `server/sql/01_tao_csdl.sql`) và nạp dữ liệu demo.

| Tài khoản | Email | Mật khẩu |
|---|---|---|
| Người dùng demo (3 ví, ~90 giao dịch, 3 ngân sách, 2 mục tiêu) | `demo@demo.vn` | `Demo@123` |
| Quản trị viên (khóa/mở khóa, danh mục mặc định, thống kê, tổng kết) | `admin@demo.vn` | `Demo@123` |
| Nhân viên hỗ trợ (xem/tìm người dùng, gửi thông báo hỗ trợ) | `hotro@demo.vn` | `Demo@123` |
| Kiểm toán viên (chỉ đọc thống kê) | `kiemtoan@demo.vn` | `Demo@123` |

Muốn làm lại từ đầu: xóa CSDL `QuanLyThuChi` trong SSMS (hoặc `sqlcmd -S localhost -E -C -Q "DROP DATABASE QuanLyThuChi"`) rồi chạy lại `npm start`.

### Cấu hình (biến môi trường, đều tùy chọn)

| Biến | Ý nghĩa |
|---|---|
| `PORT` | Cổng chạy (mặc định 5080) |
| `GEMINI_API_KEY` | Bật quét hóa đơn thật bằng Gemini. Không đặt thì dùng bản giả `FakeDichVuOcr` (trả dữ liệu mẫu, đủ để demo offline) |
| `GEMINI_MODEL` | Tên model (mặc định `gemini-2.5-flash`; kiểm tra tên hiện hành trước khi dùng) |
| `GEMINI_DUNG_BAN_GIA=1` | Ép dùng bản giả dù đã có API key |
| `JWT_KEY` | Khóa ký JWT |
| `DB_SERVER` | Máy SQL Server (mặc định `localhost`; SQL Express đặt tên riêng thì ghi `localhost\SQLEXPRESS`) |
| `DB_NAME` | Tên CSDL (mặc định `QuanLyThuChi`) |
| `DB_DRIVER` | Tên driver ODBC (mặc định `ODBC Driver 18 for SQL Server`) |
| `DB_CONNECTION` | Chuỗi kết nối ODBC đầy đủ, thay cho ba biến trên; `{db}` được thay bằng tên CSDL |

**Không commit API key.** Chỉ đặt qua biến môi trường.

## Kiểm thử tự động

```bash
cd server
npm test
```

60 kiểm thử: quy tắc nghiệp vụ R1–R13 ở tầng domain, và các luồng API (đăng ký/đăng nhập, ví và giao dịch, cảnh báo ngân sách, nạp mục tiêu, khóa tài khoản, tổng kết idempotent, quét hóa đơn, bộ hẹn giờ, dữ liệu demo, chuyển tiền giữa ví, giao dịch định kỳ, lịch chi tiêu, nhập giao dịch từ Excel/CSV, kế hoạch tài chính tháng). Mỗi tệp kiểm thử tạo CSDL tạm riêng trên SQL Server (`QLTC_KiemThu_...`) và tự xóa khi chạy xong, không đụng CSDL `QuanLyThuChi`.

## Script SQL Server (`server/sql/`)

Chạy lần lượt trong SSMS hoặc bằng `sqlcmd -S localhost -E -C -f 65001 -i <tên file>`:

| File | Nội dung |
|---|---|
| `01_tao_csdl.sql` | Tạo CSDL `QuanLyThuChi` và 14 bảng (khóa chính, khóa ngoại, CHECK, UNIQUE). Web dùng chính file này ở lần chạy đầu |
| `02_nhap_lieu.sql` | Dữ liệu mẫu, mỗi bảng ít nhất 9 dòng; chạy lại nhiều lần vẫn cho cùng kết quả. Sinh lại bằng `node sql/xuat-nhap-lieu.mjs` |
| `03_chuc_nang.sql` | Hàm, view và stored procedure cho các chức năng (đăng ký, thêm/xóa giao dịch, chuyển tiền, ngân sách, nạp mục tiêu, định kỳ, kế hoạch tháng, lịch, tổng kết, khóa tài khoản, thống kê); mỗi thủ tục ghi nhiều bảng chạy trong một transaction |
| `04_chay_thu.sql` | Chạy thử các chức năng, trường hợp thành công thì ROLLBACK để dữ liệu mẫu không đổi; kết quả lưu ở `04_ket_qua_chay_thu.txt` |

## Cấu trúc

```
server/
├── src/domain/      18 lớp + enum, đúng tên và phương thức như sơ đồ lớp Hình 4.1 (StarUML) và lớp KeHoachThang bổ sung
├── src/services/    nghiệp vụ theo nhóm use case; mỗi thao tác nhiều bước chạy trong 1 transaction
├── src/app.js       REST API (Express), JWT, phân quyền, lỗi 400/401/403/404/500
├── src/ha-tang.js   đồng hồ giờ Việt Nam, BCrypt, JWT, OCR (Gemini/Fake), lưu ảnh hóa đơn
├── src/jobs.js      bộ hẹn giờ: giao dịch định kỳ, nhắc ghi chép, nhắc mục tiêu, tổng kết cuối tháng
├── src/nhap-giao-dich.js  đọc file nhập giao dịch (.xlsx/.csv), chuẩn hóa ngày/số tiền/loại, tạo file mẫu
├── src/db.js        tầng truy cập SQL Server (get/all/run/transaction); db-worker.js giữ kết nối
├── src/seed.js      danh mục mặc định, admin, dữ liệu demo
├── sql/             script SQL Server: tạo bảng, nhập liệu, chức năng, chạy thử
├── public/          giao diện web (HTML/CSS/JS thuần, không cần build)
└── test/            kiểm thử (node:test)
docs/staruml/        mô hình use case (23 sơ đồ) và sơ đồ lớp
docs/thiet-ke/       tài liệu thiết kế
```

## Công nghệ

Backend Node.js (Express) + Microsoft SQL Server (thư viện `mssql` với driver `msnodesqlv8`), giao diện website bằng HTML/CSS/JavaScript thuần, không cần bước biên dịch. Mô hình miền (18 lớp, 6 kiểu liệt kê), quy tắc R1–R13 và danh sách API bám theo thiết kế trong `docs/thiet-ke/`.
