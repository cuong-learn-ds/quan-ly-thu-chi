// Tiện ích dùng chung cho giao diện web: gọi API, dựng DOM an toàn, hộp thoại, biểu đồ, các thành phần giao diện.
export const PHIEN = {
  get token() { try { return localStorage.getItem('token'); } catch { return null; } },
  luu(d) { try { localStorage.setItem('token', d.token); localStorage.setItem('vaiTro', d.vaiTro); localStorage.setItem('hoTen', d.hoTen); } catch { /* bỏ qua */ } },
  xoa() { try { ['token', 'vaiTro', 'hoTen'].forEach((k) => localStorage.removeItem(k)); } catch { /* bỏ qua */ } },
  get vaiTro() { try { return localStorage.getItem('vaiTro'); } catch { return null; } },
  get hoTen() { try { return localStorage.getItem('hoTen') ?? ''; } catch { return ''; } },
};

/** Chế độ giao diện: 'sang' | 'toi' | null (theo hệ thống). Lưu trong trình duyệt. */
export const CHE_DO = {
  get() { try { return localStorage.getItem('cheDo'); } catch { return null; } },
  ap() { const v = this.get(); if (v === 'toi') document.documentElement.dataset.theme = 'dark'; else if (v === 'sang') document.documentElement.dataset.theme = 'light'; else delete document.documentElement.dataset.theme; },
  dangToi() { const v = this.get(); return v === 'toi' || (v !== 'sang' && matchMedia('(prefers-color-scheme: dark)').matches); },
  doi() { this.dat(this.dangToi() ? 'sang' : 'toi'); },
  /** v: 'sang' | 'toi' | null (theo hệ thống). */
  dat(v) { try { if (v) localStorage.setItem('cheDo', v); else localStorage.removeItem('cheDo'); } catch { /* bỏ qua */ } this.ap(); document.dispatchEvent(new Event('doi-che-do')); },
};

export class LoiApi extends Error { constructor(msg, status) { super(msg); this.status = status; } }

export async function api(method, path, body, { blob = false } = {}) {
  const headers = {};
  if (PHIEN.token) headers.Authorization = `Bearer ${PHIEN.token}`;
  let data;
  if (body instanceof FormData) data = body;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; data = JSON.stringify(body); }
  let res;
  try { res = await fetch(`/api${path}`, { method, headers, body: data }); } catch { throw new LoiApi('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.', 0); }
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

// ---- định dạng
const NF = new Intl.NumberFormat('vi-VN');
export const vnd = (n) => `${n < 0 ? '−' : ''}${NF.format(Math.abs(Math.round(n ?? 0)))} ₫`;
export const so = (n) => `${n < 0 ? '−' : ''}${NF.format(Math.abs(Math.round(n ?? 0)))}`;
export const ngayVN = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
export const gioVN = (iso) => iso.slice(11, 16);
export const homNay = () => { const d = new Date(Date.now() + 7 * 3600e3); return d.toISOString().slice(0, 10); };
export const thangNay = () => homNay().slice(0, 7);
export const tachThang = (v) => [Number(v.slice(5, 7)), Number(v.slice(0, 4))];
/** Số tiền dạng phần tử: chữ số tabular, ký hiệu ₫ nhạt hơn. dau = true thì thêm dấu + cho số dương. */
export const tien = (n, { dau = false, lop = '' } = {}) => h('span', { class: `num ${lop}`.trim() }, `${n < 0 ? '−' : dau && n > 0 ? '+' : ''}${NF.format(Math.abs(Math.round(n ?? 0)))}`, h('span', { class: 'u' }, '₫'));
/** Rút gọn số tiền cho nhãn trục biểu đồ. */
export const rutGon = (v, dp = 1) => (v >= 1e9 ? `${+(v / 1e9).toFixed(dp)} tỷ` : v >= 1e6 ? `${+(v / 1e6).toFixed(dp)} tr` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : String(v)).replace('.', ',');
export const THU_VN = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
/** Tên thứ của một ngày ISO (YYYY-MM-DD). */
export const thuCua = (iso) => THU_VN[new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))).getUTCDay()];
/** Phần trăm kiểu Việt Nam, một chữ số thập phân: 57,3%. */
export const phanTram = (v, tong) => `${((v / (tong || 1)) * 100).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
/** Nhãn ngày thân thiện: Hôm nay · 20/11, Hôm qua · 19/11, còn lại dd/mm/yyyy. */
export function nhanNgay(iso) {
  const h0 = homNay(); const d = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  const lech = Math.round((d(h0) - d(iso.slice(0, 10))) / 864e5);
  if (lech === 0) return `Hôm nay · ${ngayVN(iso).slice(0, 5)}`;
  if (lech === 1) return `Hôm qua · ${ngayVN(iso).slice(0, 5)}`;
  return ngayVN(iso);
}

// ---- thông báo nhanh
let toastTimer;
export function thongBao(msg, loi = false) {
  const t = document.getElementById('toast');
  t.replaceChildren(ic(loi ? 'circle-alert' : 'circle-check'), h('span', {}, msg));
  t.className = `toast show${loi ? ' bad' : ''}`;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.className = 'toast'; }, loi ? 5000 : 3400);
}

// ---- thành phần
/** Biểu tượng từ bộ sprite icons.svg (lucide). Luôn kèm nhãn chữ hoặc aria-label ở nơi dùng. */
export const ic = (ten, lop = '') => h('svg:svg', { class: `ic ${lop}`.trim(), 'aria-hidden': 'true', focusable: 'false' }, h('svg:use', { href: `icons.svg#i-${ten}` }));

