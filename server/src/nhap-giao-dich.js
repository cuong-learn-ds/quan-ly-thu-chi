// Đọc file nhập giao dịch (.xlsx hoặc .csv) thành các dòng thô đã chuẩn hóa.
// Định dạng cột giống file xuất Excel (Ngày, Loại, Danh mục, Ví, Số tiền, Ghi chú) để file đã xuất nhập lại được.
// Mô-đun chỉ đọc và chuẩn hóa định dạng; việc khớp ví/danh mục và quy tắc nghiệp vụ do tầng service làm.
import ExcelJS from 'exceljs';
import { DomainError } from './domain/index.js';

export const SO_DONG_TOI_DA = 1000;
export const COT = [['ngay', 'Ngày'], ['loai', 'Loại'], ['danhMuc', 'Danh mục'], ['vi', 'Ví'], ['soTien', 'Số tiền'], ['ghiChu', 'Ghi chú']];
const BAT_BUOC = ['ngay', 'loai', 'danhMuc', 'vi', 'soTien'];

/** Bỏ dấu tiếng Việt, chữ thường, gộp khoảng trắng: "Danh  Mục" -> "danh muc". */
export const boDau = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd')
  .toLowerCase().replace(/\s+/g, ' ').trim();

const TEN_COT = new Map([
  ['ngay', 'ngay'], ['ngay giao dich', 'ngay'], ['ngay gio', 'ngay'], ['thoi gian', 'ngay'],
  ['loai', 'loai'], ['loai giao dich', 'loai'],
  ['danh muc', 'danhMuc'],
  ['vi', 'vi'], ['ten vi', 'vi'],
  ['so tien', 'soTien'], ['so tien (d)', 'soTien'], ['so tien (vnd)', 'soTien'],
  ['ghi chu', 'ghiChu'], ['mo ta', 'ghiChu'],
]);

/** Giá trị ô ExcelJS -> giá trị thường (chuỗi, số hoặc Date). */
function giaTriO(v) {
  if (v == null) return '';
  if (v instanceof Date || typeof v === 'number' || typeof v === 'string') return v;
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) return v.richText.map((x) => x.text).join('');
    if ('result' in v) return giaTriO(v.result);
    if ('text' in v) return giaTriO(v.text);
  }
  return String(v);
}

/** Tách CSV có hỗ trợ ngoặc kép; dấu phân cách tự nhận (, ; hoặc tab) theo dòng tiêu đề. */
export function tachCsv(vanBan) {
  const s = vanBan.replace(/^﻿/, '');
  const dongDau = s.split(/\r?\n/, 1)[0];
  const dem = (k) => dongDau.split(k).length - 1;
  const phan = [';', '\t', ','].reduce((tot, k) => (dem(k) > dem(tot) ? k : tot), ',');
  const dong = []; let o = ''; let hang = []; let trongNgoac = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (trongNgoac) {
      if (c === '"' && s[i + 1] === '"') { o += '"'; i++; } else if (c === '"') trongNgoac = false; else o += c;
    } else if (c === '"') trongNgoac = true;
    else if (c === phan) { hang.push(o); o = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; hang.push(o); dong.push(hang); hang = []; o = ''; }
    else o += c;
  }
  if (o !== '' || hang.length) { hang.push(o); dong.push(hang); }
  return dong;
}

async function docXlsx(buffer) {
  const wb = new ExcelJS.Workbook();
  try { await wb.xlsx.load(buffer); } catch { throw new DomainError('Không đọc được file Excel, hãy kiểm tra lại file'); }
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const dong = [];
  ws.eachRow({ includeEmpty: true }, (row, so) => { dong[so - 1] = row.values.slice(1).map(giaTriO); });
  return Array.from(dong, (d) => d ?? []);
}

/** Ngày: Date của Excel, "YYYY-MM-DD[ HH:mm[:ss]]" hoặc "DD/MM/YYYY[ HH:mm]". Trả "YYYY-MM-DDTHH:mm:ss" hoặc null. */
export function chuanNgay(v) {
  const p2 = (n) => String(n).padStart(2, '0');
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    // ExcelJS trả Date theo UTC đúng bằng giờ hiển thị trong ô
    return `${v.getUTCFullYear()}-${p2(v.getUTCMonth() + 1)}-${p2(v.getUTCDate())}T${p2(v.getUTCHours())}:${p2(v.getUTCMinutes())}:${p2(v.getUTCSeconds())}`;
  }
  if (typeof v === 'number' && v > 20000 && v < 80000) return chuanNgay(new Date(Math.round((v - 25569) * 86400) * 1000)); // số ngày kiểu Excel
  const s = String(v ?? '').trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  let y, mo, d, hh, mi, ss;
  if (m) [, y, mo, d, hh, mi, ss] = m;
  else {
    m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (!m) return null;
    [, d, mo, y, hh, mi, ss] = m;
  }
  const [Y, M, D] = [+y, +mo, +d];
  const kt = new Date(Date.UTC(Y, M - 1, D));
  if (kt.getUTCFullYear() !== Y || kt.getUTCMonth() !== M - 1 || kt.getUTCDate() !== D) return null; // 31/02...
  if (hh === undefined) return `${Y}-${p2(M)}-${p2(D)}T12:00:00`;
  if (+hh > 23 || +mi > 59 || +(ss ?? 0) > 59) return null;
  return `${Y}-${p2(M)}-${p2(D)}T${p2(hh)}:${mi}:${p2(ss ?? 0)}`;
}

