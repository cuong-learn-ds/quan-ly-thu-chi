# Thiết kế: Hệ thống quản lý thu chi cá nhân và lập kế hoạch tài chính

- **Ngày:** 2026-11-07
- **Loại:** Đồ án nhóm môn Phân tích thiết kế hướng đối tượng (sinh viên năm 3)
- **Trạng thái:** Chờ duyệt

## 1. Mục tiêu và tiêu chí thành công

### 1.1 Bối cảnh (đã xác nhận)
- Đồ án nhóm, phạm vi vừa sức sinh viên năm 3.
- Khi bảo vệ **bắt buộc demo website chạy được trên trình duyệt** các chức năng chính.
- Thời gian còn khoảng **3–4 tuần**; **1–2 người** viết code, có người đã biết làm giao diện web.
- Công nghệ: **ASP.NET Core Web API + SQL Server** cho backend, giao diện **website** cho frontend. Sản phẩm là **website** chạy trên trình duyệt, giao diện co giãn theo kích thước màn hình.
- Code đặt trên repo GitHub mới dưới tài khoản `buraislost`.
- Quét hóa đơn dùng **API AI đọc ảnh (Gemini)**.
- Thiết kế phải bám theo các mô hình đã vẽ trong StarUML (`docs/staruml/QuanLyThuChi.mdj`):
  - 22 sơ đồ use case (1 mức 1, 9 mức 2, 12 mức 3),
  - sơ đồ lớp Hình 4.1 (13 lớp, 4 enum).

### 1.2 Tiêu chí thành công
1. Demo chạy trọn các luồng chính trên máy cá nhân:
   - đăng ký/đăng nhập → thêm giao dịch → số dư ví thay đổi,
   - quét hóa đơn → giao dịch chi,
   - ngân sách cảnh báo vượt,
   - nạp mục tiêu tiết kiệm,
   - tổng kết cuối tháng → báo cáo + thông báo,
   - quản trị khóa tài khoản.
2. Code khớp 1–1 với sơ đồ lớp: mỗi lớp/phương thức trong Hình 4.1 có class/method tương ứng trong `Domain/`.
3. Mỗi use case mức 3 có endpoint và màn hình thực hiện được.
4. Có kiểm thử tự động cho các quy tắc nghiệp vụ và kịch bản kiểm thử thủ công cho báo cáo.

### 1.3 Ngoài phạm vi
Không làm các phần sau:
- đưa lên Internet,
- thông báo đẩy (push/web push) thời gian thực; thông báo chỉ hiện trong trang web,
- nhiều loại tiền tệ (chỉ dùng VND),
- OTP và quên mật khẩu qua email.

## 2. Kiến trúc tổng thể

**Hướng A (đã chọn):** một project Web API chia tầng theo thư mục; nghiệp vụ nằm trong phương thức của lớp thực thể.

```
quan-ly-thu-chi/
├── backend/
│   ├── QuanLyThuChi.Api/
│   │   ├── Domain/          13 lớp + 4 enum + DomainException
│   │   ├── Services/        10 service, mỗi service ứng với một nhóm use case mức 2
│   │   ├── Controllers/     REST API
│   │   ├── Dtos/            dữ liệu vào/ra API
│   │   ├── Data/            AppDbContext, cấu hình bảng, migration, dữ liệu demo
│   │   ├── Infrastructure/  JWT, BCrypt, Gemini (IDichVuOCR), ClosedXML, lưu file
│   │   └── Jobs/            NhacNhoHangNgayJob, TongKetThangJob
│   └── QuanLyThuChi.Tests/  xUnit
├── frontend/                giao diện web (HTML/CSS/JS)
├── docs/                    staruml/, thiet-ke/, demo/ (ảnh bill mẫu)
└── README.md
```

