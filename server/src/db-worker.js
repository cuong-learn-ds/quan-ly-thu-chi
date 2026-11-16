// Worker giữ kết nối SQL Server (thư viện mssql + driver msnodesqlv8, đăng nhập Windows).
// Một worker cho cả tiến trình (driver native chỉ nạp được một lần); mỗi CSDL đã mở là một "phiên" có pool và transaction riêng.
// Luồng chính gửi lệnh qua MessagePort rồi chờ đồng bộ bằng Atomics; worker xử lý bất đồng bộ và báo xong.
import { workerData } from 'node:worker_threads';

const { port, co } = workerData;
// Nạp thư viện khi có lệnh đầu tiên để mọi lỗi (thiếu driver...) được báo về luồng chính thay vì làm nó chờ mãi.
let sql = null;
const phien = new Map(); // id -> { ten, ketNoi, pool, tx }

function xong(kq) {
  port.postMessage(kq);
  Atomics.store(co, 0, 1);
  Atomics.notify(co, 0);
}

const p2 = (n) => String(n).padStart(2, '0');
/** DATETIME2/DATE trả về Date (giờ ghi nguyên vẹn theo UTC) -> chuỗi ISO như tầng nghiệp vụ đang dùng. */
function chuanHang(recordset) {
  if (!recordset) return [];
  const kieu = Object.fromEntries(Object.values(recordset.columns ?? {}).map((c) => [c.name, String(c.type?.declaration ?? '').toLowerCase()]));
  return recordset.map((h) => {
    const o = {};
    for (const [k, v] of Object.entries(h)) {
      if (v instanceof Date) {
        const s = `${v.getUTCFullYear()}-${p2(v.getUTCMonth() + 1)}-${p2(v.getUTCDate())}`;
        o[k] = kieu[k] === 'date' ? s : `${s}T${p2(v.getUTCHours())}:${p2(v.getUTCMinutes())}:${p2(v.getUTCSeconds())}`;
      } else o[k] = v;
    }
    return o;
  });
}

function thamSo(req, ds) {
  ds.forEach((v, i) => {
    const ten = `v${i}`;
    if (typeof v === 'number' && Number.isInteger(v) && Math.abs(v) > 2_000_000_000) req.input(ten, sql.Decimal(18, 0), v);
    else if (typeof v === 'number' && !Number.isInteger(v)) req.input(ten, sql.Float, v);
    else if (typeof v === 'boolean') req.input(ten, sql.Bit, v);
    else if (v === null || v === undefined) req.input(ten, sql.NVarChar, null);
    else req.input(ten, v);
  });
}

/** Tách kịch bản theo dòng GO (như SSMS/sqlcmd). */
const tachGo = (s) => s.split(/^\s*GO\s*$/gim).map((x) => x.trim()).filter(Boolean);
const lenhXoa = (ten) => `IF DB_ID(N'${ten}') IS NOT NULL BEGIN ALTER DATABASE [${ten}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${ten}]; END`;

async function voiMaster(ketNoi, fn) {
  const chu = await new sql.ConnectionPool({ connectionString: ketNoi.master }).connect();
  try { return await fn(chu); } finally { await chu.close(); }
}

async function mo({ id, ten, ketNoi, taoBang, xoaTruoc }) {
  const lo = tachGo(taoBang.replaceAll('QuanLyThuChi', ten));
  await voiMaster(ketNoi, async (chu) => {
    if (xoaTruoc) await chu.request().query(lenhXoa(ten));
    for (const l of lo) if (/CREATE DATABASE/i.test(l)) await chu.request().query(l);
  });
  const pool = await new sql.ConnectionPool({ connectionString: ketNoi.csdl, pool: { max: 4, min: 1 } }).connect();
  // Tạo bảng bằng chính file 01_tao_csdl.sql (bỏ CREATE DATABASE/USE vì đã kết nối đúng CSDL)
  for (const l of lo) if (!/^USE\s/i.test(l) && !/CREATE DATABASE/i.test(l)) await pool.request().batch(l);
  phien.set(id, { ten, ketNoi, pool, tx: null });
}

async function dong(id, xoa) {
  const p = phien.get(id);
  if (!p) return;
  phien.delete(id);
  await p.pool.close();
  if (xoa) await voiMaster(p.ketNoi, (chu) => chu.request().query(lenhXoa(p.ten)));
}

port.on('message', async (m) => {
  try {
    if (!sql) sql = (await import('mssql/msnodesqlv8.js')).default;
    if (m.op === 'mo') { await mo(m); return xong({ ok: true }); }
    const p = phien.get(m.id);
    if (!p) return xong({ ok: false, message: 'CSDL chưa được mở' });
    switch (m.op) {
      case 'begin': p.tx = new sql.Transaction(p.pool); await p.tx.begin(); return xong({ ok: true });
      case 'commit': await p.tx.commit(); p.tx = null; return xong({ ok: true });
      case 'rollback': if (p.tx) { try { await p.tx.rollback(); } catch { /* đã hủy */ } } p.tx = null; return xong({ ok: true });
      case 'query': {
        const req = new sql.Request(p.tx ?? p.pool);
        thamSo(req, m.params);
        const r = await req.query(m.sql);
        return xong({ ok: true, rows: chuanHang(r.recordset), affected: r.rowsAffected?.reduce((a, b) => a + b, 0) ?? 0 });
      }
      case 'batch': await new sql.Request(p.tx ?? p.pool).batch(m.sql); return xong({ ok: true });
      case 'dong': await dong(m.id, m.xoa); return xong({ ok: true });
      default: return xong({ ok: false, message: `Lệnh không hợp lệ: ${m.op}` });
    }
  } catch (e) {
    return xong({ ok: false, message: e.message, number: e.number ?? e.originalError?.info?.number ?? e.code ?? null });
  }
});
