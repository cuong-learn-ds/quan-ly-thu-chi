import { api, PHIEN, h, bo, thongBao, truong, chay } from './core.js';
import { trangTongQuan, trangGiaoDich, trangVi, trangDanhMuc, trangDinhKy } from './pages-ghi-chep.js';
import { trangNganSach, trangMucTieu, trangBaoCao, trangThongBao, trangCaiDat, trangTaiKhoan, trangQuanTri, trangHoTro, trangKiemToan } from './pages-ke-hoach.js';

const app = document.getElementById('app');
const ICON = {
  tq: 'M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10', gd: 'M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3', vi: 'M3 7h16a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7zM3 7l12-3v3M16 13h3',
  dm: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', ns: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 3v9l6 3', mt: 'M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z',
  bc: 'M4 20V10M10 20V4M16 20v-8M22 20H2', tb: 'M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6M10 19a2 2 0 004 0', cd: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v3M12 19v3M2 12h3M19 12h3', tk: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  dk: 'M4 12a8 8 0 0114-5.3M20 4v4h-4M20 12a8 8 0 01-14 5.3M4 20v-4h4', qt: 'M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z',
};
const icon = (k) => h('svg:svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, h('svg:path', { d: ICON[k] }));

const MENU_ND = [['#/tong-quan', 'tq', 'Tổng quan'], ['#/giao-dich', 'gd', 'Giao dịch'], ['#/vi', 'vi', 'Ví'], ['#/dinh-ky', 'dk', 'Định kỳ'], ['#/danh-muc', 'dm', 'Danh mục'], ['#/ngan-sach', 'ns', 'Ngân sách'],
  ['#/muc-tieu', 'mt', 'Mục tiêu'], ['#/bao-cao', 'bc', 'Báo cáo'], ['#/thong-bao', 'tb', 'Thông báo'], ['#/cai-dat', 'cd', 'Nhắc nhở'], ['#/tai-khoan', 'tk', 'Tài khoản']];
const TK = ['#/tai-khoan', 'tk', 'Tài khoản'];
// Mỗi vai trò đăng nhập có menu riêng; Khách (chưa đăng nhập) chỉ thấy trang Đăng nhập / Đăng ký.
const MENU = {
  NguoiDung: MENU_ND,
  QuanTriVien: [['#/quan-tri', 'qt', 'Quản trị'], TK],
  NhanVienHoTro: [['#/ho-tro', 'tb', 'Hỗ trợ người dùng'], TK],
  KiemToanVien: [['#/kiem-toan', 'bc', 'Thống kê hệ thống'], TK],
};
const menuCua = () => MENU[PHIEN.vaiTro] ?? MENU_ND;
const trangMacDinh = () => menuCua()[0][0].slice(2);
const TRANG = {
  'tong-quan': ['Tổng quan', trangTongQuan], 'giao-dich': ['Giao dịch', trangGiaoDich], vi: ['Ví của tôi', trangVi], 'dinh-ky': ['Giao dịch định kỳ', trangDinhKy], 'danh-muc': ['Danh mục', trangDanhMuc],
  'ngan-sach': ['Ngân sách', trangNganSach], 'muc-tieu': ['Mục tiêu tiết kiệm', trangMucTieu], 'bao-cao': ['Báo cáo thống kê', trangBaoCao],
  'thong-bao': ['Thông báo', trangThongBao], 'cai-dat': ['Cài đặt nhắc nhở', trangCaiDat], 'tai-khoan': ['Tài khoản', trangTaiKhoan], 'quan-tri': ['Quản trị hệ thống', trangQuanTri],
  'ho-tro': ['Hỗ trợ người dùng', trangHoTro], 'kiem-toan': ['Thống kê hệ thống (chỉ đọc)', trangKiemToan],
};

let dem = null; let timerChuong = null;
async function capNhatChuong() {
  if (!dem || PHIEN.vaiTro !== 'NguoiDung') return;
  try { const { soChuaDoc } = await api('GET', '/thong-bao/so-chua-doc'); dem.textContent = soChuaDoc; dem.hidden = soChuaDoc === 0; } catch { /* bỏ qua */ }
}

function dangXuat() { PHIEN.xoa(); clearInterval(timerChuong); location.hash = '#/dang-nhap'; }

function veKhung(khoa) {
  const menu = menuCua();
  const tieuDe = h('h1', {}, '');
  const noiDung = h('main', { class: 'page', id: 'noi-dung', tabindex: '-1' });
  dem = h('b', { hidden: true }, '0');
  const ten = h('span', { class: 'name' }, PHIEN.hoTen);
  document.addEventListener('doi-ten', () => { ten.textContent = PHIEN.hoTen; });
  bo(app).append(h('div', { class: 'shell' },
    h('aside', { class: 'side' }, h('div', { class: 'brand' }, h('i', {}, h('svg:svg', { viewBox: '0 0 24 24', fill: 'none', 'stroke-width': 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, h('svg:path', { d: 'M4 17l5-6 4 4 7-9' }))), 'Quản lý thu chi'),
      h('nav', { class: 'nav', 'aria-label': 'Điều hướng chính' }, menu.map(([href, k, t]) => h('a', { href, class: href === `#/${khoa}` ? 'on' : '', 'aria-current': href === `#/${khoa}` ? 'page' : null }, icon(k), t))),
      h('div', { class: 'gap' }), h('button', { class: 'btn nav-extra', onclick: dangXuat }, 'Đăng xuất')),
    h('div', { class: 'main' }, h('header', { class: 'top' }, tieuDe,
      PHIEN.vaiTro === 'NguoiDung' ? h('a', { class: 'bell', href: '#/thong-bao', 'aria-label': 'Thông báo' }, h('svg:svg', { viewBox: '0 0 24 24' }, h('svg:path', { d: ICON.tb })), dem) : null,
      h('div', { class: 'userchip' }, h('div', { class: 'avatar' }, (PHIEN.hoTen[0] ?? '?').toUpperCase()), ten),
      h('button', { class: 'btn sm', onclick: dangXuat }, 'Đăng xuất')), noiDung)));
  return { tieuDe, noiDung };
}

async function dinhTuyen() {
  const khoa = (location.hash.replace(/^#\/?/, '') || '').split('?')[0];
  if (khoa === 'dang-nhap' || khoa === 'dang-ky') return veXacThuc(khoa);
  if (!PHIEN.token) { location.hash = '#/dang-nhap'; return; }
  if (!TRANG[khoa] || !menuCua().some(([href]) => href === `#/${khoa}`)) { location.hash = `#/${trangMacDinh()}`; return; }
  const [ten, ham] = TRANG[khoa];
  const { tieuDe, noiDung } = veKhung(khoa);
  tieuDe.textContent = ten; document.title = `${ten} · Quản lý thu chi`;
  clearInterval(timerChuong); timerChuong = setInterval(capNhatChuong, 60000); capNhatChuong();
  try { await ham(noiDung, capNhatChuong); } catch (e) { noiDung.append(h('div', { class: 'card empty' }, e.message)); }
}

function veXacThuc(che) {
  const dangKy = che === 'dang-ky';
  const loi = h('div', { class: 'err', role: 'alert' });
  const ten = h('input', { required: true, autocomplete: 'name', maxlength: 100 }); const email = h('input', { type: 'email', required: true, autocomplete: 'email', value: dangKy ? '' : '' });
  const mk = h('input', { type: 'password', required: true, minlength: dangKy ? 6 : 1, autocomplete: dangKy ? 'new-password' : 'current-password' });
  const nut = h('button', { class: 'btn primary', style: 'justify-content:center' }, dangKy ? 'Đăng ký' : 'Đăng nhập');
  bo(app).append(h('div', { class: 'auth' }, h('div', { class: 'card' },
    h('div', { class: 'brand' }, h('i', {}, h('svg:svg', { viewBox: '0 0 24 24', fill: 'none', 'stroke-width': 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, h('svg:path', { d: 'M4 17l5-6 4 4 7-9' }))), 'Quản lý thu chi'),
    h('h1', {}, dangKy ? 'Tạo tài khoản' : 'Đăng nhập'), h('p', { class: 'muted' }, 'Quản lý thu chi cá nhân và lập kế hoạch tài chính'),
    h('form', { class: 'form', onsubmit: async (e) => {
      e.preventDefault(); loi.textContent = ''; nut.disabled = true;
      try {
        if (dangKy) { await api('POST', '/auth/dang-ky', { hoTen: ten.value, email: email.value, matKhau: mk.value }); thongBao('Đăng ký thành công, hãy đăng nhập'); location.hash = '#/dang-nhap'; return; }
        const d = await api('POST', '/auth/dang-nhap', { email: email.value, matKhau: mk.value });
        PHIEN.luu(d); location.hash = `#/${trangMacDinh()}`;
      } catch (er) { loi.textContent = er.message; } finally { nut.disabled = false; }
    } }, dangKy ? truong('Họ tên', ten) : null, truong('Email', email), truong('Mật khẩu', mk), loi, nut),
    h('p', { class: 'small', style: 'margin-top:14px;text-align:center' }, dangKy ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? ', h('a', { href: dangKy ? '#/dang-nhap' : '#/dang-ky' }, dangKy ? 'Đăng nhập' : 'Đăng ký')),
    dangKy ? null : h('div', { class: 'hint' }, 'Demo (mật khẩu Demo@123): người dùng demo@demo.vn · quản trị admin@demo.vn · nhân viên hỗ trợ hotro@demo.vn · kiểm toán viên kiemtoan@demo.vn'))));
  document.title = `${dangKy ? 'Đăng ký' : 'Đăng nhập'} · Quản lý thu chi`;
}

window.addEventListener('hashchange', dinhTuyen);
dinhTuyen();
