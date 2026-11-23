/* ==========================================================================
   CODE CHO CÁC CHỨC NĂNG (STORED PROCEDURE, FUNCTION, VIEW)
   Hệ thống: Quản lý thu chi cá nhân và lập kế hoạch tài chính — SQL Server
   Chạy sau 01_tao_csdl.sql và 02_nhap_lieu.sql.
   Quy ước:
   - Mỗi chức năng ghi nhiều bảng chạy trong MỘT transaction: lỗi ở bất kỳ bước nào thì ROLLBACK, dữ liệu không đổi.
   - Mẫu chung: BEGIN TRY / BEGIN TRANSACTION / COMMIT / END TRY, BEGIN CATCH ROLLBACK + THROW lại (không để transaction treo).
   - Lỗi nghiệp vụ báo bằng THROW 5xxxx với thông điệp tiếng Việt (mã 50001–50099).
   - Mọi thủ tục nhận @maTaiKhoan và chỉ đụng dữ liệu của chính người dùng đó (R10).
   Danh sách quy tắc: R1 số tiền > 0 · R2 không chi quá số dư · R3 sửa/xóa giao dịch hoàn tác số dư · R4 ví không trùng tên,
   ví còn dữ liệu không xóa · R5 danh mục mặc định không sửa/xóa · R6 một ngân sách/danh mục/tháng, cảnh báo ngưỡng và vượt
   mỗi mức một lần · R7 nạp mục tiêu · R8 khóa tài khoản · R9 tổng kết tháng không trùng · R10 chỉ dữ liệu của mình ·
   R11 chuyển tiền · R12 giao dịch định kỳ · R13 kế hoạch tháng.
   ========================================================================== */
USE QuanLyThuChi;
GO

/* ===================== 1. HÀM VÀ VIEW DÙNG CHUNG ===================== */

-- Số tiền đã chi của một danh mục trong một tháng (dùng cho ngân sách, kế hoạch)
CREATE OR ALTER FUNCTION dbo.fn_SoDaChi (@maTaiKhoan INT, @maDanhMuc INT, @thang INT, @nam INT)
RETURNS DECIMAL(18,0)
AS
BEGIN
    RETURN (SELECT COALESCE(SUM(soTien), 0) FROM dbo.GiaoDich
            WHERE maTaiKhoan = @maTaiKhoan AND maDanhMuc = @maDanhMuc AND loai = N'Chi'
              AND YEAR(ngayGiaoDich) = @nam AND MONTH(ngayGiaoDich) = @thang);
END;
GO

-- Tổng số dư các ví của từng người dùng
CREATE OR ALTER VIEW dbo.vw_SoDuNguoiDung AS
SELECT t.maTaiKhoan, t.hoTen, t.email, t.trangThai, COUNT(v.maVi) AS soVi, COALESCE(SUM(v.soDu), 0) AS tongSoDu
FROM dbo.TaiKhoan t LEFT JOIN dbo.Vi v ON v.maTaiKhoan = t.maTaiKhoan
WHERE t.loaiTaiKhoan = N'NguoiDung'
GROUP BY t.maTaiKhoan, t.hoTen, t.email, t.trangThai;
GO

-- Tiến độ ngân sách: hạn mức, đã chi, phần trăm, trạng thái
CREATE OR ALTER VIEW dbo.vw_TienDoNganSach AS
SELECT n.maNganSach, n.maTaiKhoan, n.thang, n.nam, d.tenDanhMuc, n.hanMuc,
       dbo.fn_SoDaChi(n.maTaiKhoan, n.maDanhMuc, n.thang, n.nam) AS soDaChi,
       CAST(dbo.fn_SoDaChi(n.maTaiKhoan, n.maDanhMuc, n.thang, n.nam) * 100.0 / n.hanMuc AS DECIMAL(6,1)) AS tienDo,
       CASE WHEN dbo.fn_SoDaChi(n.maTaiKhoan, n.maDanhMuc, n.thang, n.nam) > n.hanMuc THEN N'Vượt'
            WHEN dbo.fn_SoDaChi(n.maTaiKhoan, n.maDanhMuc, n.thang, n.nam) * 100 >= n.hanMuc * n.nguongCanhBao THEN N'Đạt ngưỡng'
            ELSE N'Bình thường' END AS trangThai
FROM dbo.NganSach n JOIN dbo.DanhMuc d ON d.maDanhMuc = n.maDanhMuc;
GO

-- Tiến độ mục tiêu tiết kiệm và số tiền cần để dành mỗi tháng
CREATE OR ALTER VIEW dbo.vw_TienDoMucTieu AS
SELECT m.maMucTieu, m.maTaiKhoan, m.tenMucTieu, m.soTienMucTieu, m.soTienHienTai, m.hanChot,
       CAST(m.soTienHienTai * 100.0 / m.soTienMucTieu AS DECIMAL(6,1)) AS tienDo,
       CASE WHEN m.soTienHienTai >= m.soTienMucTieu THEN 0
            ELSE CEILING((m.soTienMucTieu - m.soTienHienTai) /
                 NULLIF(CASE WHEN DATEDIFF(MONTH, CAST(SYSDATETIME() AS DATE), m.hanChot) < 1 THEN 1
                             ELSE DATEDIFF(MONTH, CAST(SYSDATETIME() AS DATE), m.hanChot) END, 0) / 1000.0) * 1000 END AS canMoiThang -- làm tròn lên 1.000đ
FROM dbo.MucTieuTietKiem m;
GO

/* ===================== 2. TÀI KHOẢN ===================== */

-- UC Đăng ký: tạo tài khoản người dùng + cài đặt nhắc nhở mặc định + ví "Tiền mặt" (một transaction)
-- (Mật khẩu được băm BCrypt ở tầng ứng dụng; CSDL chỉ lưu chuỗi băm.)
CREATE OR ALTER PROCEDURE dbo.sp_DangKy
    @hoTen NVARCHAR(100), @email NVARCHAR(150), @matKhauHash NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    IF LTRIM(RTRIM(ISNULL(@hoTen, N''))) = N'' THROW 50001, N'Họ tên không được để trống', 1;
    IF @email NOT LIKE N'%_@_%._%' THROW 50002, N'Email không hợp lệ', 1;
    SET @email = LOWER(LTRIM(RTRIM(@email)));
    IF EXISTS (SELECT 1 FROM dbo.TaiKhoan WHERE email = @email) THROW 50003, N'Email đã được sử dụng', 1;
    BEGIN TRY
    BEGIN TRANSACTION;
        INSERT INTO dbo.TaiKhoan (loaiTaiKhoan, hoTen, email, matKhauHash, trangThai, ngayTao, donViTienTe)
        VALUES (N'NguoiDung', LTRIM(RTRIM(@hoTen)), @email, @matKhauHash, N'HoatDong', SYSDATETIME(), N'VND');
        DECLARE @ma INT = SCOPE_IDENTITY();
        INSERT INTO dbo.CaiDatNhacNho (maTaiKhoan) VALUES (@ma);
        INSERT INTO dbo.Vi (maTaiKhoan, tenVi, loaiVi, soDu, ngayTao) VALUES (@ma, N'Tiền mặt', N'TienMat', 0, SYSDATETIME());
    COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH;
    SELECT @ma AS maTaiKhoan;
END;
GO

