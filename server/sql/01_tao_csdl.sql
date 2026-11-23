/* ==========================================================================
   CƠ SỞ DỮ LIỆU: QUẢN LÝ THU CHI CÁ NHÂN VÀ LẬP KẾ HOẠCH TÀI CHÍNH
   Hệ quản trị: Microsoft SQL Server (đã chạy thử trên SQL Server 2025 Express)
   Chạy trong SSMS hoặc: sqlcmd -S localhost -E -C -i 01_tao_csdl.sql
   Web cũng dùng chính file này để tự tạo CSDL ở lần chạy đầu.
   - Tiền: DECIMAL(18,0) (đồng Việt Nam, không có phần lẻ)
   - Thời điểm: DATETIME2(0) theo giờ Việt Nam; ngày: DATE
   - Chuỗi: NVARCHAR (tiếng Việt có dấu)
   ========================================================================== */
IF DB_ID(N'QuanLyThuChi') IS NULL
    CREATE DATABASE QuanLyThuChi COLLATE Vietnamese_100_CI_AS;
GO
USE QuanLyThuChi;
GO

/* 1. Tài khoản: 4 vai trò kế thừa gộp vào một bảng, phân biệt bằng loaiTaiKhoan */
IF OBJECT_ID(N'dbo.TaiKhoan', N'U') IS NULL
CREATE TABLE dbo.TaiKhoan (
    maTaiKhoan    INT IDENTITY(1,1) CONSTRAINT PK_TaiKhoan PRIMARY KEY,
    loaiTaiKhoan  NVARCHAR(20)  NOT NULL CONSTRAINT CK_TaiKhoan_Loai CHECK (loaiTaiKhoan IN (N'NguoiDung', N'QuanTriVien', N'NhanVienHoTro', N'KiemToanVien')),
    hoTen         NVARCHAR(100) NOT NULL,
    email         NVARCHAR(150) NOT NULL CONSTRAINT UQ_TaiKhoan_Email UNIQUE,
    matKhauHash   NVARCHAR(100) NOT NULL,
    trangThai     NVARCHAR(10)  NOT NULL CONSTRAINT DF_TaiKhoan_TrangThai DEFAULT N'HoatDong'
                  CONSTRAINT CK_TaiKhoan_TrangThai CHECK (trangThai IN (N'HoatDong', N'BiKhoa')),
    ngayTao       DATETIME2(0)  NOT NULL,
    lyDoKhoa      NVARCHAR(300) NULL,
    donViTienTe   NVARCHAR(5)   NOT NULL CONSTRAINT DF_TaiKhoan_DonVi DEFAULT N'VND'
);
GO

/* 2. Cài đặt nhắc nhở: mỗi người dùng đúng một dòng */
IF OBJECT_ID(N'dbo.CaiDatNhacNho', N'U') IS NULL
CREATE TABLE dbo.CaiDatNhacNho (
    maCaiDat      INT IDENTITY(1,1) CONSTRAINT PK_CaiDatNhacNho PRIMARY KEY,
    maTaiKhoan    INT NOT NULL CONSTRAINT UQ_CaiDat_TaiKhoan UNIQUE
                  CONSTRAINT FK_CaiDat_TaiKhoan REFERENCES dbo.TaiKhoan(maTaiKhoan),
    nhacHangNgay  BIT     NOT NULL CONSTRAINT DF_CaiDat_HangNgay DEFAULT 1,
    gioNhac       CHAR(5) NOT NULL CONSTRAINT DF_CaiDat_Gio DEFAULT '20:00'
                  CONSTRAINT CK_CaiDat_Gio CHECK (gioNhac LIKE '[0-2][0-9]:[0-5][0-9]'),
    nhacNganSach  BIT     NOT NULL CONSTRAINT DF_CaiDat_NganSach DEFAULT 1,
    nhacMucTieu   BIT     NOT NULL CONSTRAINT DF_CaiDat_MucTieu DEFAULT 1
);
GO

/* 3. Ví: tên không trùng trong cùng người dùng (R4) */
IF OBJECT_ID(N'dbo.Vi', N'U') IS NULL
CREATE TABLE dbo.Vi (
    maVi        INT IDENTITY(1,1) CONSTRAINT PK_Vi PRIMARY KEY,
    maTaiKhoan  INT NOT NULL CONSTRAINT FK_Vi_TaiKhoan REFERENCES dbo.TaiKhoan(maTaiKhoan),
    tenVi       NVARCHAR(100) NOT NULL,
    loaiVi      NVARCHAR(10)  NOT NULL CONSTRAINT CK_Vi_Loai CHECK (loaiVi IN (N'TienMat', N'NganHang', N'ViDienTu')),
    soDu        DECIMAL(18,0) NOT NULL CONSTRAINT DF_Vi_SoDu DEFAULT 0 CONSTRAINT CK_Vi_SoDu CHECK (soDu >= 0),
    ngayTao     DATETIME2(0)  NOT NULL,
    CONSTRAINT UQ_Vi_Ten UNIQUE (maTaiKhoan, tenVi)
);
GO

