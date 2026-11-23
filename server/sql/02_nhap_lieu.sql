/* ==========================================================================
   NHẬP LIỆU MẪU: QUẢN LÝ THU CHI CÁ NHÂN VÀ LẬP KẾ HOẠCH TÀI CHÍNH
   Chạy sau 01_tao_csdl.sql. Mỗi bảng có ít nhất 9 dòng.
   Script xóa dữ liệu cũ rồi chèn lại với đúng mã khóa nên chạy lại nhiều lần vẫn cho cùng kết quả.
   ========================================================================== */
USE QuanLyThuChi;
GO
SET NOCOUNT ON;

-- Xóa dữ liệu cũ (bảng con trước, bảng cha sau)
DELETE FROM dbo.BaoCaoThang;
DELETE FROM dbo.ThongBao;
DELETE FROM dbo.KeHoachThang;
DELETE FROM dbo.NganSach;
DELETE FROM dbo.ChiTietHoaDon;
DELETE FROM dbo.HoaDon;
DELETE FROM dbo.GiaoDichDinhKy;
DELETE FROM dbo.ChuyenTien;
DELETE FROM dbo.GiaoDich;
DELETE FROM dbo.MucTieuTietKiem;
DELETE FROM dbo.DanhMuc;
DELETE FROM dbo.Vi;
DELETE FROM dbo.CaiDatNhacNho;
DELETE FROM dbo.TaiKhoan;
GO

/* TaiKhoan: Tài khoản (4 vai trò; mật khẩu demo: Demo@123, lưu dạng băm BCrypt) (12 dòng) */
SET IDENTITY_INSERT dbo.TaiKhoan ON;
INSERT INTO dbo.TaiKhoan (maTaiKhoan, loaiTaiKhoan, hoTen, email, matKhauHash, trangThai, ngayTao, lyDoKhoa, donViTienTe) VALUES
  (1, N'QuanTriVien', N'Quản trị viên', N'admin@demo.vn', N'$2b$10$.BtZLaSJ6yp21TUbtLfal.6KW3jVeL/Mg9CHb1AqvTDWlhVqHrUvm', N'HoatDong', N'2026-11-16T15:15:22', NULL, N'VND'),
  (2, N'NhanVienHoTro', N'Nhân viên hỗ trợ', N'hotro@demo.vn', N'$2b$10$cBxINcAoZzodQA4/ZNXmJuWIGCmpZJznS67WzN1/FTUy0kZZq3IKK', N'HoatDong', N'2026-11-16T15:15:22', NULL, N'VND'),
  (3, N'KiemToanVien', N'Kiểm toán viên', N'kiemtoan@demo.vn', N'$2b$10$VxrsHHPDSwLp6kjefuokL.Sji7ZgktOHqnM1gZ6giPXXFSRU.g8vG', N'HoatDong', N'2026-11-16T15:15:22', NULL, N'VND'),
  (4, N'NguoiDung', N'Cường Hoàng', N'demo@demo.vn', N'$2b$10$/xr2bFFTthz1lgOLu/XOCe4nZzP9KrpGFqpxqJ/K6lqaRqCatr51a', N'HoatDong', N'2026-08-16T08:00:00', NULL, N'VND'),
  (5, N'NguoiDung', N'Nguyễn Văn An', N'an@demo.vn', N'$2b$10$8z3rQdTOeVccrp5zFBrPM.kTBPz2o4xKtJI2JhZbn3RgN98crbFiC', N'HoatDong', N'2026-08-16T08:00:00', NULL, N'VND'),
  (6, N'NguoiDung', N'Trần Thị Bình', N'binh@demo.vn', N'$2b$10$xIE0.Jrrt1PE/iFUNLpI0.1.CZUzycJNb/D8TbyKBn5HAUu5G8kiS', N'HoatDong', N'2026-08-16T08:05:00', NULL, N'VND'),
  (7, N'NguoiDung', N'Lê Hoàng Châu', N'chau@demo.vn', N'$2b$10$fKPtfqEtYg2m/MNAPkN9Ce6VrU5Mmc.WYerkkMTB0gJGi3zzf4rgu', N'HoatDong', N'2026-08-16T08:10:00', NULL, N'VND'),
  (8, N'NguoiDung', N'Phạm Minh Dũng', N'dung@demo.vn', N'$2b$10$XNEy1THzVoXkUALSdLrQouWJ0JpGY98Bbf5xCwQaRNdAUk9hj5Fye', N'HoatDong', N'2026-08-16T08:15:00', NULL, N'VND'),
  (9, N'NguoiDung', N'Hoàng Thu Hà', N'ha@demo.vn', N'$2b$10$CNW7ZeUpu5oTU/l/CppowuVLGMogwELJBCBCzodn8Skki/hrHrQL.', N'HoatDong', N'2026-08-16T08:20:00', NULL, N'VND'),
  (10, N'NguoiDung', N'Võ Thanh Khoa', N'khoa@demo.vn', N'$2b$10$4dsSeFojso1EA8C4rK/aVOtskz7t5Pi0aZlyKCRoQ36nBGxeXX.3m', N'HoatDong', N'2026-08-16T08:25:00', NULL, N'VND'),
  (11, N'NguoiDung', N'Đặng Ngọc Lan', N'lan@demo.vn', N'$2b$10$TzJftfGQ3aKWFZTx496zH.s84ZELMDstsNvgYdbgpIYHhAOWHDoa2', N'HoatDong', N'2026-08-16T08:30:00', NULL, N'VND'),
  (12, N'NguoiDung', N'Bùi Quốc Nam', N'nam@demo.vn', N'$2b$10$E5uOhOhHhAmkeCMFr1J8GOUWsf/r0EN6ddLJTVHMOfDwcTpCZoz0K', N'BiKhoa', N'2026-08-16T08:35:00', N'Tài khoản dùng chung, vi phạm điều khoản sử dụng', N'VND');
SET IDENTITY_INSERT dbo.TaiKhoan OFF;
GO

/* CaiDatNhacNho: Cài đặt nhắc nhở của từng người dùng (9 dòng) */
SET IDENTITY_INSERT dbo.CaiDatNhacNho ON;
INSERT INTO dbo.CaiDatNhacNho (maCaiDat, maTaiKhoan, nhacHangNgay, gioNhac, nhacNganSach, nhacMucTieu) VALUES
  (1, 4, 1, N'20:00', 1, 1),
  (2, 5, 1, N'20:00', 1, 1),
  (3, 6, 1, N'20:00', 1, 1),
  (4, 7, 1, N'20:00', 1, 1),
  (5, 8, 1, N'20:00', 1, 1),
  (6, 9, 1, N'20:00', 1, 1),
  (7, 10, 1, N'20:00', 1, 1),
  (8, 11, 1, N'20:00', 1, 1),
  (9, 12, 1, N'20:00', 1, 1);
SET IDENTITY_INSERT dbo.CaiDatNhacNho OFF;
GO

/* Vi: Ví của người dùng (19 dòng) */
SET IDENTITY_INSERT dbo.Vi ON;
INSERT INTO dbo.Vi (maVi, maTaiKhoan, tenVi, loaiVi, soDu, ngayTao) VALUES
  (1, 4, N'Tiền mặt', N'TienMat', 6080000, N'2026-08-16T08:00:00'),
  (2, 4, N'Vietcombank', N'NganHang', 49077000, N'2026-08-16T08:00:00'),
  (3, 4, N'Momo', N'ViDienTu', 5970000, N'2026-08-16T08:00:00'),
  (4, 5, N'Tiền mặt', N'TienMat', 80000, N'2026-11-16T15:15:23'),
  (5, 5, N'MB Bank', N'NganHang', 33020000, N'2026-11-16T15:15:23'),
  (6, 6, N'Tiền mặt', N'TienMat', 40000, N'2026-11-16T15:15:23'),
  (7, 6, N'Techcombank', N'NganHang', 25360000, N'2026-11-16T15:15:23'),
  (8, 7, N'Tiền mặt', N'TienMat', 30000, N'2026-11-16T15:15:24'),
  (9, 7, N'MB Bank', N'NganHang', 50340000, N'2026-11-16T15:15:24'),
  (10, 8, N'Tiền mặt', N'TienMat', 80000, N'2026-11-16T15:15:24'),
  (11, 8, N'Techcombank', N'NganHang', 22310000, N'2026-11-16T15:15:24'),
  (12, 9, N'Tiền mặt', N'TienMat', 60000, N'2026-11-16T15:15:24'),
  (13, 9, N'MB Bank', N'NganHang', 40420000, N'2026-11-16T15:15:24'),
  (14, 10, N'Tiền mặt', N'TienMat', 0, N'2026-11-16T15:15:25'),
  (15, 10, N'Techcombank', N'NganHang', 30120000, N'2026-11-16T15:15:25'),
  (16, 11, N'Tiền mặt', N'TienMat', 40000, N'2026-11-16T15:15:25'),
  (17, 11, N'MB Bank', N'NganHang', 25220000, N'2026-11-16T15:15:25'),
  (18, 12, N'Tiền mặt', N'TienMat', 10000, N'2026-11-16T15:15:25'),
  (19, 12, N'Techcombank', N'NganHang', 33880000, N'2026-11-16T15:15:25');
SET IDENTITY_INSERT dbo.Vi OFF;
GO

