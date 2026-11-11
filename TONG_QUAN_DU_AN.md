# Tổng quan dự án: Quản lý thu chi cá nhân và lập kế hoạch tài chính

## 1. Dự án là gì

Website giúp người dùng ghi chép thu chi, quản lý nhiều ví, đặt ngân sách theo danh mục, lập mục tiêu tiết kiệm và xem báo cáo. Hệ thống tự cảnh báo khi chi gần hoặc vượt ngân sách, nhắc ghi chép hằng ngày, tổng kết cuối tháng, và cho phép quét ảnh hóa đơn để tạo giao dịch chi. Quản trị viên có thể xem người dùng, khóa/mở khóa tài khoản và quản lý danh mục mặc định.

Đây là đồ án nhóm môn Phân tích thiết kế hướng đối tượng. Mô hình phân tích (use case, sơ đồ lớp) vẽ bằng StarUML là nền tảng; mã nguồn bám theo mô hình đó.

| Mục | Nội dung |
|---|---|
| Loại sản phẩm | Website (chạy trên trình duyệt, giao diện co giãn theo kích thước màn hình) |
| Tác nhân (actor) | 5 tác nhân (danh từ, không dùng động từ): Khách, Người dùng, Quản trị viên, Nhân viên hỗ trợ, Kiểm toán viên. Bộ hẹn giờ và dịch vụ OCR (Gemini) là thành phần của hệ thống, không phải actor. "Quản lý danh mục" là use case của Quản trị viên |
| Công nghệ bản demo | Node.js 24, Express, SQLite (`node:sqlite`), JWT, bcryptjs, ExcelJS, giao diện HTML/CSS/JS thuần |
| Phương án thiết kế ban đầu | ASP.NET Core + SQL Server cho backend (xem mục 4) |
| Chạy thử | `cd server` → `npm install` → `npm start` → http://localhost:5080 |
| Tài khoản demo (mật khẩu `Demo@123`) | `demo@demo.vn` (người dùng), `admin@demo.vn` (quản trị viên), `hotro@demo.vn` (nhân viên hỗ trợ), `kiemtoan@demo.vn` (kiểm toán viên) |

## 2. Cấu trúc thư mục

```
quan-ly-thu-chi-main/
├── README.md                      hướng dẫn chạy nhanh
├── TONG_QUAN_DU_AN.md             file này
├── .gitignore
├── docs/                          tài liệu
│   ├── staruml/
│   │   ├── Cuong_Hoang_QuanLiThuChi.mdj   mô hình StarUML: 23 sơ đồ use case (gồm Hình 5 bổ sung) + sơ đồ lớp Hình 4.1 và Hình 4.2 (lớp bổ sung)
│   │   └── Hinh_4_1_So_do_lop.png ảnh sơ đồ lớp (bản xuất trước khi chỉnh sửa)
│   ├── thiet-ke/
│   │   ├── 2026-11-07-quan-ly-thu-chi-design.md   tài liệu thiết kế: mục tiêu, kiến trúc, quy tắc R1–R12, API, màn hình
│   │   └── 2026-11-08-backend.md                  kế hoạch cài đặt backend theo từng task
│   ├── hinh-bao-cao/                              ảnh dùng trong báo cáo: sơ đồ use case/lớp/tuần tự/hoạt động/ERD, ảnh chụp màn hình
│   ├── BaoCao_DoAn_QuanLyThuChi.docx   báo cáo Word đầy đủ theo mẫu của môn (có PDF cùng tên)
│   ├── BaoCao_DoAn_QuanLyThuChi.pdf
│   └── MoTa_DeTai.docx                  mô tả đề tài ngắn để nộp
├── server/                        ★ MÃ NGUỒN CHẠY ĐƯỢC (backend + giao diện web)
│   ├── package.json               khai báo gói và lệnh npm start / npm test
│   ├── src/
│   │   ├── index.js               điểm khởi động: mở CSDL, nạp dữ liệu, chạy server và bộ hẹn giờ
│   │   ├── app.js                 dựng REST API (route, xác thực JWT, phân quyền, xử lý lỗi)
│   │   ├── db.js                  tạo bảng SQLite, bọc truy vấn và transaction
│   │   ├── ha-tang.js             đồng hồ giờ Việt Nam, băm mật khẩu, JWT, OCR (Gemini/bản giả), lưu ảnh
│   │   ├── jobs.js                bộ hẹn giờ: giao dịch định kỳ, nhắc ghi chép, nhắc mục tiêu, tổng kết cuối tháng
│   │   ├── seed.js                danh mục mặc định, tài khoản admin, dữ liệu demo
│   │   ├── domain/index.js        ★ mô hình miền: 17 lớp + enum, chứa quy tắc nghiệp vụ
│   │   └── services/index.js      ★ nghiệp vụ theo nhóm use case (tài khoản, ví, giao dịch, ngân sách…)
│   ├── public/                    giao diện web (không cần build)
│   │   ├── index.html             trang gốc
│   │   ├── styles.css             giao diện, hỗ trợ màn hình hẹp và chế độ tối
│   │   ├── core.js                gọi API, dựng DOM, hộp thoại, biểu đồ tròn và biểu đồ cột SVG
│   │   ├── app.js                 khung trang, điều hướng, đăng nhập/đăng ký
│   │   ├── pages-ghi-chep.js      Tổng quan (biểu đồ), Giao dịch, Quét hóa đơn, Ví (chuyển tiền), Giao dịch định kỳ, Danh mục
│   │   └── pages-ke-hoach.js      Ngân sách, Mục tiêu, Báo cáo, Thông báo, Nhắc nhở, Tài khoản, Quản trị
│   └── test/
│       ├── domain.test.js         kiểm thử quy tắc nghiệp vụ ở tầng domain
│       ├── api.test.js            kiểm thử các luồng API đầu-cuối
│       ├── vai-tro.test.js        kiểm thử phân quyền 4 vai trò đăng nhập
│       └── tinh-nang-moi.test.js  kiểm thử chuyển tiền giữa ví và giao dịch định kỳ
```

