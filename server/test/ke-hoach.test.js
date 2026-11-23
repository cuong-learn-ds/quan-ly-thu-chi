// Kiểm thử Lập kế hoạch tài chính tháng (R13).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { moCsdl } from '../src/db.js';
import { taoApp } from '../src/app.js';
import { bamMatKhau, DongHoGia } from '../src/ha-tang.js';
import { napDuLieuKhoiTao } from '../src/seed.js';
import { KeHoachThang } from '../src/domain/index.js';

let server, base, db;
before(async () => {
  db = moCsdl(':memory:');
  const dongHo = new DongHoGia('2026-11-15T10:00:00');
  napDuLieuKhoiTao(db, bamMatKhau, dongHo);
  const ctx = taoApp({ db, dongHo, thuMucUpload: mkdtempSync(join(tmpdir(), 'qltc-')) });
  await new Promise((r) => { server = ctx.app.listen(0, r); });
  base = `http://localhost:${server.address().port}/api`;
});
after(() => { server.close(); db.dong(); });

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

// ---------- miền
test('KeHoachThang: kiểm tra dữ liệu, cân đối, dự báo', () => {
  assert.throws(() => KeHoachThang.lap(1, 11, 2026, 0, 0, 'LichSu', 'x'), /Thu nhập dự kiến/);
  assert.throws(() => KeHoachThang.lap(1, 11, 2026, 1000, -1, 'LichSu', 'x'), /để dành/);
  assert.throws(() => KeHoachThang.lap(1, 11, 2026, 1000, 0, 'Khac', 'x'), /Phương pháp/);
  const kh = KeHoachThang.lap(1, 11, 2026, 10_000_000, 2_000_000, 'LichSu', 'x');
  assert.equal(kh.tinhConLai(7_000_000), 1_000_000);
  assert.equal(kh.laCanDoi(9_000_000), false);
  assert.equal(KeHoachThang.duBaoChiCaThang(3_000_000, 10, 30), 9_000_000);
  assert.equal(KeHoachThang.duBaoChiCaThang(3_000_000, 0, 30), 3_000_000);
});

test('Gợi ý theo thói quen: làm tròn lên 50.000đ, không thấp hơn khoản cố định, thiếu tiền thì giảm phần linh hoạt', () => {
  const ds = [{ maDanhMuc: 1, tenDanhMuc: 'Ăn uống', trungBinh3Thang: 2_420_000 }, { maDanhMuc: 4, tenDanhMuc: 'Hóa đơn', trungBinh3Thang: 300_000, coDinh: 450_000 }];
  const du = KeHoachThang.goiYPhanBo(15_000_000, 'LichSu', ds, 1_000_000);
  assert.deepEqual(du.phanBo.map((p) => p.deXuat), [2_450_000, 450_000]);
  assert.equal(du.tietKiem, 1_000_000); assert.equal(du.conLai, 15_000_000 - 2_900_000 - 1_000_000); assert.deepEqual(du.canhBao, []);
  const thieu = KeHoachThang.goiYPhanBo(2_000_000, 'LichSu', ds, 1_000_000);
  assert.ok(thieu.conLai >= 0, JSON.stringify(thieu));
  assert.equal(thieu.phanBo[1].deXuat, 450_000); // khoản cố định giữ nguyên
  assert.ok(thieu.canhBao.length >= 1);
  assert.equal(KeHoachThang.goiYPhanBo(10_000_000, 'LichSu', ds, 0).tietKiem, 1_000_000); // chưa có mục tiêu: 10% thu nhập
});

test('Gợi ý quy tắc 50/30/20: chia theo nhóm thiết yếu/mong muốn và tỷ trọng chi trước đây', () => {
  const ds = [{ maDanhMuc: 1, tenDanhMuc: 'Ăn uống', trungBinh3Thang: 3_000_000 }, { maDanhMuc: 2, tenDanhMuc: 'Đi lại', trungBinh3Thang: 1_000_000 },
    { maDanhMuc: 3, tenDanhMuc: 'Mua sắm', trungBinh3Thang: 1_000_000 }, { maDanhMuc: 5, tenDanhMuc: 'Giải trí', trungBinh3Thang: 0 }];
  const g = KeHoachThang.goiYPhanBo(10_000_000, '50-30-20', ds, 0);
  assert.equal(g.tietKiem, 2_000_000);
  assert.deepEqual(g.phanBo.map((p) => [p.nhom, p.deXuat]), [['Thiết yếu', 3_750_000], ['Thiết yếu', 1_250_000], ['Mong muốn', 3_000_000], ['Mong muốn', 0]]);
  assert.ok(g.tongChi <= 8_000_000);
});