/* DanhMuc: Danh mục: maTaiKhoan NULL là danh mục mặc định dùng chung (20 dòng) */
SET IDENTITY_INSERT dbo.DanhMuc ON;
INSERT INTO dbo.DanhMuc (maDanhMuc, maTaiKhoan, tenDanhMuc, loai, bieuTuong, mauSac, laMacDinh, laHeThong) VALUES
  (1, NULL, N'Ăn uống', N'Chi', N'restaurant', N'#ef6c00', 1, 0),
  (2, NULL, N'Đi lại', N'Chi', N'directions_bus', N'#1e88e5', 1, 0),
  (3, NULL, N'Mua sắm', N'Chi', N'shopping_bag', N'#8e24aa', 1, 0),
  (4, NULL, N'Hóa đơn', N'Chi', N'receipt_long', N'#6d4c41', 1, 0),
  (5, NULL, N'Giải trí', N'Chi', N'movie', N'#e53935', 1, 0),
  (6, NULL, N'Sức khỏe', N'Chi', N'favorite', N'#43a047', 1, 0),
  (7, NULL, N'Giáo dục', N'Chi', N'school', N'#3949ab', 1, 0),
  (8, NULL, N'Khác', N'Chi', N'category', N'#757575', 1, 0),
  (9, NULL, N'Lương', N'Thu', N'payments', N'#2e7d32', 1, 0),
  (10, NULL, N'Thưởng', N'Thu', N'card_giftcard', N'#f9a825', 1, 0),
  (11, NULL, N'Khác', N'Thu', N'category', N'#757575', 1, 0),
  (12, NULL, N'Tiết kiệm', N'Chi', N'savings', N'#00897b', 1, 1),
  (13, 5, N'Cà phê', N'Chi', N'category', N'#607d8b', 0, 0),
  (14, 6, N'Thú cưng', N'Chi', N'category', N'#607d8b', 0, 0),
  (15, 7, N'Gửi bố mẹ', N'Chi', N'category', N'#607d8b', 0, 0),
  (16, 8, N'Thể thao', N'Chi', N'category', N'#607d8b', 0, 0),
  (17, 9, N'Làm đẹp', N'Chi', N'category', N'#607d8b', 0, 0),
  (18, 10, N'Quà tặng', N'Chi', N'category', N'#607d8b', 0, 0),
  (19, 11, N'Sách', N'Chi', N'category', N'#607d8b', 0, 0),
  (20, 12, N'Du lịch', N'Chi', N'category', N'#607d8b', 0, 0);
SET IDENTITY_INSERT dbo.DanhMuc OFF;
GO

/* MucTieuTietKiem: Mục tiêu tiết kiệm (10 dòng) */
SET IDENTITY_INSERT dbo.MucTieuTietKiem ON;
INSERT INTO dbo.MucTieuTietKiem (maMucTieu, maTaiKhoan, tenMucTieu, soTienMucTieu, soTienHienTai, hanChot, ngayTao) VALUES
  (1, 4, N'Mua laptop', 20000000, 3000000, N'2027-05-16', N'2026-09-16'),
  (2, 4, N'Du lịch Đà Lạt', 6000000, 4000000, N'2027-02-16', N'2026-09-16'),
  (3, 5, N'Mua xe máy', 30000000, 500000, N'2027-05-16', N'2026-11-16'),
  (4, 6, N'Quỹ khẩn cấp', 20000000, 500000, N'2027-06-16', N'2026-11-16'),
  (5, 7, N'Du lịch Nhật Bản', 45000000, 500000, N'2027-07-16', N'2026-11-16'),
  (6, 8, N'Mua điện thoại', 12000000, 500000, N'2027-08-16', N'2026-11-16'),
  (7, 9, N'Học thạc sĩ', 60000000, 500000, N'2027-09-16', N'2026-11-16'),
  (8, 10, N'Mua laptop', 25000000, 500000, N'2027-10-16', N'2026-11-16'),
  (9, 11, N'Đám cưới', 80000000, 500000, N'2027-11-16', N'2026-11-16'),
  (10, 12, N'Sửa nhà', 40000000, 500000, N'2027-12-16', N'2026-11-16');
SET IDENTITY_INSERT dbo.MucTieuTietKiem OFF;
GO

/* GiaoDich: Giao dịch thu chi (số dư ví ở bảng Vi đã khớp với các giao dịch này) (255 dòng) */
SET IDENTITY_INSERT dbo.GiaoDich ON;
INSERT INTO dbo.GiaoDich (maGiaoDich, maTaiKhoan, maVi, maDanhMuc, maMucTieu, soTien, loai, ngayGiaoDich, ghiChu) VALUES
  (1, 4, 2, 9, NULL, 15000000, N'Thu', N'2026-09-01T11:40:00', N'Lương tháng'),
  (2, 4, 2, 10, NULL, 1000000, N'Thu', N'2026-09-15T12:08:00', N'Thưởng dự án'),
  (3, 4, 3, 2, NULL, 20000, N'Chi', N'2026-09-03T16:48:00', N'Grab / xăng xe'),
  (4, 4, 1, 5, NULL, 90000, N'Chi', N'2026-09-03T12:56:00', N'Xem phim'),
  (5, 4, 3, 2, NULL, 20000, N'Chi', N'2026-09-27T12:12:00', N'Grab / xăng xe'),
  (6, 4, 2, 3, NULL, 360000, N'Chi', N'2026-09-17T12:08:00', N'Mua đồ'),
  (7, 4, 2, 3, NULL, 360000, N'Chi', N'2026-09-15T16:28:00', N'Mua đồ'),
  (8, 4, 2, 3, NULL, 360000, N'Chi', N'2026-09-03T08:32:00', N'Mua đồ'),
  (9, 4, 3, 1, NULL, 80000, N'Chi', N'2026-09-05T16:48:00', N'Siêu thị'),
  (10, 4, 1, 5, NULL, 90000, N'Chi', N'2026-09-13T12:36:00', N'Xem phim'),
  (11, 4, 1, 5, NULL, 110000, N'Chi', N'2026-09-03T08:00:00', N'Xem phim'),
  (12, 4, 3, 2, NULL, 20000, N'Chi', N'2026-09-25T12:20:00', N'Grab / xăng xe'),
  (13, 4, 1, 5, NULL, 80000, N'Chi', N'2026-09-21T16:56:00', N'Xem phim'),
  (14, 4, 1, 1, NULL, 80000, N'Chi', N'2026-09-13T12:28:00', N'Cơm trưa'),
  (15, 4, 1, 1, NULL, 60000, N'Chi', N'2026-09-19T12:36:00', N'Cơm trưa'),
  (16, 4, 3, 2, NULL, 20000, N'Chi', N'2026-09-25T08:20:00', N'Grab / xăng xe'),
  (17, 4, 1, 1, NULL, 20000, N'Chi', N'2026-09-21T12:00:00', N'Ăn tối với bạn'),
  (18, 4, 1, 5, NULL, 150000, N'Chi', N'2026-09-25T16:12:00', N'Xem phim'),
  (19, 4, 1, 1, NULL, 100000, N'Chi', N'2026-09-13T08:36:00', N'Ăn tối với bạn'),
  (20, 4, 1, 1, NULL, 20000, N'Chi', N'2026-09-09T16:16:00', N'Siêu thị'),
  (21, 4, 1, 1, NULL, 40000, N'Chi', N'2026-09-11T12:28:00', N'Cơm trưa'),
  (22, 4, 1, 5, NULL, 110000, N'Chi', N'2026-09-15T16:04:00', N'Xem phim'),
  (23, 4, 1, 1, NULL, 40000, N'Chi', N'2026-09-07T12:00:00', N'Siêu thị'),
  (24, 4, 1, 5, NULL, 190000, N'Chi', N'2026-09-01T16:56:00', N'Xem phim'),
  (25, 4, 3, 2, NULL, 20000, N'Chi', N'2026-09-13T08:52:00', N'Grab / xăng xe'),
  (26, 4, 3, 2, NULL, 20000, N'Chi', N'2026-09-05T16:36:00', N'Grab / xăng xe'),
  (27, 4, 3, 2, NULL, 20000, N'Chi', N'2026-09-03T08:48:00', N'Grab / xăng xe'),
  (28, 4, 1, 1, NULL, 40000, N'Chi', N'2026-09-03T12:56:00', N'Siêu thị'),
  (29, 4, 3, 2, NULL, 20000, N'Chi', N'2026-09-13T12:56:00', N'Grab / xăng xe'),
  (30, 4, 1, 5, NULL, 60000, N'Chi', N'2026-09-15T12:00:00', N'Xem phim'),
  (31, 4, 2, 3, NULL, 240000, N'Chi', N'2026-09-19T16:20:00', N'Mua đồ'),
  (32, 4, 1, 1, NULL, 80000, N'Chi', N'2026-09-17T12:32:00', N'Ăn tối với bạn'),
  (33, 4, 1, 1, NULL, 20000, N'Chi', N'2026-09-23T08:40:00', N'Ăn tối với bạn'),
  (34, 4, 1, 1, NULL, 60000, N'Chi', N'2026-09-13T12:00:00', N'Cơm trưa'),
  (35, 4, 1, 5, NULL, 140000, N'Chi', N'2026-09-03T16:20:00', N'Xem phim'),
  (36, 4, 2, 9, NULL, 15000000, N'Thu', N'2026-10-01T12:56:00', N'Lương tháng'),
  (37, 4, 2, 10, NULL, 2000000, N'Thu', N'2026-10-15T12:44:00', N'Thưởng dự án'),
  (38, 4, 2, 3, NULL, 520000, N'Chi', N'2026-10-21T08:24:00', N'Mua đồ'),
  (39, 4, 1, 1, NULL, 100000, N'Chi', N'2026-10-03T08:12:00', N'Cơm trưa'),
  (40, 4, 1, 1, NULL, 20000, N'Chi', N'2026-10-21T12:44:00', N'Cơm trưa'),
  (41, 4, 3, 2, NULL, 30000, N'Chi', N'2026-10-19T12:08:00', N'Grab / xăng xe'),
  (42, 4, 2, 3, NULL, 460000, N'Chi', N'2026-10-03T08:24:00', N'Mua đồ'),
  (43, 4, 1, 1, NULL, 80000, N'Chi', N'2026-10-04T08:52:00', N'Siêu thị'),
  (44, 4, 1, 5, NULL, 150000, N'Chi', N'2026-10-13T08:08:00', N'Xem phim'),
  (45, 4, 1, 1, NULL, 100000, N'Chi', N'2026-10-21T12:56:00', N'Ăn tối với bạn'),
  (46, 4, 3, 2, NULL, 20000, N'Chi', N'2026-10-08T12:56:00', N'Grab / xăng xe'),
  (47, 4, 1, 1, NULL, 40000, N'Chi', N'2026-10-24T12:32:00', N'Cơm trưa'),
  (48, 4, 3, 2, NULL, 20000, N'Chi', N'2026-10-23T08:40:00', N'Grab / xăng xe'),
  (49, 4, 1, 1, NULL, 100000, N'Chi', N'2026-10-29T12:12:00', N'Ăn tối với bạn'),
  (50, 4, 1, 1, NULL, 40000, N'Chi', N'2026-10-04T12:52:00', N'Cơm trưa');