-- UC Đăng nhập: trả thông tin tài khoản để tầng ứng dụng so khớp mật khẩu băm (R8: tài khoản bị khóa thì từ chối)
CREATE OR ALTER PROCEDURE dbo.sp_DangNhap @email NVARCHAR(150)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @trangThai NVARCHAR(10) = (SELECT trangThai FROM dbo.TaiKhoan WHERE email = LOWER(LTRIM(RTRIM(@email))));
    IF @trangThai IS NULL THROW 50004, N'Email hoặc mật khẩu không đúng', 1;
    IF @trangThai = N'BiKhoa' THROW 50005, N'Tài khoản đã bị khóa', 1;
    SELECT maTaiKhoan, loaiTaiKhoan, hoTen, email, matKhauHash FROM dbo.TaiKhoan WHERE email = LOWER(LTRIM(RTRIM(@email)));
END;
GO

/* ===================== 3. VÍ VÀ CHUYỂN TIỀN ===================== */

-- UC Thêm ví (R4: tên ví không trùng trong cùng người dùng)
CREATE OR ALTER PROCEDURE dbo.sp_ThemVi
    @maTaiKhoan INT, @tenVi NVARCHAR(100), @loaiVi NVARCHAR(10), @soDuBanDau DECIMAL(18,0) = 0
AS
BEGIN
    SET NOCOUNT ON;
    IF LTRIM(RTRIM(ISNULL(@tenVi, N''))) = N'' THROW 50010, N'Tên ví không được để trống', 1;
    IF @loaiVi NOT IN (N'TienMat', N'NganHang', N'ViDienTu') THROW 50011, N'Loại ví không hợp lệ', 1;
    IF @soDuBanDau < 0 THROW 50012, N'Số dư ban đầu không hợp lệ', 1;
    IF EXISTS (SELECT 1 FROM dbo.Vi WHERE maTaiKhoan = @maTaiKhoan AND tenVi = LTRIM(RTRIM(@tenVi))) THROW 50013, N'Tên ví đã tồn tại', 1;
    INSERT INTO dbo.Vi (maTaiKhoan, tenVi, loaiVi, soDu, ngayTao) VALUES (@maTaiKhoan, LTRIM(RTRIM(@tenVi)), @loaiVi, @soDuBanDau, SYSDATETIME());
    SELECT * FROM dbo.Vi WHERE maVi = SCOPE_IDENTITY();
END;
GO

-- UC Xóa ví (R4: ví còn giao dịch, lịch sử chuyển tiền hoặc lịch định kỳ thì không xóa được; R10)
CREATE OR ALTER PROCEDURE dbo.sp_XoaVi @maTaiKhoan INT, @maVi INT
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM dbo.Vi WHERE maVi = @maVi AND maTaiKhoan = @maTaiKhoan) THROW 50014, N'Không tìm thấy ví', 1;
    IF EXISTS (SELECT 1 FROM dbo.GiaoDich WHERE maVi = @maVi) OR EXISTS (SELECT 1 FROM dbo.ChuyenTien WHERE @maVi IN (maViNguon, maViDich))
       OR EXISTS (SELECT 1 FROM dbo.GiaoDichDinhKy WHERE maVi = @maVi)
        THROW 50015, N'Ví còn giao dịch hoặc lịch định kỳ, không thể xóa', 1;
    DELETE FROM dbo.Vi WHERE maVi = @maVi;
END;
GO

-- UC Chuyển tiền giữa các ví (R11 + R1 + R2): trừ ví nguồn, cộng ví đích, ghi lịch sử trong một transaction
CREATE OR ALTER PROCEDURE dbo.sp_ChuyenTien
    @maTaiKhoan INT, @maViNguon INT, @maViDich INT, @soTien DECIMAL(18,0), @ghiChu NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    IF @soTien IS NULL OR @soTien <= 0 THROW 50020, N'Số tiền phải lớn hơn 0', 1;
    IF @maViNguon = @maViDich THROW 50021, N'Ví nguồn và ví đích phải khác nhau', 1;
    BEGIN TRY
    BEGIN TRANSACTION;
        DECLARE @soDuNguon DECIMAL(18,0) = (SELECT soDu FROM dbo.Vi WITH (UPDLOCK) WHERE maVi = @maViNguon AND maTaiKhoan = @maTaiKhoan);
        IF @soDuNguon IS NULL OR NOT EXISTS (SELECT 1 FROM dbo.Vi WHERE maVi = @maViDich AND maTaiKhoan = @maTaiKhoan)
            THROW 50014, N'Không tìm thấy ví', 1;
        IF @soDuNguon < @soTien THROW 50022, N'Số dư ví không đủ', 1;
        UPDATE dbo.Vi SET soDu = soDu - @soTien WHERE maVi = @maViNguon;
        UPDATE dbo.Vi SET soDu = soDu + @soTien WHERE maVi = @maViDich;
        INSERT INTO dbo.ChuyenTien (maTaiKhoan, maViNguon, maViDich, soTien, ngayChuyen, ghiChu)
        VALUES (@maTaiKhoan, @maViNguon, @maViDich, @soTien, SYSDATETIME(), @ghiChu);
    COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH;
    SELECT maVi, tenVi, soDu FROM dbo.Vi WHERE maVi IN (@maViNguon, @maViDich);
END;
GO

/* ===================== 4. DANH MỤC ===================== */

-- UC Xóa danh mục (R5): không xóa danh mục mặc định/hệ thống; đang dùng thì chuyển giao dịch, gộp ngân sách sang danh mục cùng loại
CREATE OR ALTER PROCEDURE dbo.sp_XoaDanhMuc @maTaiKhoan INT, @maDanhMuc INT, @chuyenSang INT = NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    DECLARE @loai NVARCHAR(3), @macDinh BIT, @heThong BIT;
    SELECT @loai = loai, @macDinh = laMacDinh, @heThong = laHeThong FROM dbo.DanhMuc WHERE maDanhMuc = @maDanhMuc AND maTaiKhoan = @maTaiKhoan;
    IF @loai IS NULL AND EXISTS (SELECT 1 FROM dbo.DanhMuc WHERE maDanhMuc = @maDanhMuc AND maTaiKhoan IS NULL)
        THROW 50030, N'Không thể xóa danh mục mặc định', 1;
    IF @loai IS NULL THROW 50031, N'Không tìm thấy danh mục', 1;
    DECLARE @dangDung BIT = CASE WHEN EXISTS (SELECT 1 FROM dbo.GiaoDich WHERE maDanhMuc = @maDanhMuc)
                                  OR EXISTS (SELECT 1 FROM dbo.NganSach WHERE maDanhMuc = @maDanhMuc) THEN 1 ELSE 0 END;
    BEGIN TRY
    BEGIN TRANSACTION;
        IF @dangDung = 1
        BEGIN
            IF @chuyenSang IS NULL THROW 50032, N'Danh mục đang được sử dụng, vui lòng chọn danh mục để chuyển sang', 1;
            IF NOT EXISTS (SELECT 1 FROM dbo.DanhMuc WHERE maDanhMuc = @chuyenSang AND loai = @loai AND maDanhMuc <> @maDanhMuc
                           AND (maTaiKhoan IS NULL OR maTaiKhoan = @maTaiKhoan))
                THROW 50033, N'Danh mục chuyển sang phải cùng loại', 1;
            UPDATE dbo.GiaoDich SET maDanhMuc = @chuyenSang WHERE maDanhMuc = @maDanhMuc;
            -- Ngân sách trùng tháng thì cộng hạn mức vào ngân sách của danh mục đích rồi xóa
            UPDATE dich SET dich.hanMuc = dich.hanMuc + nguon.hanMuc
            FROM dbo.NganSach dich JOIN dbo.NganSach nguon ON nguon.maTaiKhoan = dich.maTaiKhoan AND nguon.thang = dich.thang AND nguon.nam = dich.nam
            WHERE nguon.maDanhMuc = @maDanhMuc AND dich.maDanhMuc = @chuyenSang;
            DELETE nguon FROM dbo.NganSach nguon
            WHERE nguon.maDanhMuc = @maDanhMuc AND EXISTS (SELECT 1 FROM dbo.NganSach d WHERE d.maTaiKhoan = nguon.maTaiKhoan
                  AND d.thang = nguon.thang AND d.nam = nguon.nam AND d.maDanhMuc = @chuyenSang);
            UPDATE dbo.NganSach SET maDanhMuc = @chuyenSang WHERE maDanhMuc = @maDanhMuc;
        END;
        DELETE FROM dbo.DanhMuc WHERE maDanhMuc = @maDanhMuc;
    COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH;
