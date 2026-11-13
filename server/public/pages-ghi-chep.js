import { api, PHIEN, qs, h, bo, vnd, ngayVN, gioVN, homNay, thangNay, tachThang, thongBao, hopThoai, xacNhan, truong, chon, chay, bieuDoTron, chuThich, thanhTienDo, chuCai, so, bieuDoCot } from './core.js';

// ================= Tổng quan =================
export async function trangTongQuan(root) {
  let thang = thangNay();
  const vung = h('div');
  const o = h('input', { type: 'month', value: thang, 'aria-label': 'Chọn tháng', onchange: (e) => { thang = e.target.value || thangNay(); tai(); } });
  root.append(h('div', { class: 'toolbar' }, truong('Tháng', o)), vung);
  const thangTruoc = (v) => { const [t, n] = tachThang(v); return t === 1 ? `${n - 1}-12` : `${n}-${String(t - 1).padStart(2, '0')}`; };
  /** Mũi tên so với tháng trước; tốt = true nghĩa là tăng là điều tốt (thu), false nghĩa là giảm mới tốt (chi). */
  const soVoiTruoc = (hienTai, truoc, tangLaTot) => {
    if (!truoc) return h('div', { class: 'delta muted' }, 'Tháng trước chưa có dữ liệu');
    const pc = Math.round(((hienTai - truoc) / truoc) * 100);
    if (pc === 0) return h('div', { class: 'delta muted' }, '= so với tháng trước');
    const tot = (pc > 0) === tangLaTot;
    return h('div', { class: `delta ${tot ? 'thu' : 'chi'}` }, `${pc > 0 ? '▲' : '▼'} ${Math.abs(pc)}% so với tháng trước`);
  };
  async function tai() {
    const [t, n] = tachThang(thang); const [tt, nt] = tachThang(thangTruoc(thang));
    const [d, truoc, dsVi, dsMt, tg] = await Promise.all([
      chay(() => api('GET', `/bao-cao/tong-quan?${qs({ thang: t, nam: n })}`)),
      chay(() => api('GET', `/bao-cao/tong-quan?${qs({ thang: tt, nam: nt })}`)),
      chay(() => api('GET', '/vi')), chay(() => api('GET', '/muc-tieu')), chay(() => api('GET', `/bao-cao/theo-thoi-gian?nam=${n}`))]);
    if (!d) return;
    const tongViDuong = Math.max(1, ...(dsVi ?? []).map((v) => Math.abs(v.soDu)));
    const tyLeTietKiem = d.tongThu > 0 ? Math.round((d.chenhLech / d.tongThu) * 100) : null;
    const the = (nhan, v, cls = '', phu = null) => h('div', { class: 'card stat' }, h('div', { class: 'label' }, nhan), h('div', { class: `val ${cls}` }, vnd(v)), phu);
    const dsMucTieu = (dsMt ?? []).filter((m) => !m.daHoanThanh).slice(0, 3);
    // Nhận xét nhanh (tính ở trình duyệt từ dữ liệu đã có, không thêm API)
    const nhanXet = [];
    const [ht, hn] = tachThang(thangNay());
    if (t === ht && n === hn) {
      const ngayDaQua = Number(homNay().slice(8, 10)); const soNgay = new Date(n, t, 0).getDate();
      if (d.tongChi > 0 && ngayDaQua >= 3) { const duBao = Math.round((d.tongChi / ngayDaQua) * soNgay); nhanXet.push(['i', `Dự báo chi cả tháng khoảng ${vnd(duBao)} nếu giữ nhịp chi hiện tại (${vnd(Math.round(d.tongChi / ngayDaQua))}/ngày).`]); }
    }
    if (d.tongThu > 0 && d.tongChi > d.tongThu) nhanXet.push(['!', 'Tháng này bạn chi nhiều hơn thu. Hãy xem lại các khoản chi lớn.', 'bad']);
    else if (tyLeTietKiem !== null && tyLeTietKiem >= 20) nhanXet.push(['✓', `Bạn đang giữ lại ${tyLeTietKiem}% thu nhập, mức tiết kiệm tốt.`, 'ok']);
    if (d.chiTheoDanhMuc.length) { const top = [...d.chiTheoDanhMuc].sort((a, b) => b.soTien - a.soTien)[0]; nhanXet.push(['i', `Danh mục chi nhiều nhất: ${top.tenDanhMuc} (${vnd(top.soTien)}).`]); }
    const vuot = d.sapVuot.filter((x) => x.tienDo > 100).length;
    if (vuot) nhanXet.push(['!', `${vuot} ngân sách đã vượt hạn mức.`, 'bad']); else if (d.sapVuot.length) nhanXet.push(['!', `${d.sapVuot.length} ngân sách sắp chạm hạn mức.`, 'warn']);
    const chamTd = dsMucTieu.filter((m) => m.chamTienDo).length;
    if (chamTd) nhanXet.push(['!', `${chamTd} mục tiêu tiết kiệm đang chậm tiến độ.`, 'warn']);
    const gio = Number(new Date(Date.now() + 7 * 3600e3).toISOString().slice(11, 13));
    bo(vung).append(
      h('div', { class: 'greet' }, h('h2', {}, `${gio < 11 ? 'Chào buổi sáng' : gio < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'}, ${PHIEN.hoTen}`), h('p', { class: 'muted small' }, `Tình hình thu chi tháng ${String(t).padStart(2, '0')}/${n}`)),
      h('div', { class: 'quick' },
        h('a', { class: 'btn primary', href: '#/giao-dich' }, '+ Thêm giao dịch'), h('a', { class: 'btn', href: '#/vi' }, 'Chuyển tiền giữa ví'),
        h('a', { class: 'btn', href: '#/ngan-sach' }, 'Ngân sách'), h('a', { class: 'btn', href: '#/muc-tieu' }, 'Mục tiêu tiết kiệm'), h('a', { class: 'btn', href: '#/dinh-ky' }, 'Giao dịch định kỳ')),
      h('div', { class: 'grid g4' },
        the('Thu tháng này', d.tongThu, 'thu', truoc ? soVoiTruoc(d.tongThu, truoc.tongThu, true) : null),
        the('Chi tháng này', d.tongChi, 'chi', truoc ? soVoiTruoc(d.tongChi, truoc.tongChi, false) : null),
        the('Chênh lệch', d.chenhLech, d.chenhLech < 0 ? 'bad' : '', h('div', { class: 'delta muted' }, tyLeTietKiem === null ? 'Chưa có khoản thu trong tháng' : `Còn lại ${tyLeTietKiem}% thu nhập`)),
        the('Tổng số dư các ví', d.tongSoDu, '', h('div', { class: 'delta muted' }, `${(dsVi ?? []).length} ví`))),
      h('div', { class: 'grid g2', style: 'margin-top:16px' },
        h('div', { class: 'card' }, h('h2', {}, 'Chi theo danh mục'),
          d.chiTheoDanhMuc.length ? h('div', { class: 'donut' }, bieuDoTron(d.chiTheoDanhMuc), chuThich(d.chiTheoDanhMuc)) : h('div', { class: 'empty' }, 'Chưa có khoản chi nào trong tháng này')),
        h('div', { class: 'card' }, h('h2', {}, 'Số dư theo ví'),
          (dsVi ?? []).length ? dsVi.map((v) => h('div', { style: 'margin-bottom:14px' },
            h('div', { class: 'row', style: 'padding:0 0 6px;border:0' }, h('b', { class: 'info' }, v.tenVi), h('b', {}, vnd(v.soDu))),
            h('div', { class: 'bar' }, h('i', { style: `width:${Math.max(2, (Math.abs(v.soDu) / tongViDuong) * 100)}%;background:var(--primary)` })))) : h('div', { class: 'empty' }, 'Chưa có ví'))),
      h('div', { class: 'grid g2', style: 'margin-top:16px' },
        h('div', { class: 'card' }, h('h2', {}, 'Ngân sách sắp hoặc đã vượt'),
          d.sapVuot.length ? d.sapVuot.map((x) => h('div', { style: 'margin-bottom:14px' },
            h('div', { class: 'row', style: 'padding:0 0 6px;border:0' }, h('b', { class: 'info' }, x.tenDanhMuc),
              h('span', { class: `pill ${x.tienDo > 100 ? 'bad' : 'warn'}` }, `${x.tienDo}%`)),
            thanhTienDo(x.tienDo, x.nguongCanhBao), h('div', { class: 'small muted', style: 'margin-top:4px' }, `${vnd(x.soDaChi)} / ${vnd(x.hanMuc)}`)))
            : h('div', { class: 'empty' }, 'Không có ngân sách nào gần chạm hạn mức')),
        h('div', { class: 'card' }, h('h2', {}, 'Mục tiêu tiết kiệm'),
          dsMucTieu.length ? dsMucTieu.map((m) => h('div', { style: 'margin-bottom:14px' },
            h('div', { class: 'row', style: 'padding:0 0 6px;border:0' }, h('b', { class: 'info' }, m.tenMucTieu), h('span', { class: `pill ${m.chamTienDo ? 'warn' : ''}` }, m.chamTienDo ? 'Chậm tiến độ' : `${m.tienDo}%`)),
            h('div', { class: 'bar' }, h('i', { style: `width:${Math.min(100, m.tienDo)}%;background:${m.chamTienDo ? 'var(--warn)' : 'var(--ok)'}` })),
            h('div', { class: 'small muted', style: 'margin-top:4px' }, `${vnd(m.soTienHienTai)} / ${vnd(m.soTienMucTieu)} · hạn ${ngayVN(m.hanChot)}`)))
            : h('div', { class: 'empty' }, 'Chưa có mục tiêu đang thực hiện'))),
      nhanXet.length ? h('div', { class: 'card', style: 'margin-top:16px' }, h('h2', {}, 'Nhận xét nhanh'), h('div', { class: 'tips' }, nhanXet.map(([k, tx, c = '']) => h('div', { class: `tip ${c}` }, h('b', {}, k), h('span', {}, tx))))) : null,
      tg ? h('div', { class: 'card', style: 'margin-top:16px' }, h('h2', {}, `Thu chi theo tháng năm ${n}`), bieuDoCot(tg, n)) : null,
      h('div', { class: 'card', style: 'margin-top:16px' }, h('h2', {}, '5 giao dịch gần nhất'),
        d.ganDay.length ? d.ganDay.map((g) => dongGiaoDich(g)) : h('div', { class: 'empty' }, 'Chưa có giao dịch')));
  }
  await tai();
}