/** Nút: nut('Thêm', { icon: 'plus', loai: 'primary', onclick }). Khi ghiNhan = true, nhãn ẩn trên điện thoại nhưng vẫn là tên truy cập. */
export function nut(nhan, { icon, loai = '', ghiNhan = false, ...thuoc } = {}) {
  return h('button', { type: 'button', class: `btn ${loai}`.trim(), ...(ghiNhan ? { 'aria-label': nhan, title: nhan } : {}), ...thuoc }, icon ? ic(icon) : null, h('span', { class: ghiNhan ? 'lbl' : '' }, nhan));
}
export const nutIcon = (icon, nhan, { loai = '', ...thuoc } = {}) => h('button', { type: 'button', class: `btn icon ${loai}`.trim(), 'aria-label': nhan, title: nhan, ...thuoc }, ic(icon));

const BIEU_TUONG = { restaurant: 'utensils', directions_bus: 'bus', shopping_bag: 'shopping-bag', receipt_long: 'receipt-text', movie: 'film', favorite: 'heart-pulse', school: 'graduation-cap', category: 'tags', payments: 'banknote', card_giftcard: 'gift', savings: 'piggy-bank' };
const HEX = /^#[0-9a-f]{3,8}$/i;
export const mauHopLe = (m) => (typeof m === 'string' && HEX.test(m) ? m : null);
/** Ô biểu tượng. Có mau (mã màu của danh mục) thì nền và biểu tượng lấy sắc của màu đó, nhạt dần theo chủ đề sáng/tối. */
export const tileIcon = (icon, lop = '', mau) => { const m = mauHopLe(mau); return h('span', { class: `tile ${lop}${m ? ' c' : ''}`.trim(), style: m ? `--c:${m}` : null, 'aria-hidden': 'true' }, ic(icon)); };
export const tile = (bieuTuong, lop = '', mau) => tileIcon(BIEU_TUONG[bieuTuong] ?? 'tags', lop, mau);
export const chip = (loai, nhan, icon, tip) => h('span', { class: `chip ${loai}`.trim(), title: tip }, icon ? ic(icon) : null, nhan);