END;
GO

/* ===================== 5. GIAO DỊCH VÀ NGÂN SÁCH ===================== */

-- Kiểm tra ngân sách sau mỗi khoản chi (R6): đạt ngưỡng hoặc vượt thì tạo thông báo, mỗi mức chỉ một lần.
-- Gọi bên trong transaction của thủ tục ghi giao dịch.
CREATE OR ALTER PROCEDURE dbo.sp_KiemTraNganSach @maTaiKhoan INT, @maDanhMuc INT, @thang INT, @nam INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @maNS INT, @hanMuc DECIMAL(18,0), @nguong INT, @daNguong BIT, @daVuot BIT;
    SELECT @maNS = maNganSach, @hanMuc = hanMuc, @nguong = nguongCanhBao, @daNguong = daCanhBaoNguong, @daVuot = daCanhBaoVuot
    FROM dbo.NganSach WHERE maTaiKhoan = @maTaiKhoan AND maDanhMuc = @maDanhMuc AND thang = @thang AND nam = @nam;
    IF @maNS IS NULL RETURN;
    DECLARE @chi DECIMAL(18,0) = dbo.fn_SoDaChi(@maTaiKhoan, @maDanhMuc, @thang, @nam);
    DECLARE @tienDo DECIMAL(9,1) = @chi * 100.0 / @hanMuc;
    DECLARE @ten NVARCHAR(100) = (SELECT tenDanhMuc FROM dbo.DanhMuc WHERE maDanhMuc = @maDanhMuc);
    DECLARE @bat BIT = COALESCE((SELECT nhacNganSach FROM dbo.CaiDatNhacNho WHERE maTaiKhoan = @maTaiKhoan), 1);
    DECLARE @ky NVARCHAR(7) = RIGHT(N'0' + CAST(@thang AS NVARCHAR(2)), 2) + N'/' + CAST(@nam AS NVARCHAR(4));
    IF @tienDo > 100 AND @daVuot = 0
    BEGIN
        UPDATE dbo.NganSach SET daCanhBaoVuot = 1, daCanhBaoNguong = 1 WHERE maNganSach = @maNS;
        IF @bat = 1 INSERT INTO dbo.ThongBao (maTaiKhoan, loai, noiDung, daDoc, ngayTao)
            VALUES (@maTaiKhoan, N'CanhBaoNganSach', N'Ngân sách ' + @ten + N' tháng ' + @ky + N' đã vượt hạn mức', 0, SYSDATETIME());
    END
    ELSE IF @tienDo >= @nguong AND @tienDo <= 100 AND @daNguong = 0
    BEGIN
        UPDATE dbo.NganSach SET daCanhBaoNguong = 1 WHERE maNganSach = @maNS;
        IF @bat = 1 INSERT INTO dbo.ThongBao (maTaiKhoan, loai, noiDung, daDoc, ngayTao)
            VALUES (@maTaiKhoan, N'CanhBaoNganSach', N'Ngân sách ' + @ten + N' tháng ' + @ky + N' đã dùng ' + CAST(CAST(@tienDo AS INT) AS NVARCHAR(5)) + N'%', 0, SYSDATETIME());
    END;
END;
GO

-- UC Thêm giao dịch (R1, R2, R10, R6): cập nhật số dư ví, lưu giao dịch, kiểm tra ngân sách — một transaction
CREATE OR ALTER PROCEDURE dbo.sp_ThemGiaoDich
    @maTaiKhoan INT, @maVi INT, @maDanhMuc INT, @soTien DECIMAL(18,0), @loai NVARCHAR(3),
    @ngayGiaoDich DATETIME2(0) = NULL, @ghiChu NVARCHAR(200) = NULL, @maGiaoDich INT = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    SET @ngayGiaoDich = COALESCE(@ngayGiaoDich, SYSDATETIME());
    IF @soTien IS NULL OR @soTien <= 0 THROW 50040, N'Số tiền phải lớn hơn 0', 1;                         -- R1
    IF NOT EXISTS (SELECT 1 FROM dbo.DanhMuc WHERE maDanhMuc = @maDanhMuc AND (maTaiKhoan IS NULL OR maTaiKhoan = @maTaiKhoan))
        THROW 50041, N'Không tìm thấy danh mục', 1;                                                          -- R10
    IF (SELECT loai FROM dbo.DanhMuc WHERE maDanhMuc = @maDanhMuc) <> @loai THROW 50042, N'Danh mục không đúng loại giao dịch', 1;
    BEGIN TRY
    BEGIN TRANSACTION;
        DECLARE @soDu DECIMAL(18,0) = (SELECT soDu FROM dbo.Vi WITH (UPDLOCK) WHERE maVi = @maVi AND maTaiKhoan = @maTaiKhoan);
        IF @soDu IS NULL THROW 50014, N'Không tìm thấy ví', 1;                                              -- R10
        IF @loai = N'Chi' AND @soDu < @soTien THROW 50022, N'Số dư ví không đủ', 1;                          -- R2
        UPDATE dbo.Vi SET soDu = soDu + CASE WHEN @loai = N'Thu' THEN @soTien ELSE -@soTien END WHERE maVi = @maVi;
        INSERT INTO dbo.GiaoDich (maTaiKhoan, maVi, maDanhMuc, maMucTieu, soTien, loai, ngayGiaoDich, ghiChu)
        VALUES (@maTaiKhoan, @maVi, @maDanhMuc, NULL, @soTien, @loai, @ngayGiaoDich, @ghiChu);
        SET @maGiaoDich = SCOPE_IDENTITY();
        IF @loai = N'Chi'
        BEGIN
            DECLARE @t INT = MONTH(@ngayGiaoDich), @n INT = YEAR(@ngayGiaoDich);
            EXEC dbo.sp_KiemTraNganSach @maTaiKhoan, @maDanhMuc, @t, @n;                                   -- R6
        END;
    COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH;
    SELECT g.*, v.soDu AS soDuViSauGiaoDich FROM dbo.GiaoDich g JOIN dbo.Vi v ON v.maVi = g.maVi WHERE g.maGiaoDich = @maGiaoDich;
