import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { moCsdl } from '../src/db.js';
import { taoApp } from '../src/app.js';
import { bamMatKhau, DongHoGia } from '../src/ha-tang.js';
import { napDuLieuKhoiTao, napDuLieuDemo } from '../src/seed.js';

let server, base, db, dongHo, ocr, ctx;
before(async () => {
  db = moCsdl(':memory:');
  dongHo = new DongHoGia('2026-11-15T10:00:00');
  napDuLieuKhoiTao(db, bamMatKhau, dongHo);
  ocr = { loi: false, async nhanDang() { if (this.loi) { const { DomainError } = await import('../src/domain/index.js'); throw new DomainError('Không nhận dạng được hóa đơn'); } return { tenCuaHang: 'ABC', ngay: '2026-11-15', tongTien: null, matHang: [{ ten: 'Sữa', soLuong: 2, donGia: 15000 }] }; } };
  ctx = taoApp({ db, dongHo, ocr, thuMucUpload: mkdtempSync(join(tmpdir(), 'qltc-')) });
  await new Promise((r) => { server = ctx.app.listen(0, r); });
  base = `http://localhost:${server.address().port}/api`;
});
after(() => server.close());

async function goi(method, path, { token, body, raw } = {}) {
  const res = await fetch(base + path, { method, headers: { ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
  if (raw) return res;
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}
async function dangKy(email, matKhau = 'matkhau123') {
  await goi('POST', '/auth/dang-ky', { body: { hoTen: 'Test', email, matKhau } });
  const r = await goi('POST', '/auth/dang-nhap', { body: { email, matKhau } });
  return r.json.token;
}
const viDau = async (t) => (await goi('GET', '/vi', { token: t })).json[0];
const dm = async (t, ten, loai) => (await goi('GET', `/danh-muc?loai=${loai}`, { token: t })).json.find((d) => d.tenDanhMuc === ten);
const naptien = async (t, so) => goi('POST', '/giao-dich', { token: t, body: { maVi: (await viDau(t)).maVi, maDanhMuc: (await dm(t, 'Lương', 'Thu')).maDanhMuc, soTien: so, loai: 'Thu' } });

test('đăng ký tạo ví Tiền mặt và cài đặt nhắc nhở mặc định; email trùng bị từ chối', async () => {
  const t = await dangKy('a1@x.vn');
  const vis = (await goi('GET', '/vi', { token: t })).json;
  assert.equal(vis.length, 1); assert.equal(vis[0].tenVi, 'Tiền mặt'); assert.equal(vis[0].soDu, 0);
  assert.equal((await goi('GET', '/thong-bao/cai-dat', { token: t })).json.gioNhac, '20:00');
  const trung = await goi('POST', '/auth/dang-ky', { body: { hoTen: 'A', email: 'a1@x.vn', matKhau: '123456' } });
  assert.equal(trung.status, 400); assert.equal(trung.json.message, 'Email đã được sử dụng');
  const sai = await goi('POST', '/auth/dang-nhap', { body: { email: 'a1@x.vn', matKhau: 'saisai' } });
  assert.equal(sai.json.message, 'Email hoặc mật khẩu không đúng');
});

test('không token -> 401; người dùng thường gọi admin -> 403', async () => {
  assert.equal((await goi('GET', '/vi')).status, 401);
  const t = await dangKy('a2@x.vn');
  assert.equal((await goi('GET', '/admin/thong-ke', { token: t })).status, 403);
});

test('thêm thu/chi làm số dư ví thay đổi; chi vượt số dư -> 400 và không lưu', async () => {
  const t = await dangKy('a3@x.vn'); const vi = await viDau(t);
  await naptien(t, 1_000_000);
  const an = await dm(t, 'Ăn uống', 'Chi');
  const ok = await goi('POST', '/giao-dich', { token: t, body: { maVi: vi.maVi, maDanhMuc: an.maDanhMuc, soTien: 200_000, loai: 'Chi' } });
  assert.equal(ok.status, 200);
  assert.equal((await viDau(t)).soDu, 800_000);
  const vuot = await goi('POST', '/giao-dich', { token: t, body: { maVi: vi.maVi, maDanhMuc: an.maDanhMuc, soTien: 9_000_000, loai: 'Chi' } });
  assert.equal(vuot.status, 400); assert.equal(vuot.json.message, 'Số dư ví không đủ');
  assert.equal((await viDau(t)).soDu, 800_000);
  assert.equal((await goi('GET', '/giao-dich', { token: t })).json.tongSo, 2);
});

test('R3: xóa khoản thu mà tiền đã tiêu hết -> 400 và CSDL không đổi', async () => {
  const t = await dangKy('a4@x.vn'); const vi = await viDau(t);
  const thu = (await naptien(t, 100_000)).json;
  await goi('POST', '/giao-dich', { token: t, body: { maVi: vi.maVi, maDanhMuc: (await dm(t, 'Ăn uống', 'Chi')).maDanhMuc, soTien: 100_000, loai: 'Chi' } });
  const r = await goi('DELETE', `/giao-dich/${thu.maGiaoDich}`, { token: t });
  assert.equal(r.status, 400); assert.equal(r.json.message, 'Số dư ví không đủ');
  assert.equal((await goi('GET', '/giao-dich', { token: t })).json.tongSo, 2);
  assert.equal((await viDau(t)).soDu, 0);
});

test('R3: sửa đổi ví thì ví cũ hoàn tiền, ví mới bị trừ', async () => {
  const t = await dangKy('a5@x.vn'); const a = await viDau(t);
  const b = (await goi('POST', '/vi', { token: t, body: { tenVi: 'Ngân hàng', loaiVi: 'NganHang', soDuBanDau: 500_000 } })).json;
  await naptien(t, 300_000);
  const chi = (await goi('POST', '/giao-dich', { token: t, body: { maVi: a.maVi, maDanhMuc: (await dm(t, 'Ăn uống', 'Chi')).maDanhMuc, soTien: 100_000, loai: 'Chi' } })).json;
  await goi('PUT', `/giao-dich/${chi.maGiaoDich}`, { token: t, body: { maVi: b.maVi, maDanhMuc: chi.maDanhMuc, soTien: 100_000, loai: 'Chi' } });
  const vis = (await goi('GET', '/vi', { token: t })).json;
  assert.deepEqual([vis.find((v) => v.maVi === a.maVi).soDu, vis.find((v) => v.maVi === b.maVi).soDu], [300_000, 400_000]);
});

test('R10: dữ liệu của người khác trả 404', async () => {
  const t1 = await dangKy('a6@x.vn'); const t2 = await dangKy('a7@x.vn');
  const vi1 = await viDau(t1);
  assert.equal((await goi('DELETE', `/vi/${vi1.maVi}`, { token: t2 })).status, 404);
  const gd = (await naptien(t1, 10_000)).json;
  assert.equal((await goi('DELETE', `/giao-dich/${gd.maGiaoDich}`, { token: t2 })).status, 404);
});

test('R4/R5: trùng tên ví, ví còn giao dịch, danh mục mặc định, chuyển danh mục khi xóa', async () => {
  const t = await dangKy('a8@x.vn');
  assert.equal((await goi('POST', '/vi', { token: t, body: { tenVi: 'Tiền mặt', loaiVi: 'TienMat' } })).json.message, 'Tên ví đã tồn tại');
  await naptien(t, 10_000);
  assert.equal((await goi('DELETE', `/vi/${(await viDau(t)).maVi}`, { token: t })).json.message, 'Ví còn giao dịch hoặc lịch định kỳ, không thể xóa');
  const mac = await dm(t, 'Ăn uống', 'Chi');
  assert.equal((await goi('PUT', `/danh-muc/${mac.maDanhMuc}`, { token: t, body: { tenDanhMuc: 'X' } })).json.message, 'Không thể sửa danh mục mặc định');
  const moi = (await goi('POST', '/danh-muc', { token: t, body: { tenDanhMuc: 'Cà phê', loai: 'Chi' } })).json;
  const vi = await viDau(t);
  await goi('POST', '/giao-dich', { token: t, body: { maVi: vi.maVi, maDanhMuc: moi.maDanhMuc, soTien: 1000, loai: 'Chi' } });
  assert.equal((await goi('DELETE', `/danh-muc/${moi.maDanhMuc}`, { token: t })).status, 400);
  const thuKhac = await dm(t, 'Thưởng', 'Thu');
  assert.equal((await goi('DELETE', `/danh-muc/${moi.maDanhMuc}?chuyenSang=${thuKhac.maDanhMuc}`, { token: t })).status, 400); // khác loại
  assert.equal((await goi('DELETE', `/danh-muc/${moi.maDanhMuc}?chuyenSang=${mac.maDanhMuc}`, { token: t })).status, 204);
  assert.equal((await goi('GET', `/giao-dich?danhMucId=${mac.maDanhMuc}`, { token: t })).json.tongSo, 1);
});

test('R6: ngân sách cảnh báo ngưỡng và vượt đúng một lần; chỉ tính theo tháng của giao dịch', async () => {
  const t = await dangKy('a9@x.vn'); const vi = await viDau(t); await naptien(t, 5_000_000);
  const an = await dm(t, 'Ăn uống', 'Chi');
  assert.equal((await goi('POST', '/ngan-sach', { token: t, body: { maDanhMuc: (await dm(t, 'Lương', 'Thu')).maDanhMuc, hanMuc: 1000, thang: 11, nam: 2026 } })).json.message, 'Chỉ lập ngân sách cho danh mục chi');
  const ns = (await goi('POST', '/ngan-sach', { token: t, body: { maDanhMuc: an.maDanhMuc, hanMuc: 1_000_000, thang: 11, nam: 2026 } })).json;
  assert.equal((await goi('POST', '/ngan-sach', { token: t, body: { maDanhMuc: an.maDanhMuc, hanMuc: 5, thang: 11, nam: 2026 } })).json.message, 'Danh mục này đã có ngân sách trong tháng');
  const chi = (so, ngay) => goi('POST', '/giao-dich', { token: t, body: { maVi: vi.maVi, maDanhMuc: an.maDanhMuc, soTien: so, loai: 'Chi', ngayGiaoDich: ngay } });
  await chi(850_000, '2026-11-10');
  await chi(10_000, '2026-11-11');             // vẫn trong ngưỡng, không báo lại
  await chi(500_000, '2026-10-10');            // tháng 10, không ảnh hưởng ngân sách tháng 11
  const tb1 = (await goi('GET', '/thong-bao', { token: t })).json.filter((x) => x.loai === 'CanhBaoNganSach');
  assert.equal(tb1.length, 1); assert.match(tb1[0].noiDung, /đã dùng 86%|đã dùng 85%/);
  await chi(300_000, '2026-11-12');            // vượt
  await chi(100_000, '2026-11-13');            // không báo lại
  const tb2 = (await goi('GET', '/thong-bao', { token: t })).json.filter((x) => x.loai === 'CanhBaoNganSach');
  assert.equal(tb2.length, 2); assert.match(tb2[0].noiDung, /vượt hạn mức/);
  const ds = (await goi('GET', '/ngan-sach?thang=11&nam=2026', { token: t })).json;
  assert.equal(ds[0].soDaChi, 1_260_000);
  const sua = await goi('PUT', `/ngan-sach/${ns.maNganSach}`, { token: t, body: { hanMuc: 5_000_000 } });
  assert.equal(sua.json.tienDo, 25.2);
});

test('R7: nạp mục tiêu trừ ví, tạo giao dịch Tiết kiệm; hoàn thành chỉ thông báo một lần', async () => {
  const t = await dangKy('b1@x.vn'); const vi = await viDau(t); await naptien(t, 1_000_000);
  assert.equal((await goi('POST', '/muc-tieu', { token: t, body: { tenMucTieu: 'X', soTienMucTieu: 100, hanChot: '2026-11-01' } })).json.message, 'Hạn chót phải sau hôm nay');
  const mt = (await goi('POST', '/muc-tieu', { token: t, body: { tenMucTieu: 'Laptop', soTienMucTieu: 600_000, hanChot: '2027-03-01' } })).json;
  const nap1 = await goi('POST', `/muc-tieu/${mt.maMucTieu}/nap-tien`, { token: t, body: { maVi: vi.maVi, soTien: 400_000 } });
  assert.equal(nap1.json.tienDo, 66.7); assert.equal((await viDau(t)).soDu, 600_000);
  assert.equal((await goi('POST', `/muc-tieu/${mt.maMucTieu}/nap-tien`, { token: t, body: { maVi: vi.maVi, soTien: 9_000_000 } })).json.message, 'Số dư ví không đủ');
  assert.equal((await goi('GET', '/muc-tieu', { token: t })).json[0].soTienHienTai, 400_000);
  await goi('POST', `/muc-tieu/${mt.maMucTieu}/nap-tien`, { token: t, body: { maVi: vi.maVi, soTien: 200_000 } });
  await goi('POST', `/muc-tieu/${mt.maMucTieu}/nap-tien`, { token: t, body: { maVi: vi.maVi, soTien: 100_000 } });
  const tb = (await goi('GET', '/thong-bao', { token: t })).json.filter((x) => /hoàn thành mục tiêu/.test(x.noiDung));
  assert.equal(tb.length, 1);
  const gd = (await goi('GET', '/giao-dich', { token: t })).json.muc.filter((g) => g.tenDanhMuc === 'Tiết kiệm');
  assert.equal(gd.length, 3);
});

test('R8: admin khóa tài khoản -> đăng nhập bị từ chối, token cũ 401, admin không tự khóa mình', async () => {
  const t = await dangKy('b2@x.vn');
  const ad = (await goi('POST', '/auth/dang-nhap', { body: { email: 'admin@demo.vn', matKhau: 'Demo@123' } })).json.token;
  const ds = (await goi('GET', '/admin/nguoi-dung?q=b2@', { token: ad })).json;
  const id = ds[0].maTaiKhoan;
  assert.equal((await goi('PUT', `/admin/nguoi-dung/${id}/khoa`, { token: ad, body: { lyDo: ' ' } })).status, 400);
  assert.equal((await goi('PUT', `/admin/nguoi-dung/${id}/khoa`, { token: ad, body: { lyDo: 'Spam' } })).status, 204);
  assert.equal((await goi('GET', '/vi', { token: t })).status, 401);
  assert.equal((await goi('POST', '/auth/dang-nhap', { body: { email: 'b2@x.vn', matKhau: 'matkhau123' } })).json.message, 'Tài khoản đã bị khóa');
  await goi('PUT', `/admin/nguoi-dung/${id}/mo-khoa`, { token: ad });
  assert.equal((await goi('GET', '/vi', { token: t })).status, 200);
});

test('R9: tổng kết tháng chạy hai lần chỉ có một báo cáo và một thông báo', async () => {
  const t = await dangKy('b3@x.vn'); await naptien(t, 700_000);
  const ad = (await goi('POST', '/auth/dang-nhap', { body: { email: 'admin@demo.vn', matKhau: 'Demo@123' } })).json.token;
  await goi('POST', '/admin/chay-tong-ket?thang=11&nam=2026', { token: ad });
  const r2 = await goi('POST', '/admin/chay-tong-ket?thang=11&nam=2026', { token: ad });
  assert.ok(r2.json.soNguoiDaXuLy >= 1);
  const bc = (await goi('GET', '/bao-cao/thang', { token: t })).json;
  assert.equal(bc.length, 1); assert.equal(bc[0].tongThu, 700_000);
  assert.equal((await goi('GET', '/thong-bao', { token: t })).json.filter((x) => x.loai === 'TongKetThang' && /Tổng kết/.test(x.noiDung)).length, 1);
});

test('báo cáo: tổng quan, theo thời gian đủ 12 tháng, lọc sai khoảng -> 400, xuất Excel', async () => {
  const t = await dangKy('b4@x.vn'); const vi = await viDau(t); await naptien(t, 1_000_000);
  await goi('POST', '/giao-dich', { token: t, body: { maVi: vi.maVi, maDanhMuc: (await dm(t, 'Ăn uống', 'Chi')).maDanhMuc, soTien: 250_000, loai: 'Chi' } });
  const tq = (await goi('GET', '/bao-cao/tong-quan?thang=11&nam=2026', { token: t })).json;
  assert.deepEqual([tq.tongThu, tq.tongChi, tq.chenhLech, tq.tongSoDu], [1_000_000, 250_000, 750_000, 750_000]);
  assert.equal((await goi('GET', '/bao-cao/theo-thoi-gian?nam=2026', { token: t })).json.length, 12);
  assert.equal((await goi('GET', '/giao-dich?tu=2026-12-01&den=2026-11-01', { token: t })).status, 400);
  assert.equal((await goi('GET', '/giao-dich?trang=99', { token: t })).json.muc.length, 0);
  const x = await goi('GET', '/bao-cao/excel?tu=2026-11-01&den=2026-11-30', { token: t, raw: true });
  assert.equal(x.status, 200); assert.match(x.headers.get('content-type'), /spreadsheetml/);
  const ExcelJS = (await import('exceljs')).default; const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(await x.arrayBuffer()));
  assert.deepEqual(wb.worksheets.map((w) => w.name), ['Giao dịch', 'Tổng hợp']);
  assert.equal((await goi('GET', '/bao-cao/excel?tu=2020-01-01&den=2020-01-02', { token: t })).json.message, 'Không có dữ liệu trong khoảng thời gian đã chọn');
});

test('quét hóa đơn: ảnh hợp lệ -> bản nháp; sai định dạng, OCR lỗi -> 400; lưu giao dịch kèm hóa đơn', async () => {
  const t = await dangKy('b5@x.vn'); const vi = await viDau(t); await naptien(t, 500_000);
  const form = (type, size = 10) => { const f = new FormData(); f.append('anh', new Blob([new Uint8Array(size)], { type }), 'a.png'); return f; };
  const ok = await goi('POST', '/hoa-don/quet', { token: t, body: form('image/png') });
  assert.equal(ok.status, 200); assert.equal(ok.json.tongTien, 30000); // null -> tổng các dòng
  assert.match(ok.json.anhUrl, /^\/uploads\/hoa-don\/.+\.png$/);
  assert.equal((await goi('POST', '/hoa-don/quet', { token: t, body: form('text/plain') })).json.message, 'Chỉ nhận ảnh JPG hoặc PNG');
  assert.equal((await goi('POST', '/hoa-don/quet', { token: t, body: form('image/png', 5.5 * 1024 * 1024) })).json.message, 'Ảnh vượt quá 5 MB');
  ocr.loi = true;
  assert.equal((await goi('POST', '/hoa-don/quet', { token: t, body: form('image/png') })).json.message, 'Không nhận dạng được hóa đơn');
  ocr.loi = false;
  const gd = await goi('POST', '/giao-dich', { token: t, body: { maVi: vi.maVi, maDanhMuc: (await dm(t, 'Ăn uống', 'Chi')).maDanhMuc, soTien: 30000, loai: 'Chi',
    hoaDon: { tenCuaHang: 'ABC', anhHoaDon: ok.json.anhUrl, chiTiet: [{ tenMatHang: 'Sữa', soLuong: 2, donGia: 15000 }] } } });
  assert.equal(gd.json.coHoaDon, true);
  assert.equal((await goi('GET', `/giao-dich/${gd.json.maGiaoDich}/hoa-don`, { token: t })).json.chiTiet.length, 1);
});

test('bộ hẹn giờ: nhắc đúng giờ, không trùng trong ngày; mục tiêu chậm thì nhắc mục tiêu', async () => {
  const t = await dangKy('b6@x.vn');
  const mt = await goi('POST', '/muc-tieu', { token: t, body: { tenMucTieu: 'Xe', soTienMucTieu: 10_000_000, hanChot: '2026-12-31' } });
  db.run("UPDATE MucTieuTietKiem SET ngayTao='2026-09-01' WHERE maMucTieu=?", mt.json.maMucTieu);
  dongHo.datBayGio('2026-11-15T20:00:10');
  ctx.boHenGio.nhacNhoHangNgay(); ctx.boHenGio.nhacNhoHangNgay();
  const loai = (await goi('GET', '/thong-bao', { token: t })).json.map((x) => x.loai).sort();
  assert.deepEqual(loai, ['NhacGhiChep', 'NhacMucTieu']);
  dongHo.datBayGio('2026-11-15T10:00:00');
});

test('seed demo: số dư ví khớp tổng giao dịch, chạy hai lần không trùng', async () => {
  const d2 = moCsdl(':memory:'); const dh = new DongHoGia('2026-11-09T09:00:00');
  napDuLieuKhoiTao(d2, bamMatKhau, dh);
  assert.equal(napDuLieuDemo(d2, bamMatKhau, dh), true); assert.equal(napDuLieuDemo(d2, bamMatKhau, dh), false);
  const nd = d2.get("SELECT maTaiKhoan FROM TaiKhoan WHERE email='demo@demo.vn'").maTaiKhoan;
  const thuChi = d2.get("SELECT COALESCE(SUM(CASE loai WHEN 'Thu' THEN soTien ELSE -soTien END),0) s FROM GiaoDich WHERE maTaiKhoan=?", nd).s;
  const tongVi = d2.get('SELECT SUM(soDu) s FROM Vi WHERE maTaiKhoan=?', nd).s;
  assert.equal(tongVi, 8_000_000 + 20_000_000 + 6_000_000 + thuChi);
  assert.ok(d2.get('SELECT COUNT(*) n FROM GiaoDich WHERE maTaiKhoan=?', nd).n >= 80);
  assert.equal(d2.get('SELECT COUNT(*) n FROM NganSach WHERE maTaiKhoan=?', nd).n, 3);
});