INSERT INTO dbo.GiaoDich (maGiaoDich, maTaiKhoan, maVi, maDanhMuc, maMucTieu, soTien, loai, ngayGiaoDich, ghiChu) VALUES
  (51, 4, 1, 1, NULL, 100000, N'Chi', N'2026-10-15T08:52:00', N'Cơm trưa'),
  (52, 4, 1, 1, NULL, 60000, N'Chi', N'2026-10-17T16:16:00', N'Cơm trưa'),
  (53, 4, 2, 3, NULL, 520000, N'Chi', N'2026-10-11T16:48:00', N'Mua đồ'),
  (54, 4, 1, 1, NULL, 100000, N'Chi', N'2026-10-20T08:00:00', N'Cơm trưa'),
  (55, 4, 2, 3, NULL, 160000, N'Chi', N'2026-10-31T12:36:00', N'Mua đồ'),
  (56, 4, 3, 2, NULL, 20000, N'Chi', N'2026-10-16T08:52:00', N'Grab / xăng xe'),
  (57, 4, 1, 1, NULL, 40000, N'Chi', N'2026-10-18T08:56:00', N'Ăn tối với bạn'),
  (58, 4, 1, 1, NULL, 80000, N'Chi', N'2026-10-26T12:00:00', N'Siêu thị'),
  (59, 4, 3, 2, NULL, 20000, N'Chi', N'2026-10-27T16:28:00', N'Grab / xăng xe'),
  (60, 4, 3, 2, NULL, 20000, N'Chi', N'2026-10-30T12:04:00', N'Grab / xăng xe'),
  (61, 4, 1, 5, NULL, 140000, N'Chi', N'2026-10-01T12:48:00', N'Xem phim'),
  (62, 4, 2, 3, NULL, 500000, N'Chi', N'2026-10-03T16:40:00', N'Mua đồ'),
  (63, 4, 3, 2, NULL, 20000, N'Chi', N'2026-10-14T08:08:00', N'Grab / xăng xe'),
  (64, 4, 1, 1, NULL, 40000, N'Chi', N'2026-10-09T08:32:00', N'Cơm trưa'),
  (65, 4, 1, 1, NULL, 100000, N'Chi', N'2026-10-06T12:24:00', N'Ăn tối với bạn'),
  (66, 4, 3, 2, NULL, 20000, N'Chi', N'2026-10-02T08:40:00', N'Grab / xăng xe'),
  (67, 4, 1, 1, NULL, 80000, N'Chi', N'2026-10-24T16:00:00', N'Cơm trưa'),
  (68, 4, 2, 3, NULL, 320000, N'Chi', N'2026-10-16T08:00:00', N'Mua đồ'),
  (69, 4, 2, 3, NULL, 340000, N'Chi', N'2026-10-19T12:28:00', N'Mua đồ'),
  (70, 4, 2, 3, NULL, 240000, N'Chi', N'2026-10-22T12:56:00', N'Mua đồ'),
  (71, 4, 2, 9, NULL, 15000000, N'Thu', N'2026-11-01T08:20:00', N'Lương tháng'),
  (72, 4, 1, 5, NULL, 150000, N'Chi', N'2026-11-01T16:16:00', N'Xem phim'),
  (73, 4, 3, 2, NULL, 20000, N'Chi', N'2026-11-02T16:24:00', N'Grab / xăng xe'),
  (74, 4, 2, 3, NULL, 300000, N'Chi', N'2026-11-03T12:56:00', N'Mua đồ'),
  (75, 4, 1, 5, NULL, 170000, N'Chi', N'2026-11-04T08:12:00', N'Xem phim'),
  (76, 4, 1, 5, NULL, 110000, N'Chi', N'2026-11-05T12:56:00', N'Xem phim'),
  (77, 4, 2, 3, NULL, 580000, N'Chi', N'2026-11-06T16:48:00', N'Mua đồ'),
  (78, 4, 1, 1, NULL, 40000, N'Chi', N'2026-11-07T12:24:00', N'Ăn tối với bạn'),
  (79, 4, 3, 2, NULL, 20000, N'Chi', N'2026-11-08T16:52:00', N'Grab / xăng xe'),
  (80, 4, 1, 5, NULL, 170000, N'Chi', N'2026-11-09T08:24:00', N'Xem phim'),
  (81, 4, 1, 5, NULL, 100000, N'Chi', N'2026-11-10T08:44:00', N'Xem phim'),
  (82, 4, 3, 2, NULL, 20000, N'Chi', N'2026-11-11T12:44:00', N'Grab / xăng xe'),
  (83, 4, 3, 2, NULL, 20000, N'Chi', N'2026-11-12T12:00:00', N'Grab / xăng xe'),
  (84, 4, 1, 5, NULL, 130000, N'Chi', N'2026-11-13T08:20:00', N'Xem phim'),
  (85, 4, 1, 1, NULL, 100000, N'Chi', N'2026-11-14T08:24:00', N'Siêu thị'),
  (86, 4, 3, 2, NULL, 20000, N'Chi', N'2026-11-15T08:28:00', N'Grab / xăng xe'),
  (87, 4, 3, 2, NULL, 20000, N'Chi', N'2026-11-16T16:56:00', N'Grab / xăng xe'),
  (88, 4, 2, 1, NULL, 800000, N'Chi', N'2026-11-16T07:00:00', N'Đi ăn buffet'),
  (89, 4, 2, 3, NULL, 1500000, N'Chi', N'2026-11-16T06:30:00', N'Mua giày'),
  (90, 4, 2, 12, 1, 3000000, N'Chi', N'2026-10-16T10:00:00', N'Nạp mục tiêu: Mua laptop'),
  (91, 4, 2, 12, 2, 4000000, N'Chi', N'2026-10-16T10:00:00', N'Nạp mục tiêu: Du lịch Đà Lạt'),
  (92, 4, 2, 1, NULL, 308000, N'Chi', N'2026-11-01T09:15:00', N'Hóa đơn Siêu thị Co.opmart'),
  (93, 4, 2, 1, NULL, 137000, N'Chi', N'2026-11-04T10:15:00', N'Hóa đơn Bách Hóa Xanh'),
  (94, 4, 2, 1, NULL, 128000, N'Chi', N'2026-11-07T11:15:00', N'Hóa đơn Highlands Coffee'),
  (95, 4, 2, 6, NULL, 155000, N'Chi', N'2026-11-10T12:15:00', N'Hóa đơn Nhà thuốc Long Châu'),
  (96, 4, 2, 3, NULL, 322000, N'Chi', N'2026-11-13T13:15:00', N'Hóa đơn Điện Máy Xanh'),
  (97, 4, 2, 1, NULL, 60000, N'Chi', N'2026-11-16T14:15:00', N'Hóa đơn Circle K'),
  (98, 4, 2, 1, NULL, 120000, N'Chi', N'2026-11-16T15:15:00', N'Hóa đơn Phở Hà Nội'),
  (99, 4, 2, 7, NULL, 258000, N'Chi', N'2026-11-16T16:15:00', N'Hóa đơn Nhà sách Fahasa'),
  (100, 4, 2, 3, NULL, 375000, N'Chi', N'2026-11-16T17:15:00', N'Hóa đơn Lotte Mart');