END;
GO

-- UC Xóa giao dịch (R3): hoàn tác ảnh hưởng lên ví (xóa khoản thu đã tiêu hết thì báo lỗi), giao dịch nạp mục tiêu không xóa trực tiếp
CREATE OR ALTER PROCEDURE dbo.sp_XoaGiaoDich @maTaiKhoan INT, @maGiaoDich INT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    DECLARE @maVi INT, @soTien DECIMAL(18,0), @loai NVARCHAR(3), @maDm INT, @ngay DATETIME2(0), @maMt INT;
    SELECT @maVi = maVi, @soTien = soTien, @loai = loai, @maDm = maDanhMuc, @ngay = ngayGiaoDich, @maMt = maMucTieu
    FROM dbo.GiaoDich WHERE maGiaoDich = @maGiaoDich AND maTaiKhoan = @maTaiKhoan;
    IF @maVi IS NULL THROW 50043, N'Không tìm thấy giao dịch', 1;
    IF @maMt IS NOT NULL THROW 50044, N'Giao dịch nạp mục tiêu không xóa trực tiếp được', 1;
    BEGIN TRY
    BEGIN TRANSACTION;
        IF @loai = N'Thu' AND (SELECT soDu FROM dbo.Vi WITH (UPDLOCK) WHERE maVi = @maVi) < @soTien THROW 50022, N'Số dư ví không đủ', 1;
        UPDATE dbo.Vi SET soDu = soDu + CASE WHEN @loai = N'Thu' THEN -@soTien ELSE @soTien END WHERE maVi = @maVi;
        DELETE FROM dbo.GiaoDich WHERE maGiaoDich = @maGiaoDich;   -- hóa đơn và chi tiết xóa theo (ON DELETE CASCADE)
    COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH;
END;
GO

-- UC Lập ngân sách (R6): chỉ danh mục chi, mỗi (danh mục, tháng) một ngân sách; tính sẵn hai cờ cảnh báo
CREATE OR ALTER PROCEDURE dbo.sp_LapNganSach
    @maTaiKhoan INT, @maDanhMuc INT, @hanMuc DECIMAL(18,0), @thang INT, @nam INT, @nguongCanhBao INT = 80
AS
BEGIN
    SET NOCOUNT ON;
    IF @thang NOT BETWEEN 1 AND 12 THROW 50050, N'Tháng hoặc năm không hợp lệ', 1;
    IF @hanMuc IS NULL OR @hanMuc <= 0 THROW 50051, N'Hạn mức phải lớn hơn 0', 1;
    IF (SELECT loai FROM dbo.DanhMuc WHERE maDanhMuc = @maDanhMuc AND (maTaiKhoan IS NULL OR maTaiKhoan = @maTaiKhoan)) IS NULL THROW 50041, N'Không tìm thấy danh mục', 1;
    IF (SELECT loai FROM dbo.DanhMuc WHERE maDanhMuc = @maDanhMuc) <> N'Chi' THROW 50052, N'Chỉ lập ngân sách cho danh mục chi', 1;
    IF EXISTS (SELECT 1 FROM dbo.NganSach WHERE maTaiKhoan = @maTaiKhoan AND maDanhMuc = @maDanhMuc AND thang = @thang AND nam = @nam)
        THROW 50053, N'Danh mục này đã có ngân sách trong tháng', 1;
    DECLARE @chi DECIMAL(18,0) = dbo.fn_SoDaChi(@maTaiKhoan, @maDanhMuc, @thang, @nam);
    INSERT INTO dbo.NganSach (maTaiKhoan, maDanhMuc, hanMuc, thang, nam, nguongCanhBao, daCanhBaoNguong, daCanhBaoVuot)
    VALUES (@maTaiKhoan, @maDanhMuc, @hanMuc, @thang, @nam, @nguongCanhBao,
            CASE WHEN @chi * 100 >= @hanMuc * @nguongCanhBao THEN 1 ELSE 0 END, CASE WHEN @chi > @hanMuc THEN 1 ELSE 0 END);
    SELECT * FROM dbo.vw_TienDoNganSach WHERE maNganSach = SCOPE_IDENTITY();
END;
GO

/* ===================== 6. MỤC TIÊU TIẾT KIỆM ===================== */

-- UC Nạp tiền vào mục tiêu (R7): trừ ví, cộng mục tiêu, tạo giao dịch chi "Tiết kiệm"; đủ mục tiêu lần đầu thì chúc mừng
CREATE OR ALTER PROCEDURE dbo.sp_NapTienMucTieu @maTaiKhoan INT, @maMucTieu INT, @maVi INT, @soTien DECIMAL(18,0)
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    IF @soTien IS NULL OR @soTien <= 0 THROW 50060, N'Số tiền phải lớn hơn 0', 1;
    BEGIN TRY
    BEGIN TRANSACTION;
        DECLARE @mucTieu DECIMAL(18,0), @hienTai DECIMAL(18,0), @ten NVARCHAR(100);
        SELECT @mucTieu = soTienMucTieu, @hienTai = soTienHienTai, @ten = tenMucTieu
        FROM dbo.MucTieuTietKiem WITH (UPDLOCK) WHERE maMucTieu = @maMucTieu AND maTaiKhoan = @maTaiKhoan;
        IF @mucTieu IS NULL THROW 50061, N'Không tìm thấy mục tiêu', 1;
        DECLARE @soDu DECIMAL(18,0) = (SELECT soDu FROM dbo.Vi WITH (UPDLOCK) WHERE maVi = @maVi AND maTaiKhoan = @maTaiKhoan);
        IF @soDu IS NULL THROW 50014, N'Không tìm thấy ví', 1;
        IF @soDu < @soTien THROW 50022, N'Số dư ví không đủ', 1;
        UPDATE dbo.Vi SET soDu = soDu - @soTien WHERE maVi = @maVi;
        UPDATE dbo.MucTieuTietKiem SET soTienHienTai = soTienHienTai + @soTien WHERE maMucTieu = @maMucTieu;
        INSERT INTO dbo.GiaoDich (maTaiKhoan, maVi, maDanhMuc, maMucTieu, soTien, loai, ngayGiaoDich, ghiChu)
        SELECT @maTaiKhoan, @maVi, maDanhMuc, @maMucTieu, @soTien, N'Chi', SYSDATETIME(), N'Nạp mục tiêu: ' + @ten
        FROM dbo.DanhMuc WHERE laHeThong = 1;
        IF @hienTai < @mucTieu AND @hienTai + @soTien >= @mucTieu
            INSERT INTO dbo.ThongBao (maTaiKhoan, loai, noiDung, daDoc, ngayTao)
            VALUES (@maTaiKhoan, N'NhacMucTieu', N'Chúc mừng! Bạn đã hoàn thành mục tiêu ' + @ten, 0, SYSDATETIME());
    COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH;
    SELECT * FROM dbo.vw_TienDoMucTieu WHERE maMucTieu = @maMucTieu;
END;
GO

/* ===================== 7. GIAO DỊCH ĐỊNH KỲ (R12) ===================== */

