# Tổng quan dự án: Quản lý thu chi cá nhân và lập kế hoạch tài chính

## 1. Dự án là gì

Website giúp người dùng ghi chép thu chi, quản lý nhiều ví, đặt ngân sách theo danh mục, lập mục tiêu tiết kiệm và xem báo cáo. Hệ thống tự cảnh báo khi chi gần hoặc vượt ngân sách, nhắc ghi chép hằng ngày, tổng kết cuối tháng, và cho phép quét ảnh hóa đơn để tạo giao dịch chi. Quản trị viên có thể xem người dùng, khóa/mở khóa tài khoản và quản lý danh mục mặc định.

Đây là đồ án nhóm môn Phân tích thiết kế hướng đối tượng. Mô hình phân tích (use case, sơ đồ lớp) vẽ bằng StarUML là nền tảng; mã nguồn bám theo mô hình đó.

| Mục | Nội dung |
|---|---|
| Loại sản phẩm | Website (chạy trên trình duyệt, giao diện co giãn theo kích thước màn hình) |
| Tác nhân (actor) | 5 tác nhân (danh từ, không dùng động từ): Khách, Người dùng, Quản trị viên, Nhân viên hỗ trợ, Kiểm toán viên. Bộ hẹn giờ và dịch vụ OCR (Gemini) là thành phần của hệ thống, không phải actor. "Quản lý danh mục" là use case của Quản trị viên |
| Công nghệ bản demo | Node.js 24, Express, Microsoft SQL Server (`mssql` + `msnodesqlv8`), JWT, bcryptjs, ExcelJS, giao diện HTML/CSS/JS thuần |
| Phương án thiết kế ban đầu | ASP.NET Core + SQL Server cho backend (xem mục 4) |
| Chạy thử | Cần SQL Server đang chạy và ODBC Driver 18; `cd server` → `npm install` → `npm start` → http://localhost:5080 |
| Tài khoản demo (mật khẩu `Demo@123`) | `demo@demo.vn` (người dùng), `admin@demo.vn` (quản trị viên), `hotro@demo.vn` (nhân viên hỗ trợ), `kiemtoan@demo.vn` (kiểm toán viên) |

## 2. Cấu trúc thư mục

```
quan-ly-thu-chi-main/
├── README.md                      hướng dẫn chạy nhanh
├── TONG_QUAN_DU_AN.md             file này
├── .gitignore
├── docs/                          tài liệu
│   ├── staruml/
│   │   └── Cuong_Hoang_QuanLiThuChi.mdj   mô hình StarUML: 23 sơ đồ use case (gồm Hình 5 bổ sung) + sơ đồ lớp Hình 4.1 và Hình 4.2 (lớp bổ sung)
│   ├── thiet-ke/
│   │   ├── 2026-11-07-quan-ly-thu-chi-design.md   tài liệu thiết kế: mục tiêu, kiến trúc, quy tắc R1–R13, API, màn hình
│   │   └── 2026-11-08-backend.md                  kế hoạch cài đặt backend theo từng task
│   ├── hinh-bao-cao/                              ảnh dùng trong báo cáo: sơ đồ use case/lớp/tuần tự/hoạt động, ảnh chụp màn hình
│   ├── NhomCuong_Hoang_BaiKQBCCK.docx  báo cáo Word đầy đủ theo mẫu của môn (bản mới nhất)
│   ├── NhomCuong_Hoang_BaiKQBCCK.pdf   bản PDF xuất từ file Word trên
│   └── MoTa_DeTai.docx                  mô tả đề tài ngắn để nộp
├── server/                        ★ MÃ NGUỒN CHẠY ĐƯỢC (backend + giao diện web)
│   ├── package.json               khai báo gói và lệnh npm start / npm test
│   ├── src/
│   │   ├── index.js               điểm khởi động: mở CSDL, nạp dữ liệu, chạy server và bộ hẹn giờ
│   │   ├── app.js                 dựng REST API (route, xác thực JWT, phân quyền, xử lý lỗi)
│   │   ├── db.js                  kết nối SQL Server, bọc truy vấn (get/all/run) và transaction
│   │   ├── db-worker.js           worker giữ kết nối SQL Server (db.js chờ kết quả đồng bộ)
│   │   ├── ha-tang.js             đồng hồ giờ Việt Nam, băm mật khẩu, JWT, OCR (Gemini/bản giả), lưu ảnh
│   │   ├── jobs.js                bộ hẹn giờ: giao dịch định kỳ, nhắc ghi chép, nhắc mục tiêu, tổng kết cuối tháng
│   │   ├── nhap-giao-dich.js     đọc file Excel/CSV để nhập giao dịch, tạo file mẫu
│   │   ├── seed.js                danh mục mặc định, tài khoản admin, dữ liệu demo
│   │   ├── domain/index.js        ★ mô hình miền: 18 lớp + enum, chứa quy tắc nghiệp vụ
│   │   └── services/index.js      ★ nghiệp vụ theo nhóm use case (tài khoản, ví, giao dịch, ngân sách…)
│   ├── sql/                       script SQL Server
│   │   ├── 01_tao_csdl.sql        tạo CSDL QuanLyThuChi và 14 bảng (web cũng dùng file này)
│   │   ├── 02_nhap_lieu.sql       dữ liệu mẫu, mỗi bảng ≥ 9 dòng (sinh bằng xuat-nhap-lieu.mjs)
│   │   ├── 03_chuc_nang.sql       hàm, view, stored procedure cho các chức năng (transaction, TRY/CATCH)
│   │   ├── 04_chay_thu.sql        chạy thử các chức năng (thành công thì ROLLBACK)
│   │   └── 04_ket_qua_chay_thu.txt kết quả chạy thử
│   ├── public/                    giao diện web (không cần build)
│   │   ├── index.html             trang gốc
│   │   ├── styles.css             giao diện, hỗ trợ màn hình hẹp và chế độ tối
│   │   ├── core.js                gọi API, dựng DOM, hộp thoại, biểu đồ tròn và biểu đồ cột SVG
│   │   ├── app.js                 khung trang, điều hướng, đăng nhập/đăng ký
│   │   ├── pages-ghi-chep.js      Tổng quan (biểu đồ), Giao dịch (nhập từ file), Lịch chi tiêu, Quét hóa đơn, Ví (chuyển tiền), Giao dịch định kỳ, Danh mục
│   │   └── pages-ke-hoach.js      Kế hoạch tháng, Ngân sách, Mục tiêu, Báo cáo, Thông báo, Nhắc nhở, Tài khoản, Quản trị
│   └── test/
│       ├── domain.test.js         kiểm thử quy tắc nghiệp vụ ở tầng domain
│       ├── api.test.js            kiểm thử các luồng API đầu-cuối
│       ├── vai-tro.test.js        kiểm thử phân quyền 4 vai trò đăng nhập
│       ├── tinh-nang-moi.test.js  kiểm thử chuyển tiền giữa ví và giao dịch định kỳ
│       ├── lich-nhap.test.js      kiểm thử lịch chi tiêu và nhập giao dịch từ Excel/CSV
│       └── ke-hoach.test.js       kiểm thử kế hoạch tài chính tháng (R13)
```

