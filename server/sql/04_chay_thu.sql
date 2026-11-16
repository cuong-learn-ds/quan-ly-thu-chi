/* ==========================================================================
   CHẠY THỬ CÁC CHỨC NĂNG (sau 01, 02, 03)
   - Trường hợp thành công chạy trong BEGIN TRAN ... ROLLBACK để dữ liệu mẫu không đổi.
   - Trường hợp lỗi bắt bằng TRY/CATCH và in thông điệp nghiệp vụ.
   ========================================================================== */
USE QuanLyThuChi;
GO
SET NOCOUNT ON;
DECLARE @demo INT = (SELECT maTaiKhoan FROM dbo.TaiKhoan WHERE email = N'demo@demo.vn');
DECLARE @admin INT = (SELECT maTaiKhoan FROM dbo.TaiKhoan WHERE email = N'admin@demo.vn');
DECLARE @tienMat INT = (SELECT maVi FROM dbo.Vi WHERE maTaiKhoan = @demo AND tenVi = N'Tiền mặt');
DECLARE @nganHang INT = (SELECT maVi FROM dbo.Vi WHERE maTaiKhoan = @demo AND tenVi = N'Vietcombank');
DECLARE @anUong INT = (SELECT maDanhMuc FROM dbo.DanhMuc WHERE maTaiKhoan IS NULL AND tenDanhMuc = N'Ăn uống');
DECLARE @luong INT = (SELECT maDanhMuc FROM dbo.DanhMuc WHERE maTaiKhoan IS NULL AND tenDanhMuc = N'Lương');
DECLARE @thang INT = MONTH(SYSDATETIME()), @nam INT = YEAR(SYSDATETIME());
DECLARE @thangSau INT = MONTH(DATEADD(MONTH, 1, SYSDATETIME())), @namSau INT = YEAR(DATEADD(MONTH, 1, SYSDATETIME()));

PRINT N'===== 1. Thêm giao dịch chi hợp lệ: số dư ví giảm, kiểm tra ngân sách (ROLLBACK sau khi xem)';
BEGIN TRAN;
    SELECT soDu AS soDuTruoc FROM dbo.Vi WHERE maVi = @tienMat;
    EXEC dbo.sp_ThemGiaoDich @demo, @tienMat, @anUong, 45000, N'Chi', NULL, N'Cơm trưa (chạy thử)';
ROLLBACK;

PRINT N'===== 2. Chi vượt số dư (R2) -> bị từ chối, không ghi gì';
BEGIN TRY EXEC dbo.sp_ThemGiaoDich @demo, @tienMat, @anUong, 999999999, N'Chi'; END TRY
BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; PRINT N'   Lỗi: ' + ERROR_MESSAGE(); END CATCH;

PRINT N'===== 3. Danh mục khác loại giao dịch -> bị từ chối';
BEGIN TRY EXEC dbo.sp_ThemGiaoDich @demo, @tienMat, @luong, 50000, N'Chi'; END TRY
BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; PRINT N'   Lỗi: ' + ERROR_MESSAGE(); END CATCH;

PRINT N'===== 4. Chuyển tiền giữa ví (R11): tổng số dư không đổi (ROLLBACK)';
BEGIN TRAN;
    SELECT SUM(soDu) AS tongTruoc FROM dbo.Vi WHERE maTaiKhoan = @demo;
    EXEC dbo.sp_ChuyenTien @demo, @nganHang, @tienMat, 1000000, N'Chạy thử';
    SELECT SUM(soDu) AS tongSau FROM dbo.Vi WHERE maTaiKhoan = @demo;
ROLLBACK;
BEGIN TRY EXEC dbo.sp_ChuyenTien @demo, @tienMat, @tienMat, 1000; END TRY
BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; PRINT N'   Lỗi: ' + ERROR_MESSAGE(); END CATCH;