INSERT INTO dbo.GiaoDich (maGiaoDich, maTaiKhoan, maVi, maDanhMuc, maMucTieu, soTien, loai, ngayGiaoDich, ghiChu) VALUES
  (101, 5, 5, 9, NULL, 12000000, N'Thu', N'2026-09-01T08:00:00', N'Lương tháng'),
  (102, 5, 4, 1, NULL, 360000, N'Chi', N'2026-09-22T16:56:00', N'Ăn uống'),
  (103, 5, 4, 1, NULL, 360000, N'Chi', N'2026-09-14T16:56:00', N'Ăn uống'),
  (104, 5, 5, 2, NULL, 290000, N'Chi', N'2026-09-22T12:04:00', N'Đi lại'),
  (105, 5, 5, 2, NULL, 290000, N'Chi', N'2026-09-08T08:00:00', N'Đi lại'),
  (106, 5, 5, 4, NULL, 290000, N'Chi', N'2026-09-26T12:04:00', N'Hóa đơn'),
  (107, 5, 5, 3, NULL, 290000, N'Chi', N'2026-09-26T16:04:00', N'Mua sắm'),
  (108, 5, 4, 13, NULL, 200000, N'Chi', N'2026-09-18T08:00:00', N'Cà phê'),
  (109, 5, 5, 9, NULL, 12000000, N'Thu', N'2026-10-01T12:48:00', N'Lương tháng'),
  (110, 5, 5, 2, NULL, 290000, N'Chi', N'2026-10-27T16:52:00', N'Đi lại'),
  (111, 5, 5, 2, NULL, 290000, N'Chi', N'2026-10-31T16:08:00', N'Đi lại'),
  (112, 5, 5, 4, NULL, 290000, N'Chi', N'2026-10-25T08:32:00', N'Hóa đơn'),
  (113, 5, 5, 3, NULL, 290000, N'Chi', N'2026-10-11T08:40:00', N'Mua sắm'),
  (114, 5, 5, 9, NULL, 12000000, N'Thu', N'2026-11-01T08:48:00', N'Lương tháng'),
  (115, 5, 5, 2, NULL, 290000, N'Chi', N'2026-11-02T13:36:00', N'Đi lại'),
  (116, 5, 5, 2, NULL, 290000, N'Chi', N'2026-11-02T12:16:00', N'Đi lại'),
  (117, 5, 5, 4, NULL, 290000, N'Chi', N'2026-11-02T16:36:00', N'Hóa đơn'),
  (118, 5, 5, 3, NULL, 290000, N'Chi', N'2026-11-02T12:12:00', N'Mua sắm'),
  (119, 5, 5, 12, 3, 500000, N'Chi', N'2026-11-16T15:15:23', N'Nạp mục tiêu: Mua xe máy'),
  (120, 6, 7, 9, NULL, 9000000, N'Thu', N'2026-09-01T16:28:00', N'Lương tháng'),
  (121, 6, 6, 1, NULL, 270000, N'Chi', N'2026-09-22T08:08:00', N'Ăn uống'),
  (122, 6, 6, 1, NULL, 270000, N'Chi', N'2026-09-04T16:40:00', N'Ăn uống'),
  (123, 6, 6, 1, NULL, 270000, N'Chi', N'2026-09-06T12:52:00', N'Ăn uống'),
  (124, 6, 7, 2, NULL, 220000, N'Chi', N'2026-09-20T16:48:00', N'Đi lại'),
  (125, 6, 7, 2, NULL, 220000, N'Chi', N'2026-09-06T12:04:00', N'Đi lại'),
  (126, 6, 7, 4, NULL, 220000, N'Chi', N'2026-09-16T16:00:00', N'Hóa đơn'),
  (127, 6, 7, 3, NULL, 220000, N'Chi', N'2026-09-02T12:56:00', N'Mua sắm'),
  (128, 6, 7, 9, NULL, 9000000, N'Thu', N'2026-10-01T12:08:00', N'Lương tháng'),
  (129, 6, 7, 2, NULL, 220000, N'Chi', N'2026-10-23T16:48:00', N'Đi lại'),
  (130, 6, 7, 2, NULL, 220000, N'Chi', N'2026-10-03T08:16:00', N'Đi lại'),
  (131, 6, 7, 4, NULL, 220000, N'Chi', N'2026-10-11T16:12:00', N'Hóa đơn'),
  (132, 6, 7, 3, NULL, 220000, N'Chi', N'2026-10-29T12:44:00', N'Mua sắm'),
  (133, 6, 6, 14, NULL, 150000, N'Chi', N'2026-10-13T16:36:00', N'Thú cưng'),
  (134, 6, 7, 9, NULL, 9000000, N'Thu', N'2026-11-01T16:04:00', N'Lương tháng'),
  (135, 6, 7, 2, NULL, 220000, N'Chi', N'2026-11-02T12:40:00', N'Đi lại'),
  (136, 6, 7, 2, NULL, 220000, N'Chi', N'2026-11-02T12:36:00', N'Đi lại'),
  (137, 6, 7, 4, NULL, 220000, N'Chi', N'2026-11-02T12:08:00', N'Hóa đơn'),
  (138, 6, 7, 3, NULL, 220000, N'Chi', N'2026-11-02T16:40:00', N'Mua sắm'),
  (139, 6, 7, 12, 4, 500000, N'Chi', N'2026-11-16T15:15:23', N'Nạp mục tiêu: Quỹ khẩn cấp'),
  (140, 7, 9, 9, NULL, 18000000, N'Thu', N'2026-09-01T08:28:00', N'Lương tháng'),
  (141, 7, 8, 1, NULL, 540000, N'Chi', N'2026-09-12T16:56:00', N'Ăn uống'),
  (142, 7, 9, 2, NULL, 430000, N'Chi', N'2026-09-26T08:24:00', N'Đi lại'),
  (143, 7, 9, 2, NULL, 430000, N'Chi', N'2026-09-24T12:56:00', N'Đi lại'),
  (144, 7, 9, 4, NULL, 430000, N'Chi', N'2026-09-14T12:16:00', N'Hóa đơn'),
  (145, 7, 9, 3, NULL, 430000, N'Chi', N'2026-09-16T12:32:00', N'Mua sắm'),
  (146, 7, 8, 5, NULL, 430000, N'Chi', N'2026-09-12T16:20:00', N'Giải trí'),
  (147, 7, 9, 9, NULL, 18000000, N'Thu', N'2026-10-01T12:08:00', N'Lương tháng'),
  (148, 7, 9, 2, NULL, 430000, N'Chi', N'2026-10-16T12:00:00', N'Đi lại'),
  (149, 7, 9, 2, NULL, 430000, N'Chi', N'2026-10-30T12:04:00', N'Đi lại'),
  (150, 7, 9, 4, NULL, 430000, N'Chi', N'2026-10-31T08:48:00', N'Hóa đơn');