Thư mục sinh ra khi chạy (đã nằm trong `.gitignore`): `server/node_modules/` (gói cài đặt), `server/uploads/` (ảnh hóa đơn đã tải lên). Dữ liệu nằm trong CSDL `QuanLyThuChi` trên SQL Server, không nằm trong thư mục dự án.

## 3. Mỗi thư mục dùng vào việc gì

| Thư mục / file | Dùng để | Ai dùng, khi nào |
|---|---|---|
| `docs/staruml/` | Lưu mô hình phân tích thiết kế: sơ đồ use case 3 mức và sơ đồ lớp. Mở bằng phần mềm StarUML | Đưa hình vào báo cáo; đối chiếu khi sửa mã |
| `docs/thiet-ke/` | Tài liệu thiết kế: phạm vi, kiến trúc, 12 quy tắc nghiệp vụ, danh sách API, danh sách màn hình, dữ liệu demo, kế hoạch kiểm thử | Làm căn cứ viết báo cáo; thống nhất trong nhóm |
| `docs/hinh-bao-cao/` | Ảnh PNG của mọi sơ đồ (vẽ lại từ file StarUML) và ảnh chụp màn hình demo | Chèn vào báo cáo Word; dùng khi làm slide |
| `docs/NhomCuong_Hoang_BaiKQBCCK.docx` | Báo cáo đồ án theo mẫu của môn (bìa, phiếu đánh giá, mục lục tự động, Chương 1–5, tài liệu tham khảo, phụ lục) | Nộp cho giảng viên; cần điền họ tên, MSSV, lớp ở bìa |
| `server/src/domain/` | Chứa các lớp thực thể đúng như sơ đồ lớp và quy tắc nghiệp vụ (không phụ thuộc CSDL hay HTTP) | Người code backend; là phần "khớp 1–1 với sơ đồ lớp" |
| `server/src/services/` | Điều phối: tải dữ liệu → gọi domain → lưu trong một transaction → tạo thông báo | Người code backend; mỗi nhóm hàm ứng với một nhóm use case |
| `server/src/app.js` | Khai báo các đường dẫn `/api/...`, kiểm tra đăng nhập và quyền | Người code backend/frontend khi cần xem API |
| `server/src/db.js`, `seed.js` | Kết nối SQL Server và dữ liệu mẫu để demo | Khi demo hoặc làm lại dữ liệu |
| `server/sql/` | Script SQL Server: tạo bảng, nhập liệu, code chức năng (stored procedure), chạy thử | Nộp phần CSDL; chạy trong SSMS để kiểm tra |
| `server/src/jobs.js` | Các tác vụ chạy theo giờ (thành phần "Bộ hẹn giờ" của hệ thống, không phải actor) | Chạy tự động trong lúc server hoạt động |
| `server/public/` | Giao diện người dùng trên trình duyệt | Người code frontend; chụp ảnh màn hình đưa vào báo cáo |
| `server/test/` | Kiểm thử tự động; chạy bằng `npm test` | Trước khi demo/nộp để chắc không hỏng quy tắc nghiệp vụ |

