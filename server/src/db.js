// Tầng truy cập dữ liệu: Microsoft SQL Server.
// Giữ giao diện đồng bộ (get/all/run/giaoDich) để tầng nghiệp vụ viết tuần tự, dễ đọc, và mọi thao tác nhiều bước
// nằm gọn trong một transaction. Kết nối thật chạy trong worker (db-worker.js); luồng chính chờ kết quả bằng Atomics.
import { Worker, MessageChannel, receiveMessageOnPort } from 'node:worker_threads';
import { readFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const goc = join(dirname(fileURLToPath(import.meta.url)), '..');
export const KICH_BAN_TAO_BANG = join(goc, 'sql', '01_tao_csdl.sql');

/** Lỗi do SQL Server trả về (vi phạm khóa, ràng buộc...). `number` là mã lỗi SQL Server. */
export class LoiCsdl extends Error {
  constructor(message, number) { super(message); this.number = number; }
  get laTrung() { return this.number === 2627 || this.number === 2601 || /duplicate key|UNIQUE KEY/i.test(this.message); }
}

/** Chuỗi kết nối: biến môi trường DB_SERVER (mặc định localhost), đăng nhập Windows, ODBC Driver 18. */
function chuoiKetNoi(csdl) {
  if (process.env.DB_CONNECTION) return process.env.DB_CONNECTION.replace('{db}', csdl);
  const may = process.env.DB_SERVER ?? 'localhost';
  const driver = process.env.DB_DRIVER ?? 'ODBC Driver 18 for SQL Server';
  return `Driver={${driver}};Server=${may};Database=${csdl};Trusted_Connection=yes;TrustServerCertificate=yes;`;
}

/** Đổi '?' thành @v0, @v1... (bỏ qua dấu ? nằm trong chuỗi '...'). */
function doiThamSo(cau) {
  let i = 0; let trongChuoi = false; let kq = '';
  for (const c of cau) {
    if (c === "'") trongChuoi = !trongChuoi;
    kq += c === '?' && !trongChuoi ? `@v${i++}` : c;
  }
  return kq;
}

// ---- Một worker dùng chung cho cả tiến trình
let kenh = null;
function layKenh() {
  if (kenh) return kenh;
  const co = new Int32Array(new SharedArrayBuffer(4));
  const { port1, port2 } = new MessageChannel();
  const worker = new Worker(new URL('./db-worker.js', import.meta.url), {
    workerData: { port: port2, co }, transferList: [port2], env: process.env,
    execArgv: [], // không kế thừa cờ của tiến trình cha (ví dụ --input-type) làm worker hỏng
  });
  worker.unref(); port1.unref();
  kenh = {
    goi(lenh, choToiDa = 60_000) {
      Atomics.store(co, 0, 0);
      port1.postMessage(lenh);
      if (Atomics.wait(co, 0, 0, choToiDa) === 'timed-out') throw new Error('Hết thời gian chờ SQL Server (kiểm tra dịch vụ MSSQLSERVER và ODBC Driver 18)');
      const tin = receiveMessageOnPort(port1)?.message;
      if (!tin?.ok) throw new LoiCsdl(tin?.message ?? 'Lỗi CSDL', tin?.number);
      return tin;
    },
  };
  return kenh;
}

let soPhien = 0;
const dangMo = new Set();
process.once('exit', () => { for (const db of [...dangMo]) { try { db.dong(); } catch { /* bỏ qua */ } } });

export class Csdl {
  constructor(tenCsdl, { xoaTruoc = false, xoaKhiDong = false } = {}) {
    this.ten = tenCsdl;
    this.id = ++soPhien;
    this.sau = 0;
    this.xoaKhiDong = xoaKhiDong;
    layKenh().goi({ op: 'mo', id: this.id, ten: tenCsdl, ketNoi: { master: chuoiKetNoi('master'), csdl: chuoiKetNoi(tenCsdl) }, taoBang: readFileSync(KICH_BAN_TAO_BANG, 'utf8'), xoaTruoc }, 120_000);
    dangMo.add(this);
  }

  _goi(lenh) { return layKenh().goi({ ...lenh, id: this.id }); }

  all(cau, ...p) { return this._goi({ op: 'query', sql: doiThamSo(cau), params: p }).rows; }
  get(cau, ...p) { return this.all(cau, ...p)[0]; }
  /** INSERT trả thêm mã tự tăng (SCOPE_IDENTITY) để dùng tiếp. */
  run(cau, ...p) {
    const laThem = /^\s*INSERT\s/i.test(cau);
    const r = this._goi({ op: 'query', sql: doiThamSo(cau) + (laThem ? '; SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;' : ''), params: p });
    return { id: laThem ? r.rows[0]?.id ?? null : null, changes: r.affected };
  }
  exec(kichBan) { this._goi({ op: 'batch', sql: kichBan }); }

  /** Chạy fn trong MỘT transaction; lồng nhau thì dùng chung transaction ngoài cùng. Lỗi -> ROLLBACK. */
  giaoDich(fn) {
    if (this.sau > 0) return fn();
    this._goi({ op: 'begin' });
    this.sau++;
    try {
      const r = fn();
      this._goi({ op: 'commit' });
      return r;
    } catch (e) {
      this._goi({ op: 'rollback' });
      throw e;
    } finally { this.sau--; }
  }

  /** Đóng kết nối; CSDL tạm của kiểm thử thì xóa luôn. */
  dong() {
    if (!dangMo.has(this)) return;
    dangMo.delete(this);
    this._goi({ op: 'dong', xoa: this.xoaKhiDong });
  }
}

/**
 * Mở CSDL. Tên mặc định QuanLyThuChi (hoặc DB_NAME). Lần đầu tự tạo CSDL và bảng từ sql/01_tao_csdl.sql.
 * ':memory:' dùng cho kiểm thử: tạo CSDL tạm riêng và tự xóa khi đóng hoặc khi tiến trình kết thúc.
 */
export function moCsdl(ten = process.env.DB_NAME ?? 'QuanLyThuChi') {
  if (ten === ':memory:') {
    const tep = basename(process.argv[1] ?? 'kiem_thu').replace(/\W+/g, '_').slice(0, 40);
    return new Csdl(`QLTC_KiemThu_${tep}_${process.pid}_${soPhien + 1}`, { xoaTruoc: true, xoaKhiDong: true });
  }
  return new Csdl(ten);
}