> **Cập nhật 2026-11-09 (bản demo đã cài đặt):** bản chạy được dùng **Node.js (Express) + SQLite (`node:sqlite`) + giao diện website HTML/CSS/JS thuần**; mã nguồn ở `server/`. Mô hình miền, quy tắc R1–R10, route ở mục 6, bộ hẹn giờ, quét hóa đơn và dữ liệu demo giữ nguyên. Bảng công nghệ bên dưới là thiết kế ban đầu.

> **Cập nhật tác nhân (2026-11-09):** Bộ hẹn giờ và dịch vụ OCR là thành phần của hệ thống, không phải tác nhân; tác nhân phải là danh từ (không dùng động từ như "Quản lý"). Hệ thống có 5 tác nhân: Khách, Người dùng, Quản trị viên, Nhân viên hỗ trợ, Kiểm toán viên (4 vai trò đăng nhập kế thừa TaiKhoan). "Quản lý danh mục mặc định" là use case của Quản trị viên. Quyền: Quản trị viên khóa/mở khóa, danh mục mặc định, thống kê, tổng kết thủ công; Nhân viên hỗ trợ xem/tìm người dùng và gửi thông báo hỗ trợ (`POST /admin/nguoi-dung/{id}/thong-bao`); Kiểm toán viên chỉ đọc thống kê và danh sách người dùng.

### 2.1 Công nghệ

| Hạng mục | Lựa chọn | Ghi chú |
|---|---|---|
| Runtime | .NET 10 LTS | Kiểm tra SDK trên máy nhóm trước khi dựng. Nếu không cài được .NET 10 thì hạ xuống bản LTS cao nhất cài được và ghi lại vào README |
| CSDL | SQL Server Express / LocalDB, EF Core code-first + migration | |
| Xác thực | JWT Bearer, mật khẩu băm BCrypt | Tự quản lý `TaiKhoan`, không dùng ASP.NET Identity, để giữ đúng sơ đồ lớp |
| Kế thừa | EF Core TPH: 1 bảng `TaiKhoan`, cột phân loại `LoaiTaiKhoan` | Cột phân loại có 2 giá trị `NguoiDung`, `QuanTriVien` |
| OCR | Gemini qua HTTP, sau interface `IDichVuOCR` | Tên model kiểm tra bản hiện hành lúc triển khai |
| Excel | ClosedXML | |
| API docs | Swagger (OpenAPI) | |
| Frontend | Website: HTML, CSS, JavaScript, gọi API bằng fetch, biểu đồ SVG, tải ảnh bằng thẻ input file | |

### 2.2 Nguyên tắc phân tầng
- **Domain:** chứa dữ liệu và quy tắc nghiệp vụ. Không phụ thuộc EF, HTTP hay dịch vụ ngoài. Vi phạm quy tắc thì ném `DomainException` với thông điệp tiếng Việt.
- **Service:** tải thực thể → gọi phương thức domain → lưu trong một transaction → tạo thông báo nếu cần.
- **Controller:** nhận DTO, gọi service, trả DTO. Không chứa logic.

> **Cập nhật 2026-11-10 (chức năng bổ sung):** thêm ba chức năng: chuyển tiền giữa các ví (lớp `ChuyenTien`, quy tắc R11), giao dịch định kỳ hằng tháng (lớp `GiaoDichDinhKy`, quy tắc R12, do bộ hẹn giờ tạo) và biểu đồ cột thu chi 12 tháng trên trang Tổng quan. Mô hình miền có 17 lớp, `LoaiThongBao` thêm giá trị `DinhKy`. Các mục 3, 4, 5, 6, 7, 9, 11 bên dưới đã ghi thêm phần này.

## 3. Mô hình miền

Mô hình miền theo sơ đồ lớp Hình 4.1, có 1 điều chỉnh. Danh sách lớp:
- **Tài khoản:**
  - `TaiKhoan` (abstract) là lớp cha của `NguoiDung` và `QuanTriVien`.
  - `CaiDatNhacNho` thuộc `NguoiDung` (1–1).
