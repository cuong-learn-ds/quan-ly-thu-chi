// Kiểm thử Lịch chi tiêu và Nhập giao dịch từ Excel/CSV.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ExcelJS from 'exceljs';
import { moCsdl } from '../src/db.js';
import { taoApp } from '../src/app.js';
import { bamMatKhau, DongHoGia } from '../src/ha-tang.js';
import { napDuLieuKhoiTao } from '../src/seed.js';
import { tachCsv, chuanNgay, chuanSoTien, chuanLoai } from '../src/nhap-giao-dich.js';

let server, base, db;
before(async () => {
  db = moCsdl(':memory:');
  const dongHo = new DongHoGia('2026-11-15T10:00:00');
  napDuLieuKhoiTao(db, bamMatKhau, dongHo);
  const ctx = taoApp({ db, dongHo, thuMucUpload: mkdtempSync(join(tmpdir(), 'qltc-')) });
  await new Promise((r) => { server = ctx.app.listen(0, r); });
  base = `http://localhost:${server.address().port}/api`;
});
after(() => server.close());

async function goi(method, path, { token, body, form } = {}) {
  const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(base + path, { method, headers, body: form ?? (body ? JSON.stringify(body) : undefined) });
  const text = await res.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch { /* file nhị phân */ }
  return { status: res.status, json, headers: res.headers };
}
async function dangKy(email) {
  await goi('POST', '/auth/dang-ky', { body: { hoTen: 'Test', email, matKhau: 'matkhau123' } });
  return (await goi('POST', '/auth/dang-nhap', { body: { email, matKhau: 'matkhau123' } })).json.token;
}
const dm = async (t, ten, loai) => (await goi('GET', `/danh-muc?loai=${loai}`, { token: t })).json.find((d) => d.tenDanhMuc === ten);
const soDuVi = async (t) => (await goi('GET', '/vi', { token: t })).json[0].soDu;
const soGd = async (t) => (await goi('GET', '/giao-dich', { token: t })).json.tongSo;
const formTep = (noiDung, ten) => { const f = new FormData(); f.append('tep', new Blob([noiDung]), ten); return f; };
const xemTruoc = (t, noiDung, ten = 'a.csv') => goi('POST', '/giao-dich/nhap/xem-truoc', { token: t, form: formTep(noiDung, ten) });

// ---------- chuẩn hóa dữ liệu file
test('Đọc CSV: tự nhận dấu ; , và ngoặc kép, bỏ BOM', () => {
  assert.deepEqual(tachCsv('﻿a;b\r\n1;"x;y"\n'), [['a', 'b'], ['1', 'x;y']]);
  assert.deepEqual(tachCsv('a,b\n"có ""ngoặc""",2'), [['a', 'b'], ['có "ngoặc"', '2']]);
});

test('Chuẩn hóa ngày, số tiền, loại', () => {
  assert.equal(chuanNgay('2026-11-05'), '2026-11-05T12:00:00');
  assert.equal(chuanNgay('5/11/2026 08:30'), '2026-11-05T08:30:00');
  assert.equal(chuanNgay('2026-11-05 21:15'), '2026-11-05T21:15:00');
  assert.equal(chuanNgay(new Date(Date.UTC(2026, 10, 5, 9, 0))), '2026-11-05T09:00:00');
  assert.equal(chuanNgay('31/02/2026'), null);
  assert.equal(chuanNgay('hôm qua'), null);
  assert.equal(chuanSoTien('1.200.000'), 1200000);
  assert.equal(chuanSoTien('45,000 đ'), 45000);
  assert.equal(chuanSoTien(50000), 50000);
  for (const x of ['0', '-5000', '12.5', 'abc', 1.5]) assert.equal(chuanSoTien(x), null);
  assert.equal(chuanLoai('chi tiêu'), 'Chi');
  assert.equal(chuanLoai('THU'), 'Thu');
  assert.equal(chuanLoai('chuyển'), null);
});

