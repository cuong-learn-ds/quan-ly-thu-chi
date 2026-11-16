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

// ---------------- Kế hoạch tài chính tháng ----------------
export const PhuongPhapKeHoach = Object.freeze({ LichSu: 'LichSu', QuyTac503020: '50-30-20' });
/** Nhóm "thiết yếu" của quy tắc 50/30/20; các danh mục chi còn lại thuộc nhóm "mong muốn". */
export const DANH_MUC_THIET_YEU = Object.freeze(['Ăn uống', 'Đi lại', 'Hóa đơn', 'Sức khỏe', 'Giáo dục']);
const lamTron = (n, buoc) => Math.round(n / buoc) * buoc;
const lamTronXuong = (n, buoc) => Math.floor(n / buoc) * buoc;
const lamTronLen = (n, buoc) => Math.ceil(n / buoc) * buoc;
const vnd = (n) => `${Math.round(n).toLocaleString('vi-VN')}đ`;

/**
 * Kế hoạch tài chính của một tháng (R13): thu nhập dự kiến, tiền để dành và cách phân bổ chi.
 * Phần phân bổ chi được lưu thành các NganSach của tháng nên cảnh báo vượt ngân sách (R6) dùng lại được.
 */
export class KeHoachThang {
  constructor(init = {}) {
    Object.assign(this, { maKeHoach: 0, maTaiKhoan: 0, thang: 1, nam: 2000, thuNhapDuKien: 0, tietKiemDuKien: 0, phuongPhap: PhuongPhapKeHoach.LichSu, ngayLap: '' }, init);
  }
  /** R13: thu nhập dự kiến > 0, tiền để dành >= 0, phương pháp hợp lệ. */
  static lap(maTaiKhoan, thang, nam, thuNhapDuKien, tietKiemDuKien, phuongPhap, ngayLap) {
    if (!Number.isInteger(thuNhapDuKien) || thuNhapDuKien <= 0) throw new DomainError('Thu nhập dự kiến phải là số nguyên lớn hơn 0');
    if (!Number.isInteger(tietKiemDuKien) || tietKiemDuKien < 0) throw new DomainError('Tiền để dành dự kiến không hợp lệ');
    if (!Object.values(PhuongPhapKeHoach).includes(phuongPhap)) throw new DomainError('Phương pháp lập kế hoạch không hợp lệ');
    return new KeHoachThang({ maTaiKhoan, thang, nam, thuNhapDuKien, tietKiemDuKien, phuongPhap, ngayLap });
  }
  /** Phần còn lại sau khi trừ tổng hạn mức chi và tiền để dành; âm nghĩa là kế hoạch thâm hụt. */
  tinhConLai(tongChiKeHoach) { return this.thuNhapDuKien - tongChiKeHoach - this.tietKiemDuKien; }
  laCanDoi(tongChiKeHoach) { return this.tinhConLai(tongChiKeHoach) >= 0; }

  /** Dự báo chi cả tháng theo tốc độ chi hiện tại. */
  static duBaoChiCaThang(daChi, ngayDaQua, soNgayTrongThang) {
    if (ngayDaQua <= 0) return daChi;
    return Math.round((daChi / Math.min(ngayDaQua, soNgayTrongThang)) * soNgayTrongThang);
  }