INSERT INTO dbo.GiaoDich (maGiaoDich, maTaiKhoan, maVi, maDanhMuc, maMucTieu, soTien, loai, ngayGiaoDich, ghiChu) VALUES
  (151, 7, 9, 3, NULL, 430000, N'Chi', N'2026-10-14T16:44:00', N'Mua sắm'),
  (152, 7, 9, 9, NULL, 18000000, N'Thu', N'2026-11-01T08:00:00', N'Lương tháng'),
  (153, 7, 9, 2, NULL, 430000, N'Chi', N'2026-11-02T12:08:00', N'Đi lại'),
  (154, 7, 9, 2, NULL, 430000, N'Chi', N'2026-11-02T12:24:00', N'Đi lại'),
  (155, 7, 9, 4, NULL, 430000, N'Chi', N'2026-11-02T12:48:00', N'Hóa đơn'),
  (156, 7, 9, 3, NULL, 430000, N'Chi', N'2026-11-02T12:44:00', N'Mua sắm'),
  (157, 7, 9, 12, 5, 500000, N'Chi', N'2026-11-16T15:15:24', N'Nạp mục tiêu: Du lịch Nhật Bản'),
  (158, 8, 11, 9, NULL, 7500000, N'Thu', N'2026-09-01T08:36:00', N'Lương tháng'),
  (159, 8, 10, 1, NULL, 230000, N'Chi', N'2026-09-14T12:52:00', N'Ăn uống'),
  (160, 8, 10, 1, NULL, 230000, N'Chi', N'2026-09-28T16:16:00', N'Ăn uống'),
  (161, 8, 10, 1, NULL, 230000, N'Chi', N'2026-09-08T16:24:00', N'Ăn uống'),
  (162, 8, 10, 1, NULL, 230000, N'Chi', N'2026-09-12T16:40:00', N'Ăn uống'),
  (163, 8, 11, 2, NULL, 180000, N'Chi', N'2026-09-10T12:48:00', N'Đi lại'),
  (164, 8, 11, 2, NULL, 180000, N'Chi', N'2026-09-28T08:12:00', N'Đi lại'),
  (165, 8, 11, 4, NULL, 180000, N'Chi', N'2026-09-12T12:12:00', N'Hóa đơn'),
  (166, 8, 11, 3, NULL, 210000, N'Chi', N'2026-09-14T16:04:00', N'Mua sắm'),
  (167, 8, 11, 9, NULL, 7500000, N'Thu', N'2026-10-01T16:36:00', N'Lương tháng'),
  (168, 8, 11, 2, NULL, 180000, N'Chi', N'2026-10-28T16:28:00', N'Đi lại'),
  (169, 8, 11, 2, NULL, 180000, N'Chi', N'2026-10-27T12:20:00', N'Đi lại'),
  (170, 8, 11, 4, NULL, 180000, N'Chi', N'2026-10-15T08:00:00', N'Hóa đơn'),
  (171, 8, 11, 3, NULL, 180000, N'Chi', N'2026-10-31T12:56:00', N'Mua sắm'),
  (172, 8, 11, 9, NULL, 7500000, N'Thu', N'2026-11-01T12:00:00', N'Lương tháng'),
  (173, 8, 11, 2, NULL, 180000, N'Chi', N'2026-11-02T08:56:00', N'Đi lại'),
  (174, 8, 11, 2, NULL, 180000, N'Chi', N'2026-11-02T16:04:00', N'Đi lại'),
  (175, 8, 11, 4, NULL, 180000, N'Chi', N'2026-11-02T08:44:00', N'Hóa đơn'),
  (176, 8, 11, 3, NULL, 180000, N'Chi', N'2026-11-02T08:52:00', N'Mua sắm'),
  (177, 8, 11, 12, 6, 500000, N'Chi', N'2026-11-16T15:15:24', N'Nạp mục tiêu: Mua điện thoại'),
  (178, 9, 13, 9, NULL, 14000000, N'Thu', N'2026-09-01T16:00:00', N'Lương tháng'),
  (179, 9, 12, 1, NULL, 420000, N'Chi', N'2026-09-20T08:12:00', N'Ăn uống'),
  (180, 9, 12, 1, NULL, 420000, N'Chi', N'2026-09-14T08:16:00', N'Ăn uống'),
  (181, 9, 13, 2, NULL, 340000, N'Chi', N'2026-09-12T08:00:00', N'Đi lại'),
  (182, 9, 13, 2, NULL, 340000, N'Chi', N'2026-09-16T16:24:00', N'Đi lại'),
  (183, 9, 13, 4, NULL, 340000, N'Chi', N'2026-09-02T08:08:00', N'Hóa đơn'),
  (184, 9, 13, 3, NULL, 340000, N'Chi', N'2026-09-02T12:24:00', N'Mua sắm'),
  (185, 9, 13, 9, NULL, 14000000, N'Thu', N'2026-10-01T12:36:00', N'Lương tháng'),
  (186, 9, 13, 2, NULL, 340000, N'Chi', N'2026-10-04T08:40:00', N'Đi lại'),
  (187, 9, 13, 2, NULL, 340000, N'Chi', N'2026-10-19T12:20:00', N'Đi lại'),
  (188, 9, 13, 4, NULL, 340000, N'Chi', N'2026-10-26T12:24:00', N'Hóa đơn'),
  (189, 9, 13, 3, NULL, 340000, N'Chi', N'2026-10-27T16:36:00', N'Mua sắm'),
  (190, 9, 12, 17, NULL, 100000, N'Chi', N'2026-10-12T16:08:00', N'Làm đẹp'),
  (191, 9, 13, 9, NULL, 14000000, N'Thu', N'2026-11-01T08:52:00', N'Lương tháng'),
  (192, 9, 13, 2, NULL, 340000, N'Chi', N'2026-11-02T12:40:00', N'Đi lại'),
  (193, 9, 13, 2, NULL, 340000, N'Chi', N'2026-11-02T08:44:00', N'Đi lại'),
  (194, 9, 13, 4, NULL, 340000, N'Chi', N'2026-11-02T12:48:00', N'Hóa đơn'),
  (195, 9, 13, 3, NULL, 340000, N'Chi', N'2026-11-02T08:48:00', N'Mua sắm'),
  (196, 9, 13, 12, 7, 500000, N'Chi', N'2026-11-16T15:15:24', N'Nạp mục tiêu: Học thạc sĩ'),
  (197, 10, 15, 9, NULL, 10000000, N'Thu', N'2026-09-01T12:08:00', N'Lương tháng'),
  (198, 10, 14, 1, NULL, 300000, N'Chi', N'2026-09-12T12:52:00', N'Ăn uống'),
  (199, 10, 14, 1, NULL, 300000, N'Chi', N'2026-09-26T08:44:00', N'Ăn uống'),
  (200, 10, 14, 1, NULL, 300000, N'Chi', N'2026-09-26T08:08:00', N'Ăn uống');
INSERT INTO dbo.GiaoDich (maGiaoDich, maTaiKhoan, maVi, maDanhMuc, maMucTieu, soTien, loai, ngayGiaoDich, ghiChu) VALUES
  (201, 10, 15, 2, NULL, 240000, N'Chi', N'2026-09-30T08:48:00', N'Đi lại'),
  (202, 10, 15, 2, NULL, 240000, N'Chi', N'2026-09-08T08:56:00', N'Đi lại'),
  (203, 10, 15, 4, NULL, 240000, N'Chi', N'2026-09-16T08:32:00', N'Hóa đơn'),
  (204, 10, 15, 3, NULL, 240000, N'Chi', N'2026-09-10T16:56:00', N'Mua sắm'),
  (205, 10, 14, 18, NULL, 100000, N'Chi', N'2026-09-12T08:36:00', N'Quà tặng'),
  (206, 10, 15, 9, NULL, 10000000, N'Thu', N'2026-10-01T12:28:00', N'Lương tháng'),
  (207, 10, 15, 2, NULL, 240000, N'Chi', N'2026-10-17T08:52:00', N'Đi lại'),
  (208, 10, 15, 2, NULL, 240000, N'Chi', N'2026-10-09T08:00:00', N'Đi lại'),
  (209, 10, 15, 4, NULL, 240000, N'Chi', N'2026-10-07T16:44:00', N'Hóa đơn'),
  (210, 10, 15, 3, NULL, 240000, N'Chi', N'2026-10-11T08:12:00', N'Mua sắm'),
  (211, 10, 15, 9, NULL, 10000000, N'Thu', N'2026-11-01T08:04:00', N'Lương tháng'),
  (212, 10, 15, 2, NULL, 240000, N'Chi', N'2026-11-02T12:04:00', N'Đi lại'),
  (213, 10, 15, 2, NULL, 240000, N'Chi', N'2026-11-02T12:28:00', N'Đi lại'),
  (214, 10, 15, 4, NULL, 240000, N'Chi', N'2026-11-02T12:08:00', N'Hóa đơn'),
  (215, 10, 15, 3, NULL, 240000, N'Chi', N'2026-11-02T16:44:00', N'Mua sắm'),
  (216, 10, 15, 12, 8, 500000, N'Chi', N'2026-11-16T15:15:25', N'Nạp mục tiêu: Mua laptop'),
  (217, 11, 17, 9, NULL, 8000000, N'Thu', N'2026-09-01T16:00:00', N'Lương tháng'),
  (218, 11, 16, 1, NULL, 240000, N'Chi', N'2026-09-12T16:40:00', N'Ăn uống'),
  (219, 11, 16, 1, NULL, 240000, N'Chi', N'2026-09-30T16:44:00', N'Ăn uống'),
  (220, 11, 16, 1, NULL, 240000, N'Chi', N'2026-09-24T08:28:00', N'Ăn uống'),
  (221, 11, 16, 1, NULL, 240000, N'Chi', N'2026-09-30T16:20:00', N'Ăn uống'),
  (222, 11, 17, 2, NULL, 190000, N'Chi', N'2026-09-12T12:52:00', N'Đi lại'),
  (223, 11, 17, 2, NULL, 190000, N'Chi', N'2026-09-28T16:40:00', N'Đi lại'),
  (224, 11, 17, 4, NULL, 190000, N'Chi', N'2026-09-10T16:28:00', N'Hóa đơn'),
  (225, 11, 17, 3, NULL, 190000, N'Chi', N'2026-09-24T12:36:00', N'Mua sắm'),
  (226, 11, 17, 9, NULL, 8000000, N'Thu', N'2026-10-01T16:12:00', N'Lương tháng'),
  (227, 11, 17, 2, NULL, 190000, N'Chi', N'2026-10-24T12:32:00', N'Đi lại'),
  (228, 11, 17, 2, NULL, 190000, N'Chi', N'2026-10-31T16:24:00', N'Đi lại'),
  (229, 11, 17, 4, NULL, 190000, N'Chi', N'2026-10-03T16:16:00', N'Hóa đơn'),
  (230, 11, 17, 3, NULL, 190000, N'Chi', N'2026-10-24T12:44:00', N'Mua sắm'),
  (231, 11, 17, 9, NULL, 8000000, N'Thu', N'2026-11-01T12:48:00', N'Lương tháng'),
  (232, 11, 17, 2, NULL, 190000, N'Chi', N'2026-11-02T08:44:00', N'Đi lại'),
  (233, 11, 17, 2, NULL, 190000, N'Chi', N'2026-11-02T08:12:00', N'Đi lại'),
  (234, 11, 17, 4, NULL, 190000, N'Chi', N'2026-11-02T12:56:00', N'Hóa đơn'),
  (235, 11, 17, 3, NULL, 190000, N'Chi', N'2026-11-02T16:40:00', N'Mua sắm'),
  (236, 11, 17, 12, 9, 500000, N'Chi', N'2026-11-16T15:15:25', N'Nạp mục tiêu: Đám cưới'),
  (237, 12, 19, 9, NULL, 11000000, N'Thu', N'2026-09-01T08:32:00', N'Lương tháng'),
  (238, 12, 18, 1, NULL, 330000, N'Chi', N'2026-09-24T08:20:00', N'Ăn uống'),
  (239, 12, 18, 1, NULL, 330000, N'Chi', N'2026-09-12T12:48:00', N'Ăn uống'),
  (240, 12, 18, 1, NULL, 330000, N'Chi', N'2026-09-28T08:24:00', N'Ăn uống'),
  (241, 12, 19, 2, NULL, 260000, N'Chi', N'2026-09-30T12:44:00', N'Đi lại'),
  (242, 12, 19, 2, NULL, 260000, N'Chi', N'2026-09-08T08:24:00', N'Đi lại'),
  (243, 12, 19, 4, NULL, 260000, N'Chi', N'2026-09-02T08:32:00', N'Hóa đơn'),
  (244, 12, 19, 3, NULL, 260000, N'Chi', N'2026-09-14T08:48:00', N'Mua sắm'),
  (245, 12, 19, 9, NULL, 11000000, N'Thu', N'2026-10-01T08:20:00', N'Lương tháng'),
  (246, 12, 19, 2, NULL, 260000, N'Chi', N'2026-10-20T16:04:00', N'Đi lại'),
  (247, 12, 19, 2, NULL, 260000, N'Chi', N'2026-10-02T16:24:00', N'Đi lại'),
  (248, 12, 19, 4, NULL, 260000, N'Chi', N'2026-10-25T16:12:00', N'Hóa đơn'),
  (249, 12, 19, 3, NULL, 260000, N'Chi', N'2026-10-15T16:28:00', N'Mua sắm'),
  (250, 12, 19, 9, NULL, 11000000, N'Thu', N'2026-11-01T12:04:00', N'Lương tháng');