/** Số tiền: số, hoặc chuỗi "1.200.000", "1,200,000", "50000đ". Trả số nguyên > 0 hoặc null. */
export function chuanSoTien(v) {
  if (typeof v === 'number') return Number.isInteger(v) && v > 0 ? v : null;
  const s = boDau(v).replace(/vnd|d|₫|\s/g, '');
  let n;
  if (/^\d+$/.test(s)) n = Number(s);
  else if (/^\d{1,3}([.,]\d{3})+$/.test(s)) n = Number(s.replace(/[.,]/g, ''));
  else return null;
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** Loại: "Thu", "thu nhập" -> Thu; "Chi", "chi tiêu" -> Chi. */
export function chuanLoai(v) {
  const s = boDau(v);
  if (s === 'thu' || s === 'thu nhap') return 'Thu';
  if (s === 'chi' || s === 'chi tieu') return 'Chi';
  return null;
}

/**
 * Đọc file -> [{ dong, ngay, loai, danhMuc, vi, soTien, ghiChu, loi: [] }].
 * `dong` là số dòng trong file (dòng tiêu đề là 1) để người dùng dễ tìm lại.
 */
export async function docTepNhap(tep) {
  if (!tep?.buffer?.length) throw new DomainError('Vui lòng chọn file .xlsx hoặc .csv');
  const ten = String(tep.originalname ?? '').toLowerCase();
  let bang;
  if (ten.endsWith('.xlsx')) bang = await docXlsx(tep.buffer);
  else if (ten.endsWith('.csv')) bang = tachCsv(tep.buffer.toString('utf8'));
  else throw new DomainError('Chỉ hỗ trợ file .xlsx hoặc .csv');

  const iTieuDe = bang.findIndex((d) => d.some((o) => String(o ?? '').trim() !== ''));
  if (iTieuDe < 0) throw new DomainError('File không có dữ liệu');
  const viTri = {};
  bang[iTieuDe].forEach((o, i) => { const k = TEN_COT.get(boDau(o)); if (k && viTri[k] === undefined) viTri[k] = i; });
  const thieu = BAT_BUOC.filter((k) => viTri[k] === undefined);
  if (thieu.length) throw new DomainError(`File thiếu cột: ${thieu.map((k) => COT.find(([x]) => x === k)[1]).join(', ')}. Hãy dùng file mẫu.`);

  const kq = [];
  for (let i = iTieuDe + 1; i < bang.length; i++) {
    const o = (k) => (viTri[k] === undefined ? '' : bang[i][viTri[k]] ?? '');
    if (!bang[i].some((x) => String(x ?? '').trim() !== '')) continue; // bỏ dòng trống
    if (kq.length >= SO_DONG_TOI_DA) throw new DomainError(`Mỗi lần chỉ nhập tối đa ${SO_DONG_TOI_DA} dòng`);
    const loi = [];
    const ngay = chuanNgay(o('ngay')); if (!ngay) loi.push('Ngày không hợp lệ (dùng dạng 2026-11-15 hoặc 15/11/2026)');
    const loai = chuanLoai(o('loai')); if (!loai) loi.push('Loại phải là Thu hoặc Chi');
    const soTien = chuanSoTien(o('soTien')); if (!soTien) loi.push('Số tiền phải là số nguyên lớn hơn 0');
    const danhMuc = String(o('danhMuc')).trim(); if (!danhMuc) loi.push('Thiếu danh mục');
    const vi = String(o('vi')).trim(); if (!vi) loi.push('Thiếu ví');
    const ghiChu = String(o('ghiChu')).trim().slice(0, 200) || null;
    kq.push({ dong: i + 1, ngay, loai, danhMuc, vi, soTien, ghiChu, loi });
  }
  if (!kq.length) throw new DomainError('File không có dòng dữ liệu nào');
  return kq;
}

/** File mẫu .xlsx: dòng tiêu đề + ví dụ dùng ví/danh mục thật của người dùng. */
export async function taoFileMau({ tenVi = 'Tiền mặt', dmChi = 'Ăn uống', dmThu = 'Lương', homNay = '2026-11-15' } = {}) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Giao dịch');
  ws.columns = [{ header: 'Ngày', key: 'n', width: 18 }, { header: 'Loại', key: 'l', width: 8 }, { header: 'Danh mục', key: 'd', width: 18 },
    { header: 'Ví', key: 'v', width: 16 }, { header: 'Số tiền', key: 's', width: 16 }, { header: 'Ghi chú', key: 'g', width: 36 }];
  ws.getRow(1).font = { bold: true };
  ws.addRow({ n: `${homNay} 08:00`, l: 'Thu', d: dmThu, v: tenVi, s: 1000000, g: 'Ví dụ: thu nhập' });
  ws.addRow({ n: `${homNay} 12:30`, l: 'Chi', d: dmChi, v: tenVi, s: 45000, g: 'Ví dụ: cơm trưa' });
  ws.getColumn('s').numFmt = '#,##0';
  const hd = wb.addWorksheet('Hướng dẫn');
  hd.getColumn(1).width = 100;
  for (const d of ['Chỉ sheet đầu tiên được đọc. Có thể nhập lại file đã xuất từ trang Báo cáo.',
    'Ngày: 2026-11-15, 2026-11-15 08:30 hoặc 15/11/2026. Không có giờ thì lấy 12:00.',
    'Loại: Thu hoặc Chi.', 'Danh mục và Ví: ghi đúng tên đang có trong ứng dụng (không phân biệt hoa thường).',
    'Số tiền: số nguyên dương, ví dụ 45000 hoặc 45.000.', `Tối đa ${SO_DONG_TOI_DA} dòng mỗi lần. File .csv cũng dùng các cột như trên.`]) hd.addRow([d]);
  return Buffer.from(await wb.xlsx.writeBuffer());
}