-- Do bộ hẹn giờ gọi: mỗi lịch đang bật, đến ngày và tháng này chưa chạy thì tạo đúng một giao dịch;
-- thiếu số dư thì bỏ qua tháng đó và gửi một thông báo (vẫn đánh dấu tháng đã xử lý để không báo lặp).
CREATE OR ALTER PROCEDURE dbo.sp_ChayGiaoDichDinhKy @homNay DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET @homNay = COALESCE(@homNay, CAST(SYSDATETIME() AS DATE));
    DECLARE @ky CHAR(7) = CONVERT(CHAR(7), @homNay, 126), @soTao INT = 0;
    DECLARE @ma INT, @tk INT, @vi INT, @dm INT, @tien DECIMAL(18,0), @loai NVARCHAR(3), @ngay TINYINT, @ghi NVARCHAR(200);
    DECLARE cur CURSOR LOCAL FAST_FORWARD FOR
        SELECT maDinhKy, maTaiKhoan, maVi, maDanhMuc, soTien, loai, ngayTrongThang, ghiChu FROM dbo.GiaoDichDinhKy
        WHERE dangBat = 1 AND ngayTrongThang <= DAY(@homNay) AND (thangDaChay IS NULL OR thangDaChay < @ky);
    OPEN cur; FETCH NEXT FROM cur INTO @ma, @tk, @vi, @dm, @tien, @loai, @ngay, @ghi;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        DECLARE @luc DATETIME2(0) = DATEADD(HOUR, 8, CAST(DATEFROMPARTS(YEAR(@homNay), MONTH(@homNay), @ngay) AS DATETIME2(0)));
        DECLARE @ghiChu NVARCHAR(200) = LTRIM(N'[Định kỳ] ' + ISNULL(@ghi, N''));
        BEGIN TRY
            EXEC dbo.sp_ThemGiaoDich @tk, @vi, @dm, @tien, @loai, @luc, @ghiChu;
            UPDATE dbo.GiaoDichDinhKy SET thangDaChay = @ky WHERE maDinhKy = @ma;
            SET @soTao += 1;
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0 ROLLBACK;
            UPDATE dbo.GiaoDichDinhKy SET thangDaChay = @ky WHERE maDinhKy = @ma;
            INSERT INTO dbo.ThongBao (maTaiKhoan, loai, noiDung, daDoc, ngayTao)
            VALUES (@tk, N'DinhKy', N'Không tạo được giao dịch định kỳ tháng ' + @ky + N': ' + ERROR_MESSAGE(), 0, SYSDATETIME());
        END CATCH;
        FETCH NEXT FROM cur INTO @ma, @tk, @vi, @dm, @tien, @loai, @ngay, @ghi;
    END;
    CLOSE cur; DEALLOCATE cur;
    SELECT @soTao AS soGiaoDichDaTao;
END;
GO

/* ===================== 8. LẬP KẾ HOẠCH TÀI CHÍNH THÁNG (R13) ===================== */

-- Bước 1–2: gợi ý phân bổ tự động. Người dùng chỉ cần xác nhận thu nhập (mặc định lấy từ thu định kỳ hoặc trung bình 3 tháng).
-- @phuongPhap = 'LichSu': hạn mức = chi trung bình 3 tháng trước (làm tròn lên 50.000đ, không thấp hơn khoản chi định kỳ);
--               để dành = nhu cầu các mục tiêu (hoặc 10% thu nhập).
-- @phuongPhap = '50-30-20': 50% thu nhập cho nhóm thiết yếu, 30% nhóm mong muốn (chia theo tỷ trọng chi trước đây), 20% để dành.
CREATE OR ALTER PROCEDURE dbo.sp_GoiYKeHoachThang
    @maTaiKhoan INT, @thang INT, @nam INT, @phuongPhap NVARCHAR(10) = N'LichSu', @thuNhap DECIMAL(18,0) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @thang NOT BETWEEN 1 AND 12 THROW 50070, N'Tháng hoặc năm không hợp lệ', 1;
    IF @phuongPhap NOT IN (N'LichSu', N'50-30-20') THROW 50071, N'Phương pháp lập kế hoạch không hợp lệ', 1;
    DECLARE @dau DATE = DATEFROMPARTS(@nam, @thang, 1);
    DECLARE @tu DATE = DATEADD(MONTH, -3, @dau);
    -- Thu nhập dự kiến: người dùng nhập > thu định kỳ đang bật > trung bình 3 tháng (làm tròn 100.000đ)
    IF @thuNhap IS NULL OR @thuNhap <= 0
        SET @thuNhap = (SELECT SUM(soTien) FROM dbo.GiaoDichDinhKy WHERE maTaiKhoan = @maTaiKhoan AND dangBat = 1 AND loai = N'Thu');
    IF @thuNhap IS NULL OR @thuNhap <= 0
        SET @thuNhap = ROUND((SELECT COALESCE(SUM(soTien), 0) FROM dbo.GiaoDich WHERE maTaiKhoan = @maTaiKhoan AND loai = N'Thu'
                               AND ngayGiaoDich >= @tu AND ngayGiaoDich < @dau) / 3.0 / 100000, 0) * 100000;
    DECLARE @canMucTieu DECIMAL(18,0) = (SELECT COALESCE(SUM(canMoiThang), 0) FROM dbo.vw_TienDoMucTieu
                                         WHERE maTaiKhoan = @maTaiKhoan AND soTienHienTai < soTienMucTieu AND hanChot >= @dau);
    DECLARE @dl TABLE (maDanhMuc INT, tenDanhMuc NVARCHAR(100), nhom NVARCHAR(10), trungBinh DECIMAL(18,0), coDinh DECIMAL(18,0), deXuat DECIMAL(18,0));
    INSERT INTO @dl (maDanhMuc, tenDanhMuc, nhom, trungBinh, coDinh)
    SELECT d.maDanhMuc, d.tenDanhMuc,
           CASE WHEN d.tenDanhMuc IN (N'Ăn uống', N'Đi lại', N'Hóa đơn', N'Sức khỏe', N'Giáo dục') THEN N'Thiết yếu' ELSE N'Mong muốn' END,
           ROUND(COALESCE((SELECT SUM(g.soTien) FROM dbo.GiaoDich g WHERE g.maTaiKhoan = @maTaiKhoan AND g.maDanhMuc = d.maDanhMuc
                           AND g.ngayGiaoDich >= @tu AND g.ngayGiaoDich < @dau), 0) / 3.0, 0),
           COALESCE((SELECT SUM(k.soTien) FROM dbo.GiaoDichDinhKy k WHERE k.maTaiKhoan = @maTaiKhoan AND k.maDanhMuc = d.maDanhMuc
                     AND k.dangBat = 1 AND k.loai = N'Chi'), 0)
    FROM dbo.DanhMuc d
    WHERE (d.maTaiKhoan IS NULL OR d.maTaiKhoan = @maTaiKhoan) AND d.loai = N'Chi' AND d.laHeThong = 0;

    DECLARE @tietKiem DECIMAL(18,0);
    IF @phuongPhap = N'50-30-20'
    BEGIN
        SET @tietKiem = ROUND(@thuNhap * 0.2 / 10000, 0) * 10000;
        UPDATE x SET deXuat = CASE WHEN x.coDinh > q.chia THEN x.coDinh ELSE q.chia END
        FROM @dl x CROSS APPLY (
            SELECT FLOOR(CASE WHEN tong.tw > 0 THEN @thuNhap * CASE x.nhom WHEN N'Thiết yếu' THEN 0.5 ELSE 0.3 END
                                                    * (CASE WHEN x.trungBinh > x.coDinh THEN x.trungBinh ELSE x.coDinh END) / tong.tw
                              ELSE @thuNhap * CASE x.nhom WHEN N'Thiết yếu' THEN 0.5 ELSE 0.3 END / tong.soDm END / 10000) * 10000 AS chia
            FROM (SELECT SUM(CASE WHEN y.trungBinh > y.coDinh THEN y.trungBinh ELSE y.coDinh END) AS tw, COUNT(*) AS soDm FROM @dl y WHERE y.nhom = x.nhom) tong
        ) q;
    END
    ELSE
    BEGIN
        SET @tietKiem = CASE WHEN @canMucTieu > 0 THEN CEILING(@canMucTieu / 10000.0) * 10000 ELSE ROUND(@thuNhap * 0.1 / 10000, 0) * 10000 END;
        UPDATE @dl SET deXuat = CASE WHEN trungBinh = 0 AND coDinh = 0 THEN 0
                                     WHEN coDinh > CEILING(trungBinh / 50000.0) * 50000 THEN coDinh
                                     ELSE CEILING(trungBinh / 50000.0) * 50000 END;
        -- Thu nhập không đủ: giữ khoản cố định, giảm phần linh hoạt theo tỷ lệ
        DECLARE @coDinh DECIMAL(18,0) = (SELECT SUM(coDinh) FROM @dl), @linhHoat DECIMAL(18,0) = (SELECT SUM(deXuat - coDinh) FROM @dl);
        IF @coDinh + @linhHoat + @tietKiem > @thuNhap
        BEGIN
            IF @coDinh + @tietKiem > @thuNhap SET @tietKiem = CASE WHEN @thuNhap > @coDinh THEN FLOOR((@thuNhap - @coDinh) / 10000) * 10000 ELSE 0 END;
            DECLARE @k FLOAT = CASE WHEN @linhHoat > 0 THEN (@thuNhap - @coDinh - @tietKiem) / CAST(@linhHoat AS FLOAT) ELSE 0 END;
            IF @k < 0 SET @k = 0; IF @k > 1 SET @k = 1;
            UPDATE @dl SET deXuat = coDinh + FLOOR((deXuat - coDinh) * @k / 10000) * 10000;
        END;
    END;
    DECLARE @tongChi DECIMAL(18,0) = (SELECT SUM(deXuat) FROM @dl);
    SELECT @thang AS thang, @nam AS nam, @phuongPhap AS phuongPhap, @thuNhap AS thuNhapDuKien, @tietKiem AS tietKiemDeXuat,
           @canMucTieu AS mucTieuCanMoiThang, @tongChi AS tongChiDeXuat, @thuNhap - @tongChi - @tietKiem AS conLai;
    SELECT maDanhMuc, tenDanhMuc, nhom, trungBinh AS trungBinh3Thang, coDinh, deXuat AS hanMucDeXuat FROM @dl ORDER BY nhom DESC, maDanhMuc;
