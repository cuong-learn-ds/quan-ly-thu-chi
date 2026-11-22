// Các thành phần "vẽ tay" dùng chung: heo đất, hũ ngân sách, biểu đồ, bánh donut, giấy nhớ, dấu mộc, băng dính...
// Màu luôn đi qua class CSS (biến token) để đổi theo chế độ sáng/tối; bộ lọc nhòe nằm sẵn trong index.html.
import { h, ic, vnd, rutGon, phanTram, mauHopLe, thangNay } from './core.js';

const S = (tag, attrs = {}, ...con) => h(`svg:${tag}`, attrs, ...con);
let dem = 0; // id duy nhất cho clipPath, để nhiều heo/hũ trên cùng một trang không dùng chung
const kep = (v, a, b) => Math.max(a, Math.min(b, Number.isFinite(v) ? v : 0));

/** Màu pastel pha từ màu đậm của danh mục (thành chuỗi CSS dùng được trong style). */
export const pastel = (mau) => `color-mix(in srgb, ${mauHopLe(mau) ?? 'var(--ink3)'} var(--pm), var(--card))`;

/** Trạng thái hũ ngân sách: màu tô, màu chữ, dấu mộc. conLai = true thì hũ ổn ghi phần còn lại (Tổng quan). */
export function mauTrangThai(td, nguong = 80, { conLai = false } = {}) {
  const p = Math.round(td);
  if (td > 100) return { to: '--tomato-f', chu: '--tomato', loai: 'bad', moc: `TRÀN ${p}%` };
  if (td === 100) return { to: '--peach-f', chu: '--amber', loai: 'warn', moc: 'CHẠM NẮP 100%' };
  if (td >= nguong) return { to: '--peach-f', chu: '--amber', loai: 'warn', moc: `SẮP ĐẦY ${p}%` };
  return { to: '--green-f', chu: '--green', loai: 'ok', moc: conLai ? `CÒN ${100 - p}%` : 'CÒN THOẢI MÁI' };
}

// ---- trang trí nhỏ
/** Băng dính dán góc thẻ. mau: y | b | p; nho = băng nhỏ (giấy nhớ). */
export const bangDinh = (mau = 'y', { trai = '', xoay = -3, nho = false } = {}) => h('span', { class: `bang ${mau}${nho ? ' nho' : ''}`, 'aria-hidden': 'true', style: `${trai ? `left:${trai};` : ''}--rot:${xoay}deg` });

/** Dấu mộc viền màu, hơi nghiêng. loai: bad | warn | ok. */
/** tre (ms) có thì dấu mộc đóng xuống sau khoảng đó (chuyển động), không có thì hiện sẵn. */
export const dauMoc = (nhan, loai = 'bad', xoay = -4, lop = '', tre) => h('span', { class: `moc ${loai} ${lop}${tre != null ? ' an-moc' : ''}`.trim(), style: `--rot:${xoay}deg${tre != null ? `;--tre:${tre}ms` : ''}` }, nhan);

/** Số tiền đánh dấu bằng bút dạ. loai: thu | chi | giu. */
export const markTien = (n, loai = 'giu') => h('mark', { class: `m-${loai}` }, typeof n === 'number' ? vnd(n) : n);

/** Giấy nhớ: nội dung chữ tay, băng dính nhỏ, nghiêng nhẹ. */
const BO_GOC = ['3px 6px 4px 12px', '6px 3px 12px 4px', '4px 10px 3px 6px', '10px 4px 6px 3px', '3px 8px 5px 11px'];
const XOAY_GN = [-1.2, 0.9, -0.5, 1.1, -0.9];
const BANG_GN = [['b', 3], ['y', -3], ['p', 2], ['b', -2], ['y', 4]];
export function giayNho(noiDung, { mau = 'y', icon = 'lightbulb', i = 0, xoay, bang, loaiIcon = '', bay = false } = {}) {
  const [bm, bx] = BANG_GN[i % BANG_GN.length];
  // bay: giấy bay vào lần lượt (cách nhau 120ms), băng dính dán sau cùng
  return h('li', { class: `giay-nho gn-${mau}${bay ? ' an-giay' : ''}`, style: `--rot:${xoay ?? XOAY_GN[i % XOAY_GN.length]}deg;border-radius:${BO_GOC[i % BO_GOC.length]}${bay ? `;--tre:${i * 120}ms` : ''}` },
    bangDinh(bang ?? bm, { xoay: bx, nho: true }), h('span', { class: `gn-ic ${loaiIcon}`.trim() }, ic(icon, 'nhoe-nho')), h('p', {}, noiDung));
}

