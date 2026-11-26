/* ==========================================================================
   DEMO CƠ SỞ DỮ LIỆU KHI THUYẾT TRÌNH (chạy sau 01, 02, 03)
   Cách dùng trong SSMS: bôi đen từng khối (từ dòng chú thích đánh số đến chữ GO) rồi bấm F5.
   Mỗi khối tự khai báo biến nên chạy riêng được. Khối nào có ghi dữ liệu đều ROLLBACK,
   nên chạy bao nhiêu lần dữ liệu mẫu vẫn giữ nguyên.
   ========================================================================== */
USE QuanLyThuChi;
GO

/* 1. Toàn cảnh: 14 bảng và số dòng dữ liệu */
SELECT t.name AS bang, SUM(p.rows) AS soDong
FROM sys.tables t JOIN sys.partitions p ON p.object_id = t.object_id AND p.index_id < 2
GROUP BY t.name ORDER BY t.name;
GO

/* 2. Khóa ngoại: bảng con -> bảng cha (chính là các quan hệ trên sơ đồ lớp / ERD) */
SELECT OBJECT_NAME(fk.parent_object_id) AS bangCon, c.name AS cotKhoaNgoai,
       OBJECT_NAME(fk.referenced_object_id) AS bangCha, fk.delete_referential_action_desc AS khiXoa
FROM sys.foreign_keys fk
JOIN sys.foreign_key_columns k ON k.constraint_object_id = fk.object_id
JOIN sys.columns c ON c.object_id = k.parent_object_id AND c.column_id = k.parent_column_id
ORDER BY bangCon, cotKhoaNgoai;
GO

/* 3. Ràng buộc CHECK và UNIQUE: quy tắc được giữ ngay trong CSDL */
SELECT OBJECT_NAME(parent_object_id) AS bang, name AS rangBuoc, definition AS dieuKien
FROM sys.check_constraints ORDER BY bang, rangBuoc;
SELECT OBJECT_NAME(i.object_id) AS bang, i.name AS rangBuocDuyNhat,
       STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY ic.key_ordinal) AS cacCot
FROM sys.indexes i
JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE i.is_unique_constraint = 1
GROUP BY i.object_id, i.name ORDER BY bang;
GO

/* 4. Kế thừa gộp một bảng: bốn vai trò phân biệt bằng loaiTaiKhoan */
SELECT loaiTaiKhoan, COUNT(*) AS soTaiKhoan,
       SUM(CASE WHEN trangThai = N'BiKhoa' THEN 1 ELSE 0 END) AS biKhoa
FROM dbo.TaiKhoan GROUP BY loaiTaiKhoan ORDER BY loaiTaiKhoan;
GO

/* 5. Truy vấn nối bảng: 10 giao dịch gần nhất của người dùng demo */
SELECT TOP 10 g.ngayGiaoDich, v.tenVi, d.tenDanhMuc, g.loai, g.soTien, g.ghiChu
FROM dbo.GiaoDich g
JOIN dbo.TaiKhoan t ON t.maTaiKhoan = g.maTaiKhoan
JOIN dbo.Vi v       ON v.maVi = g.maVi
JOIN dbo.DanhMuc d  ON d.maDanhMuc = g.maDanhMuc
WHERE t.email = N'demo@demo.vn'
ORDER BY g.ngayGiaoDich DESC;
GO

/* 6. Ba view: số dư theo người dùng, tiến độ ngân sách tháng này, tiến độ mục tiêu */
DECLARE @demo INT = (SELECT maTaiKhoan FROM dbo.TaiKhoan WHERE email = N'demo@demo.vn');
SELECT * FROM dbo.vw_SoDuNguoiDung ORDER BY tongSoDu DESC;
SELECT tenDanhMuc, hanMuc, soDaChi, tienDo, trangThai FROM dbo.vw_TienDoNganSach
WHERE maTaiKhoan = @demo AND thang = MONTH(SYSDATETIME()) AND nam = YEAR(SYSDATETIME()) ORDER BY tienDo DESC;
SELECT tenMucTieu, soTienMucTieu, soTienHienTai, tienDo, canMoiThang FROM dbo.vw_TienDoMucTieu WHERE maTaiKhoan = @demo;
GO

