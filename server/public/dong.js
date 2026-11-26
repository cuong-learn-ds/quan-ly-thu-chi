// Lớp chuyển động "cuốn sổ sống": lật trang khi đổi mục, khối nội dung đặt xuống giấy khi cuộn tới,
// số tiền đếm lên, bìa sổ có chiều sâu và mở ra khi đăng nhập. Chỉ thêm class/biến CSS (xem dong.css);
// máy bật "giảm chuyển động" thì không làm gì cả.
import { h, giamChuyenDong } from './core.js';
import { heo } from './ve.js';

const CHO_NOI_DUNG = 3500; // ms sau khi vào trang: khối mới (dữ liệu vừa tải xong) mới có chuyển động
const SO_DEM = '.tv-so, .kpi-v, .gc-so dd';
const LAN_LUOT = '.the-vi, .kpi, .lich-o, .cg > li, tbody > tr, .txr:not(.an-moi), .gd-dong, .nhom';

let theoDoiMoi = null; let theoDoiCuon = null; let henDung = null; let viTriTruoc = -1;

/** Gọi ngay sau khi vẽ khung trang. viTri: thứ tự mục trong menu, để biết lật tới hay lật lui. */
export function trangMoi(noiDung, viTri) {
  dungTheoDoi();
  const huong = viTriTruoc >= 0 && viTri < viTriTruoc ? 'lui' : 'toi';
  viTriTruoc = viTri;
  if (giamChuyenDong() || !('IntersectionObserver' in window)) return;
  noiDung.closest('.main-in')?.classList.add('mk-lat', `mk-lat-${huong}`);

  let thuTu = 0; let henXoaThuTu = null;
  theoDoiCuon = new IntersectionObserver((ds, io) => {
    for (const m of ds) {
      if (!m.isIntersecting) continue;
      io.unobserve(m.target);
      hien(m.target, thuTu++);
    }
    clearTimeout(henXoaThuTu); henXoaThuTu = setTimeout(() => { thuTu = 0; }, 120);
  }, { rootMargin: '0px 0px -32px 0px' });

  // MutationObserver chạy trước khi trình duyệt vẽ, nên khối mới được ẩn kịp, không nháy
  theoDoiMoi = new MutationObserver((ds) => ds.forEach((m) => m.addedNodes.forEach(chuanBi)));
  theoDoiMoi.observe(noiDung, { childList: true, subtree: true });
  noiDung.querySelectorAll('.page-in > *').forEach(chuanBi);
  henDung = setTimeout(() => theoDoiMoi?.disconnect(), CHO_NOI_DUNG);
}

function dungTheoDoi() {
  theoDoiMoi?.disconnect(); theoDoiCuon?.disconnect(); clearTimeout(henDung);
  theoDoiMoi = theoDoiCuon = null;
}

/** Khối cấp trang = con trực tiếp của .page-in (bản thân .page-in là display: contents nên bỏ qua, xét con của nó). */
function chuanBi(nut) {
  if (!(nut instanceof Element)) return;
  if (nut.classList.contains('page-in')) { [...nut.children].forEach(chuanBi); return; }
  if (!nut.parentElement?.classList.contains('page-in') || nut.classList.contains('mk-an')) return;
  nut.classList.add('mk-an');
  theoDoiCuon.observe(nut);
}

function hien(khoi, i) {
  khoi.style.setProperty('--mk-tre', `${Math.min(i, 6) * 90}ms`);
  khoi.style.setProperty('--mk-nghieng', i % 2 ? '0.7deg' : '-0.7deg');
  khoi.querySelectorAll(LAN_LUOT).forEach((e, k) => e.style.setProperty('--mk-i', Math.min(k, 14)));
  khoi.classList.replace('mk-an', 'mk-vao');
  khoi.querySelectorAll(SO_DEM).forEach(demChu);
  setTimeout(() => khoi.classList.remove('mk-vao'), 2400);
}