function dongGiaoDich(g, thaoTac) {
  return h('div', { class: 'row' },
    h('div', { class: 'dot', style: `background:${g.mauSac}`, 'aria-hidden': 'true' }, chuCai(g.tenDanhMuc)),
    h('div', { class: 'info' }, h('b', {}, g.ghiChu || g.tenDanhMuc), h('span', { class: 'small muted' }, `${g.tenDanhMuc} · ${g.tenVi} · ${ngayVN(g.ngayGiaoDich)} ${gioVN(g.ngayGiaoDich)}`,
      g.coHoaDon ? h('span', { class: 'pill', style: 'margin-left:6px' }, 'Có hóa đơn') : null)),
    h('div', { class: `amt ${g.loai === 'Thu' ? 'thu' : 'chi'}` }, `${g.loai === 'Thu' ? '+' : '−'}${vnd(g.soTien)}`), thaoTac);
}

// ================= Giao dịch =================
export async function trangGiaoDich(root) {
  const [dsVi, dsDm] = await Promise.all([api('GET', '/vi'), api('GET', '/danh-muc')]);
  const loc = { tu: '', den: '', loai: '', viId: '', danhMucId: '', q: '', trang: 1 };
  const ketQua = h('div', { class: 'card' });
  const bar = h('div', { class: 'toolbar' },
    truong('Từ ngày', h('input', { type: 'date', onchange: (e) => { loc.tu = e.target.value; loc.trang = 1; tai(); } })),
    truong('Đến ngày', h('input', { type: 'date', onchange: (e) => { loc.den = e.target.value; loc.trang = 1; tai(); } })),
    truong('Loại', chon([['', 'Tất cả'], ['Thu', 'Thu'], ['Chi', 'Chi']], '', { onchange: (e) => { loc.loai = e.target.value; loc.trang = 1; tai(); } })),
    truong('Ví', chon([['', 'Tất cả'], ...dsVi.map((v) => [v.maVi, v.tenVi])], '', { onchange: (e) => { loc.viId = e.target.value; loc.trang = 1; tai(); } })),
    truong('Danh mục', chon([['', 'Tất cả'], ...dsDm.map((d) => [d.maDanhMuc, `${d.tenDanhMuc} (${d.loai})`])], '', { onchange: (e) => { loc.danhMucId = e.target.value; loc.trang = 1; tai(); } })),
    truong('Tìm ghi chú', h('input', { type: 'search', placeholder: 'Nhập từ khóa…', oninput: (e) => { clearTimeout(bar.t); bar.t = setTimeout(() => { loc.q = e.target.value; loc.trang = 1; tai(); }, 300); } })),
    h('div', { class: 'sp' }),
    h('button', { class: 'btn', onclick: () => quetHoaDon(dsVi, dsDm, tai) }, 'Quét hóa đơn'),
    h('button', { class: 'btn primary', onclick: () => bieuMauGiaoDich(null, dsVi, dsDm, tai) }, '+ Thêm giao dịch'));
  if (location.hash.includes('them=1')) { history.replaceState(null, '', '#/giao-dich'); setTimeout(() => bieuMauGiaoDich(null, dsVi, dsDm, () => location.reload()), 0); }
  root.append(bar, ketQua);

  async function tai() {
    const r = await chay(() => api('GET', `/giao-dich?${qs(loc)}`));
    if (!r) return;
    bo(ketQua);
    if (!r.muc.length) { ketQua.append(h('div', { class: 'empty' }, 'Không có giao dịch nào phù hợp')); return; }
    let ngayTruoc = '';
    for (const g of r.muc) {
      const ngay = g.ngayGiaoDich.slice(0, 10);
      if (ngay !== ngayTruoc) { ngayTruoc = ngay; ketQua.append(h('div', { class: 'day' }, ngayVN(ngay))); }
      ketQua.append(dongGiaoDich(g, h('div', { class: 'nowrap' },
        g.coHoaDon ? h('button', { class: 'btn ghost sm', onclick: () => xemHoaDon(g), 'aria-label': 'Xem hóa đơn' }, 'Hóa đơn') : null,
        h('button', { class: 'btn ghost sm', onclick: () => bieuMauGiaoDich(g, dsVi, dsDm, tai), 'aria-label': 'Sửa giao dịch' }, 'Sửa'),
        h('button', { class: 'btn ghost sm danger', onclick: async () => { if (await xacNhan('Xóa giao dịch này? Số dư ví sẽ được hoàn tác.')) { if (await chay(() => api('DELETE', `/giao-dich/${g.maGiaoDich}`))  !== undefined) { thongBao('Đã xóa giao dịch'); tai(); } } }, 'aria-label': 'Xóa giao dịch' }, 'Xóa'))));
    }
    const tongTrang = Math.max(1, Math.ceil(r.tongSo / r.kichThuocTrang));
    ketQua.append(h('div', { class: 'pager' },
      h('button', { class: 'btn sm', disabled: loc.trang <= 1, onclick: () => { loc.trang--; tai(); } }, '‹ Trước'),
      h('span', { class: 'muted small' }, `Trang ${r.trang}/${tongTrang} · ${r.tongSo} giao dịch`),
      h('button', { class: 'btn sm', disabled: loc.trang >= tongTrang, onclick: () => { loc.trang++; tai(); } }, 'Sau ›')));
  }
  await tai();
}