- **Ghi chép:**
  - `Vi` và `GiaoDich` thuộc `NguoiDung`.
  - `DanhMuc` có chủ 0..1: không có chủ nghĩa là danh mục mặc định dùng chung.
  - `HoaDon` gắn với `GiaoDich` (0..1).
  - `ChiTietHoaDon` thuộc `HoaDon` (1..*).
- **Kế hoạch:**
  - `NganSach` thuộc `NguoiDung` và gắn với một `DanhMuc`.
  - `MucTieuTietKiem` thuộc `NguoiDung`, liên kết 0..1 với các `GiaoDich` nạp tiền.
- **Đầu ra:** `ThongBao` và `BaoCaoThang` thuộc `NguoiDung`.
- **Bổ sung (2026-11-10):**
  - `ChuyenTien` thuộc `NguoiDung`, nối hai `Vi` (ví nguồn và ví đích, khác nhau).
  - `GiaoDichDinhKy` thuộc `NguoiDung`, gắn với một `Vi` và một `DanhMuc`; có `ngayTrongThang` (1–28), `dangBat` và `thangDaChay`.
- **Enum:** `LoaiGiaoDich {Thu, Chi}`, `LoaiVi {TienMat, NganHang, ViDienTu}`, `TrangThaiTaiKhoan {HoatDong, BiKhoa}`, `LoaiThongBao {NhacGhiChep, CanhBaoNganSach, NhacMucTieu, TongKetThang, HoTro, DinhKy}`.

**Điều chỉnh mô hình (cập nhật vào file StarUML khi dựng code):**
1. `NganSach` thêm `daCanhBaoNguong: bool` và `daCanhBaoVuot: bool`, phục vụ quy tắc R6.
2. Hình 3.1: use case "Tạo danh mục mặc định" đổi tên thành **"Tạo ví và cài đặt mặc định"**. Lý do: danh mục mặc định dùng chung, không tạo riêng cho từng người.
3. Có một danh mục hệ thống loại Chi tên **"Tiết kiệm"**, có trong dữ liệu khởi tạo, dùng cho giao dịch nạp mục tiêu. Danh mục này không sửa và không xóa được.

Kiểu tiền là `decimal(18,2)`, đơn vị VND.

## 4. Quy tắc nghiệp vụ

