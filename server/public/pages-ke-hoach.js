import { api, qs, h, bo, vnd, ngayVN, homNay, thangNay, tachThang, thongBao, hopThoai, xacNhan, truong, chon, chay, bieuDoTron, chuThich, thanhTienDo, so, PHIEN } from './core.js';

// ================= Ngân sách (UC 3.7) =================
export async function trangNganSach(root) {
  let thang = thangNay();
  const luoi = h('div', { class: 'grid g3' });
  root.append(h('div', { class: 'toolbar' }, truong('Tháng', h('input', { type: 'month', value: thang, onchange: (e) => { thang = e.target.value || thangNay(); tai(); } })), h('div', { class: 'sp' }),
    h('button', { class: 'btn primary', onclick: () => bieuMau(null) }, '+ Lập ngân sách')), luoi);
  async function tai() {
    const [t, n] = tachThang(thang);
    const ds = await chay(() => api('GET', `/ngan-sach?${qs({ thang: t, nam: n })}`)); if (!ds) return;
    bo(luoi);
    if (!ds.length) { luoi.append(h('div', { class: 'card empty', style: 'grid-column:1/-1' }, 'Chưa có ngân sách nào cho tháng này')); return; }
    luoi.append(...ds.map((x) => h('div', { class: 'card' },
      h('div', { class: 'row', style: 'border:0;padding:0 0 10px' }, h('b', { class: 'info' }, x.tenDanhMuc),
        h('span', { class: `pill ${x.tienDo > 100 ? 'bad' : x.tienDo >= x.nguongCanhBao ? 'warn' : 'ok'}` }, `${x.tienDo}%`)),
      thanhTienDo(x.tienDo, x.nguongCanhBao),
      h('p', { class: 'small muted' }, `Đã chi ${vnd(x.soDaChi)} / ${vnd(x.hanMuc)}`, h('br'), x.tienDo > 100 ? h('span', { class: 'bad' }, `Vượt ${vnd(x.soDaChi - x.hanMuc)}`) : `Còn ${vnd(x.hanMuc - x.soDaChi)} · cảnh báo từ ${x.nguongCanhBao}%`),
      h('div', { style: 'display:flex;gap:8px' }, h('button', { class: 'btn sm', onclick: () => bieuMau(x) }, 'Sửa hạn mức'),
        h('button', { class: 'btn sm danger', onclick: async () => { if (await xacNhan('Xóa ngân sách này?') && await chay(() => api('DELETE', `/ngan-sach/${x.maNganSach}`)) !== undefined) { thongBao('Đã xóa ngân sách'); tai(); } } }, 'Xóa')))));
  }
  async function bieuMau(x) {
    const dm = x ? [] : await api('GET', '/danh-muc?loai=Chi');
    const sel = chon(dm.filter((d) => !d.laHeThong).map((d) => [d.maDanhMuc, d.tenDanhMuc]), '');
    const han = h('input', { type: 'number', min: 1, required: true, value: x?.hanMuc ?? '' });
    const ng = h('input', { type: 'number', min: 1, max: 100, value: x?.nguongCanhBao ?? 80 });
    const [t, n] = tachThang(thang);
    const dlg = hopThoai(x ? `Sửa ngân sách ${x.tenDanhMuc}` : `Lập ngân sách tháng ${String(t).padStart(2, '0')}/${n}`, h('form', { class: 'form', onsubmit: async (e) => {
      e.preventDefault();
      const r = await chay(() => (x ? api('PUT', `/ngan-sach/${x.maNganSach}`, { hanMuc: Number(han.value), nguongCanhBao: Number(ng.value) })
        : api('POST', '/ngan-sach', { maDanhMuc: +sel.value, hanMuc: Number(han.value), thang: t, nam: n, nguongCanhBao: Number(ng.value) })), dlg);
      if (r) { dlg.dong(); thongBao('Đã lưu ngân sách'); tai(); }
    } }, x ? null : truong('Danh mục chi', sel), truong('Hạn mức chi tiêu (₫)', han), truong('Ngưỡng cảnh báo (%)', ng),
      h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn', onclick: () => dlg.dong() }, 'Hủy'), h('button', { class: 'btn primary' }, 'Lưu'))));
  }
  await tai();
}

// ================= Mục tiêu tiết kiệm (UC 3.8) =================
export async function trangMucTieu(root) {
  const luoi = h('div', { class: 'grid g3' });
  root.append(h('div', { class: 'toolbar' }, h('div', { class: 'sp' }), h('button', { class: 'btn primary', onclick: () => bieuMau(null) }, '+ Tạo mục tiêu')), luoi);
  async function tai() {
    const ds = await chay(() => api('GET', '/muc-tieu')); if (!ds) return;
    bo(luoi);
    if (!ds.length) { luoi.append(h('div', { class: 'card empty', style: 'grid-column:1/-1' }, 'Bạn chưa có mục tiêu tiết kiệm nào')); return; }
    luoi.append(...ds.map((m) => h('div', { class: 'card' },
      h('div', { class: 'row', style: 'border:0;padding:0 0 10px' }, h('b', { class: 'info' }, m.tenMucTieu),
        m.daHoanThanh ? h('span', { class: 'pill ok' }, 'Hoàn thành') : m.chamTienDo ? h('span', { class: 'pill warn' }, 'Chậm tiến độ') : h('span', { class: 'pill' }, 'Đúng tiến độ')),
      h('div', { class: 'bar', role: 'progressbar', 'aria-valuenow': Math.round(m.tienDo) }, h('i', { style: `width:${m.tienDo}%;background:${m.daHoanThanh ? 'var(--ok)' : 'var(--primary)'}` })),
      h('p', { class: 'small' }, h('b', {}, `${m.tienDo}%`), ` · ${vnd(m.soTienHienTai)} / ${vnd(m.soTienMucTieu)}`),
      h('p', { class: 'small muted' }, `Hạn chót ${ngayVN(m.hanChot)}`, m.daHoanThanh ? '' : ` · cần để dành ${vnd(m.soTienCanMoiThang)}/tháng`),
      h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, h('button', { class: 'btn sm primary', onclick: () => napTien(m) }, 'Nạp tiền'), h('button', { class: 'btn sm', onclick: () => bieuMau(m) }, 'Sửa'),
        h('button', { class: 'btn sm danger', onclick: async () => { if (await xacNhan(`Xóa mục tiêu "${m.tenMucTieu}"?`) && await chay(() => api('DELETE', `/muc-tieu/${m.maMucTieu}`)) !== undefined) { thongBao('Đã xóa mục tiêu'); tai(); } } }, 'Xóa')))));
  }
  function bieuMau(m) {
    const ten = h('input', { value: m?.tenMucTieu ?? '', required: true, maxlength: 60 }); const st = h('input', { type: 'number', min: 1, required: true, value: m?.soTienMucTieu ?? '' });
    const han = h('input', { type: 'date', required: true, value: m?.hanChot ?? '' });
    const dlg = hopThoai(m ? 'Sửa mục tiêu' : 'Tạo mục tiêu tiết kiệm', h('form', { class: 'form', onsubmit: async (e) => {
      e.preventDefault();
      const body = { tenMucTieu: ten.value, soTienMucTieu: Number(st.value), hanChot: han.value };
      const r = await chay(() => (m ? api('PUT', `/muc-tieu/${m.maMucTieu}`, body) : api('POST', '/muc-tieu', body)), dlg);
      if (r) { dlg.dong(); thongBao('Đã lưu mục tiêu'); tai(); }
    } }, truong('Tên mục tiêu', ten), h('div', { class: 'two' }, truong('Số tiền mục tiêu (₫)', st), truong('Hạn chót', han)),
      h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn', onclick: () => dlg.dong() }, 'Hủy'), h('button', { class: 'btn primary' }, 'Lưu'))));
  }
  async function napTien(m) {
    const vis = await api('GET', '/vi');
    const sel = chon(vis.map((v) => [v.maVi, `${v.tenVi} (${vnd(v.soDu)})`]), vis[0]?.maVi); const st = h('input', { type: 'number', min: 1, required: true, value: Math.round(m.soTienCanMoiThang) || '' });
    const dlg = hopThoai(`Nạp tiền vào "${m.tenMucTieu}"`, h('form', { class: 'form', onsubmit: async (e) => {
      e.preventDefault();
      const r = await chay(() => api('POST', `/muc-tieu/${m.maMucTieu}/nap-tien`, { maVi: +sel.value, soTien: Number(st.value) }), dlg);
      if (r) { dlg.dong(); thongBao(r.daHoanThanh ? '🎉 Chúc mừng! Bạn đã hoàn thành mục tiêu' : 'Đã nạp tiền vào mục tiêu'); tai(); }
    } }, truong('Ví nguồn', sel), truong('Số tiền nạp (₫)', st),
      h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn', onclick: () => dlg.dong() }, 'Hủy'), h('button', { class: 'btn primary' }, 'Nạp tiền'))));
  }
  await tai();
}

// ================= Báo cáo (UC 3.9, 3.12) =================
export async function trangBaoCao(root) {
  let tab = 'dm';
  const tabs = h('div', { class: 'tabs' }); const vung = h('div');
  root.append(tabs, vung);
  const ve = () => { bo(tabs).append(...[['dm', 'Theo danh mục'], ['tg', 'Theo thời gian'], ['thang', 'Báo cáo tháng']].map(([k, t]) => h('button', { class: tab === k ? 'on' : '', onclick: () => { tab = k; ve(); } }, t))); bo(vung); ({ dm: tabDanhMuc, tg: tabThoiGian, thang: tabThang })[tab](vung); };
  ve();
}

async function taiExcel(tu, den) {
  const b = await chay(() => api('GET', `/bao-cao/excel?${qs({ tu, den })}`, undefined, { blob: true })); if (!b) return;
  const a = h('a', { href: URL.createObjectURL(b), download: `bao-cao-${tu}-${den}.xlsx` }); document.body.append(a); a.click(); a.remove();
  thongBao('Đã tạo file Excel');
}

async function tabDanhMuc(vung) {
  const d0 = `${thangNay()}-01`; let tu = d0; let den = homNay(); let loai = 'Chi';
  const kq = h('div', { class: 'card', style: 'margin-top:16px' });
  vung.append(h('div', { class: 'toolbar' },
    truong('Từ ngày', h('input', { type: 'date', value: tu, onchange: (e) => { tu = e.target.value; tai(); } })), truong('Đến ngày', h('input', { type: 'date', value: den, onchange: (e) => { den = e.target.value; tai(); } })),
    truong('Loại', chon([['Chi', 'Chi'], ['Thu', 'Thu']], loai, { onchange: (e) => { loai = e.target.value; tai(); } })), h('div', { class: 'sp' }),
    h('button', { class: 'btn', onclick: () => taiExcel(tu, den) }, 'Xuất Excel')), kq);
  async function tai() {
    const r = await chay(() => api('GET', `/bao-cao/theo-danh-muc?${qs({ tu, den, loai })}`)); if (!r) return;
    bo(kq).append(r.length ? h('div', { class: 'donut' }, bieuDoTron(r), h('div', {}, chuThich(r))) : h('div', { class: 'empty' }, 'Không có dữ liệu trong khoảng thời gian đã chọn'));
  }
  await tai();
}

async function tabThoiGian(vung) {
  let nam = Number(thangNay().slice(0, 4)); const kq = h('div', { class: 'card', style: 'margin-top:16px' });
  vung.append(h('div', { class: 'toolbar' }, truong('Năm', h('input', { type: 'number', min: 2000, max: 2100, value: nam, onchange: (e) => { nam = +e.target.value; tai(); } }))), kq);
  async function tai() {
    const r = await chay(() => api('GET', `/bao-cao/theo-thoi-gian?nam=${nam}`)); if (!r) return;
    const max = Math.max(1, ...r.flatMap((x) => [x.thu, x.chi]));
    bo(kq).append(h('div', { class: 'legend', style: 'display:flex;gap:18px;margin-bottom:8px' }, h('div', {}, h('i', { style: 'background:var(--thu)' }), 'Thu'), h('div', {}, h('i', { style: 'background:var(--chi)' }), 'Chi')),
      h('div', { class: 'bars', role: 'img', 'aria-label': `Thu chi theo tháng năm ${nam}` }, r.map((x) => h('div', { class: 'col', title: `Tháng ${x.thang}: thu ${vnd(x.thu)}, chi ${vnd(x.chi)}` },
        h('div', { class: 'pair' }, h('i', { style: `height:${(x.thu / max) * 100}%;background:var(--thu)` }), h('i', { style: `height:${(x.chi / max) * 100}%;background:var(--chi)` })), `T${x.thang}`))),
      h('table', { style: 'margin-top:16px' }, h('thead', {}, h('tr', {}, h('th', {}, 'Tháng'), h('th', { class: 'r' }, 'Thu'), h('th', { class: 'r' }, 'Chi'), h('th', { class: 'r' }, 'Chênh lệch'))),
        h('tbody', {}, r.filter((x) => x.thu || x.chi).map((x) => h('tr', {}, h('td', {}, `Tháng ${x.thang}`), h('td', { class: 'r thu' }, so(x.thu)), h('td', { class: 'r chi' }, so(x.chi)), h('td', { class: 'r' }, so(x.thu - x.chi)))))));
  }
  await tai();
}

async function tabThang(vung) {
  const r = await chay(() => api('GET', '/bao-cao/thang')); if (!r) return;
  vung.append(h('div', { class: 'card' }, r.length ? h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Tháng'), h('th', { class: 'r' }, 'Tổng thu'), h('th', { class: 'r' }, 'Tổng chi'), h('th', { class: 'r' }, 'DM vượt NS'), h('th', {}, 'Ngày lập'))),
    h('tbody', {}, r.map((b) => h('tr', {}, h('td', {}, `${String(b.thang).padStart(2, '0')}/${b.nam}`), h('td', { class: 'r thu' }, so(b.tongThu)), h('td', { class: 'r chi' }, so(b.tongChi)), h('td', { class: 'r' }, b.soDanhMucVuot), h('td', {}, ngayVN(b.ngayLap))))))
    : h('div', { class: 'empty' }, 'Chưa có báo cáo tổng kết tháng nào. Báo cáo được lập tự động lúc 23:00 ngày cuối tháng.')));
}

// ================= Thông báo & cài đặt nhắc nhở (UC 3.11) =================
export async function trangThongBao(root, capNhatChuong) {
  const ds = h('div', { class: 'card' });
  root.append(h('div', { class: 'toolbar' }, h('div', { class: 'sp' }), h('button', { class: 'btn', onclick: async () => { await chay(() => api('PUT', '/thong-bao/da-doc-tat-ca')); tai(); capNhatChuong(); } }, 'Đánh dấu tất cả đã đọc')), ds);
  async function tai() {
    const r = await chay(() => api('GET', '/thong-bao')); if (!r) return;
    bo(ds).append(...(r.length ? r.map((t) => h('div', { class: `noti ${t.daDoc ? 'rd' : 'un'}` }, h('i', {}), h('div', { class: 'info' }, t.noiDung, h('div', { class: 'small muted', style: 'font-weight:400' }, `${ngayVN(t.ngayTao)} ${t.ngayTao.slice(11, 16)}`)),
      !t.daDoc ? h('button', { class: 'btn sm', onclick: async () => { await chay(() => api('PUT', `/thong-bao/${t.maThongBao}/da-doc`)); tai(); capNhatChuong(); } }, 'Đã đọc') : null,
      h('button', { class: 'btn sm danger', 'aria-label': 'Xóa thông báo', onclick: async () => { await chay(() => api('DELETE', `/thong-bao/${t.maThongBao}`)); tai(); capNhatChuong(); } }, 'Xóa'))) : [h('div', { class: 'empty' }, 'Không có thông báo')]));
  }
  await tai();
}

export async function trangCaiDat(root) {
  const c = await api('GET', '/thong-bao/cai-dat');
  const cb = (nhan, giaTri) => { const i = h('input', { type: 'checkbox', checked: giaTri, style: 'width:auto' }); return [i, h('label', { class: 'row', style: 'border:0;padding:8px 0;cursor:pointer' }, i, nhan)]; };
  const [i1, l1] = cb('Nhắc ghi chép thu chi hằng ngày', c.nhacHangNgay); const [i2, l2] = cb('Cảnh báo khi ngân sách sắp hoặc đã vượt', c.nhacNganSach); const [i3, l3] = cb('Nhắc nạp tiền khi mục tiêu chậm tiến độ', c.nhacMucTieu);
  const gio = h('input', { type: 'time', value: c.gioNhac, required: true, style: 'width:140px' });
  const dien = (d) => { i1.checked = d.nhacHangNgay; i2.checked = d.nhacNganSach; i3.checked = d.nhacMucTieu; gio.value = d.gioNhac; };
  root.append(h('div', { class: 'card', style: 'max-width:560px' }, h('h2', {}, 'Cài đặt nhắc nhở'), h('form', { class: 'form', onsubmit: async (e) => {
    e.preventDefault();
    const r = await chay(() => api('PUT', '/thong-bao/cai-dat', { nhacHangNgay: i1.checked, gioNhac: gio.value, nhacNganSach: i2.checked, nhacMucTieu: i3.checked }));
    if (r) thongBao('Đã lưu cài đặt');
  } }, l1, truong('Giờ nhắc hằng ngày', gio), l2, l3,
    h('div', { class: 'actions', style: 'justify-content:flex-start' }, h('button', { class: 'btn primary' }, 'Lưu cài đặt'),
      h('button', { type: 'button', class: 'btn', onclick: async () => { const d = await chay(() => api('POST', '/thong-bao/cai-dat/khoi-phuc')); if (d) { dien(d); thongBao('Đã khôi phục cài đặt mặc định'); } } }, 'Khôi phục mặc định')))));
}

// ================= Tài khoản (UC 3.2) =================
export async function trangTaiKhoan(root) {
  const t = await api('GET', '/tai-khoan/toi');
  const ten = h('input', { value: t.hoTen, required: true }); const cu = h('input', { type: 'password', required: true, autocomplete: 'current-password' });
  const moi = h('input', { type: 'password', required: true, minlength: 6, autocomplete: 'new-password' });
  root.append(h('div', { class: 'grid g2' },
    h('div', { class: 'card' }, h('h2', {}, 'Thông tin cá nhân'), h('form', { class: 'form', onsubmit: async (e) => {
      e.preventDefault();
      if (await chay(() => api('PUT', '/tai-khoan/toi', { hoTen: ten.value })) !== undefined) { try { localStorage.setItem('hoTen', ten.value.trim()); } catch { /* bỏ qua */ } thongBao('Đã cập nhật thông tin'); document.dispatchEvent(new Event('doi-ten')); }
    } }, truong('Email', h('input', { value: t.email, disabled: true })), truong('Họ tên', ten), truong('Vai trò', h('input', { value: t.vaiTro === 'QuanTriVien' ? 'Quản trị viên' : 'Người dùng', disabled: true })), h('div', { class: 'actions', style: 'justify-content:flex-start' }, h('button', { class: 'btn primary' }, 'Lưu thay đổi')))),
    h('div', { class: 'card' }, h('h2', {}, 'Đổi mật khẩu'), h('form', { class: 'form', onsubmit: async (e) => {
      e.preventDefault();
      if (await chay(() => api('PUT', '/tai-khoan/mat-khau', { matKhauCu: cu.value, matKhauMoi: moi.value })) !== undefined) { cu.value = ''; moi.value = ''; thongBao('Đã đổi mật khẩu'); }
    } }, truong('Mật khẩu hiện tại', cu), truong('Mật khẩu mới (từ 6 ký tự)', moi), h('div', { class: 'actions', style: 'justify-content:flex-start' }, h('button', { class: 'btn primary' }, 'Đổi mật khẩu'))))));
}

// ================= Quản trị và các vai trò nội bộ (UC 3.10) =================
export async function trangQuanTri(root) {
  let tab = 'nd'; const tabs = h('div', { class: 'tabs' }); const vung = h('div');
  root.append(tabs, vung);
  const ve = () => { bo(tabs).append(...[['nd', 'Người dùng'], ['dm', 'Danh mục mặc định'], ['tk', 'Thống kê & tổng kết']].map(([k, t]) => h('button', { class: tab === k ? 'on' : '', onclick: () => { tab = k; ve(); } }, t))); bo(vung); ({ nd: (v) => tabNguoiDung(v, { khoa: true }), dm: tabDmMacDinh, tk: (v) => tabThongKe(v, { chay: true }) })[tab](vung); };
  ve();
}

/** Nhân viên hỗ trợ: xem/tìm người dùng, gửi thông báo hỗ trợ (không khóa được). */
export async function trangHoTro(root) { await tabNguoiDung(root, { guiTb: true }); }

/** Kiểm toán viên: chỉ đọc thống kê và danh sách người dùng. */
export async function trangKiemToan(root) {
  const a = h('div'); const b = h('div', { style: 'margin-top:18px' }, h('h2', {}, 'Danh sách người dùng'));
  root.append(a, b);
  await tabThongKe(a, { chay: false });
  await tabNguoiDung(b, {});
}

async function tabNguoiDung(vung, { khoa: coKhoa = false, guiTb = false } = {}) {
  let q = ''; const bang = h('div', { class: 'card' });
  vung.append(h('div', { class: 'toolbar' }, truong('Tìm người dùng', h('input', { type: 'search', placeholder: 'Tên hoặc email…', oninput: (e) => { clearTimeout(vung.t); vung.t = setTimeout(() => { q = e.target.value; tai(); }, 250); } }))), bang);
  async function tai() {
    const r = await chay(() => api('GET', `/admin/nguoi-dung?${qs({ q })}`)); if (!r) return;
    const hanhDong = (u) => (coKhoa
      ? (u.trangThai === 'BiKhoa' ? h('button', { class: 'btn sm', onclick: async () => { if (await chay(() => api('PUT', `/admin/nguoi-dung/${u.maTaiKhoan}/mo-khoa`)) !== undefined) { thongBao('Đã mở khóa tài khoản'); tai(); } } }, 'Mở khóa')
        : h('button', { class: 'btn sm danger', onclick: () => khoa(u) }, 'Khóa'))
      : guiTb ? h('button', { class: 'btn sm', onclick: () => guiThongBao(u) }, 'Gửi thông báo') : null);
    bo(bang).append(r.length ? h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Họ tên'), h('th', {}, 'Email'), h('th', { class: 'r' }, 'Giao dịch'), h('th', {}, 'Ngày tạo'), h('th', {}, 'Trạng thái'), h('th', {}, ''))),
      h('tbody', {}, r.map((u) => h('tr', {}, h('td', {}, u.hoTen), h('td', {}, u.email), h('td', { class: 'r' }, u.soGiaoDich), h('td', {}, ngayVN(u.ngayTao)),
        h('td', {}, u.trangThai === 'BiKhoa' ? h('span', { class: 'pill bad', title: u.lyDoKhoa ?? '' }, 'Bị khóa') : h('span', { class: 'pill ok' }, 'Hoạt động')),
        h('td', { class: 'right' }, hanhDong(u)))))) : h('div', { class: 'empty' }, 'Không tìm thấy người dùng'));
  }
  function khoa(u) {
    const ly = h('input', { required: true, placeholder: 'VD: Vi phạm điều khoản sử dụng' });
    const dlg = hopThoai(`Khóa tài khoản ${u.email}`, h('form', { class: 'form', onsubmit: async (e) => {
      e.preventDefault();
      if (await chay(() => api('PUT', `/admin/nguoi-dung/${u.maTaiKhoan}/khoa`, { lyDo: ly.value }), dlg) !== undefined) { dlg.dong(); thongBao('Đã khóa tài khoản'); tai(); }
    } }, truong('Lý do khóa (người dùng sẽ nhận được thông báo)', ly), h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn', onclick: () => dlg.dong() }, 'Hủy'), h('button', { class: 'btn primary' }, 'Xác nhận khóa'))));
  }
  function guiThongBao(u) {
    const nd = h('textarea', { required: true, rows: 4, maxlength: 300, placeholder: 'Nội dung hỗ trợ gửi tới người dùng (tối đa 300 ký tự)' });
    const dlg = hopThoai(`Gửi thông báo hỗ trợ cho ${u.hoTen}`, h('form', { class: 'form', onsubmit: async (e) => {
      e.preventDefault();
      if (await chay(() => api('POST', `/admin/nguoi-dung/${u.maTaiKhoan}/thong-bao`, { noiDung: nd.value }), dlg) !== undefined) { dlg.dong(); thongBao('Đã gửi thông báo hỗ trợ'); }
    } }, truong('Nội dung', nd), h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn', onclick: () => dlg.dong() }, 'Hủy'), h('button', { class: 'btn primary' }, 'Gửi'))));
  }
  await tai();
}

async function tabDmMacDinh(vung) {
  const ds = h('div', { class: 'card' });
  vung.append(h('div', { class: 'toolbar' }, h('div', { class: 'sp' }), h('button', { class: 'btn primary', onclick: () => bieuMau(null) }, '+ Thêm danh mục mặc định')), ds);
  async function tai() {
    const r = await chay(() => api('GET', '/admin/danh-muc-mac-dinh')); if (!r) return;
    bo(ds).append(...r.map((d) => h('div', { class: 'row' }, h('div', { class: 'dot', style: `background:${d.mauSac}` }, (d.tenDanhMuc[0] ?? '?').toUpperCase()),
      h('div', { class: 'info' }, h('b', {}, d.tenDanhMuc), h('span', { class: 'small muted' }, `${d.loai}${d.laHeThong ? ' · hệ thống' : ''}`)),
      d.laHeThong ? h('span', { class: 'pill' }, 'Hệ thống') : h('div', {}, h('button', { class: 'btn sm', onclick: () => bieuMau(d) }, 'Sửa'), ' ',
        h('button', { class: 'btn sm danger', onclick: async () => { if (await xacNhan(`Xóa danh mục mặc định "${d.tenDanhMuc}"?`) && await chay(() => api('DELETE', `/admin/danh-muc-mac-dinh/${d.maDanhMuc}`)) !== undefined) { thongBao('Đã xóa'); tai(); } } }, 'Xóa')))));
  }
  function bieuMau(d) {
    const ten = h('input', { value: d?.tenDanhMuc ?? '', required: true }); const loai = chon([['Chi', 'Chi'], ['Thu', 'Thu']], d?.loai ?? 'Chi', { disabled: !!d }); const mau = h('input', { type: 'color', value: d?.mauSac ?? '#0f766e' });
    const dlg = hopThoai(d ? 'Sửa danh mục mặc định' : 'Thêm danh mục mặc định', h('form', { class: 'form', onsubmit: async (e) => {
      e.preventDefault();
      const body = { tenDanhMuc: ten.value, loai: loai.value, mauSac: mau.value };
      if (await chay(() => (d ? api('PUT', `/admin/danh-muc-mac-dinh/${d.maDanhMuc}`, body) : api('POST', '/admin/danh-muc-mac-dinh', body)), dlg)) { dlg.dong(); thongBao('Đã lưu'); tai(); }
    } }, truong('Tên', ten), truong('Loại', loai), truong('Màu', mau), h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn', onclick: () => dlg.dong() }, 'Hủy'), h('button', { class: 'btn primary' }, 'Lưu'))));
  }
  await tai();
}

async function tabThongKe(vung, { chay: choChay = true } = {}) {
  const t = await chay(() => api('GET', '/admin/thong-ke')); if (!t) return;
  const the = (n, v) => h('div', { class: 'card stat' }, h('div', { class: 'label' }, n), h('div', { class: 'val' }, so(v)));
  const o = h('input', { type: 'month', value: thangNay() });
  vung.append(h('div', { class: 'grid g4' }, the('Người dùng', t.soNguoiDung), the('Đang hoạt động', t.soDangHoatDong), the('Bị khóa', t.soBiKhoa), the('Giao dịch tháng này', t.soGiaoDichThangNay)),
    !choChay ? h('span') : h('div', { class: 'card', style: 'margin-top:16px;max-width:560px' }, h('h2', {}, 'Chạy tổng kết tháng thủ công'),
      h('p', { class: 'muted small' }, 'Dùng để demo mà không phải chờ đến cuối tháng. Chạy lại nhiều lần không tạo báo cáo hoặc thông báo trùng.'),
      h('div', { class: 'toolbar', style: 'margin:0' }, truong('Tháng', o), h('button', { class: 'btn primary', onclick: async () => {
        const [m, n] = tachThang(o.value); const r = await chay(() => api('POST', `/admin/chay-tong-ket?${qs({ thang: m, nam: n })}`));
        if (r) thongBao(`Đã tổng kết cho ${r.soNguoiDaXuLy} người dùng`);
      } }, 'Chạy tổng kết'))));
}
