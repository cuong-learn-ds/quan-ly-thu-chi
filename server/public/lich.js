// Lịch chọn ngày / khoảng ngày tự vẽ, thay cho ô date của trình duyệt (mỗi trình duyệt một kiểu, không có lối tắt, khó dùng trên điện thoại).
// Ngày luôn là chuỗi ISO 'YYYY-MM-DD'; so sánh chuỗi là so sánh ngày, phép tính ngày dùng UTC nên không lệch múi giờ.
import { h, ic, nutIcon, homNay, ngayVN, nhanNgay } from './core.js';

const THANG = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
const THU = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const pad = (n) => String(n).padStart(2, '0');
const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const utc = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
const tuUtc = (ms) => { const d = new Date(ms); return ymd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); };
const cong = (iso, n) => tuUtc(utc(iso) + n * 864e5);
const soNgayThang = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const congThang = (iso, n) => {
  const m = +iso.slice(5, 7) - 1 + n; const Y = +iso.slice(0, 4) + Math.floor(m / 12); const M = ((m % 12) + 12) % 12 + 1;
  return ymd(Y, M, Math.min(+iso.slice(8, 10), soNgayThang(Y, M)));
};
const thuIdx = (iso) => (new Date(utc(iso)).getUTCDay() + 6) % 7; // thứ Hai = 0
const soNgay = (a, b) => Math.round((utc(b) - utc(a)) / 864e5) + 1;
const dm = (iso) => ngayVN(iso).slice(0, 5);
const cuoiThang = (iso) => ymd(+iso.slice(0, 4), +iso.slice(5, 7), soNgayThang(+iso.slice(0, 4), +iso.slice(5, 7)));

const NHANH = [
  ['Hôm nay', () => [homNay(), homNay()]],
  ['7 ngày qua', () => [cong(homNay(), -6), homNay()]],
  ['30 ngày qua', () => [cong(homNay(), -29), homNay()]],
  ['Tháng này', () => { const t = homNay(); return [`${t.slice(0, 7)}-01`, cuoiThang(t)]; }],
  ['Tháng trước', () => { const t = congThang(`${homNay().slice(0, 7)}-01`, -1); return [t, cuoiThang(t)]; }],
  ['Năm nay', () => { const y = homNay().slice(0, 4); return [`${y}-01-01`, `${y}-12-31`]; }],
  ['Tất cả', () => ['', '']],
];

export const nhanKhoang = (tu, den) => {
  if (tu && den) return tu === den ? ngayVN(tu) : `${tu.slice(0, 4) === den.slice(0, 4) ? dm(tu) : ngayVN(tu)} – ${ngayVN(den)}`;
  return tu ? `Từ ${ngayVN(tu)}` : den ? `Đến ${ngayVN(den)}` : 'Tất cả thời gian';
};

let dangMo = null; // chỉ một lịch mở tại một thời điểm: { dong, trigger }