// ---------- lịch chi tiêu
test('Lịch: tổng thu/chi từng ngày trong tháng, không lẫn tháng khác', async () => {
  const t = await dangKy('lich@x.vn');
  const vi = (await goi('GET', '/vi', { token: t })).json[0];
  const luong = await dm(t, 'Lương', 'Thu'); const an = await dm(t, 'Ăn uống', 'Chi');
  const gd = (soTien, loai, maDanhMuc, ngayGiaoDich) => goi('POST', '/giao-dich', { token: t, body: { maVi: vi.maVi, maDanhMuc, soTien, loai, ngayGiaoDich } });
  await gd(5_000_000, 'Thu', luong.maDanhMuc, '2026-10-31T09:00');
  await gd(100_000, 'Chi', an.maDanhMuc, '2026-11-03T08:00');
  await gd(50_000, 'Chi', an.maDanhMuc, '2026-11-03T19:00');
  await gd(300_000, 'Chi', an.maDanhMuc, '2026-11-10T12:00');
  const r = (await goi('GET', '/bao-cao/lich?thang=11&nam=2026', { token: t })).json;
  assert.equal(r.soNgayTrongThang, 30);
  assert.deepEqual(r.ngay, [{ ngay: '2026-11-03', thu: 0, chi: 150_000, soGiaoDich: 2 }, { ngay: '2026-11-10', thu: 0, chi: 300_000, soGiaoDich: 1 }]);
  assert.equal(r.tongChi, 450_000); assert.equal(r.tongThu, 0);
  assert.equal(r.soNgayCoChi, 2);
  assert.equal(r.chiTrungBinhNgay, 30_000); // 450.000 / 15 ngày đã qua (hôm nay 15/11)
  assert.equal(r.chiNhieuNhat.ngay, '2026-11-10');
  const t10 = (await goi('GET', '/bao-cao/lich?thang=10&nam=2026', { token: t })).json;
  assert.equal(t10.tongThu, 5_000_000); assert.equal(t10.chiTrungBinhNgay, 0);
  assert.equal((await goi('GET', '/bao-cao/lich?thang=13&nam=2026', { token: t })).status, 400);
  // R10: người khác không thấy dữ liệu
  const t2 = await dangKy('lich2@x.vn');
  assert.deepEqual((await goi('GET', '/bao-cao/lich?thang=11&nam=2026', { token: t2 })).json.ngay, []);
});

// ---------- nhập giao dịch
test('Nhập CSV: xem trước báo lỗi từng dòng, không ghi CSDL', async () => {
  const t = await dangKy('nhap1@x.vn');
  const csv = ['Ngày;Loại;Danh mục;Ví;Số tiền;Ghi chú',
    '2026-11-01 08:00;Thu;Lương;Tiền mặt;2.000.000;Lương tháng',
    '02/11/2026;Chi;ăn uống;tiền mặt;45000;"Cơm; nước"',
    '2026-11-02;Chi;Không tồn tại;Tiền mặt;10000;',
    '2026-11-03;Chuyển;Ăn uống;Ví lạ;-5;',
    '',
    '2026-11-04;Chi;Mua sắm;Tiền mặt;9.000.000;quá số dư'].join('\n');
  const r = await xemTruoc(t, csv);
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.tongSoDong, 5);
  assert.deepEqual(r.json.hopLe.map((x) => [x.dong, x.loai, x.tenDanhMuc, x.soTien, x.ghiChu]), [[2, 'Thu', 'Lương', 2_000_000, 'Lương tháng'], [3, 'Chi', 'Ăn uống', 45_000, 'Cơm; nước']]);
  assert.equal(r.json.hopLe[1].ngayGiaoDich, '2026-11-02T12:00:00');
  const loi = Object.fromEntries(r.json.loi.map((x) => [x.dong, x.loi]));
  assert.match(loi[4], /Không có danh mục chi "Không tồn tại"/);
  assert.match(loi[5], /Loại phải là Thu hoặc Chi/); assert.match(loi[5], /Số tiền/);
  assert.match(loi[7], /không đủ/);
  assert.equal(await soGd(t), 0); // xem trước không ghi gì
});