INSERT INTO dbo.GiaoDich (maGiaoDich, maTaiKhoan, maVi, maDanhMuc, maMucTieu, soTien, loai, ngayGiaoDich, ghiChu) VALUES
  (251, 12, 19, 2, NULL, 260000, N'Chi', N'2026-11-02T08:40:00', N'Đi lại'),
  (252, 12, 19, 2, NULL, 260000, N'Chi', N'2026-11-02T12:16:00', N'Đi lại'),
  (253, 12, 19, 4, NULL, 260000, N'Chi', N'2026-11-02T12:12:00', N'Hóa đơn'),
  (254, 12, 19, 3, NULL, 260000, N'Chi', N'2026-11-02T16:32:00', N'Mua sắm'),
  (255, 12, 19, 12, 10, 500000, N'Chi', N'2026-11-16T15:15:26', N'Nạp mục tiêu: Sửa nhà');
SET IDENTITY_INSERT dbo.GiaoDich OFF;
GO

/* ChuyenTien: Chuyển tiền giữa các ví (10 dòng) */
SET IDENTITY_INSERT dbo.ChuyenTien ON;
INSERT INTO dbo.ChuyenTien (maChuyenTien, maTaiKhoan, maViNguon, maViDich, soTien, ngayChuyen, ghiChu) VALUES
  (1, 4, 2, 1, 2000000, N'2026-11-16T15:15:23', N'Rút tiền mặt'),
  (2, 4, 2, 3, 500000, N'2026-11-16T15:15:23', N'Nạp Momo'),
  (3, 5, 5, 4, 1000000, N'2026-11-16T15:15:23', N'Rút tiền mặt'),
  (4, 6, 7, 6, 1000000, N'2026-11-16T15:15:23', N'Rút tiền mặt'),
  (5, 7, 9, 8, 1000000, N'2026-11-16T15:15:24', N'Rút tiền mặt'),
  (6, 8, 11, 10, 1000000, N'2026-11-16T15:15:24', N'Rút tiền mặt'),
  (7, 9, 13, 12, 1000000, N'2026-11-16T15:15:24', N'Rút tiền mặt'),
  (8, 10, 15, 14, 1000000, N'2026-11-16T15:15:25', N'Rút tiền mặt'),
  (9, 11, 17, 16, 1000000, N'2026-11-16T15:15:25', N'Rút tiền mặt'),
  (10, 12, 19, 18, 1000000, N'2026-11-16T15:15:25', N'Rút tiền mặt');
SET IDENTITY_INSERT dbo.ChuyenTien OFF;
GO

/* GiaoDichDinhKy: Lịch giao dịch định kỳ hằng tháng (15 dòng) */
SET IDENTITY_INSERT dbo.GiaoDichDinhKy ON;
INSERT INTO dbo.GiaoDichDinhKy (maDinhKy, maTaiKhoan, maVi, maDanhMuc, soTien, loai, ngayTrongThang, ghiChu, dangBat, thangDaChay, ngayTao) VALUES
  (1, 4, 2, 9, 15000000, N'Thu', 1, N'Lương tháng', 1, N'2026-11', N'2026-11-16T15:15:23'),
  (2, 4, 2, 4, 450000, N'Chi', 15, N'Tiền điện nước, internet', 1, N'2026-11', N'2026-11-16T15:15:23'),
  (3, 4, 3, 7, 300000, N'Chi', 20, N'Học phí tiếng Anh', 1, NULL, N'2026-11-16T15:15:23'),
  (4, 5, 5, 9, 12000000, N'Thu', 1, N'Lương tháng', 1, N'2026-11', N'2026-11-16T15:15:23'),
  (5, 5, 5, 4, 300000, N'Chi', 10, N'Điện nước', 1, N'2026-11', N'2026-11-16T15:15:23'),
  (6, 6, 7, 9, 9000000, N'Thu', 1, N'Lương tháng', 1, N'2026-11', N'2026-11-16T15:15:23'),
  (7, 7, 9, 9, 18000000, N'Thu', 1, N'Lương tháng', 1, N'2026-11', N'2026-11-16T15:15:24'),
  (8, 7, 9, 4, 400000, N'Chi', 10, N'Điện nước', 1, N'2026-11', N'2026-11-16T15:15:24'),
  (9, 8, 11, 9, 7500000, N'Thu', 1, N'Lương tháng', 1, N'2026-11', N'2026-11-16T15:15:24'),
  (10, 9, 13, 9, 14000000, N'Thu', 1, N'Lương tháng', 1, N'2026-11', N'2026-11-16T15:15:24'),
  (11, 9, 13, 4, 500000, N'Chi', 10, N'Điện nước', 1, N'2026-11', N'2026-11-16T15:15:24'),
  (12, 10, 15, 9, 10000000, N'Thu', 1, N'Lương tháng', 1, N'2026-11', N'2026-11-16T15:15:25'),
  (13, 11, 17, 9, 8000000, N'Thu', 1, N'Lương tháng', 1, N'2026-11', N'2026-11-16T15:15:25'),
  (14, 11, 17, 4, 600000, N'Chi', 10, N'Điện nước', 1, N'2026-11', N'2026-11-16T15:15:25'),
  (15, 12, 19, 9, 11000000, N'Thu', 1, N'Lương tháng', 1, N'2026-11', N'2026-11-16T15:15:26');
SET IDENTITY_INSERT dbo.GiaoDichDinhKy OFF;
GO

/* HoaDon: Hóa đơn của giao dịch quét từ ảnh (9 dòng) */
SET IDENTITY_INSERT dbo.HoaDon ON;
INSERT INTO dbo.HoaDon (maHoaDon, maGiaoDich, tenCuaHang, ngayHoaDon, tongTien, anhHoaDon) VALUES
  (1, 92, N'Siêu thị Co.opmart', N'2026-11-01T09:15:00', 308000, N''),
  (2, 93, N'Bách Hóa Xanh', N'2026-11-04T10:15:00', 137000, N''),
  (3, 94, N'Highlands Coffee', N'2026-11-07T11:15:00', 128000, N''),
  (4, 95, N'Nhà thuốc Long Châu', N'2026-11-10T12:15:00', 155000, N''),
  (5, 96, N'Điện Máy Xanh', N'2026-11-13T13:15:00', 322000, N''),
  (6, 97, N'Circle K', N'2026-11-16T14:15:00', 60000, N''),
  (7, 98, N'Phở Hà Nội', N'2026-11-16T15:15:00', 120000, N''),
  (8, 99, N'Nhà sách Fahasa', N'2026-11-16T16:15:00', 258000, N''),
  (9, 100, N'Lotte Mart', N'2026-11-16T17:15:00', 375000, N'');
SET IDENTITY_INSERT dbo.HoaDon OFF;
GO

/* ChiTietHoaDon: Mặt hàng trong hóa đơn (20 dòng) */
SET IDENTITY_INSERT dbo.ChiTietHoaDon ON;
INSERT INTO dbo.ChiTietHoaDon (maChiTiet, maHoaDon, tenMatHang, soLuong, donGia) VALUES
  (1, 1, N'Gạo ST25 5kg', 1, 180000),
  (2, 1, N'Dầu ăn', 2, 45000),
  (3, 1, N'Trứng gà (10 quả)', 1, 38000),
  (4, 2, N'Rau củ các loại', 1, 62000),
  (5, 2, N'Thịt heo 500g', 1, 75000),
  (6, 3, N'Phin sữa đá', 2, 39000),
  (7, 3, N'Bánh mì que', 2, 25000),
  (8, 4, N'Vitamin C', 1, 120000),
  (9, 4, N'Khẩu trang (hộp)', 1, 35000),
  (10, 5, N'Bóng đèn LED', 3, 59000),
  (11, 5, N'Ổ cắm điện', 1, 145000),
  (12, 6, N'Nước suối', 3, 10000),
  (13, 6, N'Mì ly', 2, 15000),
  (14, 7, N'Phở bò tái', 2, 55000),
  (15, 7, N'Trà đá', 2, 5000),
  (16, 8, N'Sách UML Distilled', 1, 210000),
  (17, 8, N'Bút bi (hộp)', 1, 48000),
  (18, 9, N'Sữa tươi 1L', 4, 32000),
  (19, 9, N'Bánh quy', 2, 41000),
  (20, 9, N'Nước giặt', 1, 165000);