/** Mở lịch gắn vào nút trigger. khoang=true: chọn hai ngày + lối tắt; ngược lại chọn một ngày. ap(tu, den) được gọi khi người dùng chốt. */
function moLich({ trigger, khoang, tu: tu0, den: den0, batBuoc, ap }) {
  dangMo?.dong(false);
  let tu = tu0 || ''; let den = den0 || ''; let cho = null; let ruoc = ''; let xem = 'ngay';
  const goc = tu || homNay();
  let nam = +goc.slice(0, 4); let thang = +goc.slice(5, 7);
  const trongThang = (iso) => iso.slice(0, 7) === `${nam}-${pad(thang)}`;
  let tieuDiem = tu && trongThang(tu) ? tu : trongThang(homNay()) ? homNay() : ymd(nam, thang, 1);
  const nut_ = new Map(); // iso -> button, để cập nhật lớp mà không dựng lại (giữ tiêu điểm và sự kiện click)

  const tx = h('span', { class: 'tx' });
  const truoc = nutIcon('chevron-left', 'Tháng trước', { loai: 'ghost sm', onclick: () => buoc(-1) });
  const sau = nutIcon('chevron-right', 'Tháng sau', { loai: 'ghost sm', onclick: () => buoc(1) });
  const nhan = h('button', { type: 'button', class: 'cal-t', 'aria-live': 'polite', onclick: () => { xem = xem === 'ngay' ? 'thang' : 'ngay'; veDau(); veThan(); } }, tx, ic('chevron-down'));
  const dau = h('div', { class: 'cal-h' }, truoc, nhan, sau);
  const than = h('div', { class: 'cal-b' });
  const chan = h('div', { class: 'cal-f' });
  const nhanhEl = khoang ? h('div', { class: 'cal-p', role: 'group', 'aria-label': 'Chọn nhanh' }, NHANH.map(([t, f]) => {
    const [a, b] = f(); const dang = a === tu && b === den && (a || !tu);
    return h('button', { type: 'button', class: 'cal-q', 'aria-pressed': String(!!dang), onclick: () => { ap(a, b); dong(); } }, t);
  })) : null;
  const hop = h('div', { class: `cal${khoang ? ' kh' : ''}`, role: 'dialog', 'aria-label': khoang ? 'Chọn khoảng ngày' : 'Chọn ngày' }, nhanhEl, h('div', { class: 'cal-m' }, dau, than, chan));
  const nen = h('div', { class: 'cal-back' });

  function veDau() {
    const ngay = xem === 'ngay';
    tx.textContent = ngay ? `Tháng ${thang} · ${nam}` : String(nam);
    truoc.setAttribute('aria-label', ngay ? 'Tháng trước' : 'Năm trước'); sau.setAttribute('aria-label', ngay ? 'Tháng sau' : 'Năm sau');
    nhan.setAttribute('aria-expanded', String(!ngay)); nhan.setAttribute('aria-label', ngay ? `${tx.textContent}, bấm để chọn tháng hoặc năm` : `Năm ${nam}, bấm để quay lại lịch ngày`);
  }
  function buoc(d) {
    if (xem === 'ngay') { const m = thang - 1 + d; nam += Math.floor(m / 12); thang = ((m % 12) + 12) % 12 + 1; tieuDiem = congThang(tieuDiem, d); } else nam += d;
    veDau(); veThan();
  }
  function khoangHienThi() {
    if (!khoang) return [tu, tu];
    if (cho) { const r = ruoc || cho; return cho <= r ? [cho, r] : [r, cho]; }
    return [tu, den];
  }
  function capNhatLop() {
    const [a, b] = khoangHienThi(); const sn = soNgayThang(nam, thang); const h0 = homNay();
    for (const [iso, bt] of nut_) {
      const d = +iso.slice(8, 10); const cot = thuIdx(iso); const c = ['cal-d'];
      const la = a === iso; const lb = b === iso; const dai = a && b && a !== b;
      if (la || lb) c.push('sel');
      if (dai && la) c.push('bs'); else if (dai && lb) c.push('be'); else if (dai && iso > a && iso < b) c.push('bm');
      if (dai && iso >= a && iso <= b) { if (cot === 0 || d === 1) c.push('bl'); if (cot === 6 || d === sn) c.push('br'); }
      if (iso === h0) c.push('today'); if (cot === 6) c.push('cn');
      bt.className = c.join(' ');
      bt.setAttribute('tabindex', iso === tieuDiem ? '0' : '-1');
      bt.setAttribute('aria-pressed', String(la || lb));
    }
    veChan();
  }
  function veThan() {
    nut_.clear();
    if (xem === 'thang') {
      const thangHT = ymd(nam, thang, 1).slice(0, 7);
      than.replaceChildren(h('div', { class: 'cal-mg', role: 'group', 'aria-label': `Chọn tháng của năm ${nam}` }, THANG.map((t, i) => {
        const v = `${nam}-${pad(i + 1)}`;
        return h('button', { type: 'button', class: `cal-mo${v === thangHT ? ' sel' : ''}${v === homNay().slice(0, 7) ? ' today' : ''}`, 'aria-pressed': String(v === thangHT), 'aria-label': `Tháng ${i + 1} năm ${nam}`,
          onclick: () => { thang = i + 1; xem = 'ngay'; tieuDiem = trongThang(tieuDiem) ? tieuDiem : ymd(nam, thang, 1); veDau(); veThan(); } }, t);
      })));
      veChan(); return;
    }
    if (!trongThang(tieuDiem)) tieuDiem = ymd(nam, thang, Math.min(+tieuDiem.slice(8, 10), soNgayThang(nam, thang)));
    const sn = soNgayThang(nam, thang); const lech = thuIdx(ymd(nam, thang, 1));
    const luoi = h('div', { class: 'cal-g', role: 'group', 'aria-label': `Tháng ${thang} năm ${nam}`, onkeydown: phimLuoi },
      THU.map((t) => h('span', { class: 'cal-w', 'aria-hidden': 'true' }, t)), Array.from({ length: lech }, () => h('span', { 'aria-hidden': 'true' })));
    for (let d = 1; d <= sn; d++) {
      const iso = ymd(nam, thang, d);
      const bt = h('button', { type: 'button', 'data-iso': iso, 'aria-label': `${d} tháng ${thang} năm ${nam}${iso === homNay() ? ', hôm nay' : ''}`, onclick: () => chonNgay_(iso),
        onmouseenter: () => { if (khoang && cho && ruoc !== iso) { ruoc = iso; capNhatLop(); } }, onfocus: () => { if (khoang && cho && ruoc !== iso) { ruoc = iso; capNhatLop(); } } }, h('span', { class: 'n' }, d));
      nut_.set(iso, bt); luoi.append(bt);
    }
    than.replaceChildren(luoi); capNhatLop();
  }
  function veChan() {
    const xoa = !batBuoc && (tu || den) ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { ap('', ''); dong(); } }, khoang ? 'Xóa lọc' : 'Xóa ngày') : null;
    if (khoang) {
      const tomTat = xem === 'thang' ? 'Chọn tháng để xem lịch' : cho ? 'Chọn ngày kết thúc' : tu && den ? `${dm(tu)} → ${dm(den)} · ${soNgay(tu, den)} ngày` : 'Chọn ngày bắt đầu, rồi ngày kết thúc';
      chan.replaceChildren(...[h('span', { class: 'cal-s num', 'aria-live': 'polite' }, tomTat), xoa].filter(Boolean));
    } else chan.replaceChildren(...[h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { ap(homNay(), ''); dong(); } }, 'Hôm nay'), xoa].filter(Boolean));
  }
  function chonNgay_(iso) {
    if (!khoang) { ap(iso, ''); dong(); return; }
    if (!cho) { cho = iso; ruoc = ''; capNhatLop(); return; }
    const a = cho <= iso ? cho : iso; const b = cho <= iso ? iso : cho;
    cho = null; ap(a, b); dong();
  }
  function datTieuDiem(iso) {
    tieuDiem = iso;
    if (!trongThang(iso)) { nam = +iso.slice(0, 4); thang = +iso.slice(5, 7); veDau(); veThan(); } else capNhatLop();
    nut_.get(iso)?.focus();
  }
  function phimLuoi(e) {
    const iso = e.target.closest?.('[data-iso]')?.dataset.iso; if (!iso) return;
    const k = e.key; const di = { ArrowLeft: () => cong(iso, -1), ArrowRight: () => cong(iso, 1), ArrowUp: () => cong(iso, -7), ArrowDown: () => cong(iso, 7), PageUp: () => congThang(iso, -1), PageDown: () => congThang(iso, 1),
      Home: () => cong(iso, -thuIdx(iso)), End: () => cong(iso, 6 - thuIdx(iso)) }[k];
    if (di) { e.preventDefault(); datTieuDiem(di()); }
  }
  function viTri() {
    if (matchMedia('(max-width: 639px)').matches) { hop.style.left = hop.style.top = ''; return; }
    const r = trigger.getBoundingClientRect(); const w = hop.offsetWidth; const hh = hop.offsetHeight;
    hop.style.left = `${Math.max(8, Math.min(r.left, innerWidth - w - 8))}px`;
    hop.style.top = `${r.bottom + 6 + hh > innerHeight - 8 && r.top - 6 - hh >= 8 ? r.top - 6 - hh : r.bottom + 6}px`;
  }
  const ngoai = (e) => { if (!hop.contains(e.target) && !trigger.contains(e.target)) dong(false); };
  const phim = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); dong(); return; } // chỉ đóng lịch, không đóng hộp thoại phía dưới
    if (e.key !== 'Tab') return;
    const ds = [...hop.querySelectorAll('button:not(:disabled)')].filter((x) => x.tabIndex >= 0);
    if (!ds.length) return;
    const dau_ = ds[0]; const cuoi = ds.at(-1);
    if (!hop.contains(document.activeElement)) { e.preventDefault(); dau_.focus(); } else if (e.shiftKey && document.activeElement === dau_) { e.preventDefault(); cuoi.focus(); } else if (!e.shiftKey && document.activeElement === cuoi) { e.preventDefault(); dau_.focus(); }
  };
  function dong(traTieuDiem = true) {
    document.removeEventListener('mousedown', ngoai, true); document.removeEventListener('keydown', phim, true);
    removeEventListener('resize', viTri); removeEventListener('scroll', viTri, true);
    hop.remove(); nen.remove(); trigger.setAttribute('aria-expanded', 'false'); dangMo = null;
    if (traTieuDiem && trigger.isConnected) trigger.focus();
  }
  dangMo = { dong, trigger };
  veDau(); veThan();
  document.body.append(nen, hop); trigger.setAttribute('aria-expanded', 'true'); viTri();
  document.addEventListener('mousedown', ngoai, true); document.addEventListener('keydown', phim, true);
  addEventListener('resize', viTri); addEventListener('scroll', viTri, true);
  (nut_.get(tieuDiem) ?? hop.querySelector('button'))?.focus({ preventScroll: true });
}