Thư mục sinh ra khi chạy (đã nằm trong `.gitignore`): `server/node_modules/` (gói cài đặt), `server/data/` (file CSDL SQLite), `server/uploads/` (ảnh hóa đơn đã tải lên).

## 3. Mỗi thư mục dùng vào việc gì

| Thư mục / file | Dùng để | Ai dùng, khi nào |
|---|---|---|
| `docs/staruml/` | Lưu mô hình phân tích thiết kế: sơ đồ use case 3 mức và sơ đồ lớp. Mở bằng phần mềm StarUML | Đưa hình vào báo cáo; đối chiếu khi sửa mã |
| `docs/thiet-ke/` | Tài liệu thiết kế: phạm vi, kiến trúc, 12 quy tắc nghiệp vụ, danh sách API, danh sách màn hình, dữ liệu demo, kế hoạch kiểm thử | Làm căn cứ viết báo cáo; thống nhất trong nhóm |
| `docs/hinh-bao-cao/` | Ảnh PNG của mọi sơ đồ (vẽ lại từ file StarUML) và ảnh chụp màn hình demo | Chèn vào báo cáo Word; dùng khi làm slide |
| `docs/Nhom_..._BaoCao_v2.docx` | Báo cáo đồ án theo mẫu của môn (bìa, phiếu đánh giá, mục lục tự động, Chương 1–5, tài liệu tham khảo, phụ lục) | Nộp cho giảng viên; cần điền họ tên, MSSV, lớp ở bìa |
| `server/src/domain/` | Chứa các lớp thực thể đúng như sơ đồ lớp và quy tắc nghiệp vụ (không phụ thuộc CSDL hay HTTP) | Người code backend; là phần "khớp 1–1 với sơ đồ lớp" |
| `server/src/services/` | Điều phối: tải dữ liệu → gọi domain → lưu trong một transaction → tạo thông báo | Người code backend; mỗi nhóm hàm ứng với một nhóm use case |
| `server/src/app.js` | Khai báo các đường dẫn `/api/...`, kiểm tra đăng nhập và quyền | Người code backend/frontend khi cần xem API |
| `server/src/db.js`, `seed.js` | Cấu trúc bảng và dữ liệu mẫu để demo | Khi demo hoặc làm lại dữ liệu |
| `server/src/jobs.js` | Các tác vụ chạy theo giờ (thành phần "Bộ hẹn giờ" của hệ thống, không phải actor) | Chạy tự động trong lúc server hoạt động |
| `server/public/` | Giao diện người dùng trên trình duyệt | Người code frontend; chụp ảnh màn hình đưa vào báo cáo |
| `server/test/` | Kiểm thử tự động; chạy bằng `npm test` | Trước khi demo/nộp để chắc không hỏng quy tắc nghiệp vụ |

