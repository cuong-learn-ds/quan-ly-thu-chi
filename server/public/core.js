// Tiện ích dùng chung cho giao diện web: gọi API, dựng DOM an toàn, hộp thoại, biểu đồ SVG.
export const PHIEN = {
  get token() { try { return localStorage.getItem('token'); } catch { return null; } },
  luu(d) { try { localStorage.setItem('token', d.token); localStorage.setItem('vaiTro', d.vaiTro); localStorage.setItem('hoTen', d.hoTen); } catch { /* bỏ qua */ } },
  xoa() { try { ['token', 'vaiTro', 'hoTen'].forEach((k) => localStorage.removeItem(k)); } catch { /* bỏ qua */ } },
  get vaiTro() { try { return localStorage.getItem('vaiTro'); } catch { return null; } },
  get hoTen() { try { return localStorage.getItem('hoTen') ?? ''; } catch { return ''; } },
};

export class LoiApi extends Error { constructor(msg, status) { super(msg); this.status = status; } }

export async function api(method, path, body, { blob = false } = {}) {
  const headers = {};
  if (PHIEN.token) headers.Authorization = `Bearer ${PHIEN.token}`;
  let data;
  if (body instanceof FormData) data = body;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; data = JSON.stringify(body); }
  const res = await fetch(`/api${path}`, { method, headers, body: data });
  if (res.status === 401 && !path.startsWith('/auth/')) { PHIEN.xoa(); location.hash = '#/dang-nhap'; throw new LoiApi('Phiên đăng nhập đã hết hạn', 401); }
  if (!res.ok) {
    let m = 'Đã xảy ra lỗi, vui lòng thử lại';
    try { m = (await res.json()).message ?? m; } catch { /* không có thân JSON */ }
    throw new LoiApi(m, res.status);
  }
  if (blob) return res.blob();
  if (res.status === 204) return null;
  return res.json();
}
export const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== '' && v != null)).toString();

/** Dựng phần tử DOM; chuỗi con luôn là text (không chèn HTML) nên an toàn với dữ liệu người dùng. */
export function h(tag, attrs = {}, ...con) {
  const el = tag.startsWith('svg:') ? document.createElementNS('http://www.w3.org/2000/svg', tag.slice(4)) : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === false || v == null) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.setAttribute('class', v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked' || k === 'disabled' || k === 'selected') el[k] = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  const them = (c) => { if (c == null || c === false) return; if (Array.isArray(c)) c.forEach(them); else el.append(c instanceof Node ? c : document.createTextNode(String(c))); };
  con.forEach(them);
  return el;
}
export const bo = (el) => { el.replaceChildren(); return el; };

export const vnd = (n) => `${new Intl.NumberFormat('vi-VN').format(Math.round(n ?? 0))} ₫`;
export const so = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n ?? 0));
export const ngayVN = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
export const gioVN = (iso) => iso.slice(11, 16);
export const homNay = () => { const d = new Date(Date.now() + 7 * 3600e3); return d.toISOString().slice(0, 10); };
export const thangNay = () => homNay().slice(0, 7);
export const tachThang = (v) => [Number(v.slice(5, 7)), Number(v.slice(0, 4))];

let toastTimer;
export function thongBao(msg, loi = false) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = `toast show${loi ? ' bad' : ''}`;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.className = 'toast'; }, 3400);
}

