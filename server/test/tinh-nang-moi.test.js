import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { moCsdl } from '../src/db.js';
import { taoApp } from '../src/app.js';
import { bamMatKhau, DongHoGia } from '../src/ha-tang.js';
import { napDuLieuKhoiTao } from '../src/seed.js';
import { ChuyenTien, GiaoDichDinhKy, Vi, DanhMuc } from '../src/domain/index.js';

let server, base, db, dongHo, ctx;
before(async () => {
  db = moCsdl(':memory:');
  dongHo = new DongHoGia('2026-11-15T10:00:00');
  napDuLieuKhoiTao(db, bamMatKhau, dongHo);
  ctx = taoApp({ db, dongHo, thuMucUpload: mkdtempSync(join(tmpdir(), 'qltc-')) });
  await new Promise((r) => { server = ctx.app.listen(0, r); });
  base = `http://localhost:${server.address().port}/api`;
});
after(() => server.close());

async function goi(method, path, { token, body } = {}) {
  const res = await fetch(base + path, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}
async function dangKy(email) {
  await goi('POST', '/auth/dang-ky', { body: { hoTen: 'Test', email, matKhau: 'matkhau123' } });
  return (await goi('POST', '/auth/dang-nhap', { body: { email, matKhau: 'matkhau123' } })).json.token;
}
const dm = async (t, ten, loai) => (await goi('GET', `/danh-muc?loai=${loai}`, { token: t })).json.find((d) => d.tenDanhMuc === ten);
async function haiVi(t, soDu = 1_000_000) {
  const v1 = (await goi('GET', '/vi', { token: t })).json[0];
  const v2 = (await goi('POST', '/vi', { token: t, body: { tenVi: 'Ngân hàng', loaiVi: 'NganHang', soDuBanDau: 0 } })).json;
  await goi('POST', '/giao-dich', { token: t, body: { maVi: v1.maVi, maDanhMuc: (await dm(t, 'Lương', 'Thu')).maDanhMuc, soTien: soDu, loai: 'Thu' } });
  return [v1, v2];
}
const soDu = async (t) => Object.fromEntries((await goi('GET', '/vi', { token: t })).json.map((v) => [v.tenVi, v.soDu]));

// ---------- miền
test('ChuyenTien: ví nguồn = ví đích, số tiền <= 0, thiếu số dư đều bị từ chối', () => {
  const a = new Vi({ maVi: 1, soDu: 100 }); const b = new Vi({ maVi: 2, soDu: 0 });
  assert.throws(() => ChuyenTien.tao(1, a, a, 10, 'x'), /khác nhau/);
  assert.throws(() => ChuyenTien.tao(1, a, b, 0, 'x'), /lớn hơn 0/);
  assert.throws(() => ChuyenTien.tao(1, a, b, 101, 'x').thucHien(), /không đủ/);
  ChuyenTien.tao(1, a, b, 40, 'x').thucHien();
  assert.deepEqual([a.soDu, b.soDu], [60, 40]);
});

test('GiaoDichDinhKy: ngày 1-28, đến hạn đúng một lần mỗi tháng', () => {
  const chi = new DanhMuc({ loai: 'Chi' });
  assert.throws(() => GiaoDichDinhKy.kiemTra(1000, 29, 'Chi', chi), /1 đến 28/);
  assert.throws(() => GiaoDichDinhKy.kiemTra(0, 5, 'Chi', chi), /lớn hơn 0/);
  assert.throws(() => GiaoDichDinhKy.kiemTra(1000, 5, 'Thu', chi), /đúng loại/);
  const g = new GiaoDichDinhKy({ ngayTrongThang: 10 });
  assert.equal(g.denHan('2026-11-09'), false);
  assert.equal(g.denHan('2026-11-10'), true);
  g.thangDaChay = '2026-11'; assert.equal(g.denHan('2026-11-20'), false);
  assert.equal(g.denHan('2026-12-10'), true);
  g.dangBat = false; assert.equal(g.denHan('2026-12-10'), false);
  assert.equal(g.ngayPhatSinh('2026-12-20'), '2026-12-10T08:00:00');
});

// ---------- chuyển tiền
test('chuyển tiền: tổng số dư không đổi, ghi lịch sử, không vào báo cáo thu chi', async () => {
  const t = await dangKy('c1@x.vn'); const [v1, v2] = await haiVi(t);
  const r = await goi('POST', '/chuyen-tien', { token: t, body: { maViNguon: v1.maVi, maViDich: v2.maVi, soTien: 300_000, ghiChu: 'Gửi ngân hàng' } });
  assert.equal(r.status, 200); assert.equal(r.json.soDuNguon, 700_000); assert.equal(r.json.soDuDich, 300_000);
  assert.deepEqual(await soDu(t), { 'Tiền mặt': 700_000, 'Ngân hàng': 300_000 });
  assert.equal((await goi('GET', '/chuyen-tien', { token: t })).json.length, 1);
  const tq = (await goi('GET', '/bao-cao/tong-quan', { token: t })).json;
  assert.equal(tq.tongChi, 0); assert.equal(tq.tongSoDu, 1_000_000);
});

test('chuyển tiền: cùng ví / thiếu số dư / ví người khác -> lỗi và số dư không đổi', async () => {
  const t = await dangKy('c2@x.vn'); const [v1, v2] = await haiVi(t, 100_000);
  assert.equal((await goi('POST', '/chuyen-tien', { token: t, body: { maViNguon: v1.maVi, maViDich: v1.maVi, soTien: 10 } })).json.message, 'Ví nguồn và ví đích phải khác nhau');
  assert.equal((await goi('POST', '/chuyen-tien', { token: t, body: { maViNguon: v1.maVi, maViDich: v2.maVi, soTien: 100_001 } })).json.message, 'Số dư ví không đủ');
  assert.equal((await goi('POST', '/chuyen-tien', { token: t, body: { maViNguon: v1.maVi, maViDich: v2.maVi, soTien: -5 } })).status, 400);
  const t2 = await dangKy('c3@x.vn'); const [w1] = await haiVi(t2, 10);
  assert.equal((await goi('POST', '/chuyen-tien', { token: t, body: { maViNguon: v1.maVi, maViDich: w1.maVi, soTien: 5 } })).status, 404);
  assert.deepEqual(await soDu(t), { 'Tiền mặt': 100_000, 'Ngân hàng': 0 });
  assert.equal((await goi('GET', '/chuyen-tien', { token: t })).json.length, 0);
});

test('ví đã có lịch sử chuyển tiền thì không xóa được; vai trò khác bị 403', async () => {
  const t = await dangKy('c4@x.vn'); const [v1, v2] = await haiVi(t, 1000);
  await goi('POST', '/chuyen-tien', { token: t, body: { maViNguon: v1.maVi, maViDich: v2.maVi, soTien: 500 } });
  assert.equal((await goi('DELETE', `/vi/${v2.maVi}`, { token: t })).status, 400);
  const admin = (await goi('POST', '/auth/dang-nhap', { body: { email: 'admin@demo.vn', matKhau: 'Demo@123' } })).json?.token;
  if (admin) { assert.equal((await goi('GET', '/chuyen-tien', { token: admin })).status, 403); assert.equal((await goi('GET', '/giao-dich-dinh-ky', { token: admin })).status, 403); }
  assert.equal((await goi('GET', '/chuyen-tien')).status, 401);
});

// ---------- giao dịch định kỳ
async function taoDinhKy(t, body) {
  const [v1] = (await goi('GET', '/vi', { token: t })).json;
  return goi('POST', '/giao-dich-dinh-ky', { token: t, body: { maVi: v1.maVi, maDanhMuc: (await dm(t, 'Ăn uống', 'Chi')).maDanhMuc, soTien: 200_000, loai: 'Chi', ngayTrongThang: 10, ghiChu: 'Tiền học', ...body } });
}

test('định kỳ: tạo đúng một giao dịch mỗi tháng, đúng ngày, trừ ví', async () => {
  const t = await dangKy('d1@x.vn'); await haiVi(t);
  const dk = await taoDinhKy(t, {}); assert.equal(dk.status, 200); assert.equal(dk.json.dangBat, true);
  dongHo.datBayGio('2026-11-09T09:00:00');
  assert.equal(ctx.boHenGio.giaoDichDinhKy(), 0); // chưa tới ngày 10
  dongHo.datBayGio('2026-11-10T00:01:00');
  assert.equal(ctx.boHenGio.giaoDichDinhKy(), 1);
  assert.equal(ctx.boHenGio.giaoDichDinhKy(), 0); // chạy lại cùng tháng không trùng
  const gd = (await goi('GET', '/giao-dich?tu=2026-11-01&den=2026-11-30&loai=Chi', { token: t })).json.muc;
  assert.equal(gd.length, 1); assert.equal(gd[0].ngayGiaoDich, '2026-11-10T08:00:00'); assert.equal(gd[0].soTien, 200_000);
  assert.match(gd[0].ghiChu, /^\[Định kỳ\]/);
  assert.equal((await soDu(t))['Tiền mặt'], 800_000);
  dongHo.datBayGio('2026-12-12T09:00:00');
  assert.equal(ctx.boHenGio.giaoDichDinhKy(), 1); // tháng sau chạy lại
  dongHo.datBayGio('2026-11-15T10:00:00');
});

test('định kỳ: tắt thì không chạy; thiếu số dư thì bỏ qua tháng đó và báo thông báo', async () => {
  const t = await dangKy('d2@x.vn'); await haiVi(t, 100_000);
  const tat = (await taoDinhKy(t, { ngayTrongThang: 1 })).json;
  await goi('PUT', `/giao-dich-dinh-ky/${tat.maDinhKy}/bat-tat`, { token: t, body: { dangBat: false } });
  const thieu = (await taoDinhKy(t, { soTien: 5_000_000, ngayTrongThang: 2 })).json;
  dongHo.datBayGio('2027-01-05T09:00:00');
  assert.equal(ctx.boHenGio.giaoDichDinhKy(), 0);
  assert.equal((await soDu(t))['Tiền mặt'], 100_000);
  const tb = (await goi('GET', '/thong-bao', { token: t })).json.filter((x) => x.loai === 'DinhKy');
  assert.equal(tb.length, 1); assert.match(tb[0].noiDung, /không đủ/);
  assert.equal(ctx.boHenGio.giaoDichDinhKy(), 0); // không báo lặp trong cùng tháng
  assert.equal((await goi('GET', '/thong-bao', { token: t })).json.filter((x) => x.loai === 'DinhKy').length, 1);
  assert.ok(thieu.maDinhKy);
  dongHo.datBayGio('2026-11-15T10:00:00');
});

test('định kỳ: kiểm tra dữ liệu vào, sửa, xóa, không đụng được lịch của người khác', async () => {
  const t = await dangKy('d3@x.vn'); await haiVi(t);
  assert.equal((await taoDinhKy(t, { ngayTrongThang: 29 })).json.message, 'Ngày trong tháng phải từ 1 đến 28');
  assert.equal((await taoDinhKy(t, { soTien: 0 })).status, 400);
  assert.equal((await taoDinhKy(t, { loai: 'Thu' })).json.message, 'Danh mục không đúng loại giao dịch');
  const dk = (await taoDinhKy(t, {})).json;
  const sua = await goi('PUT', `/giao-dich-dinh-ky/${dk.maDinhKy}`, { token: t, body: { maVi: dk.maVi, maDanhMuc: dk.maDanhMuc, soTien: 350_000, loai: 'Chi', ngayTrongThang: 20 } });
  assert.equal(sua.json.soTien, 350_000); assert.equal(sua.json.ngayTrongThang, 20);
  const t2 = await dangKy('d4@x.vn');
  assert.equal((await goi('DELETE', `/giao-dich-dinh-ky/${dk.maDinhKy}`, { token: t2 })).status, 404);
  assert.equal((await goi('DELETE', `/giao-dich-dinh-ky/${dk.maDinhKy}`, { token: t })).status, 204);
  assert.equal((await goi('GET', '/giao-dich-dinh-ky', { token: t })).json.length, 0);
});