## 4. Công nghệ

Backend Node.js (Express) + SQLite, giao diện website HTML/CSS/JS thuần. Mô hình miền (17 lớp), quy tắc R1–R12 và danh sách API bám theo thiết kế.

## 5. Luồng hoạt động tổng thể

```
Trình duyệt (server/public) ──HTTP/JSON + JWT──▶ app.js (route, phân quyền)
                                                     │
                                                     ▼
                                           services/ (nghiệp vụ, transaction)
                                                     │
                                       ┌─────────────┴─────────────┐
                                       ▼                           ▼
                               domain/ (quy tắc)          db.js → SQLite (server/data)
                                       ▲
              jobs.js (bộ hẹn giờ) ────┘   ha-tang.js: OCR Gemini, ảnh hóa đơn, JWT, BCrypt
```

## 6. Các quy tắc nghiệp vụ chính (tóm tắt)

| Mã | Quy tắc |
|---|---|
| R1 | Số tiền giao dịch, hạn mức, mục tiêu phải lớn hơn 0 |
| R2 | Chi tiền không được vượt số dư ví ("Số dư ví không đủ") |
| R3 | Sửa/xóa giao dịch hoàn tác ảnh hưởng cũ lên ví rồi áp giá trị mới |
| R4 | Tên ví không trùng; ví còn giao dịch thì không xóa |
| R5 | Không sửa/xóa danh mục mặc định; xóa danh mục đang dùng phải chuyển sang danh mục cùng loại |
| R6 | Mỗi (danh mục, tháng) một ngân sách; cảnh báo khi đạt ngưỡng và khi vượt, mỗi mức một lần |
| R7 | Nạp mục tiêu: trừ ví, cộng mục tiêu, tạo giao dịch chi "Tiết kiệm"; thông báo hoàn thành một lần |
| R8 | Tài khoản bị khóa không đăng nhập được, token cũ bị từ chối; admin không tự khóa mình |
| R9 | Tổng kết tháng chạy nhiều lần vẫn chỉ có một báo cáo và một thông báo |
| R10 | Người dùng chỉ truy cập dữ liệu của mình (dữ liệu người khác trả 404) |

## 7. Lệnh thường dùng

```bash
cd server
npm install      # cài gói lần đầu
npm start        # chạy website tại http://localhost:5080
npm test         # chạy 45 kiểm thử tự động
```

Xóa thư mục `server/data` để làm lại dữ liệu từ đầu. Đặt biến môi trường `GEMINI_API_KEY` để quét hóa đơn bằng Gemini thật; nếu không đặt, hệ thống dùng bản giả trả dữ liệu mẫu.

## Chức năng bổ sung (cập nhật 2026-11-10)

| Chức năng | Mô tả ngắn | Nơi cài đặt |
|---|---|---|
| Chuyển tiền giữa các ví | Trừ ví nguồn, cộng ví đích, ghi `ChuyenTien`; không tính vào thu chi; quy tắc R11 | `ChuyenTien` (domain), `S.chuyenTien`, `POST/GET /api/chuyen-tien`, trang Ví |
| Giao dịch định kỳ | Lịch thu/chi hằng tháng, ngày 1–28; bộ hẹn giờ tạo đúng một giao dịch/tháng; thiếu số dư thì bỏ qua và báo; quy tắc R12 | `GiaoDichDinhKy` (domain), `S.dinhKy`, `/api/giao-dich-dinh-ky`, `jobs.js`, trang Định kỳ |
| Dashboard Tổng quan | So sánh thu/chi với tháng trước, nút thao tác nhanh, số dư theo ví, mục tiêu tiết kiệm, biểu đồ cột 12 tháng (dùng lại các API có sẵn, không thêm API mới) | `trangTongQuan` trong `pages-ghi-chep.js`, `bieuDoCot` trong `core.js` |

Tài liệu đã cập nhật theo chức năng bổ sung: mô hình StarUML (thêm Hình 5 và Hình 4.2, hai lớp mới, giá trị `DinhKy` của `LoaiThongBao`), ảnh `docs/hinh-bao-cao/uc_bo_sung.png` và `lop_bo_sung.png`, báo cáo Word (Phụ lục D, số liệu kiểm thử 45/45) và tài liệu thiết kế (R11, R12, API, bộ hẹn giờ). File PDF của báo cáo chưa xuất lại, cần xuất lại từ Word sau khi cập nhật mục lục.