/* 4. Danh mục: maTaiKhoan NULL = danh mục mặc định dùng chung */
IF OBJECT_ID(N'dbo.DanhMuc', N'U') IS NULL
CREATE TABLE dbo.DanhMuc (
    maDanhMuc   INT IDENTITY(1,1) CONSTRAINT PK_DanhMuc PRIMARY KEY,
    maTaiKhoan  INT NULL CONSTRAINT FK_DanhMuc_TaiKhoan REFERENCES dbo.TaiKhoan(maTaiKhoan),
    tenDanhMuc  NVARCHAR(100) NOT NULL,
    loai        NVARCHAR(3)   NOT NULL CONSTRAINT CK_DanhMuc_Loai CHECK (loai IN (N'Thu', N'Chi')),
    bieuTuong   NVARCHAR(50)  NOT NULL CONSTRAINT DF_DanhMuc_BieuTuong DEFAULT N'category',
    mauSac      CHAR(7)       NOT NULL CONSTRAINT DF_DanhMuc_Mau DEFAULT '#607d8b',
    laMacDinh   BIT NOT NULL CONSTRAINT DF_DanhMuc_MacDinh DEFAULT 0,
    laHeThong   BIT NOT NULL CONSTRAINT DF_DanhMuc_HeThong DEFAULT 0
);
GO

/* 5. Mục tiêu tiết kiệm */
IF OBJECT_ID(N'dbo.MucTieuTietKiem', N'U') IS NULL
CREATE TABLE dbo.MucTieuTietKiem (
    maMucTieu      INT IDENTITY(1,1) CONSTRAINT PK_MucTieu PRIMARY KEY,
    maTaiKhoan     INT NOT NULL CONSTRAINT FK_MucTieu_TaiKhoan REFERENCES dbo.TaiKhoan(maTaiKhoan),
    tenMucTieu     NVARCHAR(100) NOT NULL,
    soTienMucTieu  DECIMAL(18,0) NOT NULL CONSTRAINT CK_MucTieu_SoTien CHECK (soTienMucTieu > 0),
    soTienHienTai  DECIMAL(18,0) NOT NULL CONSTRAINT DF_MucTieu_HienTai DEFAULT 0 CONSTRAINT CK_MucTieu_HienTai CHECK (soTienHienTai >= 0),
    hanChot        DATE NOT NULL,
    ngayTao        DATE NOT NULL
);
GO

