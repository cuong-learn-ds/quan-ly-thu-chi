import test from 'node:test';
import assert from 'node:assert/strict';
import { Vi, DanhMuc, GiaoDich, HoaDon, ChiTietHoaDon, NganSach, MucTieuTietKiem, QuanTriVien, NguoiDung, TaiKhoan, CaiDatNhacNho, KetQuaCanhBao, DomainError, TrangThaiTaiKhoan } from '../src/domain/index.js';
import { bamMatKhau, DongHoVietNam, phanTichKetQuaGemini } from '../src/ha-tang.js';

const loi = (msg) => (e) => e instanceof DomainError && e.message === msg;
const dmChi = new DanhMuc({ maDanhMuc: 1, loai: 'Chi' });
const dmThu = new DanhMuc({ maDanhMuc: 2, loai: 'Thu' });

test('R1/R2: ví không trừ quá số dư, số tiền phải > 0', () => {
  const vi = new Vi({ soDu: 100 });
  assert.throws(() => vi.truTien(101), loi('Số dư ví không đủ'));
  assert.throws(() => vi.congTien(-5), loi('Số tiền phải lớn hơn 0'));
  vi.truTien(100); assert.equal(vi.soDu, 0);
});

test('GiaoDich: ghiNhan chi giảm ví, huy thu làm ví giảm', () => {
  const vi = new Vi({ maVi: 1, soDu: 500 });
  const chi = GiaoDich.tao(1, vi, dmChi, 100, 'Chi', '2026-11-01T10:00:00'); chi.ghiNhan();
  assert.equal(vi.soDu, 400);
  const thu = GiaoDich.tao(1, vi, dmThu, 50, 'Thu', '2026-11-01T10:00:00'); thu.ghiNhan(); assert.equal(vi.soDu, 450);
  thu.huy(); assert.equal(vi.soDu, 400);
});

test('R3: sửa đổi ví A sang B thì A hoàn tiền, B bị trừ', () => {
  const a = new Vi({ maVi: 1, soDu: 1000 }); const b = new Vi({ maVi: 2, soDu: 1000 });
  const gd = GiaoDich.tao(1, a, dmChi, 300, 'Chi', '2026-11-01T10:00:00'); gd.ghiNhan();
  gd.capNhat(b, dmChi, 300, 'Chi', '2026-11-01T10:00:00', null);
  assert.deepEqual([a.soDu, b.soDu], [1000, 700]);
});

test('R3: đổi thu thành chi, ví giảm 2 lần số tiền', () => {
  const vi = new Vi({ maVi: 1, soDu: 1000 });
  const gd = GiaoDich.tao(1, vi, dmThu, 200, 'Thu', '2026-11-01T10:00:00'); gd.ghiNhan(); assert.equal(vi.soDu, 1200);
  gd.capNhat(vi, dmChi, 200, 'Chi', '2026-11-01T10:00:00', null); assert.equal(vi.soDu, 800);
});

test('Giao dịch: danh mục khác loại hoặc số tiền <= 0 bị từ chối', () => {
  const vi = new Vi({ soDu: 1000 });
  assert.throws(() => GiaoDich.tao(1, vi, dmThu, 10, 'Chi', 'x'), loi('Danh mục không đúng loại giao dịch'));
  assert.throws(() => GiaoDich.tao(1, vi, dmChi, 0, 'Chi', 'x'), loi('Số tiền phải lớn hơn 0'));
});

test('Hóa đơn: tổng tiền = tổng thành tiền (2×15000 + 1×20000 = 50000)', () => {
  const hd = new HoaDon({ chiTiet: [new ChiTietHoaDon({ soLuong: 2, donGia: 15000 }), new ChiTietHoaDon({ soLuong: 1, donGia: 20000 })] });
  assert.equal(hd.tinhTongTien(), 50000);
});

test('R6: 85% đạt ngưỡng đúng một lần; vượt 100% cảnh báo một lần', () => {
  const ns = new NganSach({ hanMuc: 1000 });
  assert.equal(ns.kiemTraVuot(850), KetQuaCanhBao.DatNguong);
  assert.equal(ns.kiemTraVuot(860), KetQuaCanhBao.KhongCo);
  assert.equal(ns.kiemTraVuot(1200), KetQuaCanhBao.Vuot);
  assert.equal(ns.kiemTraVuot(1300), KetQuaCanhBao.KhongCo);
});

test('R6: sửa hạn mức thì tính lại hai cờ', () => {
  const ns = new NganSach({ hanMuc: 1000, daCanhBaoNguong: true, daCanhBaoVuot: true });
  ns.capNhatHanMuc(5000, 1200);
  assert.deepEqual([ns.daCanhBaoNguong, ns.daCanhBaoVuot], [false, false]);
  assert.throws(() => ns.capNhatHanMuc(0, 0), loi('Hạn mức phải lớn hơn 0'));
});

