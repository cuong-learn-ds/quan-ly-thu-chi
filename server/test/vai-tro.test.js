import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { moCsdl } from '../src/db.js';
import { taoApp } from '../src/app.js';
import { bamMatKhau, DongHoGia } from '../src/ha-tang.js';
import { napDuLieuKhoiTao } from '../src/seed.js';
import { NguoiDung, QuanTriVien, NhanVienHoTro, KiemToanVien, DomainError, LoaiThongBao } from '../src/domain/index.js';

let server, base;
before(async () => {
  const db = moCsdl(':memory:'); const dh = new DongHoGia('2026-11-15T10:00:00');
  napDuLieuKhoiTao(db, bamMatKhau, dh);
  const ctx = taoApp({ db, dongHo: dh, thuMucUpload: mkdtempSync(join(tmpdir(), 'qltc-vt-')) });
  await new Promise((r) => { server = ctx.app.listen(0, r); });
  base = `http://localhost:${server.address().port}/api`;
});
after(() => server.close());

async function goi(method, path, { token, body } = {}) {
  const res = await fetch(base + path, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}
const dangNhap = async (email) => (await goi('POST', '/auth/dang-nhap', { body: { email, matKhau: 'Demo@123' } })).json;
async function nguoiDung(email) {
  await goi('POST', '/auth/dang-ky', { body: { hoTen: 'ND', email, matKhau: 'matkhau123' } });
  return (await goi('POST', '/auth/dang-nhap', { body: { email, matKhau: 'matkhau123' } })).json.token;
}

test('đăng nhập trả đúng vai trò cho 4 loại tài khoản nội bộ và người dùng', async () => {
  const kq = {};
  for (const e of ['admin@demo.vn', 'hotro@demo.vn', 'kiemtoan@demo.vn']) kq[e] = (await dangNhap(e)).vaiTro;
  assert.deepEqual(kq, { 'admin@demo.vn': 'QuanTriVien', 'hotro@demo.vn': 'NhanVienHoTro', 'kiemtoan@demo.vn': 'KiemToanVien' });
  await nguoiDung('vt1@x.vn');
  assert.equal((await goi('POST', '/auth/dang-nhap', { body: { email: 'vt1@x.vn', matKhau: 'matkhau123' } })).json.vaiTro, 'NguoiDung');
});

test('Kiểm toán viên chỉ đọc: xem thống kê và danh sách người dùng, không khóa/tổng kết được', async () => {
  const t = (await dangNhap('kiemtoan@demo.vn')).token; const nd = await nguoiDung('vt2@x.vn');
  const tk = await goi('GET', '/admin/thong-ke', { token: t }); assert.equal(tk.status, 200); assert.equal(typeof tk.json.soNguoiMoiThangNay, 'number');
  const ds = (await goi('GET', '/admin/nguoi-dung?q=vt2@', { token: t })).json;
  assert.equal(ds.length, 1);
  assert.equal((await goi('PUT', `/admin/nguoi-dung/${ds[0].maTaiKhoan}/khoa`, { token: t, body: { lyDo: 'x' } })).status, 403);
  assert.equal((await goi('POST', '/admin/chay-tong-ket?thang=11&nam=2026', { token: t })).status, 403);
  assert.equal((await goi('GET', '/vi', { token: t })).status, 403);
  assert.equal((await goi('GET', '/vi', { token: nd })).status, 200);
});

test('Nhân viên hỗ trợ gửi thông báo cho người dùng nhưng không khóa được và không xem thống kê', async () => {
  const t = (await dangNhap('hotro@demo.vn')).token; const nd = await nguoiDung('vt3@x.vn');
  const ds = (await goi('GET', '/admin/nguoi-dung?q=vt3@', { token: t })).json; const id = ds[0].maTaiKhoan;
  assert.equal((await goi('POST', `/admin/nguoi-dung/${id}/thong-bao`, { token: t, body: { noiDung: '  ' } })).json.message, 'Nội dung thông báo không được để trống');
  assert.equal((await goi('POST', `/admin/nguoi-dung/${id}/thong-bao`, { token: t, body: { noiDung: 'x'.repeat(301) } })).status, 400);
  assert.equal((await goi('POST', `/admin/nguoi-dung/${id}/thong-bao`, { token: t, body: { noiDung: 'Bạn có thể xuất Excel ở màn hình Báo cáo' } })).status, 204);
  const tb = (await goi('GET', '/thong-bao', { token: nd })).json;
  assert.equal(tb[0].loai, LoaiThongBao.HoTro); assert.match(tb[0].noiDung, /Hỗ trợ: Bạn có thể xuất Excel/);
  assert.equal((await goi('PUT', `/admin/nguoi-dung/${id}/khoa`, { token: t, body: { lyDo: 'x' } })).status, 403);
  assert.equal((await goi('GET', '/admin/thong-ke', { token: t })).status, 403);
  assert.equal((await goi('POST', `/admin/nguoi-dung/9999/thong-bao`, { token: t, body: { noiDung: 'a' } })).status, 404);
});

test('Quản trị viên quản lý danh mục mặc định; người dùng thấy ngay; người dùng thường và hỗ trợ không đụng được', async () => {
  const t = (await dangNhap('admin@demo.vn')).token; const nd = await nguoiDung('vt4@x.vn');
  const moi = await goi('POST', '/admin/danh-muc-mac-dinh', { token: t, body: { tenDanhMuc: 'Thú cưng', loai: 'Chi' } });
  assert.equal(moi.status, 200); assert.equal(moi.json.laMacDinh, true);
  assert.equal((await goi('POST', '/admin/danh-muc-mac-dinh', { token: t, body: { tenDanhMuc: 'Thú cưng', loai: 'Chi' } })).json.message, 'Tên danh mục đã tồn tại');
  assert.ok((await goi('GET', '/danh-muc?loai=Chi', { token: nd })).json.some((d) => d.tenDanhMuc === 'Thú cưng'));
  const hotro = (await dangNhap('hotro@demo.vn')).token;
  assert.equal((await goi('GET', '/admin/danh-muc-mac-dinh', { token: hotro })).status, 403);
  assert.equal((await goi('GET', '/admin/danh-muc-mac-dinh', { token: nd })).status, 403);
  assert.equal((await goi('DELETE', `/admin/danh-muc-mac-dinh/${moi.json.maDanhMuc}`, { token: t })).status, 204);
});

test('Quản trị viên không dùng được chức năng cá nhân (ví, giao dịch...)', async () => {
  const admin = (await dangNhap('admin@demo.vn')).token;
  assert.equal((await goi('GET', '/vi', { token: admin })).status, 403);
  assert.equal((await goi('GET', '/giao-dich', { token: admin })).status, 403);
  assert.equal((await goi('GET', '/admin/thong-ke', { token: admin })).status, 200);
});

test('domain: các vai trò kế thừa TaiKhoan và quy tắc riêng của từng vai trò', () => {
  const nd = new NguoiDung({ maTaiKhoan: 5 });
  assert.deepEqual([new QuanTriVien().vaiTro, new NhanVienHoTro().vaiTro, new KiemToanVien().vaiTro, nd.vaiTro], ['QuanTriVien', 'NhanVienHoTro', 'KiemToanVien', 'NguoiDung']);
  assert.throws(() => new NhanVienHoTro().guiThongBaoHoTro(new QuanTriVien(), 'a', 'x'), (e) => e instanceof DomainError && e.message === 'Chỉ gửi thông báo hỗ trợ cho người dùng');
  const dm = new QuanTriVien().taoDanhMucMacDinh('  Du lịch ', 'Chi');
  assert.deepEqual([dm.tenDanhMuc, dm.laMacDinh, dm.maTaiKhoan], ['Du lịch', true, null]);
  assert.throws(() => new QuanTriVien().taoDanhMucMacDinh('A', 'Khac'), (e) => e instanceof DomainError);
});