/** Trạng thái ngân sách: luôn có chữ + icon, không chỉ dựa vào màu. */
export function trangThaiNS(td, nguong = 80) {
  if (td > 100) return { cls: 'bad', nhan: 'Vượt hạn mức', icon: 'circle-alert' };
  if (td === 100) return { cls: 'warn', nhan: 'Hết hạn mức', icon: 'octagon-alert' };
  if (td >= nguong) return { cls: 'warn', nhan: 'Sắp vượt', icon: 'triangle-alert' };
  return { cls: '', nhan: 'Trong hạn mức', icon: 'circle-check' };
}
export function thanhTienDo(td, nguong) {
  const tt = trangThaiNS(td, nguong); const p = Math.round(td);
  return h('div', { class: `bar ${tt.cls}`.trim(), role: 'progressbar', 'aria-valuenow': Math.min(100, p), 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuetext': `${p}% hạn mức${td > 100 ? ', vượt hạn mức' : ''}`, 'aria-label': 'Đã dùng hạn mức' },
    h('i', { style: `width:${Math.min(100, td)}%` }), nguong != null ? h('u', { style: `left:${nguong}%`, title: `Ngưỡng cảnh báo ${nguong}%` }) : null);
}
export const thanhMucTieu = (td, cham, xong) => h('div', { class: `bar ${xong ? 'done' : cham ? 'warn' : ''}`.trim(), role: 'progressbar', 'aria-valuenow': Math.min(100, Math.round(td)), 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': 'Tiến độ mục tiêu' }, h('i', { style: `width:${Math.min(100, td)}%` }));

/** Trạng thái rỗng, có thể kèm nút hành động. */
export const rong = (icon, tieuDe, moTa, hanhDong, minhHoa) => h('div', { class: 'empty' }, minhHoa ?? h('span', { class: 'tile big', 'aria-hidden': 'true' }, ic(icon)), h('b', {}, tieuDe), moTa ? h('span', {}, moTa) : null, hanhDong ?? null);
/** Khung xương trong lúc tải: gọi dangTai(el) trước khi gọi API. */
export function dangTai(el, so_ = 4) {
  bo(el).append(h('div', { class: 'skel', role: 'status', 'aria-label': 'Đang tải' }, Array.from({ length: so_ }, (_, i) => h('div', { class: 'sk-row' }, h('i', { class: 'sk' }), h('div', {}, h('i', { class: 'sk', style: `width:${60 - (i % 3) * 12}%` }), h('i', { class: 'sk', style: 'width:35%;height:10px' })), h('i', { class: 'sk', style: 'width:72px' })))));
}
/** Trạng thái lỗi tải dữ liệu, có nút Thử lại. */
export const hienLoi = (el, thuLai, msg = 'Không tải được dữ liệu. Kiểm tra kết nối rồi thử lại.') => bo(el).append(h('div', { class: 'empty err-state', role: 'alert' }, h('span', { class: 'tile big', 'aria-hidden': 'true' }, ic('circle-alert')), h('b', {}, 'Không tải được'), h('span', {}, msg), thuLai ? nut('Thử lại', { icon: 'rotate-cw', onclick: thuLai }) : null));

/** Dòng phụ nhỏ phía trên tiêu đề trang (Pangolin), mỗi trang tự đặt. */
export const datPhuDe = (text) => { const e = document.getElementById('phu-de'); if (e) e.textContent = text ?? ''; };
/** Vùng nút hành động của trang (nằm ở thanh tiêu đề). */
export const datHanhDong = (...nodes) => { document.getElementById('hanh-dong')?.replaceChildren(...nodes.flat().filter(Boolean)); };

// ---- hộp thoại
let soHop = 0;
/** Hộp thoại: trả về { dong(), loi(msg) }. Nền phía sau bị vô hiệu (inert) để Tab không thoát ra ngoài. */
export function hopThoai(tieuDe, noiDung, { rong: r = false } = {}) {
  const truoc = document.activeElement;
  const id = `hop-${++soHop}`;
  const nen = h('div', { class: 'overlay', onmousedown: (e) => { if (e.target === nen) dong(); } });
  const loiEl = h('div', { class: 'err', role: 'alert' });
  const dongNut = nutIcon('x', 'Đóng', { loai: 'ghost', onclick: () => dong() });
  const thanh = h('div', { class: 'modal-b' }, noiDung, loiEl);
  const box = h('div', { class: `modal${r ? ' wide' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': id }, h('span', { class: 'bang b', 'aria-hidden': 'true' }), h('div', { class: 'modal-h' }, h('h2', { id }, tieuDe), dongNut), thanh);
  nen.append(box); document.body.append(nen);
  const app = document.getElementById('app'); const daInert = app?.inert; if (app) app.inert = true;
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); dong(); return; }
    if (e.key !== 'Tab') return;
    const ds = [...box.querySelectorAll('button:not(:disabled),input:not([type=hidden]):not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')].filter((x) => !x.closest('[hidden]'));
    if (!ds.length) return;
    const dau = ds[0]; const cuoi = ds.at(-1);
    if (e.shiftKey && document.activeElement === dau) { e.preventDefault(); cuoi.focus(); } else if (!e.shiftKey && document.activeElement === cuoi) { e.preventDefault(); dau.focus(); }
  };
  document.addEventListener('keydown', onKey);
  (thanh.querySelector('input:not([type=file]):not([type=hidden]),select,textarea,.modal-b button') ?? dongNut).focus();
  function dong() { document.removeEventListener('keydown', onKey); nen.remove(); if (app) app.inert = daInert ?? false; truoc?.focus?.(); }
  return { dong, loi: (m) => { loiEl.replaceChildren(...(m ? [ic('circle-alert'), h('span', {}, m)] : [])); }, el: box };
}

export function xacNhan(cauHoi, nhan = 'Xóa') {
  return new Promise((xong) => {
    const nguyHiem = /^(Xóa|Khóa)/.test(nhan);
    const hd = hopThoai(nguyHiem ? `${nhan}?` : 'Xác nhận', h('div', { class: 'form' }, h('p', { class: 'dlg-p' }, cauHoi),
      h('div', { class: 'acts' },
        h('button', { type: 'button', class: 'btn', onclick: () => { hd.dong(); xong(false); } }, 'Hủy'),
        h('button', { type: 'button', class: `btn ${nguyHiem ? 'danger strong' : 'primary'}`, onclick: () => { xong(true); hd.dong(); } }, nguyHiem ? ic('trash-2') : null, nhan))));
    const dongGoc = hd.dong; hd.dong = () => { dongGoc(); xong(false); };
  });
}

/** Một ô nhập có nhãn. */
export const truong = (nhan, input, goiY) => h('label', { class: 'field' }, h('span', { class: 'lab' }, nhan), input, goiY ? h('span', { class: 'hint' }, goiY) : null);
/** Ô nhập có nhãn chỉ dành cho trình đọc màn hình (thanh lọc). */
export const truongAn = (nhan, input) => h('label', { class: 'field-an' }, h('span', { class: 'sr' }, nhan), input);
export const chon = (ds, giaTri, thuoc = {}) => h('select', thuoc, ds.map(([v, t]) => h('option', { value: v, selected: String(v) === String(giaTri) }, t)));

/** Chạy tác vụ, hiện lỗi vào hộp thoại hoặc toast. */
export async function chay(fn, hd) {
  try { return await fn(); } catch (e) { if (hd) hd.loi(e.message); else thongBao(e.message, true); return undefined; }
}

/** Nhóm nút phân đoạn (segmented): ds = [[giaTri, nhan]], role group, aria-pressed. */
export function phanDoan(nhan, ds, giaTri, doi, { kieu = '' } = {}) {
  const g = h('div', { class: `seg ${kieu}`.trim(), role: 'group', 'aria-label': nhan });
  const ve = (cur) => g.replaceChildren(...ds.map(([v, t, lop = '']) => h('button', { type: 'button', class: lop, 'aria-pressed': String(v === cur), onclick: () => { if (v === cur) return; ve(v); doi(v); } }, t)));
  ve(giaTri);
  return g;
}

/** Chọn tháng bằng hai nút trước/sau (thay cho ô nhập tháng của trình duyệt). giaTri: 'YYYY-MM'. */
export function chonThang(giaTri, doi) {
  let cur = giaTri;
  const nhan = h('b', { class: 'num', 'aria-live': 'polite' });
  const ve = () => { const [t, n] = tachThang(cur); nhan.textContent = `Tháng ${String(t).padStart(2, '0')}/${n}`; };
  const buoc = (d) => { const [t, n] = tachThang(cur); const m = t - 1 + d; cur = `${n + Math.floor(m / 12)}-${String(((m % 12) + 12) % 12 + 1).padStart(2, '0')}`; ve(); doi(cur); };
  ve();
  return h('div', { class: 'month', role: 'group', 'aria-label': 'Chọn tháng' }, nutIcon('chevron-left', 'Tháng trước', { loai: 'ghost sm', onclick: () => buoc(-1) }), nhan, nutIcon('chevron-right', 'Tháng sau', { loai: 'ghost sm', onclick: () => buoc(1) }));
}

/** Công tắc bật/tắt (role switch). */
export function congTac(nhan, bat, doi) {
  const b = h('button', { type: 'button', role: 'switch', class: 'tgl', 'aria-checked': String(!!bat), 'aria-label': nhan, onclick: () => { const moi = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', String(moi)); doi?.(moi); } }, h('i'));
  return b;
}

/** Ô chỉ số kiểu tay (Ví, Định kỳ, Nhắc nhở, Thống kê quản trị): nhãn chữ tay, số to, dòng phụ nhỏ. */
export const kpi = (nhan, giaTri, phu, lop = '') => h('div', { class: 'kpi' }, h('div', { class: 'kpi-l' }, nhan), h('div', { class: `kpi-v ${lop}`.trim() }, giaTri), phu ?? null);
export const dai = (...ks) => h('section', { class: 'kpi-strip', style: `--n:${ks.length}` }, ks);
export const kpiPhu = (t) => h('div', { class: 'kpi-d' }, t);

/** Ô mật khẩu có nút hiện/ẩn (dùng ở đăng nhập, đăng ký và đổi mật khẩu). */
export function truongMatKhau(nhan, input, goiY) {
  const bt = h('button', { type: 'button', class: 'pw-eye', 'aria-label': 'Hiện mật khẩu', 'aria-pressed': 'false', onclick: () => {
    const hien = input.type === 'password'; input.type = hien ? 'text' : 'password';
    bt.setAttribute('aria-pressed', String(hien)); bt.setAttribute('aria-label', hien ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'); bt.replaceChildren(ic(hien ? 'eye-off' : 'eye'));
  } }, ic('eye'));
  return truong(nhan, h('div', { class: 'pw' }, input, bt), goiY);
}
