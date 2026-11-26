# Tổng quan dự án: Quản lý thu chi cá nhân và lập kế hoạch tài chính

Cập nhật ngày 26/11/2026.

## 1. Dự án là gì

Website giúp người dùng ghi chép thu chi, quản lý nhiều ví, đặt ngân sách theo danh mục, lập mục tiêu tiết kiệm và kế hoạch tài chính tháng, xem báo cáo. Hệ thống tự cảnh báo khi chi gần hoặc vượt ngân sách, nhắc ghi chép, tổng kết cuối tháng, quét ảnh hóa đơn và nhập giao dịch từ Excel/CSV.

Đồ án môn Phân tích thiết kế hướng đối tượng. Trọng tâm là mô hình phân tích thiết kế (use case, lớp, tuần tự, hoạt động, dữ liệu); mã nguồn bám theo mô hình đó.

| Mục | Nội dung |
|---|---|
| Sinh viên | Võ Quốc Cường (2424802010303), Trần Minh Hoàng (2424802010347), lớp VCNS.CQ.T102 |
| Giảng viên hướng dẫn | TS. Dương Thị Kim Chi |
| Tác nhân | Người dùng, Quản trị viên, Nhân viên hỗ trợ, Kiểm toán viên, Dịch vụ OCR (hệ thống ngoài). Không có “Khách”. Bộ hẹn giờ là thành phần của hệ thống; ngân hàng (BIDV, MB…) là bên thứ ba được hỗ trợ, không phải tác nhân |
| Công nghệ | Node.js 22.13 trở lên, Express, Microsoft SQL Server (`mssql` + `msnodesqlv8`), JWT, bcryptjs, ExcelJS, HTML/CSS/JS thuần |
| Chạy thử | `npm run setup` → `npm start` → http://localhost:5080 |
| Tài khoản demo (mật khẩu `Demo@123`) | `demo@demo.vn`, `admin@demo.vn`, `hotro@demo.vn`, `kiemtoan@demo.vn` |

## 2. Hồ sơ nộp

| Yêu cầu | Tệp |
|---|---|
| Slide báo cáo | `docs/Slide_BaoCao_QuanLyThuChi_rut_gon.pptx` (18 slide, dùng khi trình bày, có lời thuyết trình trong phần ghi chú) |
| Quyển báo cáo Word | `docs/BaoCao_DoAn_QuanLyThuChi.docx` và bản `.pdf` (125 trang) |
| Demo CSDL | `server/sql/` (tệp `05_demo_thuyet_trinh.sql` dùng khi trình bày) |
| Demo giao diện | `server/` (chạy `npm start`) |
| Mô hình | `docs/staruml/Cuong_Hoang_QuanLiThuChi.mdj` |
| Khác | `docs/SoDo_Mapping_UC.xlsx`, `docs/MoTa_DeTai.docx` |

## 3. Mô hình phân tích thiết kế

| Loại sơ đồ | Số lượng | Ghi chú |
|---|---|---|
| Use case | 24 | 1 tổng quát, 9 phân rã, 12 chi tiết, 2 bổ sung. Tệp StarUML có 23 sơ đồ; sơ đồ “lịch, nhập file” vẽ riêng. “Lập kế hoạch tháng” chưa có trên sơ đồ use case |
| Lớp | 2 | 15 lớp + 5 enum (sơ đồ chính), thêm `ChuyenTien`, `GiaoDichDinhKy`, `KeHoachThang`: tổng 18 lớp, 6 enum |
| Tuần tự | 11 | Giao diện → REST API → Service → Domain → CSDL |
| Hoạt động | 10 | Chưa có sơ đồ cho lập kế hoạch tháng |
| Dữ liệu (ERD) | 1 | 14 bảng |
| Kiến trúc | 1 | `docs/hinh-bao-cao/kien_truc.png` |

Ảnh sơ đồ nằm trong `docs/hinh-bao-cao/`.

## 4. Cấu trúc thư mục

```
quan-ly-thu-chi/
├── README.md                hướng dẫn chạy và giới thiệu chức năng
├── TONG_QUAN_DU_AN.md       file này
├── docs/
│   ├── Slide_BaoCao_QuanLyThuChi_rut_gon.pptx
│   ├── BaoCao_DoAn_QuanLyThuChi.docx / .pdf
│   ├── MoTa_DeTai.docx, SoDo_Mapping_UC.xlsx
│   ├── staruml/             mô hình StarUML
│   ├── thiet-ke/            tài liệu thiết kế ban đầu
│   ├── hinh-bao-cao/        ảnh sơ đồ dùng trong báo cáo và slide
│   └── anh/                 ảnh chụp giao diện
└── server/
    ├── src/
    │   ├── index.js         khởi động: mở CSDL, nạp dữ liệu, chạy server và bộ hẹn giờ
    │   ├── app.js           REST API, JWT, phân quyền
    │   ├── services/        nghiệp vụ theo nhóm use case, transaction
    │   ├── domain/          18 lớp, 6 enum, quy tắc R1–R13
    │   ├── db.js, db-worker.js   kết nối SQL Server
    │   ├── ha-tang.js       giờ Việt Nam, BCrypt, JWT, OCR, lưu ảnh
    │   ├── jobs.js          việc chạy theo giờ
    │   ├── nhap-giao-dich.js     đọc tệp Excel/CSV
    │   └── seed.js          dữ liệu mẫu
    ├── sql/                 01 tạo CSDL, 02 dữ liệu, 03 hàm/view/thủ tục, 04 chạy thử, 05 demo
    ├── public/              giao diện web
    │   ├── app.js, core.js, pages-ghi-chep.js, pages-ke-hoach.js
    │   ├── ve.js            hình vẽ tay (heo đất, hũ, biểu đồ)
    │   ├── lich.js          chọn ngày
    │   ├── styles.css       giao diện sổ tay, sáng/tối, điện thoại
    │   └── dong.js, dong.css     chuyển động “cuốn sổ sống”
    └── test/                60 kiểm thử tự động
```

