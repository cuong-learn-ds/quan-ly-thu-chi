import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SCHEMA = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS TaiKhoan (
  maTaiKhoan INTEGER PRIMARY KEY AUTOINCREMENT,
  loaiTaiKhoan TEXT NOT NULL CHECK (loaiTaiKhoan IN ('NguoiDung','QuanTriVien','NhanVienHoTro','KiemToanVien')),
  hoTen TEXT NOT NULL, email TEXT NOT NULL UNIQUE, matKhauHash TEXT NOT NULL,
  trangThai TEXT NOT NULL DEFAULT 'HoatDong', ngayTao TEXT NOT NULL, lyDoKhoa TEXT, donViTienTe TEXT DEFAULT 'VND'
);
CREATE TABLE IF NOT EXISTS CaiDatNhacNho (
  maCaiDat INTEGER PRIMARY KEY AUTOINCREMENT, maTaiKhoan INTEGER NOT NULL UNIQUE REFERENCES TaiKhoan(maTaiKhoan),
  nhacHangNgay INTEGER NOT NULL DEFAULT 1, gioNhac TEXT NOT NULL DEFAULT '20:00', nhacNganSach INTEGER NOT NULL DEFAULT 1, nhacMucTieu INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS Vi (
  maVi INTEGER PRIMARY KEY AUTOINCREMENT, maTaiKhoan INTEGER NOT NULL REFERENCES TaiKhoan(maTaiKhoan),
  tenVi TEXT NOT NULL, loaiVi TEXT NOT NULL, soDu INTEGER NOT NULL DEFAULT 0, ngayTao TEXT NOT NULL,
  UNIQUE (maTaiKhoan, tenVi)
);
CREATE TABLE IF NOT EXISTS DanhMuc (
  maDanhMuc INTEGER PRIMARY KEY AUTOINCREMENT, maTaiKhoan INTEGER REFERENCES TaiKhoan(maTaiKhoan),
  tenDanhMuc TEXT NOT NULL, loai TEXT NOT NULL, bieuTuong TEXT NOT NULL DEFAULT 'category', mauSac TEXT NOT NULL DEFAULT '#607d8b',
  laMacDinh INTEGER NOT NULL DEFAULT 0, laHeThong INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS MucTieuTietKiem (
  maMucTieu INTEGER PRIMARY KEY AUTOINCREMENT, maTaiKhoan INTEGER NOT NULL REFERENCES TaiKhoan(maTaiKhoan),
  tenMucTieu TEXT NOT NULL, soTienMucTieu INTEGER NOT NULL, soTienHienTai INTEGER NOT NULL DEFAULT 0, hanChot TEXT NOT NULL, ngayTao TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS GiaoDich (
  maGiaoDich INTEGER PRIMARY KEY AUTOINCREMENT, maTaiKhoan INTEGER NOT NULL REFERENCES TaiKhoan(maTaiKhoan),
  maVi INTEGER NOT NULL REFERENCES Vi(maVi), maDanhMuc INTEGER NOT NULL REFERENCES DanhMuc(maDanhMuc),
  maMucTieu INTEGER REFERENCES MucTieuTietKiem(maMucTieu),
  soTien INTEGER NOT NULL CHECK (soTien > 0), loai TEXT NOT NULL, ngayGiaoDich TEXT NOT NULL, ghiChu TEXT
);
CREATE INDEX IF NOT EXISTS ix_gd_tk_ngay ON GiaoDich(maTaiKhoan, ngayGiaoDich);
CREATE TABLE IF NOT EXISTS ChuyenTien (
  maChuyenTien INTEGER PRIMARY KEY AUTOINCREMENT, maTaiKhoan INTEGER NOT NULL REFERENCES TaiKhoan(maTaiKhoan),
  maViNguon INTEGER NOT NULL REFERENCES Vi(maVi), maViDich INTEGER NOT NULL REFERENCES Vi(maVi),
  soTien INTEGER NOT NULL CHECK (soTien > 0), ngayChuyen TEXT NOT NULL, ghiChu TEXT,
  CHECK (maViNguon <> maViDich)
);
CREATE TABLE IF NOT EXISTS GiaoDichDinhKy (
  maDinhKy INTEGER PRIMARY KEY AUTOINCREMENT, maTaiKhoan INTEGER NOT NULL REFERENCES TaiKhoan(maTaiKhoan),
  maVi INTEGER NOT NULL REFERENCES Vi(maVi), maDanhMuc INTEGER NOT NULL REFERENCES DanhMuc(maDanhMuc),
  soTien INTEGER NOT NULL CHECK (soTien > 0), loai TEXT NOT NULL, ngayTrongThang INTEGER NOT NULL CHECK (ngayTrongThang BETWEEN 1 AND 28),
  ghiChu TEXT, dangBat INTEGER NOT NULL DEFAULT 1, thangDaChay TEXT, ngayTao TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS HoaDon (
  maHoaDon INTEGER PRIMARY KEY AUTOINCREMENT, maGiaoDich INTEGER NOT NULL UNIQUE REFERENCES GiaoDich(maGiaoDich) ON DELETE CASCADE,
  tenCuaHang TEXT, ngayHoaDon TEXT NOT NULL, tongTien INTEGER NOT NULL, anhHoaDon TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS ChiTietHoaDon (
  maChiTiet INTEGER PRIMARY KEY AUTOINCREMENT, maHoaDon INTEGER NOT NULL REFERENCES HoaDon(maHoaDon) ON DELETE CASCADE,
  tenMatHang TEXT NOT NULL, soLuong INTEGER NOT NULL, donGia INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS NganSach (
  maNganSach INTEGER PRIMARY KEY AUTOINCREMENT, maTaiKhoan INTEGER NOT NULL REFERENCES TaiKhoan(maTaiKhoan),
  maDanhMuc INTEGER NOT NULL REFERENCES DanhMuc(maDanhMuc), hanMuc INTEGER NOT NULL, thang INTEGER NOT NULL, nam INTEGER NOT NULL,
  nguongCanhBao INTEGER NOT NULL DEFAULT 80, daCanhBaoNguong INTEGER NOT NULL DEFAULT 0, daCanhBaoVuot INTEGER NOT NULL DEFAULT 0,
  UNIQUE (maTaiKhoan, maDanhMuc, thang, nam)
);
CREATE TABLE IF NOT EXISTS ThongBao (
  maThongBao INTEGER PRIMARY KEY AUTOINCREMENT, maTaiKhoan INTEGER NOT NULL REFERENCES TaiKhoan(maTaiKhoan),
  loai TEXT NOT NULL, noiDung TEXT NOT NULL, daDoc INTEGER NOT NULL DEFAULT 0, ngayTao TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS BaoCaoThang (
  maBaoCao INTEGER PRIMARY KEY AUTOINCREMENT, maTaiKhoan INTEGER NOT NULL REFERENCES TaiKhoan(maTaiKhoan),
  thang INTEGER NOT NULL, nam INTEGER NOT NULL, tongThu INTEGER NOT NULL, tongChi INTEGER NOT NULL, soDanhMucVuot INTEGER NOT NULL, ngayLap TEXT NOT NULL,
  UNIQUE (maTaiKhoan, thang, nam)
);
`;

export function moCsdl(duongDan = ':memory:') {
  if (duongDan !== ':memory:') mkdirSync(dirname(duongDan), { recursive: true });
  const db = new DatabaseSync(duongDan);
  db.exec(SCHEMA);
  nangCap(db);
  return new Csdl(db);
}

/** Bọc DatabaseSync: truy vấn gọn + transaction (mọi thao tác nhiều bước chạy trong 1 transaction). */
export class Csdl {
  constructor(db) { this.db = db; this.sau = 0; }
  all(sql, ...p) { return this.db.prepare(sql).all(...p); }
  get(sql, ...p) { return this.db.prepare(sql).get(...p); }
  run(sql, ...p) {
    const r = this.db.prepare(sql).run(...p);
    return { id: Number(r.lastInsertRowid), changes: Number(r.changes) };
  }
  /** Chạy fn trong transaction; ném lỗi thì ROLLBACK, CSDL không đổi. Cho phép lồng nhau (savepoint). */
  giaoDich(fn) {
    if (this.sau > 0) return fn();
    this.db.exec('BEGIN');
    this.sau++;
    try { const r = fn(); this.db.exec('COMMIT'); return r; }
    catch (e) { this.db.exec('ROLLBACK'); throw e; }
    finally { this.sau--; }
  }
}

/** CSDL tạo từ bản cũ (chỉ 2 loại tài khoản): tạo lại bảng TaiKhoan với ràng buộc mới, giữ nguyên dữ liệu. */
function nangCap(db) {
  const r = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='TaiKhoan'").get();
  if (!r || r.sql.includes('KiemToanVien')) return;
  const moi = SCHEMA.match(/CREATE TABLE IF NOT EXISTS TaiKhoan \(.*?\n\);/s)[0].replace('IF NOT EXISTS TaiKhoan', 'TaiKhoan_moi');
  db.exec('PRAGMA foreign_keys = OFF; BEGIN;');
  try {
    db.exec(moi);
    db.exec('INSERT INTO TaiKhoan_moi SELECT * FROM TaiKhoan; DROP TABLE TaiKhoan; ALTER TABLE TaiKhoan_moi RENAME TO TaiKhoan; COMMIT;');
  } catch (e) { db.exec('ROLLBACK;'); throw e; }
  db.exec('PRAGMA foreign_keys = ON;');
}