SET IDENTITY_INSERT dbo.ChiTietHoaDon OFF;
GO

/* NganSach: Ngân sách theo danh mục và tháng (gồm các ngân sách do kế hoạch tháng tạo) (54 dòng) */
SET IDENTITY_INSERT dbo.NganSach ON;
INSERT INTO dbo.NganSach (maNganSach, maTaiKhoan, maDanhMuc, hanMuc, thang, nam, nguongCanhBao, daCanhBaoNguong, daCanhBaoVuot) VALUES
  (1, 4, 1, 1100000, 11, 2026, 80, 1, 1),
  (2, 4, 3, 1900000, 11, 2026, 80, 1, 1),
  (3, 4, 2, 300000, 11, 2026, 80, 0, 0),
  (4, 4, 3, 1500000, 9, 2026, 80, 1, 0),
  (5, 4, 4, 4500000, 9, 2026, 80, 0, 0),
  (6, 4, 5, 1500000, 9, 2026, 80, 0, 0),
  (7, 4, 7, 3000000, 9, 2026, 80, 0, 0),
  (8, 4, 8, 1500000, 9, 2026, 80, 0, 0),
  (9, 4, 1, 1570000, 10, 2026, 80, 0, 0),
  (10, 4, 2, 390000, 10, 2026, 80, 0, 0),
  (11, 4, 3, 2530000, 10, 2026, 80, 1, 1),
  (12, 4, 4, 3310000, 10, 2026, 80, 0, 0),
  (13, 4, 5, 1960000, 10, 2026, 80, 0, 0),
  (14, 4, 7, 2210000, 10, 2026, 80, 0, 0),
  (15, 4, 4, 450000, 11, 2026, 80, 0, 0),
  (16, 4, 5, 450000, 11, 2026, 80, 1, 1),
  (17, 4, 7, 300000, 11, 2026, 80, 1, 0),
  (18, 5, 1, 250000, 11, 2026, 80, 0, 0),
  (19, 5, 2, 400000, 11, 2026, 80, 1, 1),
  (20, 5, 3, 200000, 11, 2026, 80, 1, 1),
  (21, 5, 4, 300000, 11, 2026, 80, 1, 0),
  (22, 5, 13, 100000, 11, 2026, 80, 0, 0),
  (23, 6, 1, 1710000, 11, 2026, 80, 0, 0),
  (24, 6, 2, 1850000, 11, 2026, 80, 0, 0),
  (25, 6, 3, 2010000, 11, 2026, 80, 0, 0),
  (26, 6, 4, 920000, 11, 2026, 80, 0, 0),
  (27, 6, 14, 680000, 11, 2026, 80, 0, 0),
  (28, 7, 1, 200000, 11, 2026, 80, 0, 0),
  (29, 7, 2, 600000, 11, 2026, 80, 1, 1),
  (30, 7, 3, 300000, 11, 2026, 80, 1, 1),
  (31, 7, 4, 400000, 11, 2026, 80, 1, 1),
  (32, 7, 5, 150000, 11, 2026, 80, 0, 0),
  (33, 8, 1, 1720000, 11, 2026, 80, 0, 0),
  (34, 8, 2, 1340000, 11, 2026, 80, 0, 0),
  (35, 8, 3, 2250000, 11, 2026, 80, 0, 0),
  (36, 8, 4, 670000, 11, 2026, 80, 0, 0),
  (37, 9, 1, 300000, 11, 2026, 80, 0, 0),
  (38, 9, 2, 500000, 11, 2026, 80, 1, 1),
  (39, 9, 3, 250000, 11, 2026, 80, 1, 1),
  (40, 9, 4, 500000, 11, 2026, 80, 0, 0),
  (41, 9, 17, 50000, 11, 2026, 80, 0, 0),
  (42, 10, 1, 1920000, 11, 2026, 80, 0, 0),
  (43, 10, 2, 2050000, 11, 2026, 80, 0, 0),
  (44, 10, 3, 2480000, 11, 2026, 80, 0, 0),
  (45, 10, 4, 1020000, 11, 2026, 80, 0, 0),
  (46, 10, 18, 510000, 11, 2026, 80, 0, 0),
  (47, 11, 1, 330000, 11, 2026, 80, 0, 0),
  (48, 11, 2, 280000, 11, 2026, 80, 1, 1),
  (49, 11, 3, 140000, 11, 2026, 80, 1, 1),
  (50, 11, 4, 600000, 11, 2026, 80, 0, 0);
INSERT INTO dbo.NganSach (maNganSach, maTaiKhoan, maDanhMuc, hanMuc, thang, nam, nguongCanhBao, daCanhBaoNguong, daCanhBaoVuot) VALUES
  (51, 12, 1, 2130000, 11, 2026, 80, 0, 0),
  (52, 12, 2, 2240000, 11, 2026, 80, 0, 0),
  (53, 12, 3, 3300000, 11, 2026, 80, 0, 0),
  (54, 12, 4, 1120000, 11, 2026, 80, 0, 0);
SET IDENTITY_INSERT dbo.NganSach OFF;
GO

/* KeHoachThang: Kế hoạch tài chính tháng (11 dòng) */
SET IDENTITY_INSERT dbo.KeHoachThang ON;
INSERT INTO dbo.KeHoachThang (maKeHoach, maTaiKhoan, thang, nam, thuNhapDuKien, tietKiemDuKien, phuongPhap, ngayLap) VALUES
  (1, 4, 9, 2026, 15000000, 3000000, N'50-30-20', N'2026-11-16T15:15:26'),
  (2, 4, 10, 2026, 15000000, 3000000, N'50-30-20', N'2026-11-16T15:15:26'),
  (3, 4, 11, 2026, 15000000, 3500000, N'LichSu', N'2026-11-16T15:15:26'),
  (4, 5, 11, 2026, 12000000, 4920000, N'LichSu', N'2026-11-16T15:15:26'),
  (5, 6, 11, 2026, 9000000, 1800000, N'50-30-20', N'2026-11-16T15:15:26'),
  (6, 7, 11, 2026, 18000000, 5570000, N'LichSu', N'2026-11-16T15:15:26'),
  (7, 8, 11, 2026, 7500000, 1500000, N'50-30-20', N'2026-11-16T15:15:26'),
  (8, 9, 11, 2026, 14000000, 5950000, N'LichSu', N'2026-11-16T15:15:27'),
  (9, 10, 11, 2026, 10000000, 2000000, N'50-30-20', N'2026-11-16T15:15:27'),
  (10, 11, 11, 2026, 8000000, 6630000, N'LichSu', N'2026-11-16T15:15:27'),
  (11, 12, 11, 2026, 11000000, 2200000, N'50-30-20', N'2026-11-16T15:15:27');
SET IDENTITY_INSERT dbo.KeHoachThang OFF;
GO