## 5. Luồng hoạt động

```
Trình duyệt (public) ──HTTP/JSON + JWT──▶ app.js ──▶ services/ ──▶ domain/ (quy tắc)
                                                        │
                      jobs.js (bộ hẹn giờ) ─────────────┤──▶ db.js ──▶ SQL Server (QuanLyThuChi)
                                                        └──▶ ha-tang.js ──▶ Gemini OCR / bản giả
```

## 6. Quy tắc nghiệp vụ

| Mã | Quy tắc |
|---|---|
| R1 | Số tiền giao dịch, hạn mức, mục tiêu phải lớn hơn 0 |
| R2 | Chi tiền không được vượt số dư ví |
| R3 | Sửa/xóa giao dịch hoàn tác ảnh hưởng cũ lên ví |
| R4 | Tên ví không trùng; ví còn dữ liệu thì không xóa |
| R5 | Không sửa/xóa danh mục mặc định; xóa danh mục đang dùng phải chuyển sang danh mục cùng loại |
| R6 | Mỗi (danh mục, tháng) một ngân sách; cảnh báo mỗi mức một lần |
| R7 | Nạp mục tiêu: trừ ví, cộng mục tiêu, tạo giao dịch chi “Tiết kiệm” |
| R8 | Tài khoản bị khóa không đăng nhập được; quản trị viên không tự khóa mình |
| R9 | Tổng kết tháng chạy lại không tạo trùng |
| R10 | Người dùng chỉ truy cập dữ liệu của mình |
| R11 | Chuyển tiền giữa hai ví khác nhau, không tính là thu chi |
| R12 | Giao dịch định kỳ ngày 1–28, mỗi tháng một lần; thiếu số dư thì bỏ qua và báo |
| R13 | Kế hoạch tháng: thu nhập lớn hơn 0; áp dụng một lần tạo ngân sách cả tháng |

## 7. Cơ sở dữ liệu

14 bảng, 14 khóa chính, 21 khóa ngoại, 7 UNIQUE, 27 CHECK, 19 DEFAULT, 1 hàm, 3 view, 21 thủ tục. Web dùng tệp `01` để tạo bảng; nghiệp vụ của web chạy ở tầng service, thủ tục trong tệp `03` là bản cài đặt nghiệp vụ trong CSDL để demo và đối chiếu.

### Điểm cần cải thiện đã rà ra (chưa sửa)

1. Xóa danh mục đang có lịch định kỳ bị lỗi khóa ngoại (đã tái hiện lỗi 547 với `sp_XoaDanhMuc`; tầng service của web cũng không xử lý bảng `GiaoDichDinhKy`).
2. Thông báo khóa tài khoản dùng loại `TongKetThang`.
3. Báo cáo lọc bằng `YEAR()`, `MONTH()` nên không tận dụng chỉ mục theo ngày.
4. `vw_TienDoNganSach` gọi `fn_SoDaChi` bốn lần mỗi dòng.
5. `sp_ThemVi`, `sp_LapNganSach` kiểm tra rồi mới ghi, không khóa (ràng buộc UNIQUE vẫn chặn đúng).

## 8. Giao diện

Phong cách sổ tay vẽ tay, hỗ trợ sáng/tối và điện thoại. Chuyển động (`dong.js`, `dong.css`): lật trang khi đổi mục, khối nội dung hiện dần khi cuộn, số tiền đếm lên, bìa sổ có chiều sâu theo chuột, bấm heo để bỏ xu, bìa sổ mở ra khi đăng nhập. Máy bật “giảm chuyển động” thì tắt hết.

Bản thiết kế lại (hai hướng “Sổ cái” và “Tài chính”) nằm ở `design-mau/index.html`, **chờ nhóm quyết định**, chưa áp dụng.

## 9. Lệnh thường dùng

```bash
npm run setup    # cài gói lần đầu
npm start        # chạy website tại http://localhost:5080
npm test         # chạy 60 kiểm thử tự động
```

Xóa cơ sở dữ liệu `QuanLyThuChi` để làm lại dữ liệu từ đầu. Đặt `GEMINI_API_KEY` để quét hóa đơn bằng Gemini thật; nếu không đặt, hệ thống dùng bản giả trả dữ liệu mẫu.