test('R7: nạp mục tiêu trả true chỉ lần đầu đủ tiền', () => {
  const vi = new Vi({ soDu: 100 }); const mt = new MucTieuTietKiem({ soTienMucTieu: 100 });
  assert.equal(mt.napTien(vi, 100), true);
  vi.congTien(50);
  assert.equal(mt.napTien(vi, 50), false);
  assert.throws(() => mt.napTien(new Vi({ soDu: 0 }), 10), loi('Số dư ví không đủ'));
});

test('Mục tiêu: chậm tiến độ và số tiền cần mỗi tháng', () => {
  const mt = new MucTieuTietKiem({ soTienMucTieu: 10_000_000, soTienHienTai: 3_000_000, ngayTao: '2026-09-01', hanChot: '2026-12-31' });
  assert.equal(mt.laChamTienDo('2026-11-15'), true);
  assert.equal(mt.laChamTienDo('2026-09-10'), false);
  const m2 = new MucTieuTietKiem({ soTienMucTieu: 10_000_000, soTienHienTai: 4_000_000, hanChot: '2027-02-05' });
  assert.equal(m2.soTienCanMoiThang('2026-11-05'), 2_000_000);
});

test('R8: đăng nhập tài khoản bị khóa ném lỗi; sai mật khẩu trả false', () => {
  const nd = new NguoiDung({ maTaiKhoan: 2, matKhauHash: bamMatKhau.bam('abc123') });
  assert.equal(nd.dangNhap('sai', bamMatKhau), false);
  assert.equal(nd.dangNhap('abc123', bamMatKhau), true);
  nd.trangThai = TrangThaiTaiKhoan.BiKhoa;
  assert.throws(() => nd.dangNhap('abc123', bamMatKhau), loi('Tài khoản đã bị khóa'));
});

test('R8: quản trị viên không tự khóa mình, khóa cần lý do', () => {
  const ad = new QuanTriVien({ maTaiKhoan: 1 }); const nd = new NguoiDung({ maTaiKhoan: 2 });
  assert.throws(() => ad.khoaTaiKhoan(ad, 'x'), loi('Không thể tự khóa tài khoản của mình'));
  assert.throws(() => ad.khoaTaiKhoan(nd, ' '), loi('Vui lòng nhập lý do khóa'));
  ad.khoaTaiKhoan(nd, 'vi phạm'); assert.equal(nd.trangThai, 'BiKhoa');
  ad.moKhoaTaiKhoan(nd); assert.equal(nd.trangThai, 'HoatDong');
});

test('Đổi mật khẩu: sai mật khẩu cũ trả false và không đổi hash', () => {
  const tk = new TaiKhoan({ matKhauHash: bamMatKhau.bam('cu1234') }); const h = tk.matKhauHash;
  assert.equal(tk.doiMatKhau('sai', 'moi1234', bamMatKhau), false); assert.equal(tk.matKhauHash, h);
  assert.equal(tk.doiMatKhau('cu1234', 'moi1234', bamMatKhau), true); assert.ok(bamMatKhau.kiemTra('moi1234', tk.matKhauHash));
});

test('Cài đặt nhắc nhở khôi phục mặc định', () => {
  const c = new CaiDatNhacNho({ nhacHangNgay: false, gioNhac: '07:00', nhacNganSach: false, nhacMucTieu: false });
  c.khoiPhucMacDinh();
  assert.deepEqual([c.nhacHangNgay, c.gioNhac, c.nhacNganSach, c.nhacMucTieu], [true, '20:00', true, true]);
});

test('Đồng hồ VN: UTC 17:30 ngày 31/10 là 00:30 ngày 1/11 (giờ Việt Nam)', () => {
  const dh = new DongHoVietNam(() => Date.UTC(2026, 9, 31, 17, 30));
  assert.equal(dh.bayGio(), '2026-11-01T00:30:00'); assert.equal(dh.homNay(), '2026-11-01');
});

test('Gemini: đọc JSON bọc trong markdown; JSON hỏng thì báo lỗi nhận dạng', () => {
  const kq = phanTichKetQuaGemini('```json\n{"tenCuaHang":"A","ngay":"2026-11-01","tongTien":50000,"matHang":[{"ten":"Sữa","soLuong":2,"donGia":15000}]}\n```');
  assert.equal(kq.tongTien, 50000); assert.equal(kq.matHang[0].ten, 'Sữa');
  assert.throws(() => phanTichKetQuaGemini('không phải json'), loi('Không nhận dạng được hóa đơn'));
});
