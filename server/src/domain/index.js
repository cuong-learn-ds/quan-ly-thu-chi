// Mô hình miền: đúng tên lớp và phương thức như sơ đồ lớp Hình 4.1 (StarUML).
// Số tiền là số nguyên VND. Quy tắc nghiệp vụ R1–R10 nằm trong các lớp này; vi phạm thì ném DomainError.

export class DomainError extends Error {}
export class NotFoundError extends Error {
  constructor(msg = 'Không tìm thấy dữ liệu') { super(msg); }
}

export const LoaiGiaoDich = Object.freeze({ Thu: 'Thu', Chi: 'Chi' });
export const LoaiVi = Object.freeze({ TienMat: 'TienMat', NganHang: 'NganHang', ViDienTu: 'ViDienTu' });
export const TrangThaiTaiKhoan = Object.freeze({ HoatDong: 'HoatDong', BiKhoa: 'BiKhoa' });
export const LoaiThongBao = Object.freeze({
  NhacGhiChep: 'NhacGhiChep', CanhBaoNganSach: 'CanhBaoNganSach', NhacMucTieu: 'NhacMucTieu', TongKetThang: 'TongKetThang', HoTro: 'HoTro', DinhKy: 'DinhKy',
});
export const KetQuaCanhBao = Object.freeze({ KhongCo: 'KhongCo', DatNguong: 'DatNguong', Vuot: 'Vuot' });

const laSoNguyenDuong = (n) => Number.isFinite(n) && n > 0;

// ---------------- Tài khoản ----------------
export class TaiKhoan {
  constructor(init = {}) {
    Object.assign(this, { maTaiKhoan: 0, hoTen: '', email: '', matKhauHash: '', trangThai: TrangThaiTaiKhoan.HoatDong, ngayTao: '', lyDoKhoa: null }, init);
  }
  /** R8: tài khoản bị khóa thì ném lỗi; sai mật khẩu trả false. `bam` = { kiemTra(matKhau, hash), bam(matKhau) } */
  dangNhap(matKhau, bam) {
    if (this.trangThai === TrangThaiTaiKhoan.BiKhoa) throw new DomainError('Tài khoản đã bị khóa');
    return bam.kiemTra(matKhau, this.matKhauHash);
  }
  doiMatKhau(cu, moi, bam) {
    if (!bam.kiemTra(cu, this.matKhauHash)) return false;
    if (!moi || moi.length < 6) throw new DomainError('Mật khẩu mới phải có ít nhất 6 ký tự');
    this.matKhauHash = bam.bam(moi);
    return true;
  }
  capNhatThongTin(hoTen) {
    if (!hoTen || !hoTen.trim()) throw new DomainError('Họ tên không được để trống');
    this.hoTen = hoTen.trim();
  }
  get vaiTro() { return 'TaiKhoan'; }
}

export class NguoiDung extends TaiKhoan {
  constructor(init = {}) { super(init); this.donViTienTe = 'VND'; this.danhSachVi = []; Object.assign(this, init); }
  tinhTongSoDu() { return this.danhSachVi.reduce((s, v) => s + v.soDu, 0); }
  get vaiTro() { return 'NguoiDung'; }
}

export class QuanTriVien extends TaiKhoan {
  khoaTaiKhoan(tk, lyDo) {
    if (tk.maTaiKhoan === this.maTaiKhoan) throw new DomainError('Không thể tự khóa tài khoản của mình');
    if (tk instanceof QuanTriVien) throw new DomainError('Không thể khóa tài khoản quản trị viên');
    if (!lyDo || !lyDo.trim()) throw new DomainError('Vui lòng nhập lý do khóa');
    tk.trangThai = TrangThaiTaiKhoan.BiKhoa;
    tk.lyDoKhoa = lyDo.trim();
  }
  moKhoaTaiKhoan(tk) { tk.trangThai = TrangThaiTaiKhoan.HoatDong; tk.lyDoKhoa = null; }
  /** Tạo danh mục mặc định dùng chung (chủ = null). */
  taoDanhMucMacDinh(ten, loai, bieuTuong, mauSac) {
    if (!ten || !ten.trim()) throw new DomainError('Tên danh mục không được để trống');
    if (!Object.values(LoaiGiaoDich).includes(loai)) throw new DomainError('Loại danh mục không hợp lệ');
    return new DanhMuc({ maTaiKhoan: null, tenDanhMuc: ten.trim(), loai, bieuTuong: bieuTuong || 'category', mauSac: mauSac || '#607d8b', laMacDinh: true });
  }
  get vaiTro() { return 'QuanTriVien'; }
}