| Mã | Quy tắc | Nơi đặt |
|---|---|---|
| R1 | Số tiền giao dịch, hạn mức, mục tiêu và tiền nạp phải > 0 | Domain (constructor/phương thức) |
| R2 | Chi tiền từ ví (giao dịch chi, nạp mục tiêu) không được vượt số dư; nếu vượt thì báo lỗi "Số dư ví không đủ" | `Vi.TruTien` |
| R3 | Sửa giao dịch: hoàn tác ảnh hưởng cũ lên ví cũ rồi áp dụng giá trị mới lên ví mới; đúng cả khi đổi ví hoặc đổi loại. Xóa giao dịch: hoàn tác ảnh hưởng lên ví | `GiaoDichService` + `Vi.CongTien/TruTien` |
| R4 | Tên ví không trùng trong cùng một người dùng; ví còn giao dịch thì không xóa được | `ViService` |
| R5 | Người dùng không sửa/xóa được danh mục mặc định hay danh mục hệ thống. Tên danh mục không trùng (cùng loại) với danh mục của mình và danh mục mặc định. Xóa danh mục đang dùng thì phải chỉ định danh mục khác **cùng loại**; giao dịch và ngân sách được chuyển sang danh mục đó. Nếu danh mục đích đã có ngân sách cùng tháng thì gộp hạn mức | `DanhMucService`, `DanhMuc.DangDuocSuDung` |
| R6 | Mỗi (người dùng, danh mục chi, tháng, năm) chỉ có một ngân sách. Khi số đã chi ≥ ngưỡng (mặc định 80%) thì tạo cảnh báo một lần (`daCanhBaoNguong`); khi > 100% thì cảnh báo một lần (`daCanhBaoVuot`). Sửa hạn mức thì tính lại hai cờ | `NganSach.KiemTraVuot`, `NganSachService` |
| R7 | Nạp mục tiêu: `Vi.TruTien` + `MucTieuTietKiem.NapTien` + tạo `GiaoDich` chi thuộc danh mục "Tiết kiệm", gắn mục tiêu. Khi `soTienHienTai ≥ soTienMucTieu` lần đầu thì tạo thông báo hoàn thành | `MucTieuService` |
| R8 | Tài khoản `BiKhoa` không đăng nhập được, và token cũ bị từ chối ở request kế tiếp. Quản trị viên không tự khóa chính mình | `TaiKhoan.DangNhap`, `QuanTriVien.KhoaTaiKhoan`, middleware |
| R9 | Tổng kết tháng có tính idempotent: mỗi (người dùng, tháng, năm) chỉ có một `BaoCaoThang`; chạy lại thì cập nhật số liệu, không tạo bản trùng, không gửi thông báo trùng | `BaoCaoService`, `BaoCaoThang.LapBaoCao` |
| R10 | Người dùng chỉ truy cập được dữ liệu của chính mình. Truy cập dữ liệu người khác trả 404 | Service (lọc theo `maTaiKhoan` từ token) |
| R11 | Chuyển tiền: ví nguồn và ví đích phải khác nhau, số tiền > 0 (R1), ví nguồn đủ số dư (R2). Trừ nguồn, cộng đích và ghi lịch sử trong một transaction; không tạo giao dịch thu/chi nên không vào báo cáo | `ChuyenTien` (domain) |
| R12 | Giao dịch định kỳ: ngày trong tháng từ 1 đến 28; mỗi lịch tạo đúng một giao dịch mỗi tháng (đánh dấu `thangDaChay`); nếu thiếu số dư thì bỏ qua tháng đó và gửi thông báo `DinhKy`, không báo lặp. Ví còn lịch định kỳ thì không xóa được (R4) | `GiaoDichDinhKy` (domain), bộ hẹn giờ |

Mọi thao tác nhiều bước (ví dụ giao dịch + ví + cảnh báo) chạy trong **một transaction CSDL**.

## 5. Service và ánh xạ use case

| Service | Use case | Phương thức chính |
|---|---|---|
| `TaiKhoanService` | 2.1, 3.1, 3.2 | DangKy (tạo `NguoiDung` + ví "Tiền mặt" + `CaiDatNhacNho` mặc định), DangNhap, DoiMatKhau, CapNhatThongTin |
| `ViService` | 2.2, 3.3 | DanhSach, Them, Sua, Xoa |
| `ChuyenTienService` | 2.10, 3.13 | DanhSach, Them (R11) |
| `DinhKyService` | 2.11, 3.14 | DanhSach, Tao, Sua, BatTat, Xoa, ChayDenHan (do bộ hẹn giờ gọi, R12) |
| `DanhMucService` | 2.3, 3.4 | DanhSach (mặc định + của mình), Them, Sua, Xoa(chuyenSang) |
| `GiaoDichService` | 2.4, 3.5 | Them (kèm hóa đơn nếu có), Sua, Xoa, TimKiem (lọc + phân trang 20/trang) |
| `HoaDonService` | 3.6 | Quet(ảnh) → bản nháp (chưa lưu) |
| `NganSachService` | 2.5, 3.7 | DanhSachTheoThang, Lap, Sua, Xoa, KiemTraSauGiaoDich |
| `MucTieuService` | 2.6, 3.8 | DanhSach, Tao, Sua, Xoa, NapTien |
| `BaoCaoService` | 2.7, 3.9, 3.12 | TongQuanThang, TheoDanhMuc, TheoThoiGian, DanhSachBaoCaoThang, TongKetThang, XuatExcel |
| `ThongBaoService` | 2.9, 3.11 | DanhSach, SoChuaDoc, DanhDauDaDoc, Xoa, Tao, LayCaiDat, LuuCaiDat |
| `QuanTriService` | 2.8, 3.10 | DanhSachNguoiDung(q), Khoa(lyDo), MoKhoa, CRUD danh mục mặc định, ThongKe |

