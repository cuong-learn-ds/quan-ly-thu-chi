import { networkInterfaces } from 'node:os';
import QRCode from 'qrcode';
import express from 'express';
import multer from 'multer';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DomainError, NotFoundError } from './domain/index.js';
import { taoDichVu } from './services/index.js';
import { DongHoVietNam, bamMatKhau, JwtService, FakeDichVuOcr, GeminiDichVuOcr, LuuTepService } from './ha-tang.js';
import { BoHenGio } from './jobs.js';

const thuMucGoc = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Dựng ứng dụng Express. `ctx` cho phép thay CSDL, đồng hồ, OCR khi kiểm thử. */
export function taoApp({ db, dongHo = new DongHoVietNam(), ocr, khoaJwt = process.env.JWT_KEY ?? 'khoa-bi-mat-chi-dung-cho-demo-cuc-bo', thuMucUpload = join(thuMucGoc, 'uploads') }) {
  const luuTep = new LuuTepService(thuMucUpload);
  if (!ocr) {
    const apiKey = process.env.GEMINI_API_KEY;
    ocr = apiKey && process.env.GEMINI_DUNG_BAN_GIA !== '1'
      ? new GeminiDichVuOcr({ apiKey, model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash' })
      : new FakeDichVuOcr(dongHo);
  }
  const jwt = new JwtService(khoaJwt);
  const ctx = { db, dongHo, bam: bamMatKhau, jwt, ocr, luuTep };
  const S = taoDichVu(ctx);
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 6 * 1024 * 1024 } });
  const bao = (fn) => (req, res, next) => Promise.resolve().then(() => fn(req, res)).then((kq) => { if (!res.headersSent) { if (kq === undefined) res.status(204).end(); else res.json(kq); } }).catch(next);

  // ---- xác thực (R8: token cũ của tài khoản bị khóa bị từ chối ở request kế tiếp)
  const dangNhapBatBuoc = (req, res, next) => {
    try {
      const h = req.headers.authorization ?? '';
      if (!h.startsWith('Bearer ')) return res.status(401).json({ message: 'Chưa đăng nhập' });
      const p = jwt.xacThuc(h.slice(7));
      const tk = db.get('SELECT maTaiKhoan, loaiTaiKhoan, trangThai FROM TaiKhoan WHERE maTaiKhoan=?', Number(p.sub));
      if (!tk || tk.trangThai !== 'HoatDong') return res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ hoặc tài khoản đã bị khóa' });
      req.maTk = tk.maTaiKhoan; req.vaiTro = tk.loaiTaiKhoan;
      next();
    } catch { res.status(401).json({ message: 'Phiên đăng nhập hết hạn' }); }
  };
  const vaiTro = (...ds) => (req, res, next) => (ds.includes(req.vaiTro) ? next() : res.status(403).json({ message: 'Bạn không có quyền truy cập' }));

  const api = express.Router();
  api.get('/health', (req, res) => res.json({ status: 'ok' }));
  // Mã QR để mở web trên điện thoại cùng mạng Wi-Fi (công khai, chỉ trả địa chỉ của chính máy chủ)
  api.get('/ket-noi-dien-thoai', bao(async (req) => {
    const cong = req.socket.localPort;
    const diaChi = Object.values(networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal && !i.address.startsWith('169.254.')).map((i) => i.address);
    diaChi.sort((a, b) => Number(/^(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))/.test(b)) - Number(/^(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))/.test(a)));
    return Promise.all(diaChi.slice(0, 3).map(async (ip) => { const url = `http://${ip}:${cong}`; return { url, svg: await QRCode.toString(url, { type: 'svg', margin: 1, width: 220 }) }; }));
  }));
  api.post('/auth/dang-ky', bao((req) => { S.taiKhoan.dangKy(req.body); return { message: 'Đăng ký thành công' }; }));
  api.post('/auth/dang-nhap', bao((req) => S.taiKhoan.dangNhap(req.body)));

  api.use(dangNhapBatBuoc);
  // Các chức năng cá nhân chỉ dành cho Người dùng; các vai trò nội bộ dùng đường dẫn /admin riêng.
  api.use(['/vi', '/danh-muc', '/giao-dich', '/hoa-don', '/ngan-sach', '/muc-tieu', '/bao-cao', '/thong-bao', '/chuyen-tien', '/giao-dich-dinh-ky'], vaiTro('NguoiDung'));
  api.get('/tai-khoan/toi', bao((req) => S.taiKhoan.toi(req.maTk)));
  api.put('/tai-khoan/toi', bao((req) => S.taiKhoan.capNhat(req.maTk, req.body?.hoTen)));
  api.put('/tai-khoan/mat-khau', bao((req) => S.taiKhoan.doiMatKhau(req.maTk, req.body)));

  api.get('/vi', bao((req) => S.vi.danhSach(req.maTk)));
  api.post('/vi', bao((req) => S.vi.them(req.maTk, req.body)));
  api.put('/vi/:id', bao((req) => S.vi.sua(req.maTk, +req.params.id, req.body)));
  api.delete('/vi/:id', bao((req) => S.vi.xoa(req.maTk, +req.params.id)));

  api.get('/danh-muc', bao((req) => S.danhMuc.danhSach(req.maTk, req.query.loai)));
  api.post('/danh-muc', bao((req) => S.danhMuc.them(req.maTk, req.body)));
  api.put('/danh-muc/:id', bao((req) => S.danhMuc.sua(req.maTk, +req.params.id, req.body)));
  api.delete('/danh-muc/:id', bao((req) => S.danhMuc.xoa(req.maTk, +req.params.id, req.query.chuyenSang)));

  api.get('/giao-dich', bao((req) => S.giaoDich.timKiem(req.maTk, req.query)));
  api.get('/giao-dich/:id/hoa-don', bao((req) => S.giaoDich.chiTietHoaDon(req.maTk, +req.params.id) ?? {}));
  api.post('/giao-dich', bao((req) => S.giaoDich.them(req.maTk, req.body)));
  api.put('/giao-dich/:id', bao((req) => S.giaoDich.sua(req.maTk, +req.params.id, req.body)));
  api.delete('/giao-dich/:id', bao((req) => S.giaoDich.xoa(req.maTk, +req.params.id)));

  api.get('/chuyen-tien', bao((req) => S.chuyenTien.danhSach(req.maTk)));
  api.post('/chuyen-tien', bao((req) => S.chuyenTien.them(req.maTk, req.body)));

  api.get('/giao-dich-dinh-ky', bao((req) => S.dinhKy.danhSach(req.maTk)));
  api.post('/giao-dich-dinh-ky', bao((req) => S.dinhKy.tao(req.maTk, req.body)));
  api.put('/giao-dich-dinh-ky/:id', bao((req) => S.dinhKy.sua(req.maTk, +req.params.id, req.body)));
  api.put('/giao-dich-dinh-ky/:id/bat-tat', bao((req) => S.dinhKy.batTat(req.maTk, +req.params.id, req.body?.dangBat)));
  api.delete('/giao-dich-dinh-ky/:id', bao((req) => S.dinhKy.xoa(req.maTk, +req.params.id)));

  api.post('/hoa-don/quet', upload.single('anh'), bao((req) => S.hoaDon.quet(req.file)));

  const thangNam = (req) => { const h = dongHo.bayGio(); return [Number(req.query.thang ?? +h.slice(5, 7)), Number(req.query.nam ?? +h.slice(0, 4))]; };
  api.get('/ngan-sach', bao((req) => S.nganSach.danhSachTheoThang(req.maTk, ...thangNam(req))));
  api.post('/ngan-sach', bao((req) => S.nganSach.lap(req.maTk, req.body)));
  api.put('/ngan-sach/:id', bao((req) => S.nganSach.sua(req.maTk, +req.params.id, req.body)));
  api.delete('/ngan-sach/:id', bao((req) => S.nganSach.xoa(req.maTk, +req.params.id)));

  api.get('/muc-tieu', bao((req) => S.mucTieu.danhSach(req.maTk)));
  api.post('/muc-tieu', bao((req) => S.mucTieu.tao(req.maTk, req.body)));
  api.put('/muc-tieu/:id', bao((req) => S.mucTieu.sua(req.maTk, +req.params.id, req.body)));
  api.delete('/muc-tieu/:id', bao((req) => S.mucTieu.xoa(req.maTk, +req.params.id)));
  api.post('/muc-tieu/:id/nap-tien', bao((req) => S.mucTieu.napTien(req.maTk, +req.params.id, req.body)));

  api.get('/bao-cao/tong-quan', bao((req) => S.baoCao.tongQuan(req.maTk, ...thangNam(req))));
  api.get('/bao-cao/theo-danh-muc', bao((req) => S.baoCao.theoDanhMuc(req.maTk, req.query.tu, req.query.den, req.query.loai ?? 'Chi')));
  api.get('/bao-cao/theo-thoi-gian', bao((req) => S.baoCao.theoThoiGian(req.maTk, Number(req.query.nam ?? dongHo.bayGio().slice(0, 4)))));
  api.get('/bao-cao/thang', bao((req) => S.baoCao.danhSachBaoCaoThang(req.maTk)));
  api.get('/bao-cao/excel', async (req, res, next) => {
    try {
      const buf = await S.baoCao.xuatExcel(req.maTk, req.query.tu, req.query.den);
      res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="bao-cao-${req.query.tu}-${req.query.den}.xlsx"` }).send(buf);
    } catch (e) { next(e); }
  });

  api.get('/thong-bao', bao((req) => S.thongBao.danhSach(req.maTk)));
  api.get('/thong-bao/so-chua-doc', bao((req) => ({ soChuaDoc: S.thongBao.soChuaDoc(req.maTk) })));
  api.get('/thong-bao/cai-dat', bao((req) => S.thongBao.layCaiDat(req.maTk)));
  api.put('/thong-bao/cai-dat', bao((req) => S.thongBao.luuCaiDat(req.maTk, req.body)));
  api.post('/thong-bao/cai-dat/khoi-phuc', bao((req) => S.thongBao.khoiPhucMacDinh(req.maTk)));
  api.put('/thong-bao/da-doc-tat-ca', bao((req) => S.thongBao.daDocTatCa(req.maTk)));
  api.put('/thong-bao/:id/da-doc', bao((req) => S.thongBao.daDoc(req.maTk, +req.params.id)));
  api.delete('/thong-bao/:id', bao((req) => S.thongBao.xoa(req.maTk, +req.params.id)));

  const QT = vaiTro('QuanTriVien'), XEM_ND = vaiTro('QuanTriVien', 'NhanVienHoTro', 'KiemToanVien');
  api.get('/admin/nguoi-dung', XEM_ND, bao((req) => S.quanTri.danhSachNguoiDung(req.query.q)));
  api.put('/admin/nguoi-dung/:id/khoa', QT, bao((req) => S.quanTri.khoa(req.maTk, +req.params.id, req.body?.lyDo)));
  api.put('/admin/nguoi-dung/:id/mo-khoa', QT, bao((req) => S.quanTri.moKhoa(req.maTk, +req.params.id)));
  api.post('/admin/nguoi-dung/:id/thong-bao', vaiTro('NhanVienHoTro'), bao((req) => S.quanTri.guiThongBaoHoTro(req.maTk, +req.params.id, req.body?.noiDung)));
  api.get('/admin/danh-muc-mac-dinh', QT, bao(() => S.quanTri.danhMucMacDinh()));
  api.post('/admin/danh-muc-mac-dinh', QT, bao((req) => S.quanTri.themMacDinh(req.maTk, req.body)));
  api.put('/admin/danh-muc-mac-dinh/:id', QT, bao((req) => S.quanTri.suaMacDinh(+req.params.id, req.body)));
  api.delete('/admin/danh-muc-mac-dinh/:id', QT, bao((req) => S.quanTri.xoaMacDinh(+req.params.id)));
  api.get('/admin/thong-ke', vaiTro('QuanTriVien', 'KiemToanVien'), bao(() => S.quanTri.thongKe()));
  api.post('/admin/chay-tong-ket', QT, bao((req) => ({ soNguoiDaXuLy: S.quanTri.chayTongKet(Number(req.query.thang), Number(req.query.nam)) })));

  app.use('/api', api);
  app.use('/uploads', express.static(thuMucUpload));
  app.use(express.static(join(thuMucGoc, 'public')));

  // ---- lỗi: DomainError 400, NotFound 404, còn lại 500 (chi tiết vào log)
  app.use('/api', (req, res) => res.status(404).json({ message: 'Không tìm thấy đường dẫn' }));
  app.use((err, req, res, _next) => {
    if (err instanceof DomainError) return res.status(400).json({ message: err.message });
    if (err instanceof NotFoundError) return res.status(404).json({ message: err.message });
    if (err instanceof multer.MulterError) return res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'Ảnh vượt quá 5 MB' : 'Tệp tải lên không hợp lệ' });
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ message: 'Dữ liệu gửi lên không đúng định dạng JSON' });
    if (String(err?.message).includes('UNIQUE constraint')) return res.status(400).json({ message: 'Dữ liệu bị trùng' });
    console.error(err);
    res.status(500).json({ message: 'Đã xảy ra lỗi, vui lòng thử lại' });
  });

  return { app, S, ctx, boHenGio: new BoHenGio(db, S, dongHo) };
}