END;
GO

-- Theo dõi kế hoạch so với thực tế + dự báo chi cả tháng theo tốc độ hiện tại
CREATE OR ALTER PROCEDURE dbo.sp_TheoDoiKeHoachThang @maTaiKhoan INT, @thang INT, @nam INT, @homNay DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET @homNay = COALESCE(@homNay, CAST(SYSDATETIME() AS DATE));
    IF NOT EXISTS (SELECT 1 FROM dbo.KeHoachThang WHERE maTaiKhoan = @maTaiKhoan AND thang = @thang AND nam = @nam)
        THROW 50076, N'Tháng này chưa có kế hoạch', 1;
    DECLARE @dau DATE = DATEFROMPARTS(@nam, @thang, 1);
    DECLARE @soNgay INT = DAY(EOMONTH(@dau));
    DECLARE @daQua INT = CASE WHEN @homNay < @dau THEN 0 WHEN @homNay > EOMONTH(@dau) THEN @soNgay ELSE DAY(@homNay) END;
    DECLARE @thu DECIMAL(18,0), @chi DECIMAL(18,0), @deDanh DECIMAL(18,0);
    SELECT @thu = COALESCE(SUM(CASE WHEN loai = N'Thu' THEN soTien ELSE 0 END), 0),
           @chi = COALESCE(SUM(CASE WHEN loai = N'Chi' AND maMucTieu IS NULL THEN soTien ELSE 0 END), 0),
           @deDanh = COALESCE(SUM(CASE WHEN loai = N'Chi' AND maMucTieu IS NOT NULL THEN soTien ELSE 0 END), 0)
    FROM dbo.GiaoDich WHERE maTaiKhoan = @maTaiKhoan AND YEAR(ngayGiaoDich) = @nam AND MONTH(ngayGiaoDich) = @thang;
    DECLARE @keHoachChi DECIMAL(18,0) = (SELECT COALESCE(SUM(hanMuc), 0) FROM dbo.NganSach WHERE maTaiKhoan = @maTaiKhoan AND thang = @thang AND nam = @nam);
    DECLARE @duBao DECIMAL(18,0) = CASE WHEN @daQua = 0 THEN @chi ELSE ROUND(@chi / @daQua * @soNgay, 0) END;
    SELECT k.thang, k.nam, k.phuongPhap, k.thuNhapDuKien, @thu AS thuThucTe, @keHoachChi AS chiKeHoach, @chi AS chiThucTe,
           k.tietKiemDuKien, @deDanh AS tietKiemThucTe, k.thuNhapDuKien - @keHoachChi - k.tietKiemDuKien AS conLaiKeHoach,
           @daQua AS ngayDaQua, @soNgay AS soNgayTrongThang, @duBao AS duBaoChiCaThang,
           CASE WHEN @thu > k.thuNhapDuKien THEN @thu ELSE k.thuNhapDuKien END - @duBao - k.tietKiemDuKien AS duBaoConLaiCuoiThang,
           CASE WHEN k.thuNhapDuKien - @keHoachChi - k.tietKiemDuKien < 0 THEN N'Kế hoạch thâm hụt'
                WHEN @duBao > @keHoachChi THEN N'Có nguy cơ chi vượt kế hoạch'
                ELSE N'Đang trong kế hoạch' END AS danhGia
    FROM dbo.KeHoachThang k WHERE k.maTaiKhoan = @maTaiKhoan AND k.thang = @thang AND k.nam = @nam;
    SELECT tenDanhMuc, hanMuc, soDaChi, tienDo, trangThai FROM dbo.vw_TienDoNganSach
    WHERE maTaiKhoan = @maTaiKhoan AND thang = @thang AND nam = @nam ORDER BY tienDo DESC;
END;
GO