## 6. API

Tiền tố `/api`, JSON, Swagger tại `/swagger`. Mọi route trừ `auth` đều yêu cầu JWT; route `/admin` yêu cầu vai trò `QuanTriVien`.

```
POST   /auth/dang-ky                          {hoTen, email, matKhau}
POST   /auth/dang-nhap                        {email, matKhau} → {token, vaiTro, hoTen}
GET    /tai-khoan/toi            PUT /tai-khoan/toi            PUT /tai-khoan/mat-khau
GET    /vi                       POST /vi       PUT /vi/{id}   DELETE /vi/{id}
GET    /danh-muc?loai            POST /danh-muc PUT /danh-muc/{id}
DELETE /danh-muc/{id}?chuyenSang={id}
GET    /giao-dich?tu&den&loai&viId&danhMucId&q&trang
POST   /giao-dich   (kèm khối hoaDon tùy chọn)   PUT /giao-dich/{id}   DELETE /giao-dich/{id}
GET    /chuyen-tien              POST /chuyen-tien  {maViNguon, maViDich, soTien, ghiChu?}
GET    /giao-dich-dinh-ky        POST /giao-dich-dinh-ky   PUT /giao-dich-dinh-ky/{id}
PUT    /giao-dich-dinh-ky/{id}/bat-tat {dangBat}      DELETE /giao-dich-dinh-ky/{id}
POST   /hoa-don/quet            multipart ảnh → bản nháp {anhUrl, tenCuaHang, ngay, tongTien, matHang[]}
GET    /ngan-sach?thang&nam      POST /ngan-sach  PUT /ngan-sach/{id}  DELETE /ngan-sach/{id}
GET    /muc-tieu                 POST /muc-tieu   PUT /muc-tieu/{id}   DELETE /muc-tieu/{id}
POST   /muc-tieu/{id}/nap-tien   {viId, soTien}
GET    /bao-cao/tong-quan?thang&nam
GET    /bao-cao/theo-danh-muc?tu&den&loai
GET    /bao-cao/theo-thoi-gian?nam
GET    /bao-cao/thang
GET    /bao-cao/excel?tu&den     → file .xlsx
GET    /thong-bao                GET /thong-bao/so-chua-doc
PUT    /thong-bao/{id}/da-doc    DELETE /thong-bao/{id}
GET    /thong-bao/cai-dat        PUT /thong-bao/cai-dat
GET    /admin/nguoi-dung?q       PUT /admin/nguoi-dung/{id}/khoa {lyDo}
PUT    /admin/nguoi-dung/{id}/mo-khoa
GET/POST/PUT/DELETE /admin/danh-muc-mac-dinh[/{id}]
GET    /admin/thong-ke
POST   /admin/chay-tong-ket?thang&nam        (chạy tổng kết thủ công để demo)
```

**Mã lỗi:**

| Mã | Trường hợp | Nội dung trả về |
|---|---|---|
| 400 | Lỗi nghiệp vụ hoặc lỗi kiểm tra dữ liệu | `{message, errors?}` |
| 401 | Chưa đăng nhập, token hết hạn, hoặc tài khoản bị khóa | |
| 403 | Không phải quản trị viên | |
| 404 | Không tồn tại, hoặc là dữ liệu của người khác | |
| 500 | Lỗi không lường trước | Thông báo chung; chi tiết ghi vào log |

## 7. Bộ hẹn giờ (Background jobs)

Bộ hẹn giờ gồm hai `BackgroundService` chạy cùng tiến trình backend.