/** Nhân viên hỗ trợ: xem/tìm người dùng và gửi thông báo hỗ trợ (không khóa/mở khóa được). */
export class NhanVienHoTro extends TaiKhoan {
  guiThongBaoHoTro(nguoiDung, noiDung, luc) {
    if (!(nguoiDung instanceof NguoiDung)) throw new DomainError('Chỉ gửi thông báo hỗ trợ cho người dùng');
    const nd = String(noiDung ?? '').trim();
    if (!nd) throw new DomainError('Nội dung thông báo không được để trống');
    if (nd.length > 300) throw new DomainError('Nội dung thông báo tối đa 300 ký tự');
    return new ThongBao({ maTaiKhoan: nguoiDung.maTaiKhoan, loai: LoaiThongBao.HoTro, noiDung: `Hỗ trợ: ${nd}`, ngayTao: luc });
  }
  get vaiTro() { return 'NhanVienHoTro'; }
}

/** Kiểm toán viên: chỉ xem thống kê hệ thống và danh sách người dùng (chỉ đọc). */
export class KiemToanVien extends TaiKhoan {
  get vaiTro() { return 'KiemToanVien'; }
}

export class CaiDatNhacNho {
  constructor(init = {}) {
    Object.assign(this, { maCaiDat: 0, maTaiKhoan: 0, nhacHangNgay: true, gioNhac: '20:00', nhacNganSach: true, nhacMucTieu: true }, init);
  }
  khoiPhucMacDinh() { Object.assign(this, { nhacHangNgay: true, gioNhac: '20:00', nhacNganSach: true, nhacMucTieu: true }); }
}

// ---------------- Ví, danh mục, giao dịch, hóa đơn ----------------
export class Vi {
  constructor(init = {}) {
    Object.assign(this, { maVi: 0, maTaiKhoan: 0, tenVi: '', loaiVi: LoaiVi.TienMat, soDu: 0, ngayTao: '' }, init);
  }
  congTien(soTien) {
    if (!laSoNguyenDuong(soTien)) throw new DomainError('Số tiền phải lớn hơn 0'); // R1
    this.soDu += soTien;
  }
  truTien(soTien) {
    if (!laSoNguyenDuong(soTien)) throw new DomainError('Số tiền phải lớn hơn 0'); // R1
    if (!this.kiemTraSoDu(soTien)) throw new DomainError('Số dư ví không đủ'); // R2
    this.soDu -= soTien;
  }
  kiemTraSoDu(soTien) { return this.soDu >= soTien; }
}

export class DanhMuc {
  constructor(init = {}) {
    Object.assign(this, { maDanhMuc: 0, maTaiKhoan: null, tenDanhMuc: '', loai: LoaiGiaoDich.Chi, bieuTuong: 'category', mauSac: '#607d8b', laMacDinh: false, laHeThong: false }, init);
  }
  laCuaNguoiDung(maTk) { return this.maTaiKhoan === maTk; }
  dangDuocSuDung(coGiaoDich, coNganSach) { return !!(coGiaoDich || coNganSach); }
}

export class ChiTietHoaDon {
  constructor(init = {}) { Object.assign(this, { maChiTiet: 0, maHoaDon: 0, tenMatHang: '', soLuong: 1, donGia: 0 }, init); }
  thanhTien() { return this.soLuong * this.donGia; }
}

export class HoaDon {
  constructor(init = {}) {
    Object.assign(this, { maHoaDon: 0, maGiaoDich: 0, tenCuaHang: null, ngayHoaDon: '', tongTien: 0, anhHoaDon: '', chiTiet: [] }, init);
  }
  tinhTongTien() { return this.chiTiet.reduce((s, c) => s + c.thanhTien(), 0); }
}