PRINT N'===== 5. Lập ngân sách trùng tháng (R6) -> bị từ chối';
BEGIN TRY EXEC dbo.sp_LapNganSach @demo, @anUong, 3000000, @thang, @nam; END TRY
BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; PRINT N'   Lỗi: ' + ERROR_MESSAGE(); END CATCH;

PRINT N'===== 6. Gợi ý kế hoạch tháng sau theo thói quen 3 tháng (R13)';
EXEC dbo.sp_GoiYKeHoachThang @demo, @thangSau, @namSau, N'LichSu';
PRINT N'===== 7. Gợi ý theo quy tắc 50/30/20 với thu nhập người dùng nhập 20.000.000đ';
EXEC dbo.sp_GoiYKeHoachThang @demo, @thangSau, @namSau, N'50-30-20', 20000000;

PRINT N'===== 8. Áp dụng kế hoạch tháng sau bằng một lệnh (ROLLBACK)';
BEGIN TRAN;
    DECLARE @pb NVARCHAR(MAX) = (SELECT d.maDanhMuc, CAST(CASE d.tenDanhMuc WHEN N'Ăn uống' THEN 3000000 WHEN N'Đi lại' THEN 900000
                                    WHEN N'Hóa đơn' THEN 450000 ELSE 300000 END AS DECIMAL(18,0)) AS hanMuc
                                 FROM dbo.DanhMuc d WHERE d.maTaiKhoan IS NULL AND d.loai = N'Chi' AND d.laHeThong = 0 FOR JSON PATH);
    EXEC dbo.sp_ApDungKeHoachThang @demo, @thangSau, @namSau, 15000000, 2000000, N'LichSu', @pb;
ROLLBACK;

PRINT N'===== 9. Theo dõi kế hoạch tháng hiện tại so với thực tế, dự báo cuối tháng';
EXEC dbo.sp_TheoDoiKeHoachThang @demo, @thang, @nam;

PRINT N'===== 10. Nạp tiền vào mục tiêu (R7) (ROLLBACK)';
DECLARE @mt INT = (SELECT TOP 1 maMucTieu FROM dbo.MucTieuTietKiem WHERE maTaiKhoan = @demo ORDER BY maMucTieu);
BEGIN TRAN; EXEC dbo.sp_NapTienMucTieu @demo, @mt, @nganHang, 500000; ROLLBACK;

PRINT N'===== 11. Lịch chi tiêu tháng hiện tại và báo cáo theo danh mục';
EXEC dbo.sp_LichChiTieu @demo, @thang, @nam;
DECLARE @dauThang DATE = DATEFROMPARTS(@nam, @thang, 1), @homNay DATE = CAST(SYSDATETIME() AS DATE);
EXEC dbo.sp_BaoCaoTheoDanhMuc @demo, @dauThang, @homNay;

PRINT N'===== 12. Tổng kết tháng trước chạy lại (R9): không tạo báo cáo trùng (ROLLBACK)';
DECLARE @tt INT = MONTH(DATEADD(MONTH, -1, SYSDATETIME())), @nt INT = YEAR(DATEADD(MONTH, -1, SYSDATETIME()));
BEGIN TRAN;
    SELECT COUNT(*) AS soBaoCaoTruoc FROM dbo.BaoCaoThang WHERE thang = @tt AND nam = @nt;
    EXEC dbo.sp_TongKetThang @tt, @nt;
    SELECT COUNT(*) AS soBaoCaoSau FROM dbo.BaoCaoThang WHERE thang = @tt AND nam = @nt;
ROLLBACK;

PRINT N'===== 13. Quản trị viên tự khóa mình (R8) -> bị từ chối; thống kê hệ thống';
BEGIN TRY EXEC dbo.sp_KhoaTaiKhoan @admin, @admin, N'Thử'; END TRY
BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; PRINT N'   Lỗi: ' + ERROR_MESSAGE(); END CATCH;
EXEC dbo.sp_ThongKeHeThong;
SELECT * FROM dbo.vw_SoDuNguoiDung ORDER BY maTaiKhoan;
GO
