import { api, PHIEN, CHE_DO, h, bo, thongBao, truong, truongMatKhau, chay, hopThoai, ic, nut, nutIcon, datHanhDong, dangTai, homNay, luotMoi } from './core.js';
import { heo, heoMini, bangDinh, giayNho, gachChan } from './ve.js';

CHE_DO.ap();
/** Hộp thoại mã QR: quét bằng điện thoại cùng Wi-Fi để mở web. */
async function hienQR() {
  const noi = h('div', { class: 'qrbox' }, h('p', { class: 'muted' }, 'Đang tạo mã QR…'));
  const dlg = hopThoai('Dùng trên điện thoại', h('div', { class: 'form' }, noi, h('div', { class: 'acts' }, h('button', { type: 'button', class: 'btn', onclick: () => dlg.dong() }, 'Đóng'))));
  try {
    const ds = await api('GET', '/ket-noi-dien-thoai');
    bo(noi);
    if (!ds.length) { noi.append(h('p', { class: 'muted' }, 'Không tìm thấy địa chỉ mạng của máy chủ. Hãy kết nối Wi-Fi hoặc mạng LAN rồi thử lại.')); return; }
    noi.append(h('p', {}, 'Mở camera điện thoại (kết nối cùng Wi-Fi với máy này) và quét mã để dùng web trên điện thoại.'),
      ...ds.map((x) => { const q = h('div', { class: 'qr' }); q.innerHTML = x.svg; return h('div', { class: 'qritem' }, q, h('a', { href: x.url, target: '_blank', rel: 'noopener' }, x.url)); }),
      h('p', { class: 'small muted' }, 'Nếu điện thoại không mở được: kiểm tra cùng Wi-Fi, và cho phép Node.js qua tường lửa Windows (mạng riêng tư). Trên điện thoại có thể chọn "Thêm vào màn hình chính" để dùng như ứng dụng.'));
  } catch (e) { bo(noi).append(h('p', { class: 'err' }, e.message)); }
}
const nutQR = () => nutIcon('qr-code', 'Dùng trên điện thoại (quét mã QR)', { loai: 'qr-btn', onclick: hienQR });
/** Nút đổi sáng/tối chỉ có icon (đầu trang, trang đăng nhập); nhãn truy cập đổi theo chế độ hiện tại. */
const nutChuDe = () => {
  const b = h('button', { type: 'button', class: 'btn icon theme-btn' });
  const ve = () => { const toi = CHE_DO.dangToi(); const t = toi ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'; b.setAttribute('aria-label', t); b.title = t; b.replaceChildren(ic(toi ? 'sun' : 'moon', 'nhoe-nho')); };
  const nghe = () => { if (b.isConnected) ve(); else document.removeEventListener('doi-che-do', nghe); };
  document.addEventListener('doi-che-do', nghe);
  b.onclick = () => CHE_DO.doi(); ve();
  return b;
};
/** Hàng đổi sáng/tối ở chân thanh bên (trang nào cũng đổi được). */
const hangChuDe = () => {
  const b = h('button', { type: 'button', class: 'nav theme-nav' });
  const ve = () => { const toi = CHE_DO.dangToi(); b.setAttribute('aria-label', toi ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'); b.replaceChildren(ic(toi ? 'sun' : 'moon', 'nhoe-nho'), toi ? 'Giao diện sáng' : 'Giao diện tối'); };
  const nghe = () => { if (b.isConnected) ve(); else document.removeEventListener('doi-che-do', nghe); };
  document.addEventListener('doi-che-do', nghe);
  b.onclick = () => CHE_DO.doi(); ve();
  return b;
};
import { trangTongQuan, trangGiaoDich, trangLich, trangVi, trangDanhMuc, trangDinhKy } from './pages-ghi-chep.js';
import { trangKeHoach, trangNganSach, trangMucTieu, trangBaoCao, trangThongBao, trangCaiDat, trangTaiKhoan, trangQuanTri, trangHoTro, trangKiemToan } from './pages-ke-hoach.js';

const app = document.getElementById('app');
const TK = ['#/tai-khoan', 'user', 'Tài khoản'];
// Menu theo vai trò, chia nhóm: [nhãn nhóm | null, [[href, icon, nhãn], ...]]. Khách chỉ thấy trang Đăng nhập / Đăng ký.
const MENU = {
  NguoiDung: [
    ['Ghi chép', [['#/tong-quan', 'layout-dashboard', 'Tổng quan'], ['#/giao-dich', 'arrow-left-right', 'Giao dịch'], ['#/lich', 'calendar', 'Lịch'], ['#/vi', 'wallet', 'Ví'], ['#/dinh-ky', 'repeat', 'Định kỳ'], ['#/danh-muc', 'tags', 'Danh mục']]],
    ['Kế hoạch', [['#/ke-hoach', 'flag', 'Kế hoạch'], ['#/ngan-sach', 'gauge', 'Ngân sách'], ['#/muc-tieu', 'target', 'Mục tiêu'], ['#/bao-cao', 'chart-column', 'Báo cáo']]],
    [null, [['#/thong-bao', 'bell', 'Thông báo'], ['#/cai-dat', 'alarm-clock', 'Nhắc nhở'], TK]],
  ],
  QuanTriVien: [[null, [['#/quan-tri', 'shield-check', 'Quản trị'], TK]]],
  NhanVienHoTro: [[null, [['#/ho-tro', 'life-buoy', 'Hỗ trợ người dùng'], TK]]],
  KiemToanVien: [[null, [['#/kiem-toan', 'chart-column', 'Thống kê hệ thống'], TK]]],
};
const menuCua = () => MENU[PHIEN.vaiTro] ?? MENU.NguoiDung;
const phang = () => menuCua().flatMap(([, ds]) => ds);
const trangMacDinh = () => phang()[0][0].slice(2);
const TRANG = {
  'tong-quan': ['Tổng quan', trangTongQuan], 'giao-dich': ['Giao dịch', trangGiaoDich], lich: ['Lịch chi tiêu', trangLich], 'ke-hoach': ['Kế hoạch tháng', trangKeHoach], vi: ['Ví của tôi', trangVi], 'dinh-ky': ['Giao dịch định kỳ', trangDinhKy], 'danh-muc': ['Danh mục', trangDanhMuc],
  'ngan-sach': ['Ngân sách', trangNganSach], 'muc-tieu': ['Mục tiêu tiết kiệm', trangMucTieu], 'bao-cao': ['Báo cáo', trangBaoCao],
  'thong-bao': ['Thông báo', trangThongBao], 'cai-dat': ['Nhắc nhở', trangCaiDat], 'tai-khoan': ['Tài khoản', trangTaiKhoan], 'quan-tri': ['Quản trị hệ thống', trangQuanTri],
  'ho-tro': ['Hỗ trợ người dùng', trangHoTro], 'kiem-toan': ['Thống kê hệ thống', trangKiemToan],
};
// Dòng mô tả cố định dưới tiêu đề cho các vai trò nội bộ (các trang của người dùng tự đặt dòng phụ theo dữ liệu).
const PHU_DE_MAC_DINH = { 'quan-tri': 'Người dùng, danh mục mặc định và tổng kết tháng', 'ho-tro': 'Tìm người dùng và gửi thông báo hỗ trợ', 'kiem-toan': 'Chỉ đọc: số liệu toàn hệ thống' };
const VAI_TRO = { NguoiDung: 'Người dùng', QuanTriVien: 'Quản trị viên', NhanVienHoTro: 'Nhân viên hỗ trợ', KiemToanVien: 'Kiểm toán viên' };
// Mobile: 3 mục chính + nút tròn "Ghi khoản mới" + "Khác" (phần còn lại, đổi giao diện, đăng xuất). Vai trò nội bộ ít mục nên hiện đủ.
const TAB_CHINH = ['#/tong-quan', '#/giao-dich', '#/ngan-sach'];

let dem = []; let timerChuong = null;
async function capNhatChuong() {
  if (!dem.length || PHIEN.vaiTro !== 'NguoiDung') return;
  try {
    const { soChuaDoc } = await api('GET', '/thong-bao/so-chua-doc');
    dem.forEach((e) => { e.textContent = soChuaDoc; e.hidden = soChuaDoc === 0; });
    document.querySelectorAll('.bell').forEach((a) => a.setAttribute('aria-label', soChuaDoc ? `Thông báo, ${soChuaDoc} chưa đọc` : 'Thông báo'));
  } catch { /* bỏ qua */ }
}

function dangXuat() { PHIEN.xoa(); clearInterval(timerChuong); location.hash = '#/dang-nhap'; }
document.addEventListener('dang-xuat', dangXuat);

const thuongHieu = () => h('a', { class: 'brand', href: `#/${trangMacDinh()}`, 'aria-label': 'Quản lý thu chi' }, heoMini(), h('span', { class: 'brand-t' }, h('span', {}, 'Quản lý'), h('span', {}, 'thu chi')));
const gayLoXo = () => h('span', { class: 'gay', 'aria-hidden': 'true' });

function hopKhac(khoa, ngoai) {
  const dong = () => dlg.dong();
  const dsLink = ngoai.map(([href, icon, t]) => h('a', { href, onclick: dong, 'aria-current': href === `#/${khoa}` ? 'page' : null }, ic(icon), t, ic('chevron-right')));
  const dlg = hopThoai('Khác', h('div', { class: 'sheet-list' }, dsLink,
    h('button', { type: 'button', onclick: () => { CHE_DO.doi(); dong(); } }, ic(CHE_DO.dangToi() ? 'sun' : 'moon'), CHE_DO.dangToi() ? 'Giao diện sáng' : 'Giao diện tối', h('span')),
    h('button', { type: 'button', onclick: () => { dong(); dangXuat(); } }, ic('log-out'), 'Đăng xuất', h('span'))));
}

function veKhung(khoa, tenTrang) {
  const ds = phang();
  const dsNhom = menuCua();
  const ngay = PHIEN.vaiTro === 'NguoiDung';
  const tq = khoa === 'tong-quan';
  const cntSide = h('span', { class: 'cnt', hidden: true, 'aria-label': 'thông báo chưa đọc' }, '0');
  const cntBell = h('b', { hidden: true, 'aria-hidden': 'true' }, '0');
  dem = [cntSide, cntBell];
  const lienKet = ([href, icon, t]) => h('a', { href, class: 'nav', 'aria-current': href === `#/${khoa}` ? 'page' : null }, ic(icon, 'nhoe-nho'), h('span', {}, t), href === '#/thong-bao' ? cntSide : null);
  const tieuDe = h('h1', {}, tenTrang, gachChan(tenTrang));
  const noiDung = h('main', { class: 'page', id: 'noi-dung', tabindex: '-1' });
  const ten = h('b', {}, PHIEN.hoTen); const chuCai = h('span', { class: 'avatar', 'aria-hidden': 'true' }, (PHIEN.hoTen[0] ?? '?').toUpperCase());
  document.addEventListener('doi-ten', () => { ten.textContent = PHIEN.hoTen; chuCai.textContent = (PHIEN.hoTen[0] ?? '?').toUpperCase(); });
  const chinh = ngay ? TAB_CHINH.map((hr) => ds.find(([x]) => x === hr)) : ds;
  const ngoai = ds.filter((m) => !chinh.includes(m));
  const tab = ([href, icon, t]) => h('a', { href, 'aria-current': href === `#/${khoa}` ? 'page' : null }, ic(icon), h('span', {}, t));
  const khacHienTai = ngoai.some(([hr]) => hr === `#/${khoa}`);
  // Nút hệ thống ở đầu trang: chỉ Tổng quan (và vai trò nội bộ); trang khác trên điện thoại chỉ có chuông.
  const chuong = ngay ? h('a', { class: `btn icon bell${tq ? '' : ' bell-m'}`, href: '#/thong-bao', 'aria-label': 'Thông báo', title: 'Thông báo' }, ic('bell', 'nhoe-nho'), cntBell) : null;
  const sys = tq ? [h('span', { class: 'sys-d' }, nutQR()), h('span', { class: 'sys-d' }, nutChuDe()), chuong] : !ngay ? [h('span', { class: 'sys-d' }, nutQR()), chuong] : [chuong];
  const dsTab = ngay ? [...chinh.slice(0, 2).map(tab), h('a', { class: 'tab-add', href: '#/giao-dich?them=1', 'aria-label': 'Ghi khoản mới', title: 'Ghi khoản mới' }, ic('plus')), ...chinh.slice(2).map(tab)] : chinh.map(tab);
  bo(app).append(h('div', { class: 'shell' },
    h('aside', { class: 'side' }, gayLoXo(), h('div', { class: 'side-in' }, thuongHieu(),
      h('nav', { 'aria-label': 'Điều hướng chính' }, dsNhom.slice(0, ngay ? 2 : 1).map(([nhan, m]) => [nhan ? h('div', { class: 'navg' }, nhan) : null, m.filter((x) => ngay || x !== TK).map(lienKet)])),
      h('div', { class: 'fill' }),
      h('nav', { class: 'side-end', 'aria-label': 'Tài khoản và giao diện' }, ngay ? dsNhom[2][1].map(lienKet) : [lienKet(TK)], hangChuDe()),
      h('div', { class: 'me' }, chuCai, h('span', { class: 'who' }, ten, h('span', {}, VAI_TRO[PHIEN.vaiTro] ?? '')), nutIcon('log-out', 'Đăng xuất', { loai: 'ghost sm', onclick: dangXuat })))),
    h('div', { class: 'main' }, h('div', { class: 'main-in' },
      h('header', { class: 'top' }, h('div', { class: 'top-t' }, h('p', { class: 'sub-h', id: 'phu-de' }, PHU_DE_MAC_DINH[khoa] ?? ''), tieuDe), h('div', { class: 'top-r' }, h('div', { class: 'hd-acts', id: 'hanh-dong' }), h('div', { class: 'hd-sys' }, sys))),
      noiDung)),
    h('nav', { class: `tabbar${ngay ? '' : ' noi-bo'}`, 'aria-label': 'Điều hướng chính (điện thoại)', style: `grid-template-columns:repeat(${dsTab.length + 1},minmax(0,1fr))` }, dsTab,
      h('button', { type: 'button', 'aria-haspopup': 'dialog', 'aria-current': khacHienTai ? 'page' : null, onclick: () => hopKhac(khoa, ngoai) }, ic('ellipsis'), h('span', {}, 'Khác')))));
  document.getElementById('app').prepend(h('button', { type: 'button', class: 'skip', onclick: () => noiDung.focus() }, 'Bỏ qua điều hướng'));
  return { noiDung };
}

async function dinhTuyen() {
  const khoa = (location.hash.replace(/^#\/?/, '') || '').split('?')[0];
  if (khoa === 'dang-nhap' || khoa === 'dang-ky') return veXacThuc(khoa);
  if (!PHIEN.token) { location.hash = '#/dang-nhap'; return; }
  if (!TRANG[khoa] || !phang().some(([href]) => href === `#/${khoa}`)) { location.hash = `#/${trangMacDinh()}`; return; }
  const [ten, ham] = TRANG[khoa];
  luotMoi(); // vào trang mới: các chuyển động "lần đầu hiện" được chạy lại
  const { noiDung } = veKhung(khoa, ten);
  document.title = `${ten} · Quản lý thu chi`;
  clearInterval(timerChuong); timerChuong = setInterval(capNhatChuong, 60000); capNhatChuong();
  // Nội dung trang nằm trong .page-in (display: contents); khung xương chỉ hiện khi trang chưa vẽ gì.
  const goc = h('div', { class: 'page-in' }); const sk = h('div', { class: 'page-sk card flush' });
  dangTai(sk, 5); noiDung.append(goc, sk); datHanhDong();
  try { await ham(goc, capNhatChuong); } catch (e) {
    bo(goc).append(h('div', { class: 'card' }, h('div', { class: 'empty err-state', role: 'alert' }, h('span', { class: 'tile big', 'aria-hidden': 'true' }, ic('circle-alert')), h('b', {}, 'Không tải được trang'), h('span', {}, e.message), nut('Thử lại', { icon: 'rotate-cw', onclick: dinhTuyen }))));
  }
  sk.remove();
}

/** Trang đăng nhập / đăng ký: bìa sổ bên trái (gáy lò xo, heo đất), phiếu nhập bên phải. */
function veXacThuc(che) {
  const dangKy = che === 'dang-ky';
  const loi = h('div', { class: 'err', role: 'alert' });
  const ten = h('input', { required: true, autocomplete: 'name', maxlength: 100, placeholder: 'Họ và tên của bạn' }); const email = h('input', { type: 'email', required: true, autocomplete: 'username', placeholder: 'ban@vidu.vn' });
  const mk = h('input', { type: 'password', required: true, minlength: dangKy ? 6 : 1, autocomplete: dangKy ? 'new-password' : 'current-password' });
  const nutGui = h('button', { class: 'btn primary auth-gui' }, dangKy ? 'Tạo sổ' : 'Mở sổ', ic('arrow-right'));
  const dongXu = h('svg:svg', { class: 'trang-tri tt-xu', width: 120, height: 90, viewBox: '0 0 120 90', 'aria-hidden': 'true' },
    h('svg:g', { class: 'nhoe tt-net', 'stroke-width': 2.6 }, h('svg:circle', { class: 'tt-vang', cx: 30, cy: 40, r: 18 }), h('svg:circle', { class: 'tt-vang', cx: 74, cy: 58, r: 14 })),
    h('svg:g', { class: 'nhoe tt-net', fill: 'none', 'stroke-width': 2.2, 'stroke-linecap': 'round' }, h('svg:path', { d: 'M24 40 h12' }), h('svg:path', { d: 'M30 34 v12' }), h('svg:path', { d: 'M68 58 h12' }), h('svg:path', { d: 'M92 18 l6 -8 M100 26 l10 -4' })));
  const tienGiay = h('svg:svg', { class: 'trang-tri tt-tien', width: 110, height: 80, viewBox: '0 0 110 80', 'aria-hidden': 'true' },
    h('svg:g', { class: 'nhoe tt-net', 'stroke-width': 2.6, 'stroke-linejoin': 'round' }, h('svg:rect', { class: 'tt-xanh', x: 10, y: 20, width: 70, height: 42, rx: 6, transform: 'rotate(-8 45 41)' }), h('svg:circle', { class: 'tt-the', cx: 45, cy: 41, r: 9, transform: 'rotate(-8 45 41)' })),
    h('svg:path', { class: 'nhoe tt-net', d: 'M86 18 c6 4 10 10 10 18', fill: 'none', 'stroke-width': 2.2, 'stroke-linecap': 'round' }));
  bo(app).append(h('div', { class: 'auth' },
    h('section', { class: 'auth-cover', 'aria-label': 'Bìa sổ' }, gayLoXo(), dongXu, tienGiay,
      h('div', { class: 'cover-t' }, h('p', {}, 'Quản lý'), h('p', {}, 'thu chi')), heo({ day: 0.45, kich: 280, xu: true }),
      h('div', { class: 'cover-the', 'aria-hidden': 'true' }, h('span', {}, 'Sổ của:', h('i', {})), h('span', {}, 'Năm:', h('i', {}, homNay().slice(0, 4)))),
      h('p', { class: 'cover-cau' }, 'Ghi đều tay, tiền tự ở lại.')),
    h('main', { class: 'auth-main' }, h('div', { class: 'authtools' }, nutQR(), nutChuDe()),
      h('div', { class: 'auth-col' },
        h('form', { class: 'card auth-form', 'aria-labelledby': 'h-dn', onsubmit: async (e) => {
          e.preventDefault(); bo(loi); nutGui.disabled = true; nutGui.setAttribute('aria-busy', 'true');
          try {
            if (dangKy) { await api('POST', '/auth/dang-ky', { hoTen: ten.value, email: email.value, matKhau: mk.value }); thongBao('Đăng ký thành công, hãy đăng nhập'); location.hash = '#/dang-nhap'; return; }
            const d = await api('POST', '/auth/dang-nhap', { email: email.value, matKhau: mk.value });
            PHIEN.luu(d); location.hash = `#/${trangMacDinh()}`;
          } catch (er) { loi.append(ic('circle-alert'), h('span', {}, er.message)); } finally { nutGui.disabled = false; nutGui.removeAttribute('aria-busy'); }
        } }, bangDinh('b', { trai: '50%', xoay: -3 }),
        h('div', { class: 'auth-h' }, h('h1', { id: 'h-dn' }, dangKy ? 'Tạo tài khoản' : 'Đăng nhập'), h('p', { class: 'muted' }, dangKy ? 'Mở một cuốn sổ mới cho riêng bạn.' : 'Mở sổ để ghi tiếp.')),
        dangKy ? truong('Họ tên', ten) : null, truong('Email', email), truongMatKhau('Mật khẩu', mk, dangKy ? 'Từ 6 ký tự' : null), loi, nutGui,
        h('p', { class: 'auth-doi' }, dangKy ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? ', h('a', { href: dangKy ? '#/dang-nhap' : '#/dang-ky' }, dangKy ? 'Đăng nhập' : 'Đăng ký'))),
        dangKy ? null : h('ul', { class: 'auth-nho' }, giayNho(['Tài khoản dùng thử:', h('br'), h('b', { class: 'auth-tk' }, 'demo@demo.vn · Demo@123')], { mau: 'y', icon: 'lightbulb', i: 0, xoay: -2, bang: 'p' }))))));
  document.title = `${dangKy ? 'Đăng ký' : 'Đăng nhập'} · Quản lý thu chi`;
}

window.addEventListener('hashchange', dinhTuyen);
dinhTuyen();