-- Bước 3: áp dụng kế hoạch bằng MỘT lệnh. @phanBo là JSON: [{"maDanhMuc":1,"hanMuc":2000000}, ...]
-- Lưu/cập nhật KeHoachThang; tạo, cập nhật (tính lại cờ cảnh báo R6) hoặc bỏ (hạn mức 0) ngân sách của từng danh mục.
CREATE OR ALTER PROCEDURE dbo.sp_ApDungKeHoachThang
    @maTaiKhoan INT, @thang INT, @nam INT, @thuNhapDuKien DECIMAL(18,0), @tietKiemDuKien DECIMAL(18,0),
    @phuongPhap NVARCHAR(10), @phanBo NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    IF @thang NOT BETWEEN 1 AND 12 THROW 50070, N'Tháng hoặc năm không hợp lệ', 1;
    IF @thuNhapDuKien IS NULL OR @thuNhapDuKien <= 0 THROW 50072, N'Thu nhập dự kiến phải là số nguyên lớn hơn 0', 1;
    IF @tietKiemDuKien IS NULL OR @tietKiemDuKien < 0 THROW 50073, N'Tiền để dành dự kiến không hợp lệ', 1;
    IF @phuongPhap NOT IN (N'LichSu', N'50-30-20') THROW 50071, N'Phương pháp lập kế hoạch không hợp lệ', 1;
    DECLARE @pb TABLE (maDanhMuc INT PRIMARY KEY, hanMuc DECIMAL(18,0));
    INSERT INTO @pb SELECT maDanhMuc, hanMuc FROM OPENJSON(@phanBo) WITH (maDanhMuc INT, hanMuc DECIMAL(18,0));
    IF EXISTS (SELECT 1 FROM @pb WHERE hanMuc IS NULL OR hanMuc < 0) THROW 50074, N'Hạn mức phân bổ phải là số nguyên không âm', 1;
    IF EXISTS (SELECT 1 FROM @pb p LEFT JOIN dbo.DanhMuc d ON d.maDanhMuc = p.maDanhMuc AND (d.maTaiKhoan IS NULL OR d.maTaiKhoan = @maTaiKhoan)
               WHERE d.maDanhMuc IS NULL OR d.loai <> N'Chi' OR d.laHeThong = 1)
        THROW 50075, N'Chỉ phân bổ cho danh mục chi của bạn (không gồm danh mục hệ thống)', 1;
    BEGIN TRY
    BEGIN TRANSACTION;
        MERGE dbo.KeHoachThang AS kh
        USING (SELECT @maTaiKhoan AS maTaiKhoan, @thang AS thang, @nam AS nam) AS s
        ON kh.maTaiKhoan = s.maTaiKhoan AND kh.thang = s.thang AND kh.nam = s.nam
        WHEN MATCHED THEN UPDATE SET thuNhapDuKien = @thuNhapDuKien, tietKiemDuKien = @tietKiemDuKien, phuongPhap = @phuongPhap, ngayLap = SYSDATETIME()
        WHEN NOT MATCHED THEN INSERT (maTaiKhoan, thang, nam, thuNhapDuKien, tietKiemDuKien, phuongPhap, ngayLap)
                              VALUES (@maTaiKhoan, @thang, @nam, @thuNhapDuKien, @tietKiemDuKien, @phuongPhap, SYSDATETIME());
        -- hạn mức 0: bỏ ngân sách
        DELETE n FROM dbo.NganSach n JOIN @pb p ON p.maDanhMuc = n.maDanhMuc
        WHERE n.maTaiKhoan = @maTaiKhoan AND n.thang = @thang AND n.nam = @nam AND p.hanMuc = 0;
        -- đã có: cập nhật hạn mức, tính lại hai cờ (R6)
        UPDATE n SET hanMuc = p.hanMuc,
               daCanhBaoNguong = CASE WHEN dbo.fn_SoDaChi(@maTaiKhoan, n.maDanhMuc, @thang, @nam) * 100 >= p.hanMuc * n.nguongCanhBao THEN 1 ELSE 0 END,
               daCanhBaoVuot = CASE WHEN dbo.fn_SoDaChi(@maTaiKhoan, n.maDanhMuc, @thang, @nam) > p.hanMuc THEN 1 ELSE 0 END
        FROM dbo.NganSach n JOIN @pb p ON p.maDanhMuc = n.maDanhMuc
        WHERE n.maTaiKhoan = @maTaiKhoan AND n.thang = @thang AND n.nam = @nam AND p.hanMuc > 0;
        -- chưa có: tạo mới
        INSERT INTO dbo.NganSach (maTaiKhoan, maDanhMuc, hanMuc, thang, nam, nguongCanhBao, daCanhBaoNguong, daCanhBaoVuot)
        SELECT @maTaiKhoan, p.maDanhMuc, p.hanMuc, @thang, @nam, 80,
               CASE WHEN dbo.fn_SoDaChi(@maTaiKhoan, p.maDanhMuc, @thang, @nam) * 100 >= p.hanMuc * 80 THEN 1 ELSE 0 END,
               CASE WHEN dbo.fn_SoDaChi(@maTaiKhoan, p.maDanhMuc, @thang, @nam) > p.hanMuc THEN 1 ELSE 0 END
        FROM @pb p WHERE p.hanMuc > 0 AND NOT EXISTS (SELECT 1 FROM dbo.NganSach n WHERE n.maTaiKhoan = @maTaiKhoan
              AND n.maDanhMuc = p.maDanhMuc AND n.thang = @thang AND n.nam = @nam);
    COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH;
    EXEC dbo.sp_TheoDoiKeHoachThang @maTaiKhoan, @thang, @nam;
END;
GO

/* ===================== 9. BÁO CÁO, TỔNG KẾT, QUẢN TRỊ ===================== */

-- Báo cáo chi theo danh mục trong khoảng thời gian (dữ liệu cho biểu đồ tròn)
CREATE OR ALTER PROCEDURE dbo.sp_BaoCaoTheoDanhMuc @maTaiKhoan INT, @tu DATE, @den DATE, @loai NVARCHAR(3) = N'Chi'
AS
BEGIN
    SET NOCOUNT ON;
    IF @tu > @den THROW 50080, N'Khoảng thời gian không hợp lệ: ngày bắt đầu sau ngày kết thúc', 1;
    SELECT d.tenDanhMuc, SUM(g.soTien) AS soTien,
           CAST(SUM(g.soTien) * 100.0 / NULLIF(SUM(SUM(g.soTien)) OVER (), 0) AS DECIMAL(5,1)) AS tyLe
    FROM dbo.GiaoDich g JOIN dbo.DanhMuc d ON d.maDanhMuc = g.maDanhMuc
    WHERE g.maTaiKhoan = @maTaiKhoan AND g.loai = @loai AND CAST(g.ngayGiaoDich AS DATE) BETWEEN @tu AND @den
    GROUP BY d.tenDanhMuc ORDER BY soTien DESC;
END;
GO

-- Lịch chi tiêu: tổng thu, chi, số giao dịch theo từng ngày của tháng
CREATE OR ALTER PROCEDURE dbo.sp_LichChiTieu @maTaiKhoan INT, @thang INT, @nam INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CAST(ngayGiaoDich AS DATE) AS ngay,
           SUM(CASE WHEN loai = N'Thu' THEN soTien ELSE 0 END) AS thu,
           SUM(CASE WHEN loai = N'Chi' THEN soTien ELSE 0 END) AS chi, COUNT(*) AS soGiaoDich
    FROM dbo.GiaoDich WHERE maTaiKhoan = @maTaiKhoan AND YEAR(ngayGiaoDich) = @nam AND MONTH(ngayGiaoDich) = @thang
    GROUP BY CAST(ngayGiaoDich AS DATE) ORDER BY ngay;
END;
GO