/** Hộp thoại: trả về { dong(), loi(msg) }. */
export function hopThoai(tieuDe, noiDung, { rong = false } = {}) {
  const truoc = document.activeElement;
  const nen = h('div', { class: 'overlay', onmousedown: (e) => { if (e.target === nen) dong(); } });
  const loiEl = h('div', { class: 'err', role: 'alert' });
  const box = h('div', { class: `modal${rong ? ' wide' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': tieuDe }, h('h2', {}, tieuDe), noiDung, loiEl);
  nen.append(box); document.body.append(nen);
  const onKey = (e) => { if (e.key === 'Escape') dong(); };
  document.addEventListener('keydown', onKey);
  box.querySelector('input:not([type=file]),select,textarea,button')?.focus();
  function dong() { document.removeEventListener('keydown', onKey); nen.remove(); truoc?.focus?.(); }
  return { dong, loi: (m) => { loiEl.textContent = m ?? ''; }, el: box };
}

export function xacNhan(cauHoi, nhan = 'Xóa') {
  return new Promise((xong) => {
    const hd = hopThoai('Xác nhận', h('div', {}, h('p', {}, cauHoi),
      h('div', { class: 'actions' },
        h('button', { class: 'btn', onclick: () => { hd.dong(); xong(false); } }, 'Hủy'),
        h('button', { class: 'btn primary', onclick: () => { hd.dong(); xong(true); } }, nhan))));
  });
}

/** Một ô nhập có nhãn. */
export const truong = (nhan, input) => h('label', { class: 'f' }, nhan, input);
export const chon = (ds, giaTri, thuoc = {}) => h('select', thuoc, ds.map(([v, t]) => h('option', { value: v, selected: String(v) === String(giaTri) }, t)));

/** Chạy tác vụ, hiện lỗi vào hộp thoại hoặc toast. */
export async function chay(fn, hd) {
  try { return await fn(); } catch (e) { if (hd) hd.loi(e.message); else thongBao(e.message, true); return undefined; }
}

// ---- biểu đồ SVG
const MAU = ['#0f766e', '#ea580c', '#7c3aed', '#2563eb', '#db2777', '#65a30d', '#ca8a04', '#64748b'];
export function bieuDoTron(ds, kichThuoc = 180) {
  const tong = ds.reduce((s, x) => s + x.soTien, 0);
  const r = 70; const c = 2 * Math.PI * r; let off = 0;
  const svg = h('svg:svg', { viewBox: '0 0 180 180', width: kichThuoc, height: kichThuoc, role: 'img', 'aria-label': 'Biểu đồ tròn theo danh mục' });
  svg.append(h('svg:circle', { cx: 90, cy: 90, r, fill: 'none', stroke: 'var(--line)', 'stroke-width': 26 }));
  ds.forEach((x, i) => {
    const len = tong ? (x.soTien / tong) * c : 0;
    svg.append(h('svg:circle', { cx: 90, cy: 90, r, fill: 'none', stroke: x.mauSac || MAU[i % MAU.length], 'stroke-width': 26,
      'stroke-dasharray': `${len} ${c - len}`, 'stroke-dashoffset': -off, transform: 'rotate(-90 90 90)' }));
    off += len;
  });
  const t = h('svg:text', { x: 90, y: 86, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 11 }); t.textContent = 'Tổng';
  const t2 = h('svg:text', { x: 90, y: 104, 'text-anchor': 'middle', fill: 'var(--text)', 'font-size': 14, 'font-weight': 700 }); t2.textContent = so(tong);
  svg.append(t, t2);
  return svg;
}
export const chuThich = (ds) => h('div', { class: 'legend' }, ds.map((x, i) =>
  h('div', {}, h('i', { style: `background:${x.mauSac || MAU[i % MAU.length]}` }, ''), h('span', {}, x.tenDanhMuc), h('span', { class: 'muted small' }, `${x.tyLe}% · ${vnd(x.soTien)}`))));

export function mauTienDo(td, nguong = 80) { return td > 100 ? 'var(--bad)' : td >= nguong ? 'var(--warn)' : 'var(--ok)'; }
export const thanhTienDo = (td, nguong) => h('div', { class: 'bar', role: 'progressbar', 'aria-valuenow': Math.round(td), 'aria-valuemin': 0, 'aria-valuemax': 100 },
  h('i', { style: `width:${Math.min(100, td)}%;background:${mauTienDo(td, nguong)}` }));
export const chuCai = (t) => (t ?? '?').trim().slice(0, 1).toUpperCase();