  /**
   * Thuật toán gợi ý phân bổ: người dùng chỉ cần nhập (hoặc xác nhận) thu nhập, hệ thống đề xuất phần còn lại.
   * danhMuc: [{ maDanhMuc, tenDanhMuc, trungBinh3Thang, coDinh }] — coDinh là tổng các khoản chi định kỳ của danh mục.
   * tietKiemCan: tổng số tiền các mục tiêu cần để dành mỗi tháng.
   * - LichSu: mỗi danh mục lấy mức chi trung bình 3 tháng (làm tròn lên 50.000đ, không thấp hơn khoản cố định);
   *   để dành = nhu cầu của các mục tiêu (hoặc 10% thu nhập nếu chưa có mục tiêu); thiếu tiền thì giảm phần linh hoạt theo tỷ lệ.
   * - 50-30-20: 50% thu nhập cho nhóm thiết yếu, 30% cho nhóm mong muốn, 20% để dành; trong mỗi nhóm chia theo tỷ trọng chi trước đây.
   */
  static goiYPhanBo(thuNhap, phuongPhap, danhMuc, tietKiemCan) {
    const canhBao = [];
    const ds = danhMuc.map((d) => ({ ...d, coDinh: d.coDinh ?? 0, trungBinh3Thang: d.trungBinh3Thang ?? 0,
      nhom: DANH_MUC_THIET_YEU.includes(d.tenDanhMuc) ? 'Thiết yếu' : 'Mong muốn' }));
    const tongCoDinh = ds.reduce((s, d) => s + d.coDinh, 0);
    let tietKiem;
    if (phuongPhap === PhuongPhapKeHoach.QuyTac503020) {
      tietKiem = lamTron(thuNhap * 0.2, 10_000);
      for (const [nhom, tyLe] of [['Thiết yếu', 0.5], ['Mong muốn', 0.3]]) {
        const trong = ds.filter((d) => d.nhom === nhom);
        if (!trong.length) continue;
        const quy = thuNhap * tyLe;
        const trongSo = trong.map((d) => Math.max(d.trungBinh3Thang, d.coDinh));
        const tong = trongSo.reduce((s, x) => s + x, 0);
        trong.forEach((d, i) => { d.deXuat = Math.max(d.coDinh, lamTronXuong(tong ? (quy * trongSo[i]) / tong : quy / trong.length, 10_000)); });
        if (trong.reduce((s, d) => s + d.deXuat, 0) > quy + 1) canhBao.push(`Các khoản cố định của nhóm ${nhom.toLowerCase()} vượt ${Math.round(tyLe * 100)}% thu nhập.`);
      }
      if (tietKiemCan > tietKiem) canhBao.push(`Các mục tiêu cần để dành ${vnd(tietKiemCan)}/tháng, nhiều hơn 20% thu nhập; nên giảm nhóm mong muốn hoặc lùi hạn chót.`);
    } else {
      tietKiem = tietKiemCan > 0 ? lamTronLen(tietKiemCan, 10_000) : lamTron(thuNhap * 0.1, 10_000);
      ds.forEach((d) => { d.deXuat = d.trungBinh3Thang > 0 || d.coDinh > 0 ? Math.max(d.coDinh, lamTronLen(d.trungBinh3Thang, 50_000)) : 0; });
      const linhHoat = ds.reduce((s, d) => s + (d.deXuat - d.coDinh), 0);
      if (thuNhap > 0 && tongCoDinh + linhHoat + tietKiem > thuNhap) {
        if (tongCoDinh + tietKiem > thuNhap) {
          tietKiem = Math.max(0, lamTronXuong(thuNhap - tongCoDinh, 10_000));
          canhBao.push('Thu nhập dự kiến chưa đủ cho các khoản cố định và mục tiêu tiết kiệm; đã giảm tiền để dành.');
        }
        const conCho = Math.max(0, thuNhap - tongCoDinh - tietKiem);
        const k = linhHoat > 0 ? Math.min(1, conCho / linhHoat) : 0;
        ds.forEach((d) => { d.deXuat = d.coDinh + lamTronXuong((d.deXuat - d.coDinh) * k, 10_000); });
        canhBao.push('Thu nhập không đủ cho mức chi như 3 tháng gần đây; các khoản linh hoạt đã được giảm theo tỷ lệ.');
      }
    }
    const tongChi = ds.reduce((s, d) => s + d.deXuat, 0);
    return { phanBo: ds, tietKiem, tongChi, conLai: thuNhap - tongChi - tietKiem, canhBao };
  }

  /** Nhận xét kế hoạch so với thực tế (hiện trên trang Kế hoạch). muc: tot | canh | xau. */
  danhGia({ tongChiKeHoach, daChi, duBaoChi, tietKiemThucTe, danhMucVuot = [], thangDaQua = false }) {
    const nx = [];
    if (!this.laCanDoi(tongChiKeHoach)) nx.push({ muc: 'xau', noiDung: `Kế hoạch đang thâm hụt ${vnd(-this.tinhConLai(tongChiKeHoach))}: tổng hạn mức chi và tiền để dành lớn hơn thu nhập dự kiến.` });
    if (danhMucVuot.length) nx.push({ muc: 'xau', noiDung: `Đã vượt hạn mức: ${danhMucVuot.join(', ')}.` });
    if (duBaoChi > tongChiKeHoach) nx.push({ muc: 'canh', noiDung: `${thangDaQua ? 'Cả tháng đã chi' : 'Theo tốc độ hiện tại, cả tháng sẽ chi khoảng'} ${vnd(duBaoChi)}, vượt kế hoạch ${vnd(duBaoChi - tongChiKeHoach)}.` });
    else if (daChi > 0) nx.push({ muc: 'tot', noiDung: `Chi tiêu đang trong kế hoạch: ${thangDaQua ? 'đã chi' : 'dự báo cả tháng'} ${vnd(duBaoChi)} / kế hoạch ${vnd(tongChiKeHoach)}.` });
    if (this.tietKiemDuKien > 0) {
      if (tietKiemThucTe >= this.tietKiemDuKien) nx.push({ muc: 'tot', noiDung: 'Đã để dành đủ số tiền theo kế hoạch tháng này.' });
      else nx.push({ muc: 'canh', noiDung: `Cần để dành thêm ${vnd(this.tietKiemDuKien - tietKiemThucTe)} (nạp vào mục tiêu tiết kiệm) để đạt kế hoạch.` });
    }
    return nx;
  }
}