async function xemHoaDon(g) {
  const hd = await chay(() => api('GET', `/giao-dich/${g.maGiaoDich}/hoa-don`));
  if (!hd?.maHoaDon) return;
  const dlg = hopThoai('Hóa đơn', h('div', {},
    h('p', {}, h('b', {}, hd.tenCuaHang || 'Cửa hàng'), ` · ${ngayVN(hd.ngayHoaDon)}`),
    h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Mặt hàng'), h('th', { class: 'r' }, 'SL'), h('th', { class: 'r' }, 'Đơn giá'), h('th', { class: 'r' }, 'Thành tiền'))),
      h('tbody', {}, hd.chiTiet.map((c) => h('tr', {}, h('td', {}, c.tenMatHang), h('td', { class: 'r' }, c.soLuong), h('td', { class: 'r' }, so(c.donGia)), h('td', { class: 'r' }, so(c.soLuong * c.donGia)))))),
    h('p', { class: 'right' }, h('b', {}, `Tổng: ${vnd(hd.tongTien)}`)),
    hd.anhHoaDon ? h('img', { src: hd.anhHoaDon, alt: 'Ảnh hóa đơn', style: 'max-width:100%;max-height:300px;border-radius:10px' }) : null,
    h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => dlg.dong() }, 'Đóng'))));
}