/* 6. Giao dịch thu chi */
IF OBJECT_ID(N'dbo.GiaoDich', N'U') IS NULL
CREATE TABLE dbo.GiaoDich (
    maGiaoDich    INT IDENTITY(1,1) CONSTRAINT PK_GiaoDich PRIMARY KEY,
    maTaiKhoan    INT NOT NULL CONSTRAINT FK_GiaoDich_TaiKhoan REFERENCES dbo.TaiKhoan(maTaiKhoan),
    maVi          INT NOT NULL CONSTRAINT FK_GiaoDich_Vi REFERENCES dbo.Vi(maVi),
    maDanhMuc     INT NOT NULL CONSTRAINT FK_GiaoDich_DanhMuc REFERENCES dbo.DanhMuc(maDanhMuc),
    maMucTieu     INT NULL CONSTRAINT FK_GiaoDich_MucTieu REFERENCES dbo.MucTieuTietKiem(maMucTieu),
    soTien        DECIMAL(18,0) NOT NULL CONSTRAINT CK_GiaoDich_SoTien CHECK (soTien > 0),
    loai          NVARCHAR(3)   NOT NULL CONSTRAINT CK_GiaoDich_Loai CHECK (loai IN (N'Thu', N'Chi')),
    ngayGiaoDich  DATETIME2(0)  NOT NULL,
    ghiChu        NVARCHAR(200) NULL
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_GiaoDich_TaiKhoan_Ngay')
    CREATE INDEX IX_GiaoDich_TaiKhoan_Ngay ON dbo.GiaoDich(maTaiKhoan, ngayGiaoDich);
GO

/* 7. Chuyển tiền giữa các ví (R11) */
IF OBJECT_ID(N'dbo.ChuyenTien', N'U') IS NULL
CREATE TABLE dbo.ChuyenTien (
    maChuyenTien  INT IDENTITY(1,1) CONSTRAINT PK_ChuyenTien PRIMARY KEY,
    maTaiKhoan    INT NOT NULL CONSTRAINT FK_ChuyenTien_TaiKhoan REFERENCES dbo.TaiKhoan(maTaiKhoan),
    maViNguon     INT NOT NULL CONSTRAINT FK_ChuyenTien_ViNguon REFERENCES dbo.Vi(maVi),
    maViDich      INT NOT NULL CONSTRAINT FK_ChuyenTien_ViDich REFERENCES dbo.Vi(maVi),
    soTien        DECIMAL(18,0) NOT NULL CONSTRAINT CK_ChuyenTien_SoTien CHECK (soTien > 0),
    ngayChuyen    DATETIME2(0)  NOT NULL,
    ghiChu        NVARCHAR(200) NULL,
    CONSTRAINT CK_ChuyenTien_KhacVi CHECK (maViNguon <> maViDich)
);
GO

/* 8. Giao dịch định kỳ hằng tháng (R12) */
IF OBJECT_ID(N'dbo.GiaoDichDinhKy', N'U') IS NULL
CREATE TABLE dbo.GiaoDichDinhKy (
    maDinhKy        INT IDENTITY(1,1) CONSTRAINT PK_GiaoDichDinhKy PRIMARY KEY,
    maTaiKhoan      INT NOT NULL CONSTRAINT FK_DinhKy_TaiKhoan REFERENCES dbo.TaiKhoan(maTaiKhoan),
    maVi            INT NOT NULL CONSTRAINT FK_DinhKy_Vi REFERENCES dbo.Vi(maVi),
    maDanhMuc       INT NOT NULL CONSTRAINT FK_DinhKy_DanhMuc REFERENCES dbo.DanhMuc(maDanhMuc),
    soTien          DECIMAL(18,0) NOT NULL CONSTRAINT CK_DinhKy_SoTien CHECK (soTien > 0),
    loai            NVARCHAR(3)   NOT NULL CONSTRAINT CK_DinhKy_Loai CHECK (loai IN (N'Thu', N'Chi')),
    ngayTrongThang  TINYINT NOT NULL CONSTRAINT CK_DinhKy_Ngay CHECK (ngayTrongThang BETWEEN 1 AND 28),
    ghiChu          NVARCHAR(200) NULL,
    dangBat         BIT NOT NULL CONSTRAINT DF_DinhKy_Bat DEFAULT 1,
    thangDaChay     CHAR(7) NULL,          -- 'YYYY-MM': tháng đã tạo giao dịch gần nhất
    ngayTao         DATETIME2(0) NOT NULL
);
GO

/* 9. Hóa đơn (quét từ ảnh) và 10. chi tiết hóa đơn */
IF OBJECT_ID(N'dbo.HoaDon', N'U') IS NULL
CREATE TABLE dbo.HoaDon (
    maHoaDon    INT IDENTITY(1,1) CONSTRAINT PK_HoaDon PRIMARY KEY,
    maGiaoDich  INT NOT NULL CONSTRAINT UQ_HoaDon_GiaoDich UNIQUE
                CONSTRAINT FK_HoaDon_GiaoDich REFERENCES dbo.GiaoDich(maGiaoDich) ON DELETE CASCADE,
    tenCuaHang  NVARCHAR(150) NULL,
    ngayHoaDon  DATETIME2(0)  NOT NULL,
    tongTien    DECIMAL(18,0) NOT NULL CONSTRAINT CK_HoaDon_Tong CHECK (tongTien >= 0),
    anhHoaDon   NVARCHAR(300) NOT NULL CONSTRAINT DF_HoaDon_Anh DEFAULT N''
);
GO
IF OBJECT_ID(N'dbo.ChiTietHoaDon', N'U') IS NULL
CREATE TABLE dbo.ChiTietHoaDon (
    maChiTiet   INT IDENTITY(1,1) CONSTRAINT PK_ChiTietHoaDon PRIMARY KEY,
    maHoaDon    INT NOT NULL CONSTRAINT FK_ChiTiet_HoaDon REFERENCES dbo.HoaDon(maHoaDon) ON DELETE CASCADE,
    tenMatHang  NVARCHAR(150) NOT NULL,
    soLuong     INT NOT NULL CONSTRAINT CK_ChiTiet_SoLuong CHECK (soLuong > 0),
    donGia      DECIMAL(18,0) NOT NULL CONSTRAINT CK_ChiTiet_DonGia CHECK (donGia >= 0)
);
GO

/* 11. Ngân sách: mỗi (người dùng, danh mục, tháng, năm) một dòng (R6) */
IF OBJECT_ID(N'dbo.NganSach', N'U') IS NULL
CREATE TABLE dbo.NganSach (
    maNganSach       INT IDENTITY(1,1) CONSTRAINT PK_NganSach PRIMARY KEY,
    maTaiKhoan       INT NOT NULL CONSTRAINT FK_NganSach_TaiKhoan REFERENCES dbo.TaiKhoan(maTaiKhoan),
    maDanhMuc        INT NOT NULL CONSTRAINT FK_NganSach_DanhMuc REFERENCES dbo.DanhMuc(maDanhMuc),
    hanMuc           DECIMAL(18,0) NOT NULL CONSTRAINT CK_NganSach_HanMuc CHECK (hanMuc > 0),
    thang            TINYINT  NOT NULL CONSTRAINT CK_NganSach_Thang CHECK (thang BETWEEN 1 AND 12),
    nam              SMALLINT NOT NULL,
    nguongCanhBao    TINYINT  NOT NULL CONSTRAINT DF_NganSach_Nguong DEFAULT 80 CONSTRAINT CK_NganSach_Nguong CHECK (nguongCanhBao BETWEEN 1 AND 100),
    daCanhBaoNguong  BIT NOT NULL CONSTRAINT DF_NganSach_DaNguong DEFAULT 0,
    daCanhBaoVuot    BIT NOT NULL CONSTRAINT DF_NganSach_DaVuot DEFAULT 0,
    CONSTRAINT UQ_NganSach UNIQUE (maTaiKhoan, maDanhMuc, thang, nam)
);
GO

/* 12. Kế hoạch tài chính tháng: thu nhập dự kiến, tiền để dành; phân bổ chi chính là các ngân sách của tháng */
IF OBJECT_ID(N'dbo.KeHoachThang', N'U') IS NULL
CREATE TABLE dbo.KeHoachThang (
    maKeHoach       INT IDENTITY(1,1) CONSTRAINT PK_KeHoachThang PRIMARY KEY,
    maTaiKhoan      INT NOT NULL CONSTRAINT FK_KeHoach_TaiKhoan REFERENCES dbo.TaiKhoan(maTaiKhoan),
    thang           TINYINT  NOT NULL CONSTRAINT CK_KeHoach_Thang CHECK (thang BETWEEN 1 AND 12),
    nam             SMALLINT NOT NULL,
    thuNhapDuKien   DECIMAL(18,0) NOT NULL CONSTRAINT CK_KeHoach_Thu CHECK (thuNhapDuKien > 0),
    tietKiemDuKien  DECIMAL(18,0) NOT NULL CONSTRAINT DF_KeHoach_TietKiem DEFAULT 0 CONSTRAINT CK_KeHoach_TietKiem CHECK (tietKiemDuKien >= 0),
    phuongPhap      NVARCHAR(10) NOT NULL CONSTRAINT CK_KeHoach_PhuongPhap CHECK (phuongPhap IN (N'LichSu', N'50-30-20')),
    ngayLap         DATETIME2(0) NOT NULL,
    CONSTRAINT UQ_KeHoachThang UNIQUE (maTaiKhoan, thang, nam)
);
GO

/* 13. Thông báo và 14. báo cáo tổng kết tháng (R9) */
IF OBJECT_ID(N'dbo.ThongBao', N'U') IS NULL
CREATE TABLE dbo.ThongBao (
    maThongBao  INT IDENTITY(1,1) CONSTRAINT PK_ThongBao PRIMARY KEY,
    maTaiKhoan  INT NOT NULL CONSTRAINT FK_ThongBao_TaiKhoan REFERENCES dbo.TaiKhoan(maTaiKhoan),
    loai        NVARCHAR(20)  NOT NULL CONSTRAINT CK_ThongBao_Loai CHECK (loai IN (N'NhacGhiChep', N'CanhBaoNganSach', N'NhacMucTieu', N'TongKetThang', N'HoTro', N'DinhKy')),
    noiDung     NVARCHAR(500) NOT NULL,
    daDoc       BIT NOT NULL CONSTRAINT DF_ThongBao_DaDoc DEFAULT 0,
    ngayTao     DATETIME2(0)  NOT NULL
);
GO
IF OBJECT_ID(N'dbo.BaoCaoThang', N'U') IS NULL
CREATE TABLE dbo.BaoCaoThang (
    maBaoCao       INT IDENTITY(1,1) CONSTRAINT PK_BaoCaoThang PRIMARY KEY,
    maTaiKhoan     INT NOT NULL CONSTRAINT FK_BaoCao_TaiKhoan REFERENCES dbo.TaiKhoan(maTaiKhoan),
    thang          TINYINT  NOT NULL CONSTRAINT CK_BaoCao_Thang CHECK (thang BETWEEN 1 AND 12),
    nam            SMALLINT NOT NULL,
    tongThu        DECIMAL(18,0) NOT NULL,
    tongChi        DECIMAL(18,0) NOT NULL,
    soDanhMucVuot  INT NOT NULL,
    ngayLap        DATETIME2(0) NOT NULL,
    CONSTRAINT UQ_BaoCaoThang UNIQUE (maTaiKhoan, thang, nam)
);
GO