/** Gạch chân vàng dưới tiêu đề trang (ba kiểu nét, chọn theo tên trang). */
const NET_GACH = ['M3 9 C 40 3, 80 12, 120 6 S 180 4, 197 8', 'M3 8 C 50 12, 90 3, 130 7 S 182 10, 197 6', 'M3 7 C 44 11, 96 3, 140 8 S 186 6, 197 9'];
export const gachChan = (ten = '') => S('svg', { class: 'gach', 'aria-hidden': 'true', viewBox: '0 0 200 14', preserveAspectRatio: 'none' }, S('path', { d: NET_GACH[[...ten].reduce((a, c) => a + c.charCodeAt(0), 0) % NET_GACH.length], pathLength: 240, fill: 'none', 'stroke-width': 8, 'stroke-linecap': 'round' }));

// ---- heo đất
/** Heo đất đầy theo day (0..1). xu: đồng xu vẽ sẵn trên đầu. nhan: có thì là hình có tên; không có thì chỉ trang trí.
 *  chay = { tu, roi }: nước dâng từ mức tu lên day; roi = đồng xu rơi vào khe, heo nhún rồi nước mới dâng. */
export function heo({ day = 0, kich = 220, xu = true, nhan, chay } = {}) {
  const f = kep(day, 0, 1); const id = `heo-than-${++dem}`; const fy = 142 - f * 100;
  const ha = chay ? Math.max(0, f - kep(chay.tu ?? 0, 0, 1)) * 100 : 0; const roi = !!chay?.roi;
  let song = `M20 ${fy.toFixed(1)}`; for (let x = 20; x < 180; x += 20) song += ' q5 -4 10 0 t10 0';
  const a11y = nhan ? { role: 'img', 'aria-label': nhan } : { 'aria-hidden': 'true' };
  const hinh = S('svg', { class: `heo${chay ? ' chay' : ''}${roi ? ' roi' : ''}`, viewBox: '0 0 200 170', width: '100%', ...(chay ? { style: `--ha:${ha.toFixed(1)}px` } : {}), ...a11y },
    S('defs', {}, S('clipPath', { id }, S('ellipse', { cx: 96, cy: 92, rx: 64, ry: 48 }))),
    S('g', { class: 'nhoe-heo heo-net' },
      S('path', { d: 'M33 86 c-12 -6 -18 6 -10 11 c7 4 11 -7 2 -10 c-6 -2 -11 1 -13 6', fill: 'none' }),
      S('rect', { class: 'heo-chan', x: 46, y: 124, width: 21, height: 32, rx: 8 }), S('rect', { class: 'heo-chan', x: 122, y: 124, width: 21, height: 32, rx: 8 }),
      S('ellipse', { class: 'heo-than', cx: 96, cy: 92, rx: 66, ry: 50, stroke: 'none' })),
    S('g', { 'clip-path': `url(#${id})` }, S('rect', { class: 'heo-nuoc', x: 20, y: fy.toFixed(1), width: 160, height: 200 }), S('path', { class: 'heo-song', d: song, fill: 'none', 'stroke-width': 2.4, 'stroke-linecap': 'round' })),
    S('g', { class: 'nhoe-heo heo-net' },
      S('ellipse', { cx: 96, cy: 92, rx: 66, ry: 50, fill: 'none' }),
      S('rect', { class: 'heo-chan', x: 68, y: 128, width: 21, height: 30, rx: 8 }), S('rect', { class: 'heo-chan', x: 104, y: 128, width: 21, height: 30, rx: 8 }),
      S('path', { class: 'heo-chan', d: 'M116 52 L124 26 L142 54' }),
      S('rect', { class: 'heo-mui', x: 152, y: 74, width: 32, height: 36, rx: 13 }),
      S('path', { d: 'M78 45 L110 45', 'stroke-width': 6 }),
      S('g', { class: 'heo-xu', 'stroke-width': 2.4 }, [[66, 80], [58, 90], [66, 100], [76, 96], [76, 84]].map(([cx, cy]) => S('circle', { cx, cy, r: 5 }))),
      S('circle', { class: 'heo-hoa', cx: 68, cy: 90, r: 4, 'stroke-width': 2 }),
      S('path', { d: 'M88 104 c4 6 10 6 14 0', fill: 'none', 'stroke-width': 2.4 })),
    S('ellipse', { class: 'heo-mat', cx: 163, cy: 92, rx: 2.8, ry: 4.4 }), S('ellipse', { class: 'heo-mat', cx: 174, cy: 92, rx: 2.8, ry: 4.4 }),
    S('circle', { class: 'heo-mat', cx: 138, cy: 76, r: 5 }), S('circle', { class: 'heo-sang', cx: 139.8, cy: 74.2, r: 1.6 }),
    S('ellipse', { class: 'heo-ma', cx: 140, cy: 98, rx: 9, ry: 5 }),
    xu || roi ? S('g', { class: `nhoe-heo heo-net${roi ? ' heo-roi' : ''}`, 'stroke-width': 3 }, S('circle', { class: 'heo-xu', cx: 94, cy: 14, r: 13 }), S('path', { d: 'M94 7 v14', 'stroke-width': 2.4 }), S('path', { d: 'M72 6 l-8 -4', fill: 'none', 'stroke-width': 2.4 }), S('path', { d: 'M118 6 l8 -4', fill: 'none', 'stroke-width': 2.4 })) : null);
  return h('div', { class: 'heo-w', style: `width:${kich}px` }, hinh);
}