export class GiaoDich {
  constructor(init = {}) {
    Object.assign(this, { maGiaoDich: 0, maTaiKhoan: 0, maVi: 0, maDanhMuc: 0, maMucTieu: null, soTien: 0, loai: LoaiGiaoDich.Chi, ngayGiaoDich: '', ghiChu: null, vi: null, danhMuc: null, hoaDon: null }, init);
  }
  static tao(maTaiKhoan, vi, danhMuc, soTien, loai, ngay, ghiChu, maMucTieu = null) {
    GiaoDich.#kiemTra(danhMuc, soTien, loai);
    return new GiaoDich({ maTaiKhoan, vi, maVi: vi.maVi, danhMuc, maDanhMuc: danhMuc.maDanhMuc, soTien, loai, ngayGiaoDich: ngay, ghiChu: ghiChu ?? null, maMucTieu });
  }
  static #kiemTra(dm, soTien, loai) {
    if (!laSoNguyenDuong(soTien)) throw new DomainError('Số tiền phải lớn hơn 0'); // R1
    if (dm.loai !== loai) throw new DomainError('Danh mục không đúng loại giao dịch');
  }
  /** Áp ảnh hưởng của giao dịch lên ví. */
  ghiNhan() { if (this.loai === LoaiGiaoDich.Thu) this.vi.congTien(this.soTien); else this.vi.truTien(this.soTien); }
  /** Hoàn tác ảnh hưởng lên ví (khi xóa). */
  huy() { if (this.loai === LoaiGiaoDich.Thu) this.vi.truTien(this.soTien); else this.vi.congTien(this.soTien); }
  /** R3: hoàn tác giá trị cũ trên ví cũ rồi áp giá trị mới lên ví mới (đúng cả khi đổi ví hoặc đổi loại). */
  capNhat(vi, dm, soTien, loai, ngay, ghiChu) {
    GiaoDich.#kiemTra(dm, soTien, loai);
    this.huy();
    Object.assign(this, { vi, maVi: vi.maVi, danhMuc: dm, maDanhMuc: dm.maDanhMuc, soTien, loai, ngayGiaoDich: ngay, ghiChu: ghiChu ?? null });
    this.ghiNhan();
  }
}

/** Chuyển tiền giữa hai ví của cùng một người dùng. Không phải thu/chi nên không vào báo cáo thu chi. */
export class ChuyenTien {
  constructor(init = {}) {
    Object.assign(this, { maChuyenTien: 0, maTaiKhoan: 0, maViNguon: 0, maViDich: 0, soTien: 0, ngayChuyen: '', ghiChu: null, viNguon: null, viDich: null }, init);
  }
  static tao(maTaiKhoan, viNguon, viDich, soTien, ngay, ghiChu) {
    if (!laSoNguyenDuong(soTien)) throw new DomainError('Số tiền phải lớn hơn 0'); // R1
    if (viNguon.maVi === viDich.maVi) throw new DomainError('Ví nguồn và ví đích phải khác nhau'); // R11
    return new ChuyenTien({ maTaiKhoan, viNguon, viDich, maViNguon: viNguon.maVi, maViDich: viDich.maVi, soTien, ngayChuyen: ngay, ghiChu: ghiChu ?? null });
  }
  /** R2 (ví nguồn đủ số dư) nằm trong truTien; lỗi thì dịch vụ rollback. */
  thucHien() { this.viNguon.truTien(this.soTien); this.viDich.congTien(this.soTien); }
}

/** Giao dịch lặp lại hằng tháng vào một ngày cố định (1-28), do bộ hẹn giờ tự tạo. */
export class GiaoDichDinhKy {
  constructor(init = {}) {
    Object.assign(this, { maDinhKy: 0, maTaiKhoan: 0, maVi: 0, maDanhMuc: 0, soTien: 0, loai: LoaiGiaoDich.Chi, ngayTrongThang: 1, ghiChu: null, dangBat: true, thangDaChay: null, ngayTao: '' }, init);
  }
  static kiemTra(soTien, ngayTrongThang, loai, danhMuc) {
    if (!laSoNguyenDuong(soTien)) throw new DomainError('Số tiền phải lớn hơn 0'); // R1
    if (!Number.isInteger(ngayTrongThang) || ngayTrongThang < 1 || ngayTrongThang > 28) throw new DomainError('Ngày trong tháng phải từ 1 đến 28'); // R12
    if (danhMuc.loai !== loai) throw new DomainError('Danh mục không đúng loại giao dịch');
  }
  /** Đến hạn khi đang bật, đã tới ngày trong tháng và tháng này chưa chạy (mỗi tháng đúng một lần). */
  denHan(homNay) {
    return this.dangBat && +homNay.slice(8, 10) >= this.ngayTrongThang && this.thangDaChay !== homNay.slice(0, 7);
  }
  ngayPhatSinh(homNay) { return `${homNay.slice(0, 7)}-${String(this.ngayTrongThang).padStart(2, '0')}T08:00:00`; }
}