/* ThongBao: Thông báo (31 dòng) */
SET IDENTITY_INSERT dbo.ThongBao ON;
INSERT INTO dbo.ThongBao (maThongBao, maTaiKhoan, loai, noiDung, daDoc, ngayTao) VALUES
  (1, 4, N'CanhBaoNganSach', N'Ngân sách Ăn uống tháng 11/2026 đã dùng 85%', 0, N'2026-11-16T15:15:22'),
  (2, 4, N'CanhBaoNganSach', N'Ngân sách Mua sắm tháng 11/2026 đã vượt hạn mức', 0, N'2026-11-16T15:15:22'),
  (3, 4, N'CanhBaoNganSach', N'Ngân sách Ăn uống tháng 11/2026 đã vượt hạn mức', 0, N'2026-11-16T15:15:23'),
  (4, 4, N'TongKetThang', N'Tổng kết tháng 09/2026: thu 16.000.000đ, chi 3.140.000đ, 0 danh mục vượt ngân sách.', 0, N'2026-11-16T15:15:27'),
  (5, 5, N'TongKetThang', N'Tổng kết tháng 09/2026: thu 12.000.000đ, chi 2.080.000đ, 0 danh mục vượt ngân sách.', 0, N'2026-11-16T15:15:27'),
  (6, 5, N'TongKetThang', N'Bạn chưa lập ngân sách cho tháng 10/2026. Hãy lập ngân sách tháng mới!', 0, N'2026-11-16T15:15:27'),
  (7, 6, N'TongKetThang', N'Tổng kết tháng 09/2026: thu 9.000.000đ, chi 1.690.000đ, 0 danh mục vượt ngân sách.', 0, N'2026-11-16T15:15:27'),
  (8, 6, N'TongKetThang', N'Bạn chưa lập ngân sách cho tháng 10/2026. Hãy lập ngân sách tháng mới!', 0, N'2026-11-16T15:15:27'),
  (9, 7, N'TongKetThang', N'Tổng kết tháng 09/2026: thu 18.000.000đ, chi 2.690.000đ, 0 danh mục vượt ngân sách.', 0, N'2026-11-16T15:15:27'),
  (10, 7, N'TongKetThang', N'Bạn chưa lập ngân sách cho tháng 10/2026. Hãy lập ngân sách tháng mới!', 0, N'2026-11-16T15:15:27'),
  (11, 8, N'TongKetThang', N'Tổng kết tháng 09/2026: thu 7.500.000đ, chi 1.670.000đ, 0 danh mục vượt ngân sách.', 0, N'2026-11-16T15:15:27'),
  (12, 8, N'TongKetThang', N'Bạn chưa lập ngân sách cho tháng 10/2026. Hãy lập ngân sách tháng mới!', 0, N'2026-11-16T15:15:27'),
  (13, 9, N'TongKetThang', N'Tổng kết tháng 09/2026: thu 14.000.000đ, chi 2.200.000đ, 0 danh mục vượt ngân sách.', 0, N'2026-11-16T15:15:27'),
  (14, 9, N'TongKetThang', N'Bạn chưa lập ngân sách cho tháng 10/2026. Hãy lập ngân sách tháng mới!', 0, N'2026-11-16T15:15:27'),
  (15, 10, N'TongKetThang', N'Tổng kết tháng 09/2026: thu 10.000.000đ, chi 1.960.000đ, 0 danh mục vượt ngân sách.', 0, N'2026-11-16T15:15:27'),
  (16, 10, N'TongKetThang', N'Bạn chưa lập ngân sách cho tháng 10/2026. Hãy lập ngân sách tháng mới!', 0, N'2026-11-16T15:15:27'),
  (17, 11, N'TongKetThang', N'Tổng kết tháng 09/2026: thu 8.000.000đ, chi 1.720.000đ, 0 danh mục vượt ngân sách.', 0, N'2026-11-16T15:15:27'),
  (18, 11, N'TongKetThang', N'Bạn chưa lập ngân sách cho tháng 10/2026. Hãy lập ngân sách tháng mới!', 0, N'2026-11-16T15:15:27'),
  (19, 12, N'TongKetThang', N'Tổng kết tháng 09/2026: thu 11.000.000đ, chi 2.030.000đ, 0 danh mục vượt ngân sách.', 0, N'2026-11-16T15:15:27'),
  (20, 12, N'TongKetThang', N'Bạn chưa lập ngân sách cho tháng 10/2026. Hãy lập ngân sách tháng mới!', 0, N'2026-11-16T15:15:27'),
  (21, 4, N'TongKetThang', N'Tổng kết tháng 10/2026: thu 17.000.000đ, chi 11.600.000đ, 1 danh mục vượt ngân sách.', 0, N'2026-11-16T15:15:27'),
  (22, 5, N'TongKetThang', N'Tổng kết tháng 10/2026: thu 12.000.000đ, chi 1.160.000đ, 0 danh mục vượt ngân sách.', 0, N'2026-11-16T15:15:27'),
  (23, 6, N'TongKetThang', N'Tổng kết tháng 10/2026: thu 9.000.000đ, chi 1.030.000đ, 0 danh mục vượt ngân sách.', 0, N'2026-11-16T15:15:27'),
  (24, 7, N'TongKetThang', N'Tổng kết tháng 10/2026: thu 18.000.000đ, chi 1.720.000đ, 0 danh mục vượt ngân sách.', 0, N'2026-11-16T15:15:27'),
  (25, 8, N'TongKetThang', N'Tổng kết tháng 10/2026: thu 7.500.000đ, chi 720.000đ, 0 danh mục vượt ngân sách.', 0, N'2026-11-16T15:15:27'),
  (26, 9, N'TongKetThang', N'Tổng kết tháng 10/2026: thu 14.000.000đ, chi 1.460.000đ, 0 danh mục vượt ngân sách.', 0, N'2026-11-16T15:15:27'),
  (27, 10, N'TongKetThang', N'Tổng kết tháng 10/2026: thu 10.000.000đ, chi 960.000đ, 0 danh mục vượt ngân sách.', 0, N'2026-11-16T15:15:27'),
  (28, 11, N'TongKetThang', N'Tổng kết tháng 10/2026: thu 8.000.000đ, chi 760.000đ, 0 danh mục vượt ngân sách.', 0, N'2026-11-16T15:15:27'),
  (29, 12, N'TongKetThang', N'Tổng kết tháng 10/2026: thu 11.000.000đ, chi 1.040.000đ, 0 danh mục vượt ngân sách.', 0, N'2026-11-16T15:15:27'),
  (30, 12, N'TongKetThang', N'Tài khoản của bạn đã bị khóa. Lý do: Tài khoản dùng chung, vi phạm điều khoản sử dụng', 0, N'2026-11-16T15:15:27'),
  (31, 4, N'HoTro', N'Hỗ trợ: Chào bạn, nhóm hỗ trợ đã kiểm tra: bạn có thể dùng trang Kế hoạch để lập ngân sách cả tháng chỉ với một lần bấm.', 0, N'2026-11-16T15:15:27');
SET IDENTITY_INSERT dbo.ThongBao OFF;
GO

/* BaoCaoThang: Báo cáo tổng kết tháng (18 dòng) */
SET IDENTITY_INSERT dbo.BaoCaoThang ON;
INSERT INTO dbo.BaoCaoThang (maBaoCao, maTaiKhoan, thang, nam, tongThu, tongChi, soDanhMucVuot, ngayLap) VALUES
  (1, 4, 9, 2026, 16000000, 3140000, 0, N'2026-11-16T15:15:27'),
  (2, 5, 9, 2026, 12000000, 2080000, 0, N'2026-11-16T15:15:27'),
  (3, 6, 9, 2026, 9000000, 1690000, 0, N'2026-11-16T15:15:27'),
  (4, 7, 9, 2026, 18000000, 2690000, 0, N'2026-11-16T15:15:27'),
  (5, 8, 9, 2026, 7500000, 1670000, 0, N'2026-11-16T15:15:27'),
  (6, 9, 9, 2026, 14000000, 2200000, 0, N'2026-11-16T15:15:27'),
  (7, 10, 9, 2026, 10000000, 1960000, 0, N'2026-11-16T15:15:27'),
  (8, 11, 9, 2026, 8000000, 1720000, 0, N'2026-11-16T15:15:27'),
  (9, 12, 9, 2026, 11000000, 2030000, 0, N'2026-11-16T15:15:27'),
  (10, 4, 10, 2026, 17000000, 11600000, 1, N'2026-11-16T15:15:27'),
  (11, 5, 10, 2026, 12000000, 1160000, 0, N'2026-11-16T15:15:27'),
  (12, 6, 10, 2026, 9000000, 1030000, 0, N'2026-11-16T15:15:27'),
  (13, 7, 10, 2026, 18000000, 1720000, 0, N'2026-11-16T15:15:27'),
  (14, 8, 10, 2026, 7500000, 720000, 0, N'2026-11-16T15:15:27'),
  (15, 9, 10, 2026, 14000000, 1460000, 0, N'2026-11-16T15:15:27'),
  (16, 10, 10, 2026, 10000000, 960000, 0, N'2026-11-16T15:15:27'),
  (17, 11, 10, 2026, 8000000, 760000, 0, N'2026-11-16T15:15:27'),
  (18, 12, 10, 2026, 11000000, 1040000, 0, N'2026-11-16T15:15:27');
SET IDENTITY_INSERT dbo.BaoCaoThang OFF;
GO

-- Kiểm tra số dòng của từng bảng
SELECT N'TaiKhoan' AS Bang, COUNT(*) AS SoDong FROM dbo.TaiKhoan
UNION ALL SELECT N'CaiDatNhacNho' AS Bang, COUNT(*) AS SoDong FROM dbo.CaiDatNhacNho
UNION ALL SELECT N'Vi' AS Bang, COUNT(*) AS SoDong FROM dbo.Vi
UNION ALL SELECT N'DanhMuc' AS Bang, COUNT(*) AS SoDong FROM dbo.DanhMuc
UNION ALL SELECT N'MucTieuTietKiem' AS Bang, COUNT(*) AS SoDong FROM dbo.MucTieuTietKiem
UNION ALL SELECT N'GiaoDich' AS Bang, COUNT(*) AS SoDong FROM dbo.GiaoDich
UNION ALL SELECT N'ChuyenTien' AS Bang, COUNT(*) AS SoDong FROM dbo.ChuyenTien
UNION ALL SELECT N'GiaoDichDinhKy' AS Bang, COUNT(*) AS SoDong FROM dbo.GiaoDichDinhKy
UNION ALL SELECT N'HoaDon' AS Bang, COUNT(*) AS SoDong FROM dbo.HoaDon
UNION ALL SELECT N'ChiTietHoaDon' AS Bang, COUNT(*) AS SoDong FROM dbo.ChiTietHoaDon
UNION ALL SELECT N'NganSach' AS Bang, COUNT(*) AS SoDong FROM dbo.NganSach
UNION ALL SELECT N'KeHoachThang' AS Bang, COUNT(*) AS SoDong FROM dbo.KeHoachThang
UNION ALL SELECT N'ThongBao' AS Bang, COUNT(*) AS SoDong FROM dbo.ThongBao
UNION ALL SELECT N'BaoCaoThang' AS Bang, COUNT(*) AS SoDong FROM dbo.BaoCaoThang;
GO