**`NhacNhoHangNgayJob`** (kiểm tra mỗi phút) xử lý những người dùng có `gioNhac` bằng giờ:phút hiện tại:
- Nếu `nhacHangNgay` bật và hôm nay chưa có giao dịch, tạo thông báo `NhacGhiChep`.
- Nếu `nhacMucTieu` bật và có mục tiêu chậm tiến độ, tạo thông báo `NhacMucTieu`.
  - Chậm tiến độ nghĩa là số đã nạp nhỏ hơn số kỳ vọng tuyến tính theo thời gian, tính từ ngày tạo đến `hanChot`.
- Mỗi loại thông báo gửi tối đa một lần mỗi ngày cho mỗi người.

**`TongKetThangJob`** chạy lúc 23:00 ngày cuối tháng, gọi `BaoCaoService.TongKetThang(thang, nam)` cho mọi người dùng đang hoạt động:
1. Tính tổng thu, tổng chi trong tháng.
2. Đối chiếu ngân sách; danh mục nào vượt thì tăng `soDanhMucVuot` và gửi cảnh báo (nếu chưa gửi).
3. Tạo mới hoặc cập nhật `BaoCaoThang` (R9).
4. Gửi thông báo `TongKetThang`. Nếu tháng sau chưa có ngân sách thì nhắc lập ngân sách tháng mới.

Endpoint `POST /admin/chay-tong-ket` gọi cùng hàm này để demo mà không phải chờ đến cuối tháng.

**Giao dịch định kỳ (bổ sung 2026-11-10):** mỗi phút bộ hẹn giờ gọi `DinhKyService.ChayDenHan()` (và gọi một lần khi khởi động). Với mỗi lịch đang bật, đã tới `ngayTrongThang` và chưa chạy trong tháng này, hệ thống tạo giao dịch ngày `ngayTrongThang` lúc 08:00 qua `GiaoDichService.Them` rồi đặt `thangDaChay`. Nếu lỗi (ví thiếu số dư) thì chỉ đánh dấu đã xử lý tháng đó và gửi một thông báo loại `DinhKy` (R12).

## 8. Quét hóa đơn

1. Frontend gửi ảnh lên `POST /hoa-don/quet`.
   - Chỉ nhận JPG/PNG, tối đa 5 MB.
   - Lưu vào `uploads/hoa-don/{guid}.{ext}`, phục vụ dạng file tĩnh.
2. `GeminiDichVuOCR` gửi ảnh kèm prompt, yêu cầu trả **JSON theo schema**:
   `{tenCuaHang: string?, ngay: date?, tongTien: number?, matHang: [{ten, soLuong, donGia}]}`.
3. Backend kiểm tra JSON trả về, rồi trả bản nháp cho frontend.
   - Nếu `tongTien` rỗng thì lấy tổng các dòng mặt hàng.
4. Người dùng sửa mặt hàng, chọn danh mục chi và ví rồi bấm Lưu. Frontend gọi `POST /giao-dich` kèm khối `hoaDon`.
   - Số tiền giao dịch bằng `tongTien` đã xác nhận.
   - `HoaDon` và các `ChiTietHoaDon` được lưu cùng transaction với giao dịch.
5. Gemini lỗi, hết hạn mức, quá thời gian chờ 30 giây, hoặc trả JSON không hợp lệ: API trả 400 "Không nhận dạng được hóa đơn". Giao diện chuyển sang nhập tay (`«extend»` "Nhập tay khi nhận dạng lỗi"), ảnh vẫn được giữ.
6. API key đặt trong `appsettings.Development.json` (đã liệt kê trong `.gitignore`) hoặc user-secrets, **không commit**.
7. Khi kiểm thử dùng `FakeDichVuOCR`.

## 9. Frontend (website)

```
frontend/lib/
├── core/      api_client (dio + interceptor gắn token, xử lý 401), auth_state, router (go_router),
│              theme (Material 3, nền sáng), format (VND, ngày)
├── features/  tai_khoan, tong_quan, vi, danh_muc, giao_dich, hoa_don, ngan_sach,
│              muc_tieu, bao_cao, thong_bao, quan_tri
│              (mỗi thư mục: models/ repository/ state/ screens/ widgets/)
└── main.dart
```