/** Heo nhỏ ở thương hiệu (thanh bên, đăng nhập): nét mực, màu qua class để đổi theo chế độ. */
export function heoMini() {
  return S('svg', { class: 'heo-mini', width: 46, height: 38, viewBox: '0 0 48 40', 'aria-hidden': 'true' },
    S('g', { class: 'nhoe-nho hm-net', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
      S('rect', { class: 'hm-chan', x: 11, y: 29, width: 6, height: 8, rx: 2 }), S('rect', { class: 'hm-chan', x: 27, y: 29, width: 6, height: 8, rx: 2 }),
      S('ellipse', { class: 'hm-than', cx: 22, cy: 22, rx: 17, ry: 13 }), S('path', { class: 'hm-chan', d: 'M28 10 l3 -7 l5 8' }),
      S('rect', { class: 'hm-mui', x: 36, y: 17, width: 9, height: 11, rx: 4 }), S('path', { d: 'M17 9.5 h9', 'stroke-width': 3, fill: 'none' }), S('path', { d: 'M5 20 c-4 -2 -5 3 -2 4', fill: 'none' })),
    S('circle', { class: 'hm-mat', cx: 32, cy: 19, r: 1.8 }));
}

// ---- hũ ngân sách
/** Hũ đầy theo day (>1 = tràn, nắp bật ra). canhBao: 0..1, vạch đứt. mau: tên biến CSS của màu tô, ví dụ '--tomato-f'.
 *  chay: nước dâng từ đáy lên mức dùng; hũ tràn thì nắp bật rồi nước tràn ra sau khi nước đầy. */
export function hu({ day = 0, canhBao = 0.8, mau = '--peach-f', kich = 150, nhan, chay = false } = {}) {
  const f = Math.max(0, Number.isFinite(day) ? day : 0); const w = kep(canhBao, 0, 1); const id = `hu-than-${++dem}`;
  const fy = 168 - Math.min(f, 1) * 128; const wy = 168 - w * 128; const tran = f > 1;
  let song = `M24 ${fy.toFixed(1)}`; for (let x = 24; x < 116; x += 16) song += ' q4 -3 8 0 t8 0';
  const THAN = 'M30 46 Q30 38 38 38 H102 Q110 38 110 46 V150 Q110 168 92 168 H48 Q30 168 30 150 Z';
  const tint = { style: `fill:var(${mau})` };
  const a11y = nhan ? { role: 'img', 'aria-label': nhan } : { 'aria-hidden': 'true' };
  const nap = (xoay) => S('g', { class: `nhoe-hu hu-net${xoay ? ' hu-nap-bat' : ''}`, 'stroke-width': 3, 'stroke-linejoin': 'round' },
    S('rect', { class: 'hu-nap', x: 26, y: 12, width: 88, height: 16, rx: 6 }), S('rect', { class: 'hu-nap', x: 60, y: 4, width: 20, height: 10, rx: 4 }));
  return h('div', { class: 'hu-w', style: `width:${kich}px` }, S('svg', { class: `hu${chay ? ' chay' : ''}`, viewBox: '0 0 140 180', width: '100%', ...(chay ? { style: `--ha:${(Math.min(f, 1) * 128).toFixed(1)}px` } : {}), ...a11y },
    S('defs', {}, S('clipPath', { id }, S('path', { d: THAN }))),
    S('path', { class: 'hu-than', d: THAN }),
    S('g', { 'clip-path': `url(#${id})` }, S('rect', { class: 'hu-nuoc', x: 20, y: fy.toFixed(1), width: 100, height: 200, ...tint }), S('path', { class: 'hu-song', d: song, fill: 'none', 'stroke-width': 2, 'stroke-linecap': 'round' })),
    tran ? S('g', { class: 'nhoe-hu hu-net hu-tran', 'stroke-width': 2.6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' },
      S('path', { d: 'M100 38 C 114 38, 119 56, 117 78 C 116 90, 106 90, 107 78 C 108 64, 106 52, 98 46 Z', ...tint }),
      S('ellipse', { cx: 118, cy: 172, rx: 18, ry: 5, ...tint }),
      S('path', { d: 'M28 44 C 18 46, 16 60, 20 70 C 22 76, 28 74, 27 67 C 26 60, 28 52, 34 48 Z', ...tint })) : null,
    S('g', { class: 'nhoe-hu', fill: 'none', 'stroke-linecap': 'round' },
      S('path', { class: 'hu-net', d: `M32 ${wy.toFixed(1)} H108`, 'stroke-width': 2, 'stroke-dasharray': '6 5' }),
      S('path', { class: 'hu-sang', d: 'M42 62 V128', 'stroke-width': 6 }),
      S('path', { class: 'hu-net', d: THAN, 'stroke-width': 3, 'stroke-linejoin': 'round' }),
      S('rect', { class: 'hu-net hu-co', x: 34, y: 28, width: 72, height: 12, rx: 5, 'stroke-width': 3 })),
    nap(tran),
    S('text', { class: 'hu-chu', x: tran ? 120 : 114, y: (wy + 4).toFixed(1), 'font-size': tran ? 12 : 13 }, `${Math.round(w * 100)}%`)));
}

// ---- biểu đồ cột thu/chi
const SO_TRUC = (cao) => { const mu = 10 ** Math.floor(Math.log10(cao)); const f = cao / mu; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * mu; }; // trần trục làm tròn lên số "đẹp"
/** hang = [{nam, thang, thu, chi}] dài 1..12. Có chú giải Thu (sọc) / Chi ở dòng đầu, khoanh tháng hiện tại, chỉ cột chi cao nhất. */
export function bieuDoThuChi(hang, { chuThich = true, chay = false } = {}) {
  const n = hang.length; const X0 = 40; const X1 = 592; const DAY = 220; const TOP = 40; const CAO = DAY - TOP;
  const tran = SO_TRUC(Math.max(1, ...hang.flatMap((x) => [x.thu, x.chi]))); const slot = (X1 - X0) / n; const bw = Math.min(26, slot * 0.28);
  const [namHT, thangHT] = [Number(thangNay().slice(0, 4)), Number(thangNay().slice(5, 7))];
  const cx = (i) => X0 + slot * (i + 0.5); const hc = (v) => Math.max(v > 0 ? 3 : 0, (v / tran) * CAO);
  const comChi = hang.filter((x) => x.chi > 0); const topChi = comChi.length >= 2 && n <= 8 ? hang.reduce((m, x, i) => (x.chi > (hang[m]?.chi ?? -1) ? i : m), 0) : -1;
  const nhan = [[tran, TOP + 5], [tran / 2, (TOP + DAY) / 2 + 5], [0, DAY + 5]];
  const goiTat = hang.map((x) => (x.thu || x.chi ? `tháng ${x.thang} thu ${vnd(x.thu)}, chi ${vnd(x.chi)}` : `tháng ${x.thang} chưa ghi`)).join('; ');
  const ve = S('svg', { class: `bd${chay ? ' chay' : ''}`, role: 'img', 'aria-label': `Thu chi ${n} tháng: ${goiTat}`, viewBox: '0 0 600 270', width: '100%' },
    S('g', { class: 'bd-nhan', 'font-size': 15, 'text-anchor': 'end' }, nhan.map(([v, y]) => S('text', { x: 32, y }, v ? rutGon(v) : '0'))),
    S('g', { class: 'nhoe', fill: 'none', 'stroke-linecap': 'round' },
      S('path', { class: 'bd-luoi', d: `M${X0} ${(TOP + DAY) / 2} C 200 ${(TOP + DAY) / 2 - 2}, 400 ${(TOP + DAY) / 2 + 3}, ${X1} ${(TOP + DAY) / 2}`, 'stroke-width': 2, 'stroke-dasharray': '7 7' }),
      S('path', { class: 'bd-luoi', d: `M${X0} ${TOP} C 200 ${TOP + 2}, 400 ${TOP - 2}, ${X1} ${TOP + 1}`, 'stroke-width': 2, 'stroke-dasharray': '7 7' }),
      S('path', { class: 'bd-day', d: `M${X0 - 2} ${DAY} C 200 ${DAY + 2}, 400 ${DAY - 2}, ${X1 + 2} ${DAY + 1}`, 'stroke-width': 3 })),
    S('g', { class: 'nhoe bd-cot', 'stroke-width': 2.6, 'stroke-linejoin': 'round' }, hang.map((x, i) => [
      x.thu > 0 ? S('rect', { class: 'bd-thu', style: chay ? `--i:${i * 2}` : null, x: (cx(i) - bw - 3).toFixed(1), y: (DAY - hc(x.thu)).toFixed(1), width: bw.toFixed(1), height: hc(x.thu).toFixed(1), rx: 4 }) : null,
      x.chi > 0 ? S('rect', { class: 'bd-chi', style: chay ? `--i:${i * 2 + 1}` : null, x: (cx(i) + 3).toFixed(1), y: (DAY - hc(x.chi)).toFixed(1), width: bw.toFixed(1), height: hc(x.chi).toFixed(1), rx: 4 }) : null])),
    S('g', { class: 'bd-nhan', 'font-size': 13, 'text-anchor': 'middle' }, hang.map((x, i) => (!x.thu && !x.chi ? S('text', { x: cx(i).toFixed(1), y: DAY - 10 }, 'chưa ghi') : null))),
    S('g', { class: 'bd-thang', 'font-size': 17, 'text-anchor': 'middle' }, hang.map((x, i) => S('text', { x: cx(i).toFixed(1), y: 250 }, `T${x.thang}`))),
    ...hang.map((x, i) => (x.nam === namHT && x.thang === thangHT ? S('ellipse', { class: 'nhoe bd-khoanh', cx: cx(i).toFixed(1), cy: 244, rx: 24, ry: 16, fill: 'none', 'stroke-width': 2.4 }) : null)),
    (() => {
      if (topChi < 0 || !chuThich) return null;
      const tx = cx(topChi) + 3 + bw + 4; const ty = DAY - hc(hang[topChi].chi) - 8; const sx = Math.min(tx + 34, 560); const nho = sx + 136 > 596;
      return S('g', {}, S('g', { class: 'nhoe bd-mui', fill: 'none', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
        S('path', { d: `M${sx} 62 C ${sx - 14} 72, ${tx + 8} ${ty - 24}, ${tx} ${ty}` }), S('path', { d: `M${tx - 6} ${ty - 10} L ${tx} ${ty} L ${tx + 10} ${ty - 7}` })),
        S('text', { class: 'bd-ghichu', x: nho ? 594 : sx + 2, y: 54, 'font-size': 15, 'text-anchor': nho ? 'end' : 'start' }, 'chi mạnh tay nhất'));
    })());
  const chuGiai = h('div', { class: 'bd-cg' }, h('span', {}, S('svg', { width: 16, height: 16, 'aria-hidden': 'true' }, S('rect', { class: 'bd-thu', x: 1, y: 1, width: 14, height: 14, rx: 3, 'stroke-width': 2 })), 'Thu'),
    h('span', {}, S('svg', { width: 16, height: 16, 'aria-hidden': 'true' }, S('rect', { class: 'bd-chi', x: 1, y: 1, width: 14, height: 14, rx: 3, 'stroke-width': 2 })), 'Chi'));
  return h('figure', { class: 'chart' }, chuGiai, ve,
    h('div', { class: 'sr' }, h('table', {}, h('caption', {}, `Thu chi ${n} tháng gần nhất`), h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Tháng'), h('th', { scope: 'col' }, 'Thu'), h('th', { scope: 'col' }, 'Chi'))),
      h('tbody', {}, hang.map((x) => h('tr', {}, h('th', { scope: 'row' }, `Tháng ${x.thang}/${x.nam}`), h('td', {}, vnd(x.thu)), h('td', {}, vnd(x.chi))))))));
}

// ---- bánh donut, thanh xếp chồng, chú giải
/** Xếp theo số tiền giảm dần; quá toiDa thì gộp phần còn lại thành "Khác". */
function nhomDm(ds, toiDa) {
  const sx = [...ds].filter((x) => x.soTien > 0).sort((a, b) => b.soTien - a.soTien);
  if (sx.length <= toiDa) return sx;
  return [...sx.slice(0, toiDa - 1), { tenDanhMuc: 'Khác', soTien: sx.slice(toiDa - 1).reduce((s, x) => s + x.soTien, 0), khac: true }];
}
const mauPhan = (x) => (x.khac ? 'var(--thead)' : pastel(x.mauSac));
const nhanPhan = (nhom, tong) => nhom.map((x) => `${x.tenDanhMuc} ${phanTram(x.soTien, tong)}`).join(', ');

/** Bánh donut: viền nhòe hai vòng, vạch chia ở ranh giới; giữa là tổng rút gọn. */
export function donut(ds, { tong, nhanGiua = 'đã chi', toiDa = 5, tieuDe = 'Cơ cấu chi' } = {}) {
  const nhom = nhomDm(ds, toiDa); const T = tong ?? nhom.reduce((s, x) => s + x.soTien, 0); const C = 2 * Math.PI * 70; let cum = 0;
  const dau = []; let c = 0; nhom.forEach((x) => { dau.push(c); c += x.soTien / (T || 1); }); // vạch chia đặt ở đầu mỗi phần
  const vach = dau.map((f) => { const t = -Math.PI / 2 + f * 2 * Math.PI; const p = (r) => `${(100 + r * Math.cos(t)).toFixed(1)} ${(100 + r * Math.sin(t)).toFixed(1)}`; return `M${p(53)} L${p(87)}`; });
  cum = 0;
  return S('svg', { class: 'donut', role: 'img', 'aria-label': `${tieuDe}: ${nhanPhan(nhom, T)}`, viewBox: '0 0 200 200', width: 190, height: 190 },
    S('g', { transform: 'rotate(-90 100 100)', fill: 'none', 'stroke-width': 34 }, nhom.map((x) => { const len = (x.soTien / (T || 1)) * C; const el = S('circle', { cx: 100, cy: 100, r: 70, style: `stroke:${mauPhan(x)}`, 'stroke-dasharray': `${len.toFixed(1)} ${C.toFixed(2)}`, 'stroke-dashoffset': (-cum).toFixed(1) }); cum += len; return el; })),
    S('g', { class: 'nhoe donut-net', fill: 'none', 'stroke-width': 2.6, 'stroke-linecap': 'round' }, S('circle', { cx: 100, cy: 100, r: 87 }), S('circle', { cx: 100, cy: 100, r: 53 }), vach.map((d) => S('path', { d }))),
    S('text', { class: 'donut-so', x: 100, y: 102, 'text-anchor': 'middle', 'font-size': 26 }, rutGon(T, 2)), S('text', { class: 'donut-nhan', x: 100, y: 122, 'text-anchor': 'middle', 'font-size': 14 }, nhanGiua));
}

/** Thanh xếp chồng nằm ngang (tổng các phần = 100%). */
export function thanhXep(ds, { tong, toiDa = 6, tieuDe = 'Cơ cấu theo danh mục' } = {}) {
  const nhom = nhomDm(ds, toiDa); const T = tong ?? nhom.reduce((s, x) => s + x.soTien, 0); let x0 = 2;
  return S('svg', { class: 'xep', role: 'img', 'aria-label': `${tieuDe}: ${nhanPhan(nhom, T)}`, viewBox: '0 0 400 34', width: '100%' },
    S('g', { class: 'nhoe donut-net', 'stroke-width': 2.4, 'stroke-linejoin': 'round' }, nhom.map((x, i) => { const w = Math.max(4, (x.soTien / (T || 1)) * 396); const r = S('rect', { x: x0.toFixed(1), y: 4, width: w.toFixed(1), height: 26, rx: i === 0 || i === nhom.length - 1 ? 6 : 0, style: `fill:${mauPhan(x)}` }); x0 += w; return r; })));
}

/** Danh sách chú giải: chấm màu, tên, đường chấm chấm, số tiền, phần trăm. */
export function chuGiai(ds, { tong, toiDa = 5 } = {}) {
  const nhom = nhomDm(ds, toiDa); const T = tong ?? nhom.reduce((s, x) => s + x.soTien, 0);
  return h('ul', { class: 'cg' }, nhom.map((x) => h('li', {}, h('span', { class: 'cg-d', 'aria-hidden': 'true', style: `background:${mauPhan(x)}` }), h('span', { class: 'cg-t' }, x.tenDanhMuc), h('span', { class: 'cg-c', 'aria-hidden': 'true' }),
    h('b', {}, vnd(x.soTien)), h('span', { class: 'cg-p' }, phanTram(x.soTien, T)))));
}

// ---- hóa đơn mép răng cưa
const RANG = (() => { let d = ''; for (let x = 10; x <= 300; x += 20) d += ` L${x} 14 L${x + 10} 2`; return d; })();
/** Phiếu giấy có mép dưới răng cưa (phiếu tổng kết, hóa đơn). */
export const hoaDon = (noiDung, { xoay = -0.8, lop = '' } = {}) => h('section', { class: `hoa-don ${lop}`.trim(), style: `--rot:${xoay}deg` }, noiDung,
  S('svg', { class: 'rang-cua', 'aria-hidden': 'true', viewBox: '0 0 300 16', preserveAspectRatio: 'none' }, S('path', { class: 'rc-nen', d: `M0 0 L0 2${RANG} L300 0 Z` }), S('path', { class: 'rc-net', d: `M0 2${RANG}`, fill: 'none', 'stroke-width': 2, 'stroke-linejoin': 'round' })));

// ---- thẻ ví màu
const LOAI_VI = { TienMat: ['--mint-f', 'banknote'], NganHang: ['--sky-f', 'landmark'], ViDienTu: ['--pink-f', 'smartphone'] };
const PHU_VI = ['--peach-f', '--lilac-f'];
const XOAY_VI = [-0.7, 0.5, -0.4];
/** Thẻ ví màu theo loại ví (cùng loại thì xoay vòng màu phụ). pc = % tổng số dư. Có thaoTac thì là thẻ ví đầy đủ, không có thì là liên kết sang #/vi. */
export function theVi(v, { pc = 0, i = 0, dem: soCungLoai = 0, thaoTac, phu } = {}) {
  const [mau, icon] = LOAI_VI[v.loaiVi] ?? ['--sky-f', 'wallet']; const nen = soCungLoai ? PHU_VI[(soCungLoai - 1) % PHU_VI.length] : mau;
  const dung = { class: `the-vi${thaoTac ? ' wcard' : ''}`, style: `--nen:var(${nen});--rot:${XOAY_VI[i % XOAY_VI.length]}deg;border-radius:${i % 2 ? 'var(--ra)' : 'var(--rb)'}` };
  const noi = [h('span', { class: 'lo-bam', 'aria-hidden': 'true' }), h('span', { class: 'tv-t' }, h('span', { class: 'tile', 'aria-hidden': 'true' }, ic(icon, 'nhoe-nho')), h('span', { class: 'tv-ten' }, v.tenVi), thaoTac ?? null),
    h('b', { class: 'tv-so num' }, vnd(v.soDu)), h('span', { class: 'tv-tl' }, h('span', { class: 'bar', 'aria-hidden': 'true' }, h('i', { style: `width:${Math.max(2, pc)}%` })), `${pc}% tổng số dư`), phu ?? null];
  return thaoTac ? h('div', dung, noi) : h('a', { ...dung, href: '#/vi' }, noi);
}