/** Nút chọn khoảng ngày. doi({ tu, den }) khi chốt; tu/den là '' khi bỏ lọc. */
export function chonKhoang({ tu = '', den = '', doi, nhan = 'Khoảng ngày' } = {}) {
  const st = { tu, den };
  const tx = h('span', { class: 'tx' });
  const bt = h('button', { type: 'button', class: 'btn dpbtn', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', onclick: () => {
    if (dangMo?.trigger === bt) { dangMo.dong(); return; }
    moLich({ trigger: bt, khoang: true, ...st, batBuoc: false, ap: (a, b) => { st.tu = a; st.den = b; ve(); doi?.({ tu: a, den: b }); } });
  } }, ic('calendar'), tx);
  const ve = () => { tx.textContent = nhanKhoang(st.tu, st.den); bt.classList.toggle('has', !!(st.tu || st.den)); bt.setAttribute('aria-label', `${nhan}: ${tx.textContent}`); };
  ve();
  return bt;
}

/** Nút chọn một ngày; đọc/ghi giá trị qua thuộc tính .value ('YYYY-MM-DD' hoặc ''). */
export function chonNgay({ giaTri = '', doi, nhan = 'Ngày', batBuoc = true, nhanDep = false } = {}) {
  let v = giaTri;
  const tx = h('span', { class: 'tx' });
  const bt = h('button', { type: 'button', class: 'btn dpbtn', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', onclick: () => {
    if (dangMo?.trigger === bt) { dangMo.dong(); return; }
    moLich({ trigger: bt, khoang: false, tu: v, den: '', batBuoc, ap: (a) => { v = a; ve(); doi?.(a); } });
  } }, ic('calendar'), tx);
  const ve = () => { tx.textContent = v ? (nhanDep ? nhanNgay(v) : ngayVN(v)) : 'Chọn ngày'; bt.classList.toggle('has', !!v); bt.setAttribute('aria-label', `${nhan}: ${v ? ngayVN(v) : 'chưa chọn'}`); };
  Object.defineProperty(bt, 'value', { get: () => v, set: (x) => { v = x || ''; ve(); } });
  ve();
  return bt;
}

/** Ngày + giờ cho form giao dịch. .value trả về 'YYYY-MM-DDTHH:mm' như ô datetime-local cũ. */
export function chonNgayGio(giaTri) {
  const ngay = chonNgay({ giaTri: giaTri.slice(0, 10), nhan: 'Ngày' });
  const gio = h('input', { type: 'time', value: giaTri.slice(11, 16) || '00:00', required: true, 'aria-label': 'Giờ' });
  const w = h('div', { class: 'dt' }, ngay, gio);
  Object.defineProperty(w, 'value', { get: () => `${ngay.value}T${gio.value || '00:00'}` });
  return w;
}