**Quy ước chung:**
- Quản lý trạng thái: `provider` (`ChangeNotifier`).
- Bố cục responsive: rộng ≥ 900 px dùng menu bên trái, hẹp hơn dùng thanh điều hướng dưới.
- Giao diện tiếng Việt.

**Các màn hình:**
1. **Đăng nhập, Đăng ký.**
2. **Tổng quan:**
   - thu, chi, chênh lệch tháng này;
   - biểu đồ tròn chi theo danh mục;
   - biểu đồ cột thu chi 12 tháng của năm đang chọn;
   - tổng số dư các ví;
   - ngân sách ≥ 80%;
   - 5 giao dịch gần nhất.
3. **Giao dịch:**
   - danh sách nhóm theo ngày;
   - bộ lọc;
   - hộp thoại thêm/sửa;
   - nút Quét hóa đơn.
4. **Xác nhận hóa đơn:** ảnh bill bên cạnh bảng mặt hàng sửa được; chọn danh mục và ví.
5. **Ví:** thẻ ví, nút Chuyển tiền giữa ví (chọn ví nguồn, ví đích, số tiền) và lịch sử chuyển tiền.
   - **Giao dịch định kỳ (menu Định kỳ):** danh sách lịch, bật/tắt, thêm/sửa/xóa; chọn loại, danh mục, ví, số tiền, ngày 1–28.
6. **Danh mục:** 2 tab Thu / Chi; khi xóa thì hỏi danh mục chuyển sang.
7. **Ngân sách:** chọn tháng; thanh tiến độ đổi màu xanh < 80% ≤ vàng ≤ 100% < đỏ.
8. **Mục tiêu tiết kiệm:** thẻ tiến độ, nút nạp tiền, số tiền cần để dành mỗi tháng.
9. **Báo cáo:** 3 tab (theo danh mục, theo thời gian, báo cáo tháng); nút xuất Excel.
10. **Thông báo:** chuông có số chưa đọc, làm mới mỗi 60 giây; danh sách thông báo.
11. **Cài đặt nhắc nhở.**
12. **Tài khoản:** hồ sơ, đổi mật khẩu.
13. **Quản trị:** người dùng (khóa/mở khóa), danh mục mặc định, thống kê, nút chạy tổng kết tháng.

**Phiên đăng nhập:**
- Token lưu trong trình duyệt (localStorage); backend bật CORS cho origin của frontend (`flutter run -d chrome` khi dev).
- Quét hóa đơn trên web: đưa ảnh thẳng lên trang bằng chọn tệp, kéo-thả hoặc dán ảnh (Ctrl+V); xem trước ảnh rồi bấm "Quét hóa đơn". Chỉ nhận JPG/PNG tối đa 5 MB.
- Khi API trả 401 thì xóa token và quay về màn hình đăng nhập.
- Đăng nhập bằng quản trị viên thì vào thẳng màn hình Quản trị.

**Báo lỗi:**
- Lỗi 400 hiện `message` bằng snackbar.
- Lỗi theo từng ô hiện ngay dưới ô nhập.

## 10. Dữ liệu demo (seed)

Dữ liệu demo được nạp tự động khi CSDL còn trống, ở môi trường Development:
- **Tài khoản:**
  - `admin@demo.vn` (quản trị viên);
  - `demo@demo.vn` (người dùng).
  - Mật khẩu ghi trong README, dùng cho demo cục bộ.
- **Danh mục mặc định:**
  - Chi: Ăn uống, Đi lại, Mua sắm, Hóa đơn, Giải trí, Sức khỏe, Giáo dục, Khác.
  - Thu: Lương, Thưởng, Khác.
  - Danh mục hệ thống: Tiết kiệm.