// ---------------- Kế hoạch: ngân sách, mục tiêu ----------------
export class NganSach {
  constructor(init = {}) {
    Object.assign(this, { maNganSach: 0, maTaiKhoan: 0, maDanhMuc: 0, hanMuc: 0, thang: 1, nam: 2000, nguongCanhBao: 80, daCanhBaoNguong: false, daCanhBaoVuot: false }, init);
  }
  tinhSoDaChi(giaoDichs) {
    return giaoDichs.filter((g) => g.loai === LoaiGiaoDich.Chi && g.maDanhMuc === this.maDanhMuc && +g.ngayGiaoDich.slice(5, 7) === this.thang && +g.ngayGiaoDich.slice(0, 4) === this.nam)
      .reduce((s, g) => s + g.soTien, 0);
  }
  tinhTienDo(soDaChi) { return this.hanMuc <= 0 ? 0 : (soDaChi / this.hanMuc) * 100; }
  /** R6: mỗi mức (ngưỡng, vượt) chỉ cảnh báo đúng một lần. */
  kiemTraVuot(soDaChi) {
    const td = this.tinhTienDo(soDaChi);
    if (td > 100 && !this.daCanhBaoVuot) { this.daCanhBaoVuot = true; this.daCanhBaoNguong = true; return KetQuaCanhBao.Vuot; }
    if (td >= this.nguongCanhBao && td <= 100 && !this.daCanhBaoNguong) { this.daCanhBaoNguong = true; return KetQuaCanhBao.DatNguong; }
    return KetQuaCanhBao.KhongCo;
  }
  /** R6: sửa hạn mức thì tính lại hai cờ. */
  capNhatHanMuc(hanMuc, soDaChi) {
    if (!laSoNguyenDuong(hanMuc)) throw new DomainError('Hạn mức phải lớn hơn 0'); // R1
    this.hanMuc = hanMuc;
    const td = this.tinhTienDo(soDaChi);
    this.daCanhBaoVuot = td > 100;
    this.daCanhBaoNguong = td >= this.nguongCanhBao;
  }
}

const ngayThanhSo = (iso) => Math.floor(Date.parse(iso.slice(0, 10) + 'T00:00:00Z') / 86400000);

export class MucTieuTietKiem {
  constructor(init = {}) {
    Object.assign(this, { maMucTieu: 0, maTaiKhoan: 0, tenMucTieu: '', soTienMucTieu: 0, soTienHienTai: 0, hanChot: '', ngayTao: '' }, init);
  }
  /** R7: trừ ví nguồn, cộng vào mục tiêu; trả true CHỈ lần đầu đạt đủ mục tiêu. */
  napTien(vi, soTien) {
    const truoc = this.daHoanThanh();
    vi.truTien(soTien);
    this.soTienHienTai += soTien;
    return !truoc && this.daHoanThanh();
  }
  tinhTienDo() { return this.soTienMucTieu <= 0 ? 0 : Math.min(100, (this.soTienHienTai / this.soTienMucTieu) * 100); }
  daHoanThanh() { return this.soTienHienTai >= this.soTienMucTieu; }
  /** Chậm tiến độ: đã nạp ít hơn số kỳ vọng tuyến tính theo thời gian (ngày tạo -> hạn chót). */
  laChamTienDo(homNay) {
    if (this.daHoanThanh()) return false;
    const tong = ngayThanhSo(this.hanChot) - ngayThanhSo(this.ngayTao);
    if (tong <= 0) return true;
    const troiQua = Math.min(Math.max(ngayThanhSo(homNay) - ngayThanhSo(this.ngayTao), 0), tong);
    return this.soTienHienTai < (this.soTienMucTieu * troiQua) / tong;
  }
  soTienCanMoiThang(homNay) {
    const conLai = Math.max(0, this.soTienMucTieu - this.soTienHienTai);
    if (conLai === 0) return 0;
    const soThang = Math.max(1, (+this.hanChot.slice(0, 4) - +homNay.slice(0, 4)) * 12 + +this.hanChot.slice(5, 7) - +homNay.slice(5, 7));
    return Math.round(conLai / soThang);
  }
}

// ---------------- Đầu ra: thông báo, báo cáo tháng ----------------
export class ThongBao {
  constructor(init = {}) {
    Object.assign(this, { maThongBao: 0, maTaiKhoan: 0, loai: LoaiThongBao.NhacGhiChep, noiDung: '', daDoc: false, ngayTao: '' }, init);
  }
  danhDauDaDoc() { this.daDoc = true; }
}

export class BaoCaoThang {
  constructor(init = {}) {
    Object.assign(this, { maBaoCao: 0, maTaiKhoan: 0, thang: 1, nam: 2000, tongThu: 0, tongChi: 0, soDanhMucVuot: 0, ngayLap: '' }, init);
  }
  /** R9: lập hoặc cập nhật số liệu (không tạo bản trùng). */
  lapBaoCao(thu, chi, soVuot, luc) { Object.assign(this, { tongThu: thu, tongChi: chi, soDanhMucVuot: soVuot, ngayLap: luc }); }
}