test('Nhập: xác nhận ghi toàn bộ, cập nhật số dư; nhập lại thì đánh dấu có thể trùng', async () => {
  const t = await dangKy('nhap2@x.vn');
  const csv = 'Ngày,Loại,Danh mục,Ví,Số tiền,Ghi chú\n2026-11-05,Chi,Ăn uống,Tiền mặt,30000,Cơm\n2026-11-01,Thu,Lương,Tiền mặt,1000000,Lương\n';
  const xt = (await xemTruoc(t, csv)).json;
  // Dòng chi đứng trước trong file nhưng ngày sau -> áp theo ngày nên vẫn đủ số dư
  assert.equal(xt.loi.length, 0); assert.equal(xt.hopLe.length, 2);
  assert.ok(xt.hopLe.every((x) => !x.coTheTrung));
  const r = await goi('POST', '/giao-dich/nhap', { token: t, body: { dong: xt.hopLe } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.deepEqual(r.json, { soDaNhap: 2, tongThu: 1_000_000, tongChi: 30_000 });
  assert.equal(await soDuVi(t), 970_000);
  assert.equal(await soGd(t), 2);
  const lan2 = (await xemTruoc(t, csv)).json;
  assert.ok(lan2.hopLe.every((x) => x.coTheTrung));
});

test('Nhập: một dòng lỗi thì rollback, không dòng nào được ghi', async () => {
  const t = await dangKy('nhap3@x.vn');
  const vi = (await goi('GET', '/vi', { token: t })).json[0];
  const luong = await dm(t, 'Lương', 'Thu'); const an = await dm(t, 'Ăn uống', 'Chi');
  const dong = [
    { dong: 2, ngayGiaoDich: '2026-11-01T08:00:00', loai: 'Thu', soTien: 100_000, maVi: vi.maVi, maDanhMuc: luong.maDanhMuc },
    { dong: 3, ngayGiaoDich: '2026-11-02T08:00:00', loai: 'Chi', soTien: 500_000, maVi: vi.maVi, maDanhMuc: an.maDanhMuc }];
  const r = await goi('POST', '/giao-dich/nhap', { token: t, body: { dong } });
  assert.equal(r.status, 400);
  assert.match(r.json.message, /^Dòng 3: .*không đủ.*Chưa nhập giao dịch nào/);
  assert.equal(await soGd(t), 0); assert.equal(await soDuVi(t), 0);
  // Ví của người khác (R10) cũng bị từ chối
  const t2 = await dangKy('nhap4@x.vn');
  const r2 = await goi('POST', '/giao-dich/nhap', { token: t2, body: { dong: [dong[0]] } });
  assert.equal(r2.status, 400); assert.match(r2.json.message, /ví hoặc danh mục không tồn tại/);
  assert.equal((await goi('POST', '/giao-dich/nhap', { token: t, body: { dong: [] } })).status, 400);
});

test('Nhập Excel: file mẫu tải về nhập lại được; file đã xuất từ Báo cáo cũng nhập được', async () => {
  const t = await dangKy('nhap5@x.vn');
  const mau = await fetch(`${base}/giao-dich/nhap/mau`, { headers: { Authorization: `Bearer ${t}` } });
  assert.equal(mau.status, 200);
  assert.match(mau.headers.get('content-disposition'), /mau-nhap-giao-dich\.xlsx/);
  const buf = Buffer.from(await mau.arrayBuffer());
  const xt = (await xemTruoc(t, buf, 'mau.xlsx')).json;
  assert.equal(xt.loi.length, 0, JSON.stringify(xt.loi));
  assert.deepEqual(xt.hopLe.map((x) => [x.loai, x.soTien, x.ngayGiaoDich]), [['Thu', 1_000_000, '2026-11-15T08:00:00'], ['Chi', 45_000, '2026-11-15T12:30:00']]);
  await goi('POST', '/giao-dich/nhap', { token: t, body: { dong: xt.hopLe } });
  // Xuất ra Excel rồi nhập vào tài khoản khác cùng tên ví/danh mục
  const xuat = await fetch(`${base}/bao-cao/excel?tu=2026-11-01&den=2026-11-30`, { headers: { Authorization: `Bearer ${t}` } });
  const t2 = await dangKy('nhap6@x.vn');
  const xt2 = (await xemTruoc(t2, Buffer.from(await xuat.arrayBuffer()), 'bao-cao.xlsx')).json;
  assert.equal(xt2.hopLe.length, 2, JSON.stringify(xt2));
  // Ô ngày kiểu Date trong Excel
  const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('x');
  ws.addRows([['Ngày', 'Loại', 'Danh mục', 'Ví', 'Số tiền'], [new Date(Date.UTC(2026, 10, 2, 7, 15)), 'Thu', 'Thưởng', 'Tiền mặt', 200000]]);
  const xt3 = (await xemTruoc(t2, Buffer.from(await wb.xlsx.writeBuffer()), 'd.xlsx')).json;
  assert.equal(xt3.hopLe[0].ngayGiaoDich, '2026-11-02T07:15:00');
});

test('Nhập: file sai định dạng, thiếu cột, rỗng; chỉ Người dùng được nhập', async () => {
  const t = await dangKy('nhap7@x.vn');
  assert.match((await xemTruoc(t, 'x', 'a.txt')).json.message, /\.xlsx hoặc \.csv/);
  assert.match((await xemTruoc(t, 'Ngày,Loại,Ví\n2026-11-01,Thu,Tiền mặt', 'a.csv')).json.message, /thiếu cột: Danh mục, Số tiền/);
  assert.match((await xemTruoc(t, 'Ngày,Loại,Danh mục,Ví,Số tiền\n', 'a.csv')).json.message, /không có dòng dữ liệu/);
  assert.match((await xemTruoc(t, 'không phải excel', 'a.xlsx')).json.message, /Không đọc được file Excel/);
  const admin = (await goi('POST', '/auth/dang-nhap', { body: { email: 'admin@demo.vn', matKhau: 'Demo@123' } })).json.token;
  assert.equal((await xemTruoc(admin, 'a', 'a.csv')).status, 403);
  assert.equal((await goi('GET', '/bao-cao/lich', { token: admin })).status, 403);
});