/** Đếm số tiền đang nằm trong một ô: chỉ sửa đúng nút chữ chứa số, giữ nguyên dấu và ký hiệu đi kèm. */
function demChu(o) {
  if (o.querySelector('.dem-w')) return; // đã có hiệu ứng đếm riêng
  const duyet = document.createTreeWalker(o, NodeFilter.SHOW_TEXT);
  let chu; while ((chu = duyet.nextNode()) && !/\d/.test(chu.nodeValue));
  const m = chu?.nodeValue.match(/^(\D*)(\d{1,3}(?:\.\d{3})+)(\D*)$/);
  if (!m) return;
  const [goc, truoc, so, sau] = m; const dich = Number(so.replaceAll('.', ''));
  let vuaGhi = goc; const t0 = performance.now(); const ms = 1100;
  const ghi = (s) => { vuaGhi = s; chu.nodeValue = s; };
  const khung = (t) => {
    if (!chu.isConnected || chu.nodeValue !== vuaGhi) return; // trang đã vẽ lại: thôi
    const p = Math.max(0, Math.min(1, (t - t0) / ms));
    if (p >= 1) { ghi(goc); return; }
    ghi(`${truoc}${(Math.round((dich * (1 - (1 - p) ** 3)) / 1000) * 1000).toLocaleString('vi-VN')}${sau}`);
    requestAnimationFrame(khung);
  };
  ghi(`${truoc}0${sau}`);
  requestAnimationFrame(khung);
  setTimeout(() => { if (chu.isConnected && chu.nodeValue === vuaGhi) ghi(goc); }, ms + 400); // tab chạy nền: vẫn chốt đúng số
}

// ---- bìa sổ (đăng nhập, đăng ký)
const XU_ROI = [[6, 0], [17, 520], [29, 180], [63, 360], [74, 40], [84, 620], [93, 260]]; // [vị trí ngang %, trễ ms]

/** Bìa sổ: các lớp trôi theo chuột, xu rơi một lượt, bấm vào heo thì bỏ thêm một đồng. */
export function biaSo(vung) {
  dungTheoDoi(); viTriTruoc = -1;
  const bia = vung.querySelector('.auth-cover'); if (!bia) return;

  const heoCu = bia.querySelector('.heo-w');
  if (heoCu) {
    let day = 0.45;
    const nutHeo = h('button', { type: 'button', class: 'mk-heo', 'aria-label': 'Bỏ một đồng xu vào heo đất', title: 'Bỏ một đồng xu' });
    heoCu.replaceWith(nutHeo); nutHeo.append(heoCu);
    nutHeo.addEventListener('click', () => {
      const tu = day >= 0.95 ? 0.1 : day; day = day >= 0.95 ? 0.2 : Math.min(1, day + 0.11);
      nutHeo.replaceChildren(heo({ day, kich: 280, xu: true, chay: giamChuyenDong() ? undefined : { tu, roi: true } }));
    });
  }
  if (giamChuyenDong()) return;
  vung.querySelector('.auth')?.classList.add('mk-vao-bia');

  const lop = h('span', { class: 'mk-mua-xu', 'aria-hidden': 'true' }, XU_ROI.map(([x, tre]) => h('i', { style: `left:${x}%;animation-delay:${tre}ms` })));
  bia.append(lop); setTimeout(() => lop.remove(), 3200);

  if (!matchMedia('(pointer: fine)').matches) return;
  let dx = 0; let dy = 0; let x = 0; let y = 0; let chay = false;
  const buoc = () => {
    if (!bia.isConnected) return;
    x += (dx - x) * 0.07; y += (dy - y) * 0.07;
    bia.style.setProperty('--mx', x.toFixed(3)); bia.style.setProperty('--my', y.toFixed(3));
    chay = Math.abs(dx - x) + Math.abs(dy - y) > 0.002;
    if (chay) requestAnimationFrame(buoc);
  };
  const toi = (a, b) => { dx = a; dy = b; if (!chay) { chay = true; requestAnimationFrame(buoc); } };
  bia.addEventListener('mousemove', (e) => { const r = bia.getBoundingClientRect(); toi(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1); });
  bia.addEventListener('mouseleave', () => toi(0, 0));
}

/** Đăng nhập xong: bìa sổ khép lại che màn hình, đổi trang, rồi mở ra. Không chặn thao tác. */
export function moSo(chuyenTrang) {
  if (giamChuyenDong()) { chuyenTrang(); return; }
  const lop = h('div', { class: 'mk-bia', 'aria-hidden': 'true' }, h('div', { class: 'mk-bia-to' }, h('p', {}, 'Quản lý'), h('p', {}, 'thu chi')));
  document.body.append(lop);
  setTimeout(() => { chuyenTrang(); setTimeout(() => lop.classList.add('mo'), 110); }, 230);
  setTimeout(() => lop.remove(), 1100);
}