## 4. Công nghệ

Backend Node.js (Express) + Microsoft SQL Server, giao diện website HTML/CSS/JS thuần. Mô hình miền (18 lớp), quy tắc R1–R13 và danh sách API bám theo thiết kế.

## 5. Luồng hoạt động tổng thể

```
Trình duyệt (server/public) ──HTTP/JSON + JWT──▶ app.js (route, phân quyền)
                                                     │
                                                     ▼
                                           services/ (nghiệp vụ, transaction)
                                                     │
                                       ┌─────────────┴─────────────┐
                                       ▼                           ▼
                               domain/ (quy tắc)          db.js → SQL Server (QuanLyThuChi)
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
| R11 | Chuyển tiền: hai ví khác nhau, số tiền > 0, ví nguồn đủ số dư; tổng số dư không đổi |
| R12 | Giao dịch định kỳ: ngày 1–28, mỗi tháng tạo đúng một lần; thiếu số dư thì bỏ qua và báo |
| R13 | Kế hoạch tháng: thu nhập dự kiến > 0, tiền để dành ≥ 0, mỗi tháng một kế hoạch; phân bổ chi lưu thành ngân sách của tháng |

## 7. Lệnh thường dùng

```bash
cd server
npm install      # cài gói lần đầu
npm start        # chạy website tại http://localhost:5080
npm test         # chạy 60 kiểm thử tự động (mỗi tệp dùng CSDL tạm riêng, tự xóa)
```

Xóa CSDL `QuanLyThuChi` (SSMS hoặc `sqlcmd -S localhost -E -C -Q "DROP DATABASE QuanLyThuChi"`) để làm lại dữ liệu từ đầu. Đặt biến môi trường `GEMINI_API_KEY` để quét hóa đơn bằng Gemini thật; nếu không đặt, hệ thống dùng bản giả trả dữ liệu mẫu.

## Chức năng bổ sung (cập nhật 2026-11-10)

| Chức năng | Mô tả ngắn | Nơi cài đặt |
|---|---|---|
| Chuyển tiền giữa các ví | Trừ ví nguồn, cộng ví đích, ghi `ChuyenTien`; không tính vào thu chi; quy tắc R11 | `ChuyenTien` (domain), `S.chuyenTien`, `POST/GET /api/chuyen-tien`, trang Ví |
| Giao dịch định kỳ | Lịch thu/chi hằng tháng, ngày 1–28; bộ hẹn giờ tạo đúng một giao dịch/tháng; thiếu số dư thì bỏ qua và báo; quy tắc R12 | `GiaoDichDinhKy` (domain), `S.dinhKy`, `/api/giao-dich-dinh-ky`, `jobs.js`, trang Định kỳ |
| Dashboard Tổng quan | So sánh thu/chi với tháng trước, nút thao tác nhanh, số dư theo ví, mục tiêu tiết kiệm, biểu đồ cột 12 tháng (dùng lại các API có sẵn, không thêm API mới) | `trangTongQuan` trong `pages-ghi-chep.js`, `bieuDoCot` trong `core.js` |
| Nhận xét nhanh và dự báo chi trên Tổng quan | Tính ở trình duyệt từ dữ liệu có sẵn: dự báo chi cả tháng, chi vượt thu, ngân sách vượt, mục tiêu chậm | `trangTongQuan` |
| Giao diện điện thoại và mã QR | CSS cho màn hình nhỏ, nút + nổi, manifest để thêm vào màn hình chính; API công khai `GET /api/ket-noi-dien-thoai` trả các địa chỉ LAN thật của máy chủ kèm mã QR (SVG, thư viện `qrcode`); trang `#/dien-thoai` gồm thẻ QR (chép/in, chọn địa chỉ mạng) và thẻ hướng dẫn | `app.js` (noiDungDienThoai), `styles.css`, `manifest.webmanifest`, `app.js` trong `src` |
| Giao diện sáng/tối | Màu chủ đạo xanh lá (#2f9e44); nút đổi chế độ, lưu trong trình duyệt, mặc định theo hệ thống | `CHE_DO` trong `core.js`, `styles.css` |
| Thống kê quản trị mở rộng | Thêm `soNguoiMoiThangNay`, hiển thị tổng giao dịch và tỷ lệ hoạt động | `S.quanTri.thongKe`, `tabThongKe` |

Tài liệu đã cập nhật theo chức năng bổ sung: mô hình StarUML (thêm Hình 5 và Hình 4.2, hai lớp mới, giá trị `DinhKy` của `LoaiThongBao`), ảnh `docs/hinh-bao-cao/uc_bo_sung.png` và `lop_bo_sung.png`, báo cáo Word (Phụ lục D, số liệu kiểm thử 45/45) và tài liệu thiết kế (R11, R12, API, bộ hẹn giờ). File PDF của báo cáo chưa xuất lại, cần xuất lại từ Word sau khi cập nhật mục lục.

## Chức năng bổ sung (cập nhật 2026-11-16)

| Chức năng | Mô tả ngắn | Nơi cài đặt |
|---|---|---|
| Lịch chi tiêu | Lịch tháng, mỗi ô là tổng thu/chi của ngày, màu đậm theo mức chi; thẻ tổng thu, tổng chi, chi trung bình/ngày, ngày chi nhiều nhất; bấm ngày để xem/thêm giao dịch | `S.lich.theoThang`, `GET /api/bao-cao/lich`, `trangLich` trong `pages-ghi-chep.js`, menu Lịch |
| Nhập giao dịch từ Excel/CSV | File cùng định dạng với file xuất Excel; bước xem trước khớp tên ví/danh mục, mô phỏng số dư theo thứ tự ngày (R2), đánh dấu dòng có thể trùng; bước nhập chạy trong một transaction | `src/nhap-giao-dich.js`, `S.nhapGiaoDich`, `/api/giao-dich/nhap/*`, nút "Nhập từ file" ở trang Giao dịch |

| Kế hoạch tài chính tháng | Gợi ý thu nhập dự kiến (từ lương định kỳ), tiền để dành và hạn mức từng danh mục theo thói quen chi 3 tháng (làm tròn lên 50.000đ, không thấp hơn khoản cố định) hoặc theo quy tắc 50/30/20; áp dụng một lần tạo `KeHoachThang` và các `NganSach` của tháng; theo dõi kế hoạch so với thực tế, dự báo chi cả tháng; quy tắc R13 | `KeHoachThang`, `PhuongPhapKeHoach` (domain), `S.keHoach`, `GET /api/ke-hoach`, `GET /api/ke-hoach/goi-y`, `POST /api/ke-hoach`, trang Kế hoạch |
| Chuyển CSDL sang SQL Server | Thay SQLite bằng SQL Server; 14 bảng; script tạo bảng, nhập liệu, stored procedure và chạy thử ở `server/sql/`; kiểm thử chạy trên CSDL tạm của SQL Server | `src/db.js`, `src/db-worker.js`, `server/sql/` |

Lịch chi tiêu và Nhập file không thêm lớp miền mới (dùng lại `GiaoDich`, R1, R2, R10). Kế hoạch tháng thêm lớp `KeHoachThang` (18 lớp) và kiểu liệt kê `PhuongPhapKeHoach`, đã vẽ ở sơ đồ lớp StarUML Hình 4.2.

Tài liệu đã cập nhật theo đợt này: sơ đồ lớp Hình 4.1 sắp xếp lại (không còn tọa độ âm, đường cắt nhau); Hình 4.2 thêm `KeHoachThang`; báo cáo Word thêm R13, đặc tả UC Lập kế hoạch tài chính tháng, bảng KeHoachThang, mục 3.4 Cài đặt CSDL trên SQL Server, trang Kế hoạch (ảnh `web_ke_hoach.png`, `web_lap_ke_hoach.png`), 60 kiểm thử; PDF đã xuất lại. Mục 3.3 "Mô hình quan hệ" (`docs/hinh-bao-cao/csdl_14_bang.png`, 14 bảng kiểu SQL Server) theo yêu cầu bài thực hành; không dùng ERD. File StarUML thêm 11 sơ đồ tuần tự (gói "Mô hình tuần tự"); báo cáo thêm biểu đồ trình tự 2.6.11 Lập kế hoạch tài chính tháng (`sd_ke_hoach.png`). `MoTa_DeTai.docx` cập nhật SQL Server, 60 kiểm thử, các chức năng mới. Bài nộp nén ở `../NhomCuong_Hoang_BaiThucHanh.zip`. Báo cáo cũ `BaoCao_DoAn_QuanLyThuChi` và các ảnh chỉ nó dùng đã xóa (còn trong lịch sử git).