function inputNgay(giaTri) { return h('input', { type: 'datetime-local', value: giaTri, required: true }); }

// Hộp thoại thêm / sửa giao dịch (UC 3.5)
function bieuMauGiaoDich(g, dsVi, dsDm, sauKhiLuu) {
  let loai = g?.loai ?? 'Chi';
  const tien = h('input', { type: 'number', min: 1, required: true, value: g?.soTien ?? '', placeholder: 'VD: 50000', 'aria-label': 'Số tiền' });
  const vi = chon(dsVi.map((v) => [v.maVi, `${v.tenVi} (${vnd(v.soDu)})`]), g?.maVi ?? dsVi[0]?.maVi);
  const dmSel = h('select');
  const ngay = inputNgay((g?.ngayGiaoDich ?? `${homNay()}T${new Date(Date.now() + 7 * 3600e3).toISOString().slice(11, 16)}`).slice(0, 16));
  const ghi = h('input', { type: 'text', maxlength: 200, value: g?.ghiChu ?? '', placeholder: 'VD: Cơm trưa với đồng nghiệp' });
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Loại giao dịch' });
  const veDm = () => { bo(dmSel).append(...dsDm.filter((d) => d.loai === loai && !(d.laHeThong)).map((d) => h('option', { value: d.maDanhMuc, selected: d.maDanhMuc === g?.maDanhMuc }, d.tenDanhMuc))); };
  const veSeg = () => { bo(seg).append(...['Chi', 'Thu'].map((l) => h('button', { type: 'button', class: loai === l ? 'on' : '', onclick: () => { loai = l; veSeg(); veDm(); } }, l))); };
  veSeg(); veDm();
  const dlg = hopThoai(g ? 'Sửa giao dịch' : 'Thêm giao dịch', h('form', { class: 'form', onsubmit: async (e) => {
    e.preventDefault(); dlg.loi('');
    const body = { maVi: +vi.value, maDanhMuc: +dmSel.value, soTien: Number(tien.value), loai, ngayGiaoDich: ngay.value, ghiChu: ghi.value || null };
    const r = await chay(() => (g ? api('PUT', `/giao-dich/${g.maGiaoDich}`, body) : api('POST', '/giao-dich', body)), dlg);
    if (r) { dlg.dong(); thongBao(g ? 'Đã cập nhật giao dịch' : 'Đã thêm giao dịch'); sauKhiLuu(); }
  } }, seg, h('div', { class: 'two' }, truong('Số tiền (₫)', tien), truong('Ngày giờ', ngay)),
    h('div', { class: 'two' }, truong('Danh mục', dmSel), truong('Ví', vi)), truong('Ghi chú', ghi),
    h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn', onclick: () => dlg.dong() }, 'Hủy'), h('button', { class: 'btn primary' }, 'Lưu'))));
}

// ================= Quét hóa đơn (UC 3.6) =================
function quetHoaDon(dsVi, dsDm, sauKhiLuu) {
  const khung = h('div');
  const dlg = hopThoai('Quét hóa đơn', khung, { rong: true });
  // Đưa ảnh thẳng lên trang web: chọn tệp, kéo thả, hoặc dán ảnh từ clipboard (Ctrl+V); xem trước rồi bấm Quét.
  const chonAnh = h('input', { type: 'file', accept: 'image/png,image/jpeg', hidden: true, onchange: (e) => e.target.files[0] && xemTruoc(e.target.files[0]) });
  const vung = h('div', { class: 'drop', tabindex: 0, role: 'button', onclick: () => chonAnh.click(), onkeydown: (e) => { if (e.key === 'Enter') chonAnh.click(); },
    ondragover: (e) => { e.preventDefault(); vung.classList.add('over'); }, ondragleave: () => vung.classList.remove('over'),
    ondrop: (e) => { e.preventDefault(); vung.classList.remove('over'); e.dataTransfer.files[0] && xemTruoc(e.dataTransfer.files[0]); } },
    h('p', {}, h('b', {}, 'Tải ảnh hóa đơn lên: chọn tệp, kéo thả hoặc dán (Ctrl+V)')), h('p', { class: 'small' }, 'Chỉ nhận ảnh JPG/PNG, tối đa 5 MB'));
  const veChon = () => bo(khung).append(vung, chonAnh, h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => dlg.dong() }, 'Đóng')));
  const dan = (e) => { const f = [...(e.clipboardData?.files ?? [])].find((x) => x.type.startsWith('image/')); if (f) { e.preventDefault(); xemTruoc(f); } };
  document.addEventListener('paste', dan);
  const dongGoc = dlg.dong; dlg.dong = () => { document.removeEventListener('paste', dan); dongGoc(); };
  veChon();

  /** Kiểm tra nhanh ngay trên trình duyệt (máy chủ vẫn kiểm tra lại), rồi hiện ảnh xem trước cùng nút Quét. */
  function xemTruoc(file) {
    dlg.loi('');
    if (!['image/jpeg', 'image/png'].includes(file.type)) { dlg.loi('Chỉ nhận ảnh JPG hoặc PNG'); return; }
    if (file.size > 5 * 1024 * 1024) { dlg.loi('Ảnh vượt quá 5 MB'); return; }
    const url = URL.createObjectURL(file);
    bo(khung).append(h('div', { class: 'scan' }, h('img', { src: url, alt: 'Ảnh hóa đơn đã chọn' }),
      h('div', { class: 'form' }, h('p', {}, h('b', {}, file.name || 'Ảnh dán từ clipboard')), h('p', { class: 'muted small' }, `${Math.round(file.size / 1024)} KB · hãy kiểm tra ảnh rõ nét, đủ các dòng mặt hàng rồi bấm Quét hóa đơn.`))),
      h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: veChon }, 'Chọn ảnh khác'), h('button', { class: 'btn primary', onclick: () => xuLy(file, url) }, 'Quét hóa đơn')));
  }

  async function xuLy(file, preview) {
    bo(khung).append(h('p', { class: 'muted' }, 'Đang nhận dạng hóa đơn…'));
    const form = new FormData(); form.append('anh', file);
    let nhap = null; let thongDiep = '';
    try { nhap = await api('POST', '/hoa-don/quet', form); } catch (e) { thongDiep = e.message; }
    // Nhận dạng lỗi -> chuyển sang nhập tay (extend "Nhập tay khi nhận dạng lỗi"); ảnh vẫn được giữ.
    if (!nhap && !/nhận dạng/i.test(thongDiep)) { veChon(); dlg.loi(thongDiep); return; }
    veBanNhap(nhap ?? { anhUrl: '', tenCuaHang: '', ngay: homNay(), tongTien: 0, matHang: [{ ten: '', soLuong: 1, donGia: 0 }] }, preview, !nhap);
  }

  function veBanNhap(b, preview, nhapTay) {
    const cuaHang = h('input', { value: b.tenCuaHang ?? '', placeholder: 'Tên cửa hàng' });
    const ngay = h('input', { type: 'date', value: b.ngay ?? homNay() });
    const dmChi = dsDm.filter((d) => d.loai === 'Chi' && !d.laHeThong);
    const dmSel = chon(dmChi.map((d) => [d.maDanhMuc, d.tenDanhMuc]), dmChi[0]?.maDanhMuc);
    const viSel = chon(dsVi.map((v) => [v.maVi, `${v.tenVi} (${vnd(v.soDu)})`]), dsVi[0]?.maVi);
    const tong = h('b', {});
    const tbody = h('tbody');
    const dong = (m) => {
      const ten = h('input', { value: m.ten, placeholder: 'Tên mặt hàng', oninput: cap }); const sl = h('input', { type: 'number', min: 1, value: m.soLuong, oninput: cap, style: 'width:70px' });
      const gia = h('input', { type: 'number', min: 0, value: m.donGia, oninput: cap, style: 'width:110px' });
      const tr = h('tr', {}, h('td', {}, ten), h('td', {}, sl), h('td', {}, gia), h('td', { class: 'r' }, ''),
        h('td', {}, h('button', { type: 'button', class: 'btn ghost sm danger', 'aria-label': 'Xóa dòng', onclick: () => { tr.remove(); cap(); } }, '✕')));
      tr.lay = () => ({ tenMatHang: ten.value, soLuong: +sl.value || 1, donGia: +gia.value || 0 });
      return tr;
    };
    function cap() {
      let t = 0;
      for (const tr of tbody.children) { const c = tr.lay(); t += c.soLuong * c.donGia; tr.children[3].textContent = so(c.soLuong * c.donGia); }
      tong.textContent = vnd(t); tong.dataset.v = t;
    }
    (b.matHang.length ? b.matHang : [{ ten: '', soLuong: 1, donGia: 0 }]).forEach((m) => tbody.append(dong(m)));
    bo(khung).append(
      nhapTay ? h('p', { class: 'err' }, 'Không nhận dạng được hóa đơn. Ảnh vẫn được giữ, bạn hãy nhập tay thông tin bên dưới.') : h('p', { class: 'muted small' }, 'Hãy kiểm tra và chỉnh sửa thông tin được nhận dạng rồi bấm Lưu.'),
      h('div', { class: 'scan' }, h('img', { src: preview, alt: 'Ảnh hóa đơn đã chọn' }),
        h('div', { class: 'form' }, h('div', { class: 'two' }, truong('Cửa hàng', cuaHang), truong('Ngày', ngay)),
          h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Mặt hàng'), h('th', {}, 'SL'), h('th', {}, 'Đơn giá'), h('th', { class: 'r' }, 'Thành tiền'), h('th', {}, ''))), tbody),
          h('button', { type: 'button', class: 'btn sm', onclick: () => { tbody.append(dong({ ten: '', soLuong: 1, donGia: 0 })); } }, '+ Thêm dòng'),
          h('div', { class: 'right' }, 'Tổng tiền: ', tong),
          h('div', { class: 'two' }, truong('Danh mục chi', dmSel), truong('Ví thanh toán', viSel)))),
      h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => dlg.dong() }, 'Hủy'),
        h('button', { class: 'btn primary', onclick: async () => {
          dlg.loi('');
          const chiTiet = [...tbody.children].map((tr) => tr.lay()).filter((c) => c.tenMatHang.trim());
          const soTien = Number(tong.dataset.v);
          const r = await chay(() => api('POST', '/giao-dich', { maVi: +viSel.value, maDanhMuc: +dmSel.value, soTien, loai: 'Chi', ngayGiaoDich: `${ngay.value}T12:00:00`,
            ghiChu: cuaHang.value ? `Hóa đơn ${cuaHang.value}` : 'Hóa đơn', hoaDon: { tenCuaHang: cuaHang.value || null, ngayHoaDon: ngay.value, anhHoaDon: b.anhUrl, chiTiet } }), dlg);
          if (r) { dlg.dong(); thongBao('Đã lưu giao dịch chi từ hóa đơn'); sauKhiLuu(); }
        } }, 'Lưu giao dịch')));
    cap();
  }
}