- **Người dùng demo có:**
  - 3 ví;
  - khoảng 90 giao dịch trải đều 3 tháng gần nhất;
  - ngân sách tháng hiện tại: 1 cái ~85% (đã cảnh báo ngưỡng), 1 cái > 100%;
  - 2 mục tiêu tiết kiệm (1 đúng tiến độ, 1 chậm).
- **Ảnh bill mẫu** trong `docs/demo/`.

## 11. Kiểm thử

- **Unit test (xUnit) cho domain**, viết theo TDD:
  - R1, R2;
  - R3 (sửa có đổi ví, đổi loại);
  - R6 (ngưỡng, vượt, mỗi mức báo một lần, sửa hạn mức);
  - R7 (nạp đến khi hoàn thành);
  - R8;
  - R9 (chạy 2 lần không trùng);
  - tính tiến độ mục tiêu.
- **Integration test API** (`WebApplicationFactory`, SQLite in-memory, `FakeDichVuOCR`):
  - đăng ký → đăng nhập → thêm giao dịch → số dư;
  - truy cập dữ liệu người khác → 404;
  - tài khoản bị khóa → 401;
  - quét hóa đơn → lưu;
  - chạy tổng kết.
- **Kiểm thử chức năng bổ sung (`test/tinh-nang-moi.test.js`):**
  - R11: cùng ví, số tiền ≤ 0, thiếu số dư, ví người khác (404); tổng số dư không đổi; không vào báo cáo thu chi; ví còn lịch sử không xóa được;
  - R12: ngày 1–28, đến hạn đúng một lần mỗi tháng, tắt thì không chạy, thiếu số dư thì bỏ qua và báo một lần, sửa/xóa, không đụng lịch của người khác;
  - vai trò khác `NguoiDung` nhận 403 ở hai nhóm route mới.
- **Kịch bản kiểm thử thủ công:**
  - Mỗi use case mức 3 có một bảng gồm bước, dữ liệu, kết quả mong đợi và kết quả thực tế.
  - Dùng làm chương Kiểm thử của báo cáo.
- **Frontend:** test cho các hàm định dạng tiền/ngày. Còn lại kiểm thử thủ công theo kịch bản.

## 12. Tiến độ (khoảng 3,5 tuần)

| Tuần | Backend (người A) | Giao diện web (người B) |
|---|---|---|
| 1 | Repo, khung project, CSDL + migration, xác thực, ví, danh mục, giao dịch | Khung trang web, router, đăng nhập/đăng ký, bố cục, ví, danh mục, giao dịch |
| 2 | Ngân sách, mục tiêu, thông báo, Bộ hẹn giờ | Ngân sách, mục tiêu, thông báo, cài đặt nhắc nhở, Tổng quan |
| 3 | Quét hóa đơn (Gemini), báo cáo + Excel, quản trị | Quét hóa đơn, báo cáo, quản trị |
| 4 (nửa đầu) | Seed, sửa lỗi, README, cập nhật StarUML | Kiểm thử theo kịch bản, chụp hình báo cáo, tập demo |

**Mốc kiểm tra cuối tuần 1:** đăng nhập → thêm giao dịch → số dư ví đổi theo, chạy được trên trình duyệt.

## 13. Rủi ro

| Rủi ro | Cách giảm |
|---|---|
| Mất mạng hoặc Gemini hết lượt lúc bảo vệ | Quay video demo quét bill trước; vẫn còn đường nhập tay; `FakeDichVuOCR` bật được bằng cấu hình |
| Máy nhóm chưa có .NET 10 / SQL Server | README hướng dẫn cài; kiểm tra SDK ngay ngày đầu |
| Chậm tiến độ | Làm theo thứ tự ưu tiên ở mục 12; nếu trễ thì cắt theo thứ tự: xuất Excel → biểu đồ theo thời gian → nhắc mục tiêu |
| Code lệch sơ đồ | Tên lớp/phương thức giữ đúng như Hình 4.1; mỗi khi đổi model phải cập nhật file `.mdj` cùng lúc |