/* 7. Ràng buộc chặn dữ liệu sai (cả ba lệnh đều phải bị từ chối) */
DECLARE @demo INT = (SELECT maTaiKhoan FROM dbo.TaiKhoan WHERE email = N'demo@demo.vn');
DECLARE @vi INT = (SELECT TOP 1 maVi FROM dbo.Vi WHERE maTaiKhoan = @demo);
BEGIN TRY BEGIN TRAN; UPDATE dbo.Vi SET soDu = -1 WHERE maVi = @vi; ROLLBACK; END TRY
BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; PRINT N'a) Số dư âm: ' + ERROR_MESSAGE(); END CATCH;
BEGIN TRY BEGIN TRAN;
    INSERT INTO dbo.ChuyenTien (maTaiKhoan, maViNguon, maViDich, soTien, ngayChuyen) VALUES (@demo, @vi, @vi, 1000, SYSDATETIME()); ROLLBACK; END TRY
BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; PRINT N'b) Chuyển vào chính ví đó: ' + ERROR_MESSAGE(); END CATCH;
BEGIN TRY EXEC dbo.sp_DangKy N'Người thử', N'demo@demo.vn', N'x'; END TRY
BEGIN CATCH PRINT N'c) Email trùng: ' + ERROR_MESSAGE(); END CATCH;
GO

/* 8. Thủ tục thêm giao dịch: số dư trước và sau, kiểm tra ngân sách (ROLLBACK) */
DECLARE @demo INT = (SELECT maTaiKhoan FROM dbo.TaiKhoan WHERE email = N'demo@demo.vn');
DECLARE @vi INT = (SELECT maVi FROM dbo.Vi WHERE maTaiKhoan = @demo AND tenVi = N'Tiền mặt');
DECLARE @dm INT = (SELECT maDanhMuc FROM dbo.DanhMuc WHERE maTaiKhoan IS NULL AND tenDanhMuc = N'Ăn uống');
BEGIN TRAN;
    SELECT tenVi, soDu AS soDuTruoc FROM dbo.Vi WHERE maVi = @vi;
    EXEC dbo.sp_ThemGiaoDich @demo, @vi, @dm, 45000, N'Chi', NULL, N'Cơm trưa (demo)';
ROLLBACK;
BEGIN TRY EXEC dbo.sp_ThemGiaoDich @demo, @vi, @dm, 999999999, N'Chi'; END TRY
BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; PRINT N'Chi quá số dư (R2): ' + ERROR_MESSAGE(); END CATCH;
GO

/* 9. Transaction chuyển tiền: tổng số dư không đổi (ROLLBACK) */
DECLARE @demo INT = (SELECT maTaiKhoan FROM dbo.TaiKhoan WHERE email = N'demo@demo.vn');
DECLARE @nguon INT = (SELECT maVi FROM dbo.Vi WHERE maTaiKhoan = @demo AND tenVi = N'Vietcombank');
DECLARE @dich INT = (SELECT maVi FROM dbo.Vi WHERE maTaiKhoan = @demo AND tenVi = N'Tiền mặt');
BEGIN TRAN;
    SELECT SUM(soDu) AS tongTruoc FROM dbo.Vi WHERE maTaiKhoan = @demo;
    EXEC dbo.sp_ChuyenTien @demo, @nguon, @dich, 1000000, N'Demo';
    SELECT SUM(soDu) AS tongSau FROM dbo.Vi WHERE maTaiKhoan = @demo;
ROLLBACK;
GO

/* 10. Gợi ý kế hoạch tháng sau (quy tắc 50/30/20) và thống kê hệ thống */
DECLARE @demo INT = (SELECT maTaiKhoan FROM dbo.TaiKhoan WHERE email = N'demo@demo.vn');
DECLARE @t INT = MONTH(DATEADD(MONTH, 1, SYSDATETIME())), @n INT = YEAR(DATEADD(MONTH, 1, SYSDATETIME()));
EXEC dbo.sp_GoiYKeHoachThang @demo, @t, @n, N'50-30-20', 20000000;
EXEC dbo.sp_ThongKeHeThong;
GO