// ================= Ví =================
export async function trangVi(root) {
  const luoi = h('div', { class: 'grid g3' });
  const lichSu = h('div', { class: 'card', style: 'margin-top:16px' });
  let dsVi = [];
  root.append(h('div', { class: 'toolbar' }, h('div', { class: 'sp' }), h('button', { class: 'btn', onclick: () => chuyenTien() }, 'Chuyển tiền giữa ví'), h('button', { class: 'btn primary', onclick: () => bieuMau(null) }, '+ Thêm ví')), luoi, lichSu);
  const NHAN = { TienMat: 'Tiền mặt', NganHang: 'Ngân hàng', ViDienTu: 'Ví điện tử' };
  async function tai() {
    const ds = await chay(() => api('GET', '/vi')); if (!ds) return;
    dsVi = ds; taiLichSu();
    bo(luoi).append(...ds.map((v) => h('div', { class: 'card' }, h('div', { class: 'row', style: 'border:0;padding:0' }, h('div', { class: 'info' }, h('b', {}, v.tenVi), h('span', { class: 'pill' }, NHAN[v.loaiVi]))),
      h('div', { class: 'stat' }, h('div', { class: 'val' }, vnd(v.soDu))),
      h('div', { style: 'margin-top:12px;display:flex;gap:8px' }, h('button', { class: 'btn sm', onclick: () => bieuMau(v) }, 'Sửa'),
        h('button', { class: 'btn sm danger', onclick: async () => { if (await xacNhan(`Xóa ví "${v.tenVi}"?`) && await chay(() => api('DELETE', `/vi/${v.maVi}`)) !== undefined) { thongBao('Đã xóa ví'); tai(); } } }, 'Xóa')))));
  }
  async function taiLichSu() {
    const ls = await chay(() => api('GET', '/chuyen-tien')); if (!ls) return;
    bo(lichSu).append(h('h2', {}, 'Lịch sử chuyển tiền'), ls.length ? ls.map((c) => h('div', { class: 'row' }, h('div', { class: 'info' }, h('b', {}, `${c.tenViNguon} → ${c.tenViDich}`),
      h('span', { class: 'small muted' }, `${ngayVN(c.ngayChuyen)} ${gioVN(c.ngayChuyen)}${c.ghiChu ? ` · ${c.ghiChu}` : ''}`)), h('b', {}, vnd(c.soTien)))) : h('div', { class: 'empty' }, 'Chưa có lần chuyển tiền nào'));
  }
  function chuyenTien() {
    if (dsVi.length < 2) { thongBao('Cần ít nhất hai ví để chuyển tiền', true); return; }
    const nguon = chon(dsVi.map((v) => [v.maVi, `${v.tenVi} (${vnd(v.soDu)})`]), dsVi[0].maVi);
    const dich = chon(dsVi.map((v) => [v.maVi, v.tenVi]), dsVi[1].maVi);
    const st = h('input', { type: 'number', min: 1, required: true });
    const gc = h('input', { maxlength: 200 });
    const dlg = hopThoai('Chuyển tiền giữa ví', h('form', { class: 'form', onsubmit: async (e) => {
      e.preventDefault();
      const r = await chay(() => api('POST', '/chuyen-tien', { maViNguon: +nguon.value, maViDich: +dich.value, soTien: Number(st.value), ghiChu: gc.value }), dlg);
      if (r !== undefined) { dlg.dong(); thongBao('Đã chuyển tiền'); tai(); }
    } }, truong('Từ ví', nguon), truong('Đến ví', dich), truong('Số tiền (₫)', st), truong('Ghi chú', gc),
      h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn', onclick: () => dlg.dong() }, 'Hủy'), h('button', { class: 'btn primary' }, 'Chuyển'))));
  }
  function bieuMau(v) {
    const ten = h('input', { value: v?.tenVi ?? '', required: true, maxlength: 50 });
    const loai = chon(Object.entries(NHAN), v?.loaiVi ?? 'TienMat');
    const sd = h('input', { type: 'number', min: 0, value: 0 });
    const dlg = hopThoai(v ? 'Sửa ví' : 'Thêm ví', h('form', { class: 'form', onsubmit: async (e) => {
      e.preventDefault();
      const r = await chay(() => (v ? api('PUT', `/vi/${v.maVi}`, { tenVi: ten.value, loaiVi: loai.value }) : api('POST', '/vi', { tenVi: ten.value, loaiVi: loai.value, soDuBanDau: Number(sd.value) })), dlg);
      if (r !== undefined) { dlg.dong(); thongBao('Đã lưu ví'); tai(); }
    } }, truong('Tên ví', ten), truong('Loại ví', loai), v ? null : truong('Số dư ban đầu (₫)', sd),
      h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn', onclick: () => dlg.dong() }, 'Hủy'), h('button', { class: 'btn primary' }, 'Lưu'))));
  }
  await tai();
}

// ================= Danh mục =================
export async function trangDanhMuc(root) {
  let loai = 'Chi';
  const ds = h('div', { class: 'card' });
  const seg = h('div', { class: 'tabs' });
  root.append(h('div', { class: 'toolbar' }, seg, h('div', { class: 'sp' }), h('button', { class: 'btn primary', onclick: () => bieuMau(null) }, '+ Thêm danh mục')), ds);
  const veTab = () => bo(seg).append(...['Chi', 'Thu'].map((l) => h('button', { class: loai === l ? 'on' : '', onclick: () => { loai = l; veTab(); tai(); } }, l === 'Chi' ? 'Danh mục chi' : 'Danh mục thu')));
  async function tai() {
    const r = await chay(() => api('GET', `/danh-muc?loai=${loai}`)); if (!r) return;
    bo(ds).append(...r.map((d) => h('div', { class: 'row' }, h('div', { class: 'dot', style: `background:${d.mauSac}` }, chuCai(d.tenDanhMuc)),
      h('div', { class: 'info' }, h('b', {}, d.tenDanhMuc), h('span', { class: 'small muted' }, d.laHeThong ? 'Danh mục hệ thống' : d.laMacDinh ? 'Mặc định (dùng chung)' : 'Của bạn')),
      d.laMacDinh || d.laHeThong ? h('span', { class: 'pill' }, 'Không sửa được') : h('div', {}, h('button', { class: 'btn sm', onclick: () => bieuMau(d) }, 'Sửa'), ' ',
        h('button', { class: 'btn sm danger', onclick: () => xoa(d, r) }, 'Xóa')))));
  }
  function bieuMau(d) {
    const ten = h('input', { value: d?.tenDanhMuc ?? '', required: true, maxlength: 40 }); const mau = h('input', { type: 'color', value: d?.mauSac ?? '#2f9e44' });
    const dlg = hopThoai(d ? 'Sửa danh mục' : `Thêm danh mục ${loai === 'Chi' ? 'chi' : 'thu'}`, h('form', { class: 'form', onsubmit: async (e) => {
      e.preventDefault();
      const body = { tenDanhMuc: ten.value, loai, mauSac: mau.value };
      const r = await chay(() => (d ? api('PUT', `/danh-muc/${d.maDanhMuc}`, body) : api('POST', '/danh-muc', body)), dlg);
      if (r !== undefined) { dlg.dong(); thongBao('Đã lưu danh mục'); tai(); }
    } }, truong('Tên danh mục', ten), truong('Màu', mau),
      h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn', onclick: () => dlg.dong() }, 'Hủy'), h('button', { class: 'btn primary' }, 'Lưu'))));
  }
  function xoa(d, tatCa) {
    const khac = tatCa.filter((x) => x.maDanhMuc !== d.maDanhMuc && !x.laHeThong);
    const sel = chon([['', '— Không chuyển (chỉ khi danh mục chưa dùng) —'], ...khac.map((x) => [x.maDanhMuc, x.tenDanhMuc])], '');
    const dlg = hopThoai('Xóa danh mục', h('div', { class: 'form' }, h('p', {}, `Xóa "${d.tenDanhMuc}". Nếu đang được dùng, giao dịch và ngân sách sẽ chuyển sang danh mục cùng loại bạn chọn:`), sel,
      h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => dlg.dong() }, 'Hủy'),
        h('button', { class: 'btn primary', onclick: async () => {
          const r = await chay(() => api('DELETE', `/danh-muc/${d.maDanhMuc}${sel.value ? `?chuyenSang=${sel.value}` : ''}`), dlg);
          if (r !== undefined) { dlg.dong(); thongBao('Đã xóa danh mục'); tai(); }
        } }, 'Xóa'))));
  }
  veTab(); await tai();
}

// ================= Giao dịch định kỳ =================
export async function trangDinhKy(root) {
  const vung = h('div', { class: 'card' });
  root.append(h('div', { class: 'toolbar' }, h('div', { class: 'sp' }), h('button', { class: 'btn primary', onclick: () => bieuMau(null) }, '+ Thêm giao dịch định kỳ')),
    h('p', { class: 'small muted' }, 'Hệ thống tự tạo giao dịch vào ngày đã chọn mỗi tháng (đúng một lần/tháng). Nếu ví không đủ số dư, tháng đó bị bỏ qua và bạn nhận một thông báo.'), vung);
  async function tai() {
    const ds = await chay(() => api('GET', '/giao-dich-dinh-ky')); if (!ds) return;
    bo(vung).append(ds.length ? ds.map((g) => h('div', { class: 'row' },
      h('div', { class: 'info' }, h('b', {}, `${g.tenDanhMuc} · ${vnd(g.soTien)}`), h('span', { class: 'small muted' }, `${g.loai} · ngày ${g.ngayTrongThang} hằng tháng · ví ${g.tenVi}${g.ghiChu ? ` · ${g.ghiChu}` : ''}`)),
      h('span', { class: `pill ${g.dangBat ? '' : 'warn'}` }, g.dangBat ? 'Đang bật' : 'Đã tắt'),
      h('button', { class: 'btn sm', onclick: async () => { if (await chay(() => api('PUT', `/giao-dich-dinh-ky/${g.maDinhKy}/bat-tat`, { dangBat: !g.dangBat })) !== undefined) tai(); } }, g.dangBat ? 'Tắt' : 'Bật'),
      h('button', { class: 'btn sm', onclick: () => bieuMau(g) }, 'Sửa'),
      h('button', { class: 'btn sm danger', onclick: async () => { if (await xacNhan('Xóa giao dịch định kỳ này?') && await chay(() => api('DELETE', `/giao-dich-dinh-ky/${g.maDinhKy}`)) !== undefined) { thongBao('Đã xóa'); tai(); } } }, 'Xóa')))
      : h('div', { class: 'empty' }, 'Chưa có giao dịch định kỳ nào'));
  }
  async function bieuMau(g) {
    const [dsVi, dsDm] = await Promise.all([api('GET', '/vi'), api('GET', '/danh-muc')]);
    const loai = chon([['Chi', 'Chi'], ['Thu', 'Thu']], g?.loai ?? 'Chi');
    const dm = h('select', {});
    const napDm = () => { dm.replaceChildren(...dsDm.filter((d) => d.loai === loai.value && !d.laHeThong).map((d) => h('option', { value: d.maDanhMuc, selected: g?.maDanhMuc === d.maDanhMuc }, d.tenDanhMuc))); };
    loai.addEventListener('change', napDm); napDm();
    const vi = chon(dsVi.map((v) => [v.maVi, v.tenVi]), g?.maVi ?? dsVi[0]?.maVi);
    const st = h('input', { type: 'number', min: 1, required: true, value: g?.soTien ?? '' });
    const ngay = h('input', { type: 'number', min: 1, max: 28, required: true, value: g?.ngayTrongThang ?? 1 });
    const gc = h('input', { maxlength: 200, value: g?.ghiChu ?? '' });
    const dlg = hopThoai(g ? 'Sửa giao dịch định kỳ' : 'Thêm giao dịch định kỳ', h('form', { class: 'form', onsubmit: async (e) => {
      e.preventDefault();
      const body = { maVi: +vi.value, maDanhMuc: +dm.value, soTien: Number(st.value), loai: loai.value, ngayTrongThang: Number(ngay.value), ghiChu: gc.value };
      const r = await chay(() => (g ? api('PUT', `/giao-dich-dinh-ky/${g.maDinhKy}`, body) : api('POST', '/giao-dich-dinh-ky', body)), dlg);
      if (r !== undefined) { dlg.dong(); thongBao('Đã lưu'); tai(); }
    } }, truong('Loại', loai), truong('Danh mục', dm), truong('Ví', vi), truong('Số tiền (₫)', st), truong('Ngày trong tháng (1-28)', ngay), truong('Ghi chú', gc),
      h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn', onclick: () => dlg.dong() }, 'Hủy'), h('button', { class: 'btn primary' }, 'Lưu'))));
  }
  await tai();
}