-- UC Tổng kết cuối tháng (R9): mỗi (người dùng, tháng) một báo cáo; chạy lại chỉ cập nhật số liệu, không gửi thông báo trùng
CREATE OR ALTER PROCEDURE dbo.sp_TongKetThang @thang INT, @nam INT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    IF @thang NOT BETWEEN 1 AND 12 THROW 50070, N'Tháng hoặc năm không hợp lệ', 1;
    DECLARE @so TABLE (maTaiKhoan INT, tongThu DECIMAL(18,0), tongChi DECIMAL(18,0), soVuot INT);
    INSERT INTO @so
    SELECT t.maTaiKhoan,
           COALESCE((SELECT SUM(soTien) FROM dbo.GiaoDich g WHERE g.maTaiKhoan = t.maTaiKhoan AND g.loai = N'Thu' AND YEAR(g.ngayGiaoDich) = @nam AND MONTH(g.ngayGiaoDich) = @thang), 0),
           COALESCE((SELECT SUM(soTien) FROM dbo.GiaoDich g WHERE g.maTaiKhoan = t.maTaiKhoan AND g.loai = N'Chi' AND YEAR(g.ngayGiaoDich) = @nam AND MONTH(g.ngayGiaoDich) = @thang), 0),
           (SELECT COUNT(*) FROM dbo.vw_TienDoNganSach v WHERE v.maTaiKhoan = t.maTaiKhoan AND v.thang = @thang AND v.nam = @nam AND v.trangThai = N'Vượt')
    FROM dbo.TaiKhoan t WHERE t.loaiTaiKhoan = N'NguoiDung' AND t.trangThai = N'HoatDong';
    BEGIN TRY
    BEGIN TRANSACTION;
        UPDATE b SET tongThu = s.tongThu, tongChi = s.tongChi, soDanhMucVuot = s.soVuot, ngayLap = SYSDATETIME()
        FROM dbo.BaoCaoThang b JOIN @so s ON s.maTaiKhoan = b.maTaiKhoan WHERE b.thang = @thang AND b.nam = @nam;
        DECLARE @moi TABLE (maTaiKhoan INT, tongThu DECIMAL(18,0), tongChi DECIMAL(18,0), soVuot INT);
        INSERT INTO dbo.BaoCaoThang (maTaiKhoan, thang, nam, tongThu, tongChi, soDanhMucVuot, ngayLap)
        OUTPUT inserted.maTaiKhoan, inserted.tongThu, inserted.tongChi, inserted.soDanhMucVuot INTO @moi
        SELECT s.maTaiKhoan, @thang, @nam, s.tongThu, s.tongChi, s.soVuot, SYSDATETIME() FROM @so s
        WHERE NOT EXISTS (SELECT 1 FROM dbo.BaoCaoThang b WHERE b.maTaiKhoan = s.maTaiKhoan AND b.thang = @thang AND b.nam = @nam);
        -- Thông báo chỉ gửi cho báo cáo vừa tạo lần đầu
        INSERT INTO dbo.ThongBao (maTaiKhoan, loai, noiDung, daDoc, ngayTao)
        SELECT maTaiKhoan, N'TongKetThang', N'Tổng kết tháng ' + RIGHT(N'0' + CAST(@thang AS NVARCHAR(2)), 2) + N'/' + CAST(@nam AS NVARCHAR(4))
               + N': thu ' + FORMAT(tongThu, N'#,0', 'vi-VN') + N'đ, chi ' + FORMAT(tongChi, N'#,0', 'vi-VN') + N'đ, '
               + CAST(soVuot AS NVARCHAR(5)) + N' danh mục vượt ngân sách.', 0, SYSDATETIME() FROM @moi;
    COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH;
    SELECT COUNT(*) AS soNguoiDaXuLy FROM @so;
END;
GO

-- UC Khóa tài khoản (R8): bắt buộc lý do, quản trị viên không tự khóa mình, người bị khóa nhận thông báo
CREATE OR ALTER PROCEDURE dbo.sp_KhoaTaiKhoan @maQuanTri INT, @maTaiKhoan INT, @lyDo NVARCHAR(300)
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    IF NOT EXISTS (SELECT 1 FROM dbo.TaiKhoan WHERE maTaiKhoan = @maQuanTri AND loaiTaiKhoan = N'QuanTriVien') THROW 50090, N'Bạn không có quyền truy cập', 1;
    IF LTRIM(RTRIM(ISNULL(@lyDo, N''))) = N'' THROW 50091, N'Vui lòng nhập lý do khóa', 1;
    IF @maQuanTri = @maTaiKhoan THROW 50092, N'Không thể tự khóa tài khoản của mình', 1;
    IF NOT EXISTS (SELECT 1 FROM dbo.TaiKhoan WHERE maTaiKhoan = @maTaiKhoan) THROW 50093, N'Không tìm thấy tài khoản', 1;
    BEGIN TRY
    BEGIN TRANSACTION;
        UPDATE dbo.TaiKhoan SET trangThai = N'BiKhoa', lyDoKhoa = LTRIM(RTRIM(@lyDo)) WHERE maTaiKhoan = @maTaiKhoan;
        INSERT INTO dbo.ThongBao (maTaiKhoan, loai, noiDung, daDoc, ngayTao)
        VALUES (@maTaiKhoan, N'TongKetThang', N'Tài khoản của bạn đã bị khóa. Lý do: ' + LTRIM(RTRIM(@lyDo)), 0, SYSDATETIME());
    COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_MoKhoaTaiKhoan @maQuanTri INT, @maTaiKhoan INT
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM dbo.TaiKhoan WHERE maTaiKhoan = @maQuanTri AND loaiTaiKhoan = N'QuanTriVien') THROW 50090, N'Bạn không có quyền truy cập', 1;
    UPDATE dbo.TaiKhoan SET trangThai = N'HoatDong', lyDoKhoa = NULL WHERE maTaiKhoan = @maTaiKhoan;
END;
GO

-- Thống kê hệ thống (quản trị viên, kiểm toán viên)
CREATE OR ALTER PROCEDURE dbo.sp_ThongKeHeThong
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @ky CHAR(7) = CONVERT(CHAR(7), SYSDATETIME(), 126);
    SELECT (SELECT COUNT(*) FROM dbo.TaiKhoan WHERE loaiTaiKhoan = N'NguoiDung') AS soNguoiDung,
           (SELECT COUNT(*) FROM dbo.TaiKhoan WHERE loaiTaiKhoan = N'NguoiDung' AND trangThai = N'HoatDong') AS dangHoatDong,
           (SELECT COUNT(*) FROM dbo.TaiKhoan WHERE trangThai = N'BiKhoa') AS biKhoa,
           (SELECT COUNT(*) FROM dbo.TaiKhoan WHERE loaiTaiKhoan = N'NguoiDung' AND CONVERT(CHAR(7), ngayTao, 126) = @ky) AS nguoiMoiThangNay,
           (SELECT COUNT(*) FROM dbo.GiaoDich WHERE CONVERT(CHAR(7), ngayGiaoDich, 126) = @ky) AS giaoDichThangNay,
           (SELECT COUNT(*) FROM dbo.GiaoDich) AS tongGiaoDich,
           (SELECT COUNT(*) FROM dbo.KeHoachThang WHERE thang = MONTH(SYSDATETIME()) AND nam = YEAR(SYSDATETIME())) AS soKeHoachThangNay;
END;
GO