test('API: gợi ý tự điền thu nhập từ lương định kỳ và chi trung bình 3 tháng, áp dụng tạo ngân sách cả tháng', async () => {
  const t = await dangKy('kh1@x.vn');
  const vi = (await goi('GET', '/vi', { token: t })).json[0];
  const luong = await dm(t, 'Lương', 'Thu'); const an = await dm(t, 'Ăn uống', 'Chi'); const hd = await dm(t, 'Hóa đơn', 'Chi');
  await goi('POST', '/giao-dich', { token: t, body: { maVi: vi.maVi, maDanhMuc: luong.maDanhMuc, soTien: 30_000_000, loai: 'Thu', ngayGiaoDich: '2026-08-01T08:00' } });
  for (const th of ['09', '10', '11']) await goi('POST', '/giao-dich', { token: t, body: { maVi: vi.maVi, maDanhMuc: an.maDanhMuc, soTien: 2_000_000, loai: 'Chi', ngayGiaoDich: `2026-${th}-10T12:00` } });
  await goi('POST', '/giao-dich-dinh-ky', { token: t, body: { maVi: vi.maVi, maDanhMuc: luong.maDanhMuc, soTien: 12_000_000, loai: 'Thu', ngayTrongThang: 5 } });
  await goi('POST', '/giao-dich-dinh-ky', { token: t, body: { maVi: vi.maVi, maDanhMuc: hd.maDanhMuc, soTien: 400_000, loai: 'Chi', ngayTrongThang: 10 } });

  assert.deepEqual((await goi('GET', '/ke-hoach?thang=12&nam=2026', { token: t })).json, { thang: 12, nam: 2026, coKeHoach: false });
  const g = (await goi('GET', '/ke-hoach/goi-y?thang=12&nam=2026', { token: t })).json;
  assert.equal(g.thuNhapDuKien, 12_000_000); assert.match(g.nguonThuNhap, /định kỳ/);
  const p = Object.fromEntries(g.phanBo.map((x) => [x.tenDanhMuc, x]));
  assert.equal(p['Ăn uống'].trungBinh3Thang, 2_000_000); assert.equal(p['Ăn uống'].deXuat, 2_000_000);
  assert.equal(p['Hóa đơn'].coDinh, 400_000); assert.equal(p['Hóa đơn'].deXuat, 400_000);
  assert.ok(!g.phanBo.some((x) => x.tenDanhMuc === 'Tiết kiệm')); // danh mục hệ thống không phân bổ

  const r = await goi('POST', '/ke-hoach', { token: t, body: { thang: 12, nam: 2026, thuNhapDuKien: g.thuNhapDuKien, tietKiemDuKien: g.tietKiem, phuongPhap: 'LichSu',
    phanBo: g.phanBo.map((x) => ({ maDanhMuc: x.maDanhMuc, hanMuc: x.deXuat })) } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.coKeHoach, true); assert.equal(r.json.tongChiKeHoach, 2_400_000);
  const ns = (await goi('GET', '/ngan-sach?thang=12&nam=2026', { token: t })).json;
  assert.deepEqual(ns.map((n) => [n.tenDanhMuc, n.hanMuc]).sort(), [['Hóa đơn', 400_000], ['Ăn uống', 2_000_000]].sort());

  // Điều chỉnh: đặt 0 thì bỏ ngân sách, giá trị mới thì cập nhật; vẫn một kế hoạch cho tháng
  const r2 = await goi('POST', '/ke-hoach', { token: t, body: { thang: 12, nam: 2026, thuNhapDuKien: 12_000_000, tietKiemDuKien: 3_000_000, phuongPhap: 'LichSu',
    phanBo: [{ maDanhMuc: an.maDanhMuc, hanMuc: 2_500_000 }, { maDanhMuc: hd.maDanhMuc, hanMuc: 0 }] } });
  assert.equal(r2.json.tongChiKeHoach, 2_500_000); assert.equal(r2.json.conLaiKeHoach, 12_000_000 - 2_500_000 - 3_000_000);
  assert.equal(db.get('SELECT COUNT(*) n FROM KeHoachThang WHERE thang=12 AND nam=2026').n, 1);
  assert.equal((await goi('GET', '/ke-hoach/goi-y?thang=12&nam=2026', { token: t })).json.daCoKeHoach, true);
});

test('API: theo dõi kế hoạch tháng hiện tại, dự báo chi và nhận xét', async () => {
  const t = await dangKy('kh2@x.vn');
  const vi = (await goi('GET', '/vi', { token: t })).json[0];
  const luong = await dm(t, 'Lương', 'Thu'); const an = await dm(t, 'Ăn uống', 'Chi');
  await goi('POST', '/giao-dich', { token: t, body: { maVi: vi.maVi, maDanhMuc: luong.maDanhMuc, soTien: 10_000_000, loai: 'Thu', ngayGiaoDich: '2026-11-01T08:00' } });
  await goi('POST', '/giao-dich', { token: t, body: { maVi: vi.maVi, maDanhMuc: an.maDanhMuc, soTien: 1_500_000, loai: 'Chi', ngayGiaoDich: '2026-11-05T12:00' } });
  const r = (await goi('POST', '/ke-hoach', { token: t, body: { thang: 11, nam: 2026, thuNhapDuKien: 10_000_000, tietKiemDuKien: 1_000_000, phuongPhap: '50-30-20',
    phanBo: [{ maDanhMuc: an.maDanhMuc, hanMuc: 2_000_000 }] } })).json;
  assert.equal(r.ngayDaQua, 15); assert.equal(r.soNgayTrongThang, 30);
  assert.equal(r.chiThucTe, 1_500_000); assert.equal(r.duBaoChi, 3_000_000); // 1,5tr trong 15 ngày -> 3tr cả tháng
  assert.ok(r.nhanXet.some((n) => n.muc === 'canh' && /vượt kế hoạch/.test(n.noiDung)), JSON.stringify(r.nhanXet));
  assert.ok(r.nhanXet.some((n) => /để dành thêm/.test(n.noiDung)));
  assert.equal(r.nganSach[0].soDaChi, 1_500_000);
});

test('API: dữ liệu sai bị từ chối, không ghi gì; dữ liệu người khác và vai trò khác bị chặn', async () => {
  const t = await dangKy('kh3@x.vn');
  const luong = await dm(t, 'Lương', 'Thu'); const tk = (await goi('GET', '/danh-muc?loai=Chi', { token: t })).json.find((d) => d.laHeThong);
  for (const body of [{ thang: 12, nam: 2026, thuNhapDuKien: 0, phanBo: [] }, { thang: 13, nam: 2026, thuNhapDuKien: 1_000_000, phanBo: [] },
    { thang: 12, nam: 2026, thuNhapDuKien: 1_000_000, phanBo: [{ maDanhMuc: luong.maDanhMuc, hanMuc: 100_000 }] },
    { thang: 12, nam: 2026, thuNhapDuKien: 1_000_000, phanBo: [{ maDanhMuc: tk.maDanhMuc, hanMuc: 100_000 }] }]) {
    assert.equal((await goi('POST', '/ke-hoach', { token: t, body })).status, 400, JSON.stringify(body));
  }
  assert.equal(db.get("SELECT COUNT(*) n FROM KeHoachThang k JOIN TaiKhoan t ON t.maTaiKhoan=k.maTaiKhoan WHERE t.email='kh3@x.vn'").n, 0);
  const t2 = await dangKy('kh4@x.vn');
  const dmRieng = (await goi('POST', '/danh-muc', { token: t2, body: { tenDanhMuc: 'Thú cưng', loai: 'Chi' } })).json;
  assert.equal((await goi('POST', '/ke-hoach', { token: t, body: { thang: 12, nam: 2026, thuNhapDuKien: 1_000_000, phanBo: [{ maDanhMuc: dmRieng.maDanhMuc, hanMuc: 1 }] } })).status, 404);
  const admin = (await goi('POST', '/auth/dang-nhap', { body: { email: 'admin@demo.vn', matKhau: 'Demo@123' } })).json.token;
  assert.equal((await goi('GET', '/ke-hoach', { token: admin })).status, 403);
});
