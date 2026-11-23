import { api, PHIEN, qs, h, bo, vnd, so, ngayVN, gioVN, homNay, thangNay, tachThang, thongBao, hopThoai, xacNhan, truong, truongAn, chon, chay, ic, nut, nutIcon, tien, tile, chip, rong, dangTai, hienLoi, datHanhDong, datPhuDe, phanDoan, chonThang, congTac, thuCua, mauHopLe, kpi, dai, kpiPhu, demSo, nenChay, baoSuKien, layDuoc } from './core.js';
import { heo, hu, bieuDoThuChi, donut, chuGiai, thanhXep, giayNho, dauMoc, markTien, mauTrangThai, theVi, hoaDon, bangDinh } from './ve.js';
import { chonKhoang, chonNgay, chonNgayGio } from './lich.js';

const NHAN_VI = { TienMat: 'Tiền mặt', NganHang: 'Ngân hàng', ViDienTu: 'Ví điện tử' };
const thuChi = (g) => tien(g.loai === 'Thu' ? g.soTien : -g.soTien, { dau: true, lop: g.loai === 'Thu' ? 'income' : 'expense' });
const giaVN = () => new Date(Date.now() + 7 * 3600e3);
/** Số tiền ngắn bằng chữ cho câu giấy nhớ: 7,3 triệu. */
const bangChu = (v) => (v >= 1e9 ? `${+(v / 1e9).toFixed(1)} tỷ` : v >= 1e6 ? `${+(v / 1e6).toFixed(1)} triệu` : vnd(v)).replace('.', ',');
/** Nhãn dưới ngày trong sổ: Hôm nay, Hôm qua, hoặc thứ trong tuần. */
function nhanThu(iso) {
  const d = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  const lech = Math.round((d(homNay()) - d(iso)) / 864e5);
  return lech === 0 ? 'Hôm nay' : lech === 1 ? 'Hôm qua' : thuCua(iso);
}

// ================= Tổng quan =================
/** Lời chào theo giờ Việt Nam. */
function loiChao() {
  const gio = giaVN().getUTCHours(); const buoi = gio < 5 ? 'tối' : gio < 11 ? 'sáng' : gio < 14 ? 'trưa' : gio < 18 ? 'chiều' : 'tối';
  return `Chào buổi ${buoi}${PHIEN.hoTen ? `, ${PHIEN.hoTen}` : ''}!`;
}
const thangTruoc = (v) => { const [t, n] = tachThang(v); return t === 1 ? `${n - 1}-12` : `${n}-${String(t - 1).padStart(2, '0')}`; };
// Độ nghiêng dấu mộc dưới ba hũ ở Tổng quan
const XOAY_MOC = [-4, 3, -2];

export async function trangTongQuan(root) {
  let thang = thangNay();
  const vung = h('div', { class: 'page-in' });
  const hn = homNay();
  datPhuDe(`${thuCua(hn)}, ${ngayVN(hn)}`);
  datHanhDong(chonThang(thang, (v) => { thang = v; tai(); }), h('a', { class: 'btn primary', href: '#/giao-dich?them=1' }, ic('plus'), 'Ghi khoản mới'));
  root.append(vung);
  /** Chip so với tháng trước. tangLaTot: tăng là điều tốt (thu) hay giảm mới tốt (chi). */
  const chipSo = (nhan, hienTai, truoc, tangLaTot, tt) => {
    if (!truoc) return h('span', { class: 'chip-so' }, `Tháng ${tt} chưa có khoản ${nhan.toLowerCase()}`);
    const pc = Math.round(((hienTai - truoc) / truoc) * 100);
    if (pc === 0) return h('span', { class: 'chip-so' }, `${nhan} bằng tháng ${tt}`);
    const tot = (pc > 0) === tangLaTot;
    return h('span', { class: 'chip-so' }, h('span', { class: `cs-i ${tot ? 'ok' : 'bad'}` }, ic(pc > 0 ? 'arrow-up-right' : 'arrow-down-right')), `${nhan} ${pc > 0 ? 'nhiều' : 'ít'} hơn tháng ${tt}: `, h('b', { class: tot ? 'ok' : 'bad' }, `${Math.abs(pc)}%`));
  };
  async function tai() {
    dangTai(vung, 4);
    const [t, n] = tachThang(thang); const [tt, nt] = tachThang(thangTruoc(thang));
    const nam6 = t >= 6 ? [n] : [n - 1, n];
    const [d, truoc, dsVi, dsMt, dsNs, chuoi] = await Promise.all([
      chay(() => api('GET', `/bao-cao/tong-quan?${qs({ thang: t, nam: n })}`)),
      chay(() => api('GET', `/bao-cao/tong-quan?${qs({ thang: tt, nam: nt })}`)),
      chay(() => api('GET', '/vi')), chay(() => api('GET', '/muc-tieu')), chay(() => api('GET', `/ngan-sach?${qs({ thang: t, nam: n })}`)),
      Promise.all(nam6.map((y) => api('GET', `/bao-cao/theo-thoi-gian?nam=${y}`).then((r) => [y, r]))).catch(() => null)]);
    if (!d) { hienLoi(vung, tai); return; }
    const dong = nenChay('tong-quan'); // chuyển động chỉ chạy lần đầu hiện trang, không chạy khi tải lại ngầm hay đổi tháng
    const mk = (v, loai) => { const e = markTien(v, loai); return dong ? demSo(e, v) : e; };
    const tongViDuong = (dsVi ?? []).reduce((s, v) => s + Math.max(0, v.soDu), 0);
    const tyLeGiu = d.tongThu > 0 ? Math.max(0, d.chenhLech / d.tongThu) : 0; const pGiu = Math.round(tyLeGiu * 100);
    const ns = [...(dsNs ?? [])].sort((a, b) => b.tienDo - a.tienDo);
    // Câu tóm tắt tháng
    const cau = d.tongThu === 0 && d.tongChi === 0 ? `Tháng ${t} chưa ghi khoản nào.`
      : d.chenhLech < 0 ? ['Tháng ', t, ' bạn đã thu ', mk(d.tongThu, 'thu'), ', chi ', mk(d.tongChi, 'chi'), ' và đã chi quá ', mk(-d.chenhLech, 'chi'), '.']
        : ['Tháng ', t, ' bạn đã thu ', mk(d.tongThu, 'thu'), ', chi ', mk(d.tongChi, 'chi'), ' và còn giữ lại ', mk(d.chenhLech, 'giu'), '.'];
    // Ghi chú nhanh (tính ở trình duyệt từ dữ liệu đã có, không thêm API)
    const nho = [];
    const [ht, hnn] = tachThang(thangNay());
    if (t === ht && n === hnn) {
      const ngayDaQua = Number(homNay().slice(8, 10)); const soNgay = new Date(n, t, 0).getDate();
      if (d.tongChi > 0 && ngayDaQua >= 3) nho.push(['y', 'lightbulb', `Cứ đà này, cả tháng sẽ chi khoảng ${bangChu(Math.round((d.tongChi / ngayDaQua) * soNgay))}.`, '']);
    }
    if (d.tongThu > 0 && d.tongChi > d.tongThu) nho.push(['p', 'circle-alert', 'Tháng này chi nhiều hơn thu.', 'bad']);
    else if (d.tongThu > 0 && pGiu >= 20) nho.push(['g', 'piggy-bank', `Bạn giữ lại ${pGiu}% thu nhập. Rất ổn!`, 'ok']);
    if (d.chiTheoDanhMuc.length) { const top = [...d.chiTheoDanhMuc].sort((a, b) => b.soTien - a.soTien)[0]; nho.push(['l', 'shopping-bag', `${top.tenDanhMuc} tốn nhiều nhất: ${vnd(top.soTien)}.`, '']); }
    const vuot = ns.filter((x) => x.tienDo > 100).slice(0, 2);
    vuot.forEach((x) => nho.push(['p', 'triangle-alert', `Hũ ${x.tenDanhMuc} đã tràn, vượt ${vnd(x.soDaChi - x.hanMuc)}.`, 'bad']));
    if (!vuot.length) ns.filter((x) => x.tienDo >= x.nguongCanhBao).slice(0, 2).forEach((x) => nho.push(['y', 'triangle-alert', `Hũ ${x.tenDanhMuc} sắp đầy (${Math.round(x.tienDo)}%).`, '']));
    (dsMt ?? []).filter((m) => !m.daHoanThanh && m.chamTienDo).slice(0, 2).forEach((m) => nho.push(['b', 'flag', `Mục tiêu ${m.tenMucTieu} đang chậm so với kế hoạch.`, '']));
    // Biểu đồ 6 tháng kết thúc ở tháng đang chọn
    const map = chuoi ? Object.fromEntries(chuoi) : null;
    const hang = Array.from({ length: 6 }, (_, i) => { const m = t - (5 - i); return m >= 1 ? { nam: n, thang: m } : { nam: n - 1, thang: m + 12 }; })
      .map((x) => ({ ...x, thu: map?.[x.nam]?.[x.thang - 1]?.thu ?? 0, chi: map?.[x.nam]?.[x.thang - 1]?.chi ?? 0 }));
    const demLoai = {};
    bo(vung).append(
      h('section', { class: 'card chao', 'aria-labelledby': 'loi-chao' }, bangDinh('y', { trai: '64px', xoay: -4 }),
        h('div', { class: 'chao-t' }, h('h2', { id: 'loi-chao' }, loiChao()), h('p', { class: 'cau' }, cau),
          h('div', { class: 'chips-so' }, chipSo('Thu', d.tongThu, truoc?.tongThu, true, tt), chipSo('Chi', d.tongChi, truoc?.tongChi, false, tt))),
        h('div', { class: 'chao-heo' }, h('svg:svg', { class: 'mui-ten nhoe', width: 74, height: 44, viewBox: '0 0 74 44', 'aria-hidden': 'true' }, h('svg:path', { d: 'M4 8 C 22 2, 46 8, 60 30', fill: 'none', 'stroke-width': 2.6, 'stroke-linecap': 'round' }), h('svg:path', { d: 'M50 28 L 61 32 L 63 20', fill: 'none', 'stroke-width': 2.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })),
          heo({ day: tyLeGiu, kich: 220, xu: true, chay: dong ? { tu: 0 } : undefined, nhan: d.tongThu > 0 ? `Heo đất đầy ${pGiu}%: phần thu nhập bạn giữ lại` : 'Heo đất trống: tháng này chưa có khoản thu' }),
          h('p', { class: 'heo-cap' }, d.tongThu > 0 ? `Heo đã đầy ${pGiu}%: phần thu nhập bạn giữ lại` : 'Tháng này chưa có khoản thu'))),
      h('section', { class: 'vi-sec', 'aria-labelledby': 'h-vi' },
        h('div', { class: 'sec-hd' }, h('h2', { id: 'h-vi' }, 'Tiền đang nằm ở đâu'), h('p', {}, 'Tổng số dư ', dong ? demSo(h('b', { class: 'num' }, vnd(d.tongSoDu)), d.tongSoDu) : h('b', { class: 'num' }, vnd(d.tongSoDu)))),
        (dsVi ?? []).length ? h('div', { class: 'the-luoi' }, dsVi.map((v, i) => { const k = demLoai[v.loaiVi] ?? 0; demLoai[v.loaiVi] = k + 1; return theVi(v, { pc: tongViDuong ? Math.round((Math.max(0, v.soDu) / tongViDuong) * 100) : 0, i, dem: k }); }))
          : h('div', { class: 'card' }, rong('wallet', 'Chưa có ví nào', 'Thêm ví để bắt đầu ghi chép thu chi.', h('a', { class: 'btn primary', href: '#/vi' }, ic('plus'), 'Thêm ví')))),
      h('div', { class: 'row2 tq-bd' },
        h('section', { class: 'card b grow', 'aria-labelledby': 'h-bd' }, h('div', { class: 'card-h' }, h('h2', { id: 'h-bd' }, 'Thu chi 6 tháng')), map ? bieuDoThuChi(hang, { chay: dong }) : rong('chart-column', 'Chưa có dữ liệu')),
        h('section', { class: 'card fixed', 'aria-labelledby': 'h-dm' }, h('div', { class: 'card-h' }, h('h2', { id: 'h-dm' }, 'Tiền chi đi đâu?')),
          d.chiTheoDanhMuc.length ? [h('div', { class: 'donut-w' }, donut(d.chiTheoDanhMuc, { tong: d.tongChi, nhanGiua: 'đã chi', tieuDe: `Cơ cấu chi tháng ${t}` })), chuGiai(d.chiTheoDanhMuc, { tong: d.tongChi })]
            : rong('inbox', 'Chưa có khoản chi nào trong tháng này', 'Ghi một khoản chi để thấy tiền đi đâu.'))),
      h('div', { class: 'row2 tq-hu' },
        h('section', { class: 'card fixed hu-sec', 'aria-labelledby': 'h-hu' }, h('div', { class: 'card-h' }, h('h2', { id: 'h-hu' }, 'Hũ ngân sách tháng này'), ns.length ? h('a', { href: '#/ngan-sach' }, 'Xem tất cả') : null),
          ns.length ? [h('div', { class: 'hu-ke', style: `--n:${Math.min(3, ns.length)}` }, ns.slice(0, 3).map((x) => { const m = mauTrangThai(x.tienDo, x.nguongCanhBao); return h('div', {}, hu({ day: x.tienDo / 100, canhBao: x.nguongCanhBao / 100, mau: m.to, kich: 104, chay: dong, nhan: `Hũ ${x.tenDanhMuc} đã dùng ${Math.round(x.tienDo)}%, vạch cảnh báo ${x.nguongCanhBao}%` })); })),
            h('div', { class: 'hu-nhan', style: `--n:${Math.min(3, ns.length)}` }, ns.slice(0, 3).map((x, i) => { const m = mauTrangThai(x.tienDo, x.nguongCanhBao, { conLai: true }); return h('div', {}, h('span', { class: 'hu-ten' }, x.tenDanhMuc), h('span', { class: 'hu-so num' }, h('span', { class: 'nw' }, `${so(x.soDaChi)} /`), ' ', h('span', { class: 'nw' }, vnd(x.hanMuc))), dauMoc(m.moc, m.loai, XOAY_MOC[i % 3], '', dong ? (ns[i].tienDo > 100 ? 1500 : 1150) : undefined)); }))]
            : rong('gauge', 'Chưa có hũ nào cho tháng này', 'Đặt hạn mức chi cho từng danh mục để được cảnh báo.', h('a', { class: 'btn primary', href: '#/ngan-sach' }, ic('plus'), 'Thêm hũ mới'), hu({ day: 0, kich: 96 }))),
        h('section', { class: 'so-ke hep grow', 'aria-labelledby': 'h-gd' }, h('span', { class: 'le', 'aria-hidden': 'true' }),
          h('div', { class: 'so-hd' }, h('h2', { id: 'h-gd' }, 'Ghi chép gần đây'), h('a', { href: '#/giao-dich' }, 'Xem cả sổ')),
          d.ganDay.length ? h('ul', { class: 'gd-ds' }, d.ganDay.map((g, i) => { const ngay = g.ngayGiaoDich.slice(0, 10); const lap = i > 0 && d.ganDay[i - 1].ngayGiaoDich.slice(0, 10) === ngay;
            return h('li', { class: 'gd-dong' }, h('span', { class: `gd-ngay${lap ? ' lap' : ''}` }, lap ? [h('svg:svg', { class: 'dit nhoe-nho', width: 16, height: 12, viewBox: '0 0 16 12', 'aria-hidden': 'true' }, h('svg:path', { d: 'M7 2 L4 10 M13 2 L10 10', fill: 'none', 'stroke-width': 2, 'stroke-linecap': 'round' })), h('span', { class: 'sr' }, ngayVN(ngay))] : ngayVN(ngay).slice(0, 5)),
              h('span', { class: 'gd-t' }, h('b', {}, g.ghiChu || g.tenDanhMuc), h('span', {}, `${g.tenDanhMuc} · ${g.tenVi} · ${gioVN(g.ngayGiaoDich)}`)), h('b', { class: `gd-tien num ${g.loai === 'Thu' ? 'income' : 'expense'}` }, `${g.loai === 'Thu' ? '+' : '−'}${vnd(g.soTien)}`)); }))
            : rong('inbox', 'Chưa có giao dịch', 'Thêm giao dịch đầu tiên để bắt đầu theo dõi.'))),
      nho.length ? h('section', { class: 'gn-sec tq-gc', 'aria-labelledby': 'h-ghichu' }, h('h2', { id: 'h-ghichu' }, 'Ghi chú nhanh'), h('ul', { class: 'note-list' }, nho.map(([mau, icon, tx, loai], i) => giayNho(tx, { mau, icon, i, loaiIcon: loai, bay: dong })))) : null);
  }
  await tai();
}

/** Một dòng giao dịch: ô icon danh mục, mô tả đậm, dòng phụ "Danh mục · Ví · giờ", số tiền, thao tác hiện khi rê chuột. */
function dongGiaoDich(g, thaoTac, moi = false) {
  return h('div', { class: `txr${moi ? ' an-moi' : ''}` }, tile(g.bieuTuong, '', g.mauSac),
    h('div', {}, h('div', { class: 't1' }, h('span', {}, g.ghiChu || g.tenDanhMuc), g.coHoaDon ? h('span', { title: 'Có hóa đơn', role: 'img', 'aria-label': 'Có hóa đơn' }, ic('receipt-text')) : null),
      h('div', { class: 't2' }, `${g.tenDanhMuc} · ${g.tenVi} · ${gioVN(g.ngayGiaoDich)}`)),
    h('span', { class: 'amt' }, thuChi(g)), thaoTac ?? h('span'));
}

// ================= Giao dịch =================
export async function trangGiaoDich(root) {
  let [dsVi, dsDm] = await Promise.all([api('GET', '/vi'), api('GET', '/danh-muc')]);
  const loc = { tu: '', den: '', loai: '', viId: '', danhMucId: '', q: '', trang: 1 };
  const ketQua = h('section', { class: 'so-ke', 'aria-label': 'Sổ giao dịch' });
  const loadLai = () => { loc.trang = 1; tai(); };
  let tq;
  const bar = h('div', { class: 'toolbar loc' },
    h('label', { class: 'ico-in' }, h('span', { class: 'sr' }, 'Tìm ghi chú'), ic('search'), h('input', { type: 'search', placeholder: 'Tìm trong ghi chú…', oninput: (e) => { clearTimeout(tq); tq = setTimeout(() => { loc.q = e.target.value; loadLai(); }, 300); } })),
    phanDoan('Loại giao dịch', [['', 'Tất cả'], ['Thu', 'Thu'], ['Chi', 'Chi']], '', (v) => { loc.loai = v; loadLai(); }),
    truongAn('Ví', chon([['', 'Tất cả ví'], ...dsVi.map((v) => [v.maVi, v.tenVi])], '', { onchange: (e) => { loc.viId = e.target.value; loadLai(); } })),
    truongAn('Danh mục', chon([['', 'Tất cả danh mục'], ...dsDm.map((d) => [d.maDanhMuc, `${d.tenDanhMuc} (${d.loai})`])], '', { onchange: (e) => { loc.danhMucId = e.target.value; loadLai(); } })),
    chonKhoang({ nhan: 'Khoảng ngày', doi: ({ tu, den }) => { loc.tu = tu; loc.den = den; loadLai(); } }));
  datPhuDe('');
  datHanhDong(nut('Nhập từ file', { icon: 'upload', ghiNhan: true, onclick: () => nhapTuFile(lamMoiTatCa) }), nut('Quét hóa đơn', { icon: 'scan-line', ghiNhan: true, onclick: () => quetHoaDon(dsVi, dsDm, lamMoiTatCa) }), nut('Thêm giao dịch', { icon: 'plus', loai: 'primary chi-hep', ghiNhan: true, onclick: () => bieuMauGiaoDich(null, dsVi, dsDm, tai) }));
  const phieu = dsVi.length ? phieuGhi() : null;
  root.append(bar, h('div', { class: 'gd-bo' }, ketQua, phieu?.el ?? null));
  if (location.hash.includes('them=1')) {
    history.replaceState(null, '', '#/giao-dich');
    setTimeout(() => { if (phieu && matchMedia('(min-width: 1180px)').matches) { phieu.el.scrollIntoView({ block: 'center' }); phieu.soTien.focus(); } else bieuMauGiaoDich(null, dsVi, dsDm, tai); }, 0);
  }
  async function lamMoiTatCa() { const v = await chay(() => api('GET', '/vi')); if (v) { dsVi = v; phieu?.capVi(dsVi); } tai(); }

  /** Phiếu "Ghi khoản mới" bên phải sổ (chỉ hiện khi đủ rộng; màn hẹp dùng hộp thoại). */
  function phieuGhi() {
    let loai = 'Chi'; let maDm = null; let maVi = dsVi[0]?.maVi; let xong = false;
    const soTien = h('input', { id: 'so-tien', type: 'text', inputmode: 'numeric', placeholder: '0', autocomplete: 'off', 'aria-describedby': 'ph-goi-y' });
    const ghi = h('input', { id: 'ghi-chu', type: 'text', maxlength: 200, placeholder: 'Cơm trưa…', autocomplete: 'off' });
    const ngay = chonNgay({ giaTri: homNay(), nhan: 'Ngày', nhanDep: true });
    const goiY = h('div', { class: 'hint', id: 'ph-goi-y', 'aria-live': 'polite' });
    const loiMay = h('div', { class: 'err', role: 'alert' });
    const dong = h('p', { class: 'ph-tt', role: 'status' });
    const khungTien = h('div', { class: 'amount chi' }, soTien, h('span', { class: 'cur', 'aria-hidden': 'true' }, '₫'));
    const nutLoai = h('div', { class: 'phieu-loai', role: 'group', 'aria-label': 'Loại khoản' });
    const dmEl = h('div', { class: 'chips', role: 'group', 'aria-labelledby': 'lb-dm' }); const viEl = h('div', { class: 'chips', role: 'group', 'aria-labelledby': 'lb-vi' });
    const luu = h('button', { type: 'button', class: 'btn primary phieu-gui' }, ic('check'), 'Ghi vào sổ');
    const soNguyen = () => Number(soTien.value.replace(/\D/g, '')) || 0;
    const dsDmLoai = () => dsDm.filter((d) => d.loai === loai && !d.laHeThong);
    const capNhat = () => {
      const st = soNguyen(); const v = dsVi.find((x) => x.maVi === maVi);
      khungTien.className = `amount ${loai === 'Thu' ? 'thu' : 'chi'}`;
      const thieu = loai === 'Chi' && v && st > v.soDu;
      goiY.className = thieu ? 'err' : 'hint';
      goiY.replaceChildren(...(thieu ? [ic('circle-alert'), h('span', {}, `Số dư ví ${v.tenVi} không đủ: còn ${vnd(v.soDu)}.`)] : [v ? (loai === 'Chi' ? `Số dư ví ${v.tenVi}: ${vnd(v.soDu)}` : `Cộng vào ví ${v.tenVi}`) : '']));
      if (thieu) soTien.setAttribute('aria-invalid', 'true'); else soTien.removeAttribute('aria-invalid');
      luu.disabled = st <= 0 || !maDm || !maVi;
      dong.className = `ph-tt${xong ? ' ok' : ''}`;
      dong.textContent = xong ? 'Đã ghi vào sổ.' : st <= 0 ? 'Nhập số tiền để ghi.' : 'Sẵn sàng ghi.';
    };
    const veLoai = () => nutLoai.replaceChildren(...[['Chi', 'Khoản chi', 'chi'], ['Thu', 'Khoản thu', 'thu']].map(([l, t, c]) => h('button', { type: 'button', class: `loai-nut ${c}`, 'aria-pressed': String(loai === l), onclick: () => { if (loai === l) return; loai = l; maDm = dsDmLoai()[0]?.maDanhMuc ?? null; veLoai(); veDm(); capNhat(); } }, t)));
    const veDm = () => { if (!maDm) maDm = dsDmLoai()[0]?.maDanhMuc ?? null; dmEl.replaceChildren(...dsDmLoai().map((d) => h('button', { type: 'button', class: 'chip-btn', style: mauHopLe(d.mauSac) ? `--c:${d.mauSac}` : null, 'aria-pressed': String(maDm === d.maDanhMuc), onclick: () => { maDm = d.maDanhMuc; veDm(); capNhat(); } }, d.tenDanhMuc))); };
    const veVi = () => viEl.replaceChildren(...dsVi.map((v) => h('button', { type: 'button', class: 'chip-btn', 'aria-pressed': String(maVi === v.maVi), onclick: () => { maVi = v.maVi; veVi(); capNhat(); } }, v.tenVi)));
    // Gõ số thì tự chèn dấu chấm ngăn cách hàng nghìn, giữ vị trí con trỏ theo số chữ số đứng trước nó.
    soTien.addEventListener('input', () => {
      xong = false; loiMay.replaceChildren();
      const dau = soTien.value.slice(0, soTien.selectionStart ?? soTien.value.length).replace(/\D/g, '').length;
      const so_ = soTien.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 13);
      soTien.value = so_ ? new Intl.NumberFormat('vi-VN').format(Number(so_)) : '';
      let dem = 0; let pos = 0; while (pos < soTien.value.length && dem < dau) { if (/\d/.test(soTien.value[pos])) dem++; pos++; }
      try { soTien.setSelectionRange(pos, pos); } catch { /* bỏ qua */ }
      capNhat();
    });
    ghi.addEventListener('input', () => { xong = false; capNhat(); });
    luu.onclick = async () => {
      loiMay.replaceChildren(); luu.disabled = true; luu.setAttribute('aria-busy', 'true');
      const gioNay = giaVN().toISOString().slice(11, 16);
      const body = { maVi, maDanhMuc: maDm, soTien: soNguyen(), loai, ngayGiaoDich: `${ngay.value}T${ngay.value === homNay() ? gioNay : '12:00'}`, ghiChu: ghi.value || null };
      try {
        const moi = await api('POST', '/giao-dich', body);
        if (moi?.maGiaoDich) baoSuKien(`dong:${moi.maGiaoDich}`); // dòng mới viết ra khi sổ vẽ lại
        thongBao('Đã thêm giao dịch'); soTien.value = ''; ghi.value = ''; xong = true; luu.removeAttribute('aria-busy'); capNhat();
        await lamMoiTatCa();
      } catch (e) { luu.removeAttribute('aria-busy'); loiMay.replaceChildren(ic('circle-alert'), h('span', {}, e.message)); capNhat(); }
    };
    const el = h('section', { class: 'phieu', 'aria-labelledby': 'h-phieu' }, bangDinh('b', { trai: '50%', xoay: -3 }), h('h2', { id: 'h-phieu' }, 'Ghi khoản mới'), nutLoai,
      h('div', { class: 'field' }, h('label', { class: 'lab', for: 'so-tien' }, 'Số tiền'), khungTien, goiY),
      h('div', { class: 'field' }, h('span', { class: 'lab', id: 'lb-dm' }, 'Danh mục'), dmEl), h('div', { class: 'field' }, h('span', { class: 'lab', id: 'lb-vi' }, 'Ví'), viEl),
      h('div', { class: 'two' }, h('div', { class: 'field' }, h('span', { class: 'lab' }, 'Ngày'), ngay), h('div', { class: 'field' }, h('label', { class: 'lab', for: 'ghi-chu' }, 'Ghi chú'), ghi)),
      loiMay, luu, dong);
    veLoai(); veDm(); veVi(); capNhat();
    return { el, soTien, capVi: () => { if (!dsVi.some((x) => x.maVi === maVi)) maVi = dsVi[0]?.maVi; veVi(); capNhat(); } };
  }

  async function tai() {
    dangTai(ketQua, 6);
    const r = await chay(() => api('GET', `/giao-dich?${qs(loc)}`));
    if (!r) { hienLoi(ketQua, tai); return; }
    const coLoc = !!(loc.tu || loc.den || loc.loai || loc.viId || loc.danhMucId || loc.q);
    datPhuDe(`${r.tongSo} dòng ${coLoc ? 'khớp bộ lọc' : 'trong sổ'}`);
    bo(ketQua).append(h('span', { class: 'le', 'aria-hidden': 'true' }));
    if (!r.muc.length) {
      const tenLoai = loc.loai === 'Thu' ? ' khoản thu' : loc.loai === 'Chi' ? ' khoản chi' : ' khoản nào';
      ketQua.append(h('div', { class: 'so-rong' }, rong('inbox', `Trang này chưa có${tenLoai}`, 'Đổi bộ lọc hoặc khoảng ngày, hoặc ghi một khoản mới.', null, heo({ day: 0, kich: 150, xu: true }))));
      return;
    }
    const nhom = [];
    for (const g of r.muc) { const ngay = g.ngayGiaoDich.slice(0, 10); if (nhom.at(-1)?.ngay !== ngay) nhom.push({ ngay, ds: [] }); nhom.at(-1).ds.push(g); }
    const namNay = homNay().slice(0, 4);
    for (const { ngay, ds } of nhom) {
      const tong = ds.reduce((a, g) => a + (g.loai === 'Thu' ? g.soTien : -g.soTien), 0);
      ketQua.append(h('div', { class: 'nhom' }, h('div', { class: 'nhom-ngay' }, h('span', { class: 'n1' }, ngayVN(ngay).slice(0, 5)), h('span', { class: 'n2' }, nhanThu(ngay)), ngay.slice(0, 4) !== namNay ? h('span', { class: 'n3' }, ngay.slice(0, 4)) : null),
        h('div', { class: 'nhom-dong' },
          ds.map((g) => dongGiaoDich(g, h('span', { class: 'ra' },
            g.coHoaDon ? nutIcon('receipt-text', `Xem hóa đơn của ${g.ghiChu || g.tenDanhMuc}`, { loai: 'ghost sm', onclick: () => xemHoaDon(g) }) : null,
            nutIcon('pencil', `Sửa giao dịch ${g.ghiChu || g.tenDanhMuc}`, { loai: 'ghost sm', onclick: () => bieuMauGiaoDich(g, dsVi, dsDm, tai) }),
            nutIcon('trash-2', `Xóa giao dịch ${g.ghiChu || g.tenDanhMuc}`, { loai: 'ghost sm danger', onclick: async () => { if (await xacNhan('Xóa giao dịch này? Số dư ví sẽ được hoàn tác.')) { if (await chay(() => api('DELETE', `/giao-dich/${g.maGiaoDich}`)) !== undefined) { thongBao('Đã xóa giao dịch'); lamMoiTatCa(); } } } })), !!layDuoc(`dong:${g.maGiaoDich}`))),
          h('div', { class: 'nhom-cong' }, h('span', {}, `cộng ${ds.length} khoản`), h('b', { class: `num ${tong >= 0 ? 'income' : 'expense'}` }, `${tong > 0 ? '+' : ''}${vnd(tong)}`)))));
    }
    const tongTrang = Math.max(1, Math.ceil(r.tongSo / r.kichThuocTrang));
    ketQua.append(h('div', { class: 'pager' }, h('span', { class: 'num' }, `Trang ${r.trang}/${tongTrang} · ${r.tongSo} giao dịch`),
      h('span', { class: 'grp' }, nutIcon('chevron-left', 'Trang trước', { disabled: loc.trang <= 1, onclick: () => { loc.trang--; tai(); } }), nutIcon('chevron-right', 'Trang sau', { disabled: loc.trang >= tongTrang, onclick: () => { loc.trang++; tai(); } }))));
  }
  await tai();
}

// Nhập giao dịch từ file Excel/CSV: chọn file -> xem trước (lỗi từng dòng, dòng có thể trùng) -> xác nhận nhập
function nhapTuFile(sauKhiNhap) {
  const vung = h('div', { class: 'nhap-vung' });
  const tep = h('input', { type: 'file', accept: '.xlsx,.csv', hidden: true, 'aria-label': 'Chọn file Excel hoặc CSV', onchange: () => { if (tep.files[0]) xemTruoc(tep.files[0]); } });
  const taiMau = async () => {
    const b = await chay(() => api('GET', '/giao-dich/nhap/mau', undefined, { blob: true }), dlg); if (!b) return;
    const a = h('a', { href: URL.createObjectURL(b), download: 'mau-nhap-giao-dich.xlsx' }); document.body.append(a); a.click(); a.remove();
  };
  const dlg = hopThoai('Nhập giao dịch từ file', h('div', { class: 'form' },
    h('p', { class: 'hint' }, 'File .xlsx hoặc .csv có các cột: Ngày, Loại (Thu/Chi), Danh mục, Ví, Số tiền, Ghi chú. File xuất từ trang Báo cáo cũng nhập lại được. Tối đa 1000 dòng, 2 MB.'),
    h('div', { class: 'toolbar' }, tep, nut('Chọn file', { icon: 'upload', loai: 'primary', onclick: () => tep.click() }), nut('Tải file mẫu', { icon: 'download', onclick: taiMau })),
    vung, h('div', { class: 'acts' }, h('button', { type: 'button', class: 'btn', onclick: () => dlg.dong() }, 'Đóng'))), { rong: true });

  async function xemTruoc(file) {
    dlg.loi(''); bo(vung).append(h('p', { class: 'hint' }, 'Đang đọc file…'));
    const fd = new FormData(); fd.append('tep', file);
    const r = await chay(() => api('POST', '/giao-dich/nhap/xem-truoc', fd), dlg);
    bo(vung); if (!r) return;
    const soTrung = r.hopLe.filter((x) => x.coTheTrung).length;
    const chonDong = new Set(r.hopLe.filter((x) => !x.coTheTrung).map((x) => x.dong)); // dòng có thể trùng mặc định bỏ chọn
    const nutNhap = h('button', { type: 'button', class: 'btn primary' });
    const capNhatNut = () => { nutNhap.textContent = `Nhập ${chonDong.size} giao dịch`; nutNhap.disabled = chonDong.size === 0; };
    nutNhap.onclick = async () => {
      dlg.loi(''); nutNhap.disabled = true;
      const kq = await chay(() => api('POST', '/giao-dich/nhap', { dong: r.hopLe.filter((x) => chonDong.has(x.dong)) }), dlg);
      if (!kq) { capNhatNut(); return; }
      dlg.dong(); thongBao(`Đã nhập ${kq.soDaNhap} giao dịch (thu ${vnd(kq.tongThu)}, chi ${vnd(kq.tongChi)})`); sauKhiNhap();
    };
    capNhatNut();
    vung.append(h('div', { class: 'nhap-tom-tat' }, chip('ok', `${r.hopLe.length} dòng hợp lệ`, 'circle-check'),
      r.loi.length ? chip('bad', `${r.loi.length} dòng lỗi (bỏ qua)`, 'circle-alert') : null,
      soTrung ? chip('warn', `${soTrung} dòng có thể trùng (đã bỏ chọn)`, 'triangle-alert') : null));
    if (r.loi.length) vung.append(h('details', { class: 'nhap-loi', open: !r.hopLe.length }, h('summary', {}, 'Xem các dòng lỗi'),
      h('ul', {}, r.loi.map((x) => h('li', {}, h('b', {}, `Dòng ${x.dong}: `), x.loi)))));
    if (r.hopLe.length) {
      const tatCa = h('input', { type: 'checkbox', 'aria-label': 'Chọn tất cả', checked: chonDong.size === r.hopLe.length, onchange: (e) => {
        r.hopLe.forEach((x) => (e.target.checked ? chonDong.add(x.dong) : chonDong.delete(x.dong)));
        bang.querySelectorAll('tbody input').forEach((c) => { c.checked = e.target.checked; }); capNhatNut();
      } });
      const bang = h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, tatCa), h('th', {}, 'Dòng'), h('th', {}, 'Ngày'), h('th', {}, 'Danh mục'), h('th', {}, 'Ví'), h('th', { class: 'r' }, 'Số tiền'), h('th', {}, 'Ghi chú'))),
        h('tbody', {}, r.hopLe.map((x) => h('tr', {},
          h('td', {}, h('input', { type: 'checkbox', checked: chonDong.has(x.dong), 'aria-label': `Chọn dòng ${x.dong}`, onchange: (e) => { if (e.target.checked) chonDong.add(x.dong); else chonDong.delete(x.dong); capNhatNut(); } })),
          h('td', { class: 'hint' }, x.dong), h('td', { class: 'nowrap' }, `${ngayVN(x.ngayGiaoDich)} ${gioVN(x.ngayGiaoDich)}`),
          h('td', {}, x.tenDanhMuc, x.coTheTrung ? chip('warn', 'Có thể trùng') : null), h('td', {}, x.tenVi),
          h('td', { class: 'r nowrap' }, tien(x.loai === 'Thu' ? x.soTien : -x.soTien, { dau: true, lop: x.loai === 'Thu' ? 'income' : 'expense' })), h('td', { class: 'hint' }, x.ghiChu ?? '')))));
      vung.append(h('div', { class: 'nhap-bang' }, bang), h('p', { class: 'hint' }, 'Các dòng được nhập theo thứ tự ngày, tất cả trong một lần: nếu có dòng lỗi (ví dụ ví không đủ số dư) thì không dòng nào được ghi.'),
        h('div', { class: 'acts' }, nutNhap));
    }
  }
}

// ================= Lịch chi tiêu =================
/** Số tiền rút gọn cho ô lịch: 45k, 1,2tr, 2tỷ. */
const gonLich = (n) => {
  const r = (x) => x.toFixed(1).replace(/\.0$/, '').replace('.', ',');
  if (n >= 995e6) return `${r(n / 1e9)}tỷ`;
  if (n >= 995e3) return `${r(n / 1e6)}tr`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}k`;
  return String(n);
};
const THU_TRONG_TUAN = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export async function trangLich(root) {
  const [dsVi, dsDm] = await Promise.all([api('GET', '/vi'), api('GET', '/danh-muc')]);
  let thang = thangNay(); let ngayChon = homNay(); let theoNgay = new Map();
  const tomTat = h('div', { class: 'page-in' }); const luoi = h('div', { class: 'card lich' }); const chiTiet = h('div', { class: 'card flush lich-ct' });
  datPhuDe('Ô càng đậm, ngày đó chi càng nhiều');
  datHanhDong(chonThang(thang, (v) => { thang = v; tai(); }));
  root.append(tomTat, h('div', { class: 'lich-bo-cuc' }, luoi, chiTiet));

  async function tai() {
    const [t, n] = tachThang(thang);
    const d = await chay(() => api('GET', `/bao-cao/lich?${qs({ thang: t, nam: n })}`)); if (!d) return;
    if (ngayChon && ngayChon.slice(0, 7) !== thang) ngayChon = null;
    bo(tomTat).append(dai(kpi('Tổng thu', tien(d.tongThu, { lop: 'income' })), kpi('Tổng chi', tien(d.tongChi, { lop: 'expense' })),
      kpi('Chi trung bình/ngày', tien(d.chiTrungBinhNgay), kpiPhu(`${d.soNgayCoChi} ngày có chi tiêu`)),
      kpi('Ngày chi nhiều nhất', d.chiNhieuNhat ? ngayVN(d.chiNhieuNhat.ngay) : '—', kpiPhu(d.chiNhieuNhat ? vnd(d.chiNhieuNhat.chi) : 'Chưa có chi tiêu'))));
    theoNgay = new Map(d.ngay.map((x) => [x.ngay, x]));
    const maxChi = Math.max(1, ...d.ngay.map((x) => x.chi));
    const lech = (new Date(Date.UTC(n, t - 1, 1)).getUTCDay() + 6) % 7; // thứ Hai là cột đầu
    const hom = homNay();
    const o7 = [...THU_TRONG_TUAN.map((x) => h('div', { class: 'lich-thu', 'aria-hidden': 'true' }, x)), ...Array.from({ length: lech }, () => h('div', { 'aria-hidden': 'true' }))];
    for (let i = 1; i <= d.soNgayTrongThang; i++) {
      const ngay = `${thang}-${String(i).padStart(2, '0')}`; const x = theoNgay.get(ngay);
      const nen = x?.chi ? `background:color-mix(in srgb, var(--tomato-f) ${Math.round(25 + (x.chi / maxChi) * 75)}%, var(--card))` : '';
      o7.push(h('button', { type: 'button', class: `lich-o${ngay === hom ? ' hom-nay' : ''}${ngay === ngayChon ? ' chon' : ''}${ngay > hom ? ' tuong-lai' : ''}`, style: nen,
        'aria-pressed': ngay === ngayChon ? 'true' : 'false',
        'aria-label': `Ngày ${i}/${t}${x ? `: thu ${vnd(x.thu)}, chi ${vnd(x.chi)}, ${x.soGiaoDich} giao dịch` : ': không có giao dịch'}`,
        title: x ? `Thu ${vnd(x.thu)} · Chi ${vnd(x.chi)}` : '',
        onclick: (e) => { ngayChon = ngay; luoi.querySelectorAll('.lich-o').forEach((b) => { const on = b === e.currentTarget; b.classList.toggle('chon', on); b.setAttribute('aria-pressed', on); }); xemNgay(); } },
      h('span', { class: 'so' }, i), x?.thu ? h('span', { class: 'thu' }, `+${gonLich(x.thu)}`) : null, x?.chi ? h('span', { class: 'chi' }, `−${gonLich(x.chi)}`) : null));
    }
    bo(luoi).append(h('div', { class: 'lich-luoi' }, o7), h('p', { class: 'hint lich-ghi' }, 'Bấm vào một ngày để xem chi tiết và ghi thêm giao dịch.'));
    xemNgay();
  }

  async function xemNgay() {
    bo(chiTiet);
    if (!ngayChon) { chiTiet.append(h('div', { class: 'card-h' }, h('h2', {}, 'Chi tiết ngày')), rong('calendar', 'Chọn một ngày trên lịch', 'Giao dịch của ngày đó sẽ hiện ở đây.')); return; }
    const r = await chay(() => api('GET', `/giao-dich?${qs({ tu: ngayChon, den: ngayChon })}`)); if (!r) return;
    const { thu = 0, chi = 0 } = theoNgay.get(ngayChon) ?? {};
    chiTiet.append(h('div', { class: 'card-h' }, h('h2', {}, `${thuCua(ngayChon)}, ${ngayVN(ngayChon)}`), h('span', { class: 'lich-tong' }, tien(thu, { dau: true, lop: 'income' }), ' · ', tien(-chi, { dau: true, lop: 'expense' }))),
      ...(r.muc.length ? r.muc.map((g) => dongGiaoDich(g)) : [rong('inbox', 'Không có giao dịch', 'Ngày này chưa ghi khoản nào.')]),
      ...(r.tongSo > r.muc.length ? [h('p', { class: 'hint lich-ghi' }, `Hiển thị ${r.muc.length}/${r.tongSo} giao dịch. Xem đủ ở trang Giao dịch.`)] : []),
      h('div', { class: 'acts lich-them' }, nut('Thêm giao dịch ngày này', { icon: 'plus', loai: 'primary', onclick: () => bieuMauGiaoDich(null, dsVi, dsDm, tai, ngayChon) })));
  }
  await tai();
}

async function xemHoaDon(g) {
  const hd = await chay(() => api('GET', `/giao-dich/${g.maGiaoDich}/hoa-don`));
  if (!hd?.maHoaDon) return;
  const dlg = hopThoai('Hóa đơn', h('div', { class: 'form' },
    hoaDon(h('div', { class: 'hd-in' },
      h('div', { class: 'hd-dau' }, h('b', {}, hd.tenCuaHang || 'Cửa hàng'), h('span', { class: 'num' }, ngayVN(hd.ngayHoaDon))),
      h('div', { class: 'tbl-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Mặt hàng'), h('th', { class: 'r' }, 'SL'), h('th', { class: 'r' }, 'Đơn giá'), h('th', { class: 'r' }, 'Thành tiền'))),
        h('tbody', {}, hd.chiTiet.map((c) => h('tr', {}, h('td', {}, c.tenMatHang), h('td', { class: 'r num' }, c.soLuong), h('td', { class: 'r num' }, so(c.donGia)), h('td', { class: 'r num' }, so(c.soLuong * c.donGia))))),
        h('tfoot', {}, h('tr', {}, h('td', { colspan: 3 }, 'Tổng cộng'), h('td', { class: 'r num' }, vnd(hd.tongTien)))))),
      hd.anhHoaDon ? h('img', { class: 'hd-anh', src: hd.anhHoaDon, alt: 'Ảnh hóa đơn' }) : null)),
    h('div', { class: 'acts' }, h('button', { type: 'button', class: 'btn', onclick: () => dlg.dong() }, 'Đóng'))), { rong: true });
}

const inputNgay = (giaTri) => chonNgayGio(giaTri);

// Hộp thoại thêm / sửa giao dịch (UC 3.5)
function bieuMauGiaoDich(g, dsVi, dsDm, sauKhiLuu, ngayMacDinh = null) {
  let loai = g?.loai ?? 'Chi';
  const tien_ = h('input', { type: 'number', min: 1, required: true, value: g?.soTien ?? '', placeholder: '0', inputmode: 'numeric', 'aria-label': 'Số tiền', 'aria-describedby': 'gd-goi-y' });
  const vi = chon(dsVi.map((v) => [v.maVi, `${v.tenVi} (${vnd(v.soDu)})`]), g?.maVi ?? dsVi[0]?.maVi, { 'aria-label': 'Ví' });
  const dmSel = h('select', { 'aria-label': 'Danh mục' });
  const ngay = inputNgay((g?.ngayGiaoDich ?? `${ngayMacDinh ?? homNay()}T${giaVN().toISOString().slice(11, 16)}`).slice(0, 16));
  const ghi = h('input', { type: 'text', maxlength: 200, value: g?.ghiChu ?? '', placeholder: 'VD: Cơm trưa với đồng nghiệp' });
  const goiY = h('div', { class: 'hint', id: 'gd-goi-y', 'aria-live': 'polite' });
  const seg = h('div', { class: 'phieu-loai', role: 'group', 'aria-label': 'Loại giao dịch' });
  const khungTien = h('div', { class: 'amount' }, tien_, h('span', { class: 'cur', 'aria-hidden': 'true' }, '₫'));
  const capGoiY = () => {
    const v = dsVi.find((x) => String(x.maVi) === vi.value); const st = Number(tien_.value) || 0;
    const thieu = !g && loai === 'Chi' && v && st > v.soDu; // chỉ gợi ý; máy chủ vẫn là nơi quyết định
    goiY.className = thieu ? 'err' : 'hint';
    goiY.replaceChildren(...(thieu ? [ic('circle-alert'), h('span', {}, `Số dư ví ${v.tenVi} không đủ: còn ${vnd(v.soDu)}.`)] : [v ? (loai === 'Chi' ? `Số dư ví ${v.tenVi}: ${vnd(v.soDu)}` : `Cộng vào ví ${v.tenVi}`) : '']));
    if (thieu) tien_.setAttribute('aria-invalid', 'true'); else tien_.removeAttribute('aria-invalid');
    khungTien.className = `amount ${loai === 'Thu' ? 'thu' : 'chi'}`;
  };
  tien_.addEventListener('input', capGoiY); vi.addEventListener('change', capGoiY);
  const veDm = () => { bo(dmSel).append(...dsDm.filter((d) => d.loai === loai && !(d.laHeThong)).map((d) => h('option', { value: d.maDanhMuc, selected: d.maDanhMuc === g?.maDanhMuc }, d.tenDanhMuc))); };
  const veSeg = () => { bo(seg).append(...['Chi', 'Thu'].map((l) => h('button', { type: 'button', class: `loai-nut ${l === 'Chi' ? 'chi' : 'thu'}`, 'aria-pressed': String(loai === l), onclick: () => { loai = l; veSeg(); veDm(); capGoiY(); } }, l))); };
  veSeg(); veDm(); capGoiY();
  const luu = h('button', { class: 'btn primary' }, 'Lưu');
  const dlg = hopThoai(g ? 'Sửa giao dịch' : 'Thêm giao dịch', h('form', { class: 'form', onsubmit: async (e) => {
    e.preventDefault(); dlg.loi(''); luu.disabled = true; luu.setAttribute('aria-busy', 'true');
    const body = { maVi: +vi.value, maDanhMuc: +dmSel.value, soTien: Number(tien_.value), loai, ngayGiaoDich: ngay.value, ghiChu: ghi.value || null };
    const r = await chay(() => (g ? api('PUT', `/giao-dich/${g.maGiaoDich}`, body) : api('POST', '/giao-dich', body)), dlg);
    luu.disabled = false; luu.removeAttribute('aria-busy');
    if (r) { dlg.dong(); if (!g && r.maGiaoDich) baoSuKien(`dong:${r.maGiaoDich}`); thongBao(g ? 'Đã cập nhật giao dịch' : 'Đã thêm giao dịch'); sauKhiLuu(); }
  } }, seg,
    h('div', { class: 'field' }, h('span', { class: 'lab' }, 'Số tiền'), khungTien, goiY),
    h('div', { class: 'two' }, truong('Danh mục', dmSel), truong('Ví', vi)),
    h('div', { class: 'two' }, truong('Ngày giờ', ngay), truong('Ghi chú', ghi)),
    h('div', { class: 'acts' }, h('button', { type: 'button', class: 'btn', onclick: () => dlg.dong() }, 'Hủy'), luu)));
}

// ================= Quét hóa đơn (UC 3.6) =================
function quetHoaDon(dsVi, dsDm, sauKhiLuu) {
  const khung = h('div', { class: 'modal-b' });
  const dlg = hopThoai('Quét hóa đơn', khung, { rong: true });
  // Đưa ảnh thẳng lên trang web: chọn tệp, chụp ảnh, kéo thả, hoặc dán ảnh từ clipboard (Ctrl+V); xem trước rồi bấm Quét.
  const chonAnh = h('input', { type: 'file', accept: 'image/png,image/jpeg', hidden: true, onchange: (e) => e.target.files[0] && xemTruoc(e.target.files[0]) });
  const chupAnh = h('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true, onchange: (e) => e.target.files[0] && xemTruoc(e.target.files[0]) });
  const vung = h('div', { class: 'drop', tabindex: 0, role: 'button', 'aria-label': 'Chọn ảnh hóa đơn', onclick: () => chonAnh.click(), onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); chonAnh.click(); } },
    ondragover: (e) => { e.preventDefault(); vung.classList.add('over'); }, ondragleave: () => vung.classList.remove('over'),
    ondrop: (e) => { e.preventDefault(); vung.classList.remove('over'); e.dataTransfer.files[0] && xemTruoc(e.dataTransfer.files[0]); } },
    h('span', { class: 'dz-i' }, ic('upload')), h('b', {}, 'Kéo ảnh hóa đơn vào đây, hoặc dán (Ctrl+V)'), h('p', { class: 'muted' }, 'Chỉ nhận ảnh JPG/PNG, tối đa 5 MB. Chụp đủ bốn góc và đủ sáng.'));
  const veChon = () => bo(khung).append(vung, chonAnh, chupAnh, h('div', { class: 'acts' },
    h('button', { type: 'button', class: 'btn', onclick: () => chupAnh.click() }, ic('camera'), 'Chụp ảnh'), h('button', { type: 'button', class: 'btn primary', onclick: () => chonAnh.click() }, ic('image'), 'Chọn ảnh')));
  const dan = (e) => { if (!khung.isConnected) { document.removeEventListener('paste', dan); return; } const f = [...(e.clipboardData?.files ?? [])].find((x) => x.type.startsWith('image/')); if (f) { e.preventDefault(); xemTruoc(f); } };
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
      h('div', { class: 'form' }, h('p', { class: 'dlg-p' }, h('b', {}, file.name || 'Ảnh dán từ clipboard')), h('p', { class: 'muted small' }, `${Math.round(file.size / 1024)} KB · hãy kiểm tra ảnh rõ nét, đủ các dòng mặt hàng rồi bấm Quét hóa đơn.`))),
      h('div', { class: 'acts' }, h('button', { type: 'button', class: 'btn', onclick: veChon }, 'Chọn ảnh khác'), h('button', { type: 'button', class: 'btn primary', onclick: () => xuLy(file, url) }, ic('scan-line'), 'Quét hóa đơn')));
  }

  async function xuLy(file, preview) {
    bo(khung).append(h('div', { class: 'scan' }, h('img', { src: preview, alt: 'Ảnh hóa đơn đang đọc' }),
      h('div', { class: 'scan-load', role: 'status', 'aria-live': 'polite' }, h('b', {}, 'Đang đọc hóa đơn…'), h('i', { class: 'sk', style: 'width:40%' }), h('i', { class: 'sk', style: 'height:36px' }), h('i', { class: 'sk', style: 'width:60%' }), h('i', { class: 'sk' }), h('i', { class: 'sk', style: 'width:85%' }))));
    const form = new FormData(); form.append('anh', file);
    let nhap = null; let thongDiep = '';
    try { nhap = await api('POST', '/hoa-don/quet', form); } catch (e) { thongDiep = e.message; }
    // Nhận dạng lỗi -> chuyển sang nhập tay (extend "Nhập tay khi nhận dạng lỗi"); ảnh vẫn được giữ.
    if (!nhap && !/nhận dạng/i.test(thongDiep)) { veChon(); dlg.loi(thongDiep); return; }
    veBanNhap(nhap ?? { anhUrl: '', tenCuaHang: '', ngay: homNay(), tongTien: 0, matHang: [{ ten: '', soLuong: 1, donGia: 0 }] }, preview, !nhap);
  }

  function veBanNhap(b, preview, nhapTay) {
    const cuaHang = h('input', { value: b.tenCuaHang ?? '', placeholder: 'Tên cửa hàng' });
    const ngay = chonNgay({ giaTri: b.ngay ?? homNay(), nhan: 'Ngày hóa đơn' });
    const dmChi = dsDm.filter((d) => d.loai === 'Chi' && !d.laHeThong);
    const dmSel = chon(dmChi.map((d) => [d.maDanhMuc, d.tenDanhMuc]), dmChi[0]?.maDanhMuc);
    const viSel = chon(dsVi.map((v) => [v.maVi, `${v.tenVi} (${vnd(v.soDu)})`]), dsVi[0]?.maVi);
    const tong = h('b', { class: 'num' });
    const tbody = h('tbody');
    const dong = (m) => {
      const ten = h('input', { value: m.ten, placeholder: 'Tên mặt hàng', 'aria-label': 'Tên mặt hàng', oninput: cap }); const sl = h('input', { type: 'number', min: 1, value: m.soLuong, 'aria-label': 'Số lượng', oninput: cap, style: 'width:72px' });
      const gia = h('input', { type: 'number', min: 0, value: m.donGia, 'aria-label': 'Đơn giá', oninput: cap, style: 'width:112px' });
      const tr = h('tr', {}, h('td', {}, ten), h('td', {}, sl), h('td', {}, gia), h('td', { class: 'r num' }, ''),
        h('td', {}, nutIcon('x', 'Xóa dòng', { loai: 'ghost sm danger', onclick: () => { tr.remove(); cap(); } })));
      tr.lay = () => ({ tenMatHang: ten.value, soLuong: +sl.value || 1, donGia: +gia.value || 0 });
      return tr;
    };
    function cap() {
      let t = 0;
      for (const tr of tbody.children) { const c = tr.lay(); t += c.soLuong * c.donGia; tr.children[3].textContent = so(c.soLuong * c.donGia); }
      tong.textContent = vnd(t); tong.dataset.v = t;
    }
    (b.matHang.length ? b.matHang : [{ ten: '', soLuong: 1, donGia: 0 }]).forEach((m) => tbody.append(dong(m)));
    const luu = h('button', { type: 'button', class: 'btn primary' }, 'Lưu giao dịch');
    luu.onclick = async () => {
      dlg.loi(''); luu.disabled = true; luu.setAttribute('aria-busy', 'true');
      const chiTiet = [...tbody.children].map((tr) => tr.lay()).filter((c) => c.tenMatHang.trim());
      const soTien = Number(tong.dataset.v);
      const r = await chay(() => api('POST', '/giao-dich', { maVi: +viSel.value, maDanhMuc: +dmSel.value, soTien, loai: 'Chi', ngayGiaoDich: `${ngay.value}T12:00:00`,
        ghiChu: cuaHang.value ? `Hóa đơn ${cuaHang.value}` : 'Hóa đơn', hoaDon: { tenCuaHang: cuaHang.value || null, ngayHoaDon: ngay.value, anhHoaDon: b.anhUrl, chiTiet } }), dlg);
      luu.disabled = false; luu.removeAttribute('aria-busy');
      if (r) { dlg.dong(); thongBao('Đã lưu giao dịch chi từ hóa đơn'); sauKhiLuu(); }
    };
    bo(khung).append(
      nhapTay ? h('div', { class: 'err', role: 'alert' }, ic('circle-alert'), h('span', {}, 'Không nhận dạng được hóa đơn. Ảnh vẫn được giữ, bạn hãy nhập tay thông tin bên dưới.')) : h('p', { class: 'dlg-p' }, 'Hãy kiểm tra và chỉnh sửa thông tin được nhận dạng rồi bấm Lưu.'),
      h('div', { class: 'scan' }, h('img', { src: preview, alt: 'Ảnh hóa đơn đã chọn' }),
        h('div', { class: 'form' }, h('div', { class: 'two' }, truong('Cửa hàng', cuaHang), truong('Ngày', ngay)),
          h('div', { class: 'items tbl-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Mặt hàng'), h('th', {}, 'SL'), h('th', {}, 'Đơn giá'), h('th', { class: 'r' }, 'Thành tiền'), h('th', {}, h('span', { class: 'sr' }, 'Xóa')))), tbody)),
          h('div', { class: 'cardfoot' }, nut('Thêm dòng', { icon: 'plus', loai: 'sm', onclick: () => { tbody.append(dong({ ten: '', soLuong: 1, donGia: 0 })); } }), h('span', {}, 'Tổng tiền: ', tong)),
          h('div', { class: 'two' }, truong('Danh mục chi', dmSel), truong('Ví thanh toán', viSel)))),
      h('div', { class: 'acts' }, h('button', { type: 'button', class: 'btn', onclick: () => dlg.dong() }, 'Hủy'), luu));
    cap();
  }
}

// ================= Ví =================
export async function trangVi(root) {
  const luoi = h('div', { class: 'the-luoi vi-ds' });
  const tomTat = h('div', { class: 'page-in' });
  const lichSu = h('section', { class: 'so-ke hep' });
  let dsVi = [];
  datHanhDong(nut('Chuyển tiền', { icon: 'arrow-left-right', ghiNhan: true, onclick: () => chuyenTien() }), nut('Thêm ví', { icon: 'plus', loai: 'primary', ghiNhan: true, onclick: () => bieuMau(null) }));
  root.append(tomTat, luoi, lichSu);
  const gio = (iso) => `${ngayVN(iso).slice(0, 5)} ${gioVN(iso)}`;
  async function tai() {
    const ds = await chay(() => api('GET', '/vi')); if (!ds) { hienLoi(luoi, tai); return; }
    dsVi = ds; taiLichSu();
    const gan = await Promise.all(ds.map((v) => api('GET', `/giao-dich?${qs({ viId: v.maVi })}`).then((r) => r?.muc?.[0] ?? null).catch(() => null)));
    const tong = ds.reduce((s, v) => s + v.soDu, 0); const lon = [...ds].sort((a, b) => b.soDu - a.soDu)[0];
    const pc = (v) => (tong > 0 ? Math.round((Math.max(0, v.soDu) / tong) * 100) : 0);
    const moiNhat = gan.filter(Boolean).sort((a, b) => b.ngayGiaoDich.localeCompare(a.ngayGiaoDich))[0];
    datPhuDe(`Tổng số dư ${vnd(tong)}`);
    bo(tomTat).append(ds.length ? dai(kpi('Tổng số dư', nenChay('vi-tong') ? demSo(tien(tong), tong) : tien(tong), kpiPhu(`${ds.length} ví`)), kpi('Ví lớn nhất', lon.tenVi, kpiPhu(`${pc(lon)}% tổng số dư`)),
      kpi('Giao dịch gần nhất', moiNhat ? gio(moiNhat.ngayGiaoDich) : '–', kpiPhu(moiNhat ? `${moiNhat.ghiChu || moiNhat.tenDanhMuc} · ${moiNhat.tenVi}` : 'Chưa có giao dịch'))) : null);
    bo(luoi);
    if (!ds.length) { luoi.append(h('div', { class: 'card', style: 'grid-column:1/-1' }, rong('wallet', 'Chưa có ví nào', 'Thêm ví để bắt đầu ghi chép thu chi.', nut('Thêm ví', { icon: 'plus', loai: 'primary', onclick: () => bieuMau(null) })))); return; }
    const demLoai = {};
    luoi.append(...ds.map((v, i) => { const k = demLoai[v.loaiVi] ?? 0; demLoai[v.loaiVi] = k + 1;
      return theVi(v, { pc: pc(v), i, dem: k,
        thaoTac: h('span', { class: 'ra' }, nutIcon('pencil', `Sửa ví ${v.tenVi}`, { loai: 'ghost sm', onclick: () => bieuMau(v) }),
          nutIcon('trash-2', `Xóa ví ${v.tenVi}`, { loai: 'ghost sm danger', onclick: async () => { if (await xacNhan(`Xóa ví "${v.tenVi}"?`) && await chay(() => api('DELETE', `/vi/${v.maVi}`)) !== undefined) { thongBao('Đã xóa ví'); tai(); } } })),
        phu: h('span', { class: 'tv-gan' }, gan[i] ? `Gần nhất ${gio(gan[i].ngayGiaoDich)}` : 'Chưa có giao dịch') }); }));
  }
  async function taiLichSu() {
    const ls = await chay(() => api('GET', '/chuyen-tien')); if (!ls) return;
    bo(lichSu).append(h('span', { class: 'le', 'aria-hidden': 'true' }), h('div', { class: 'so-hd' }, h('h2', {}, 'Lịch sử chuyển tiền')),
      ...(ls.length ? ls.map((c) => h('div', { class: 'ct-dong' }, h('span', { class: 'gd-ngay' }, ngayVN(c.ngayChuyen).slice(0, 5)),
        h('span', { class: 'gd-t' }, h('b', {}, `${c.tenViNguon} → ${c.tenViDich}`), h('span', {}, `${gioVN(c.ngayChuyen)}${c.ghiChu ? ` · ${c.ghiChu}` : ''}`)), h('b', { class: 'gd-tien num' }, vnd(c.soTien)))) : [rong('arrow-left-right', 'Chưa có lần chuyển tiền nào', 'Chuyển tiền giữa các ví để thấy lịch sử ở đây.')]));
  }
  function chuyenTien() {
    if (dsVi.length < 2) { thongBao('Cần ít nhất hai ví để chuyển tiền', true); return; }
    const nguon = chon(dsVi.map((v) => [v.maVi, `${v.tenVi} (${vnd(v.soDu)})`]), dsVi[0].maVi);
    const dich = chon(dsVi.map((v) => [v.maVi, v.tenVi]), dsVi[1].maVi);
    const st = h('input', { type: 'number', min: 1, required: true, inputmode: 'numeric' });
    const gc = h('input', { maxlength: 200 });
    const dlg = hopThoai('Chuyển tiền giữa ví', h('form', { class: 'form', onsubmit: async (e) => {
      e.preventDefault();
      const r = await chay(() => api('POST', '/chuyen-tien', { maViNguon: +nguon.value, maViDich: +dich.value, soTien: Number(st.value), ghiChu: gc.value }), dlg);
      if (r !== undefined) { dlg.dong(); thongBao('Đã chuyển tiền'); tai(); }
    } }, h('div', { class: 'two' }, truong('Từ ví', nguon), truong('Đến ví', dich)), truong('Số tiền (₫)', st), truong('Ghi chú', gc),
      h('div', { class: 'acts' }, h('button', { type: 'button', class: 'btn', onclick: () => dlg.dong() }, 'Hủy'), h('button', { class: 'btn primary' }, 'Chuyển'))));
  }
  function bieuMau(v) {
    const ten = h('input', { value: v?.tenVi ?? '', required: true, maxlength: 50 });
    const loai = chon(Object.entries(NHAN_VI), v?.loaiVi ?? 'TienMat');
    const sd = h('input', { type: 'number', min: 0, value: 0, inputmode: 'numeric' });
    const dlg = hopThoai(v ? 'Sửa ví' : 'Thêm ví', h('form', { class: 'form', onsubmit: async (e) => {
      e.preventDefault();
      const r = await chay(() => (v ? api('PUT', `/vi/${v.maVi}`, { tenVi: ten.value, loaiVi: loai.value }) : api('POST', '/vi', { tenVi: ten.value, loaiVi: loai.value, soDuBanDau: Number(sd.value) })), dlg);
      if (r !== undefined) { dlg.dong(); thongBao('Đã lưu ví'); tai(); }
    } }, truong('Tên ví', ten), truong('Loại ví', loai), v ? null : truong('Số dư ban đầu (₫)', sd),
      h('div', { class: 'acts' }, h('button', { type: 'button', class: 'btn', onclick: () => dlg.dong() }, 'Hủy'), h('button', { class: 'btn primary' }, 'Lưu'))));
  }
  await tai();
}

// ================= Danh mục =================
export async function trangDanhMuc(root) {
  const luoi = h('div', { class: 'row2 eq' });
  datHanhDong(nut('Thêm danh mục', { icon: 'plus', loai: 'primary', ghiNhan: true, onclick: () => bieuMau(null) }));
  root.append(luoi);
  async function tai() {
    dangTai(luoi, 6);
    const tu = `${thangNay()}-01`; const den = homNay();
    const [tatCa, chi, thu] = await Promise.all([chay(() => api('GET', '/danh-muc')), chay(() => api('GET', `/bao-cao/theo-danh-muc?${qs({ tu, den, loai: 'Chi' })}`)), chay(() => api('GET', `/bao-cao/theo-danh-muc?${qs({ tu, den, loai: 'Thu' })}`))]);
    if (!tatCa) { hienLoi(luoi, tai); return; }
    bo(luoi);
    const soChi = tatCa.filter((d) => d.loai === 'Chi' && !d.laHeThong).length; const soThu = tatCa.filter((d) => d.loai === 'Thu' && !d.laHeThong).length;
    datPhuDe(`${soChi} danh mục chi · ${soThu} danh mục thu`);
    const khoiLoai = (loai, bc, kieu) => {
      const ds = tatCa.filter((d) => d.loai === loai && !d.laHeThong);
      const so_ = new Map((bc ?? []).map((x) => [x.maDanhMuc, x]));
      const tong = (bc ?? []).reduce((s, x) => s + x.soTien, 0);
      const sx = [...ds].sort((a, b) => (so_.get(b.maDanhMuc)?.soTien ?? 0) - (so_.get(a.maDanhMuc)?.soTien ?? 0));
      return h('section', { class: `card flush ${kieu}` },
        h('div', { class: 'card-h' }, h('h2', {}, loai === 'Chi' ? 'Danh mục chi' : 'Danh mục thu'), h('span', { class: 'muted num' }, `${ds.length} danh mục · ${vnd(tong)}`)),
        tong > 0 ? h('div', { class: 'xep-w' }, thanhXep(bc, { tong, tieuDe: `Cơ cấu ${loai === 'Chi' ? 'chi' : 'thu'} tháng này` })) : null,
        sx.length ? sx.map((d) => { const x = so_.get(d.maDanhMuc); const sua = !d.laMacDinh;
          return h('div', { class: 'txr' }, tile(d.bieuTuong, '', d.mauSac),
            h('div', {}, h('div', { class: 't1' }, h('span', {}, d.tenDanhMuc)), h('div', { class: 't2' }, x ? `${String(x.tyLe).replace('.', ',')}% tổng ${loai === 'Chi' ? 'chi' : 'thu'} tháng này` : 'Chưa có giao dịch tháng này', d.laMacDinh ? ' · mặc định' : '')),
            h('span', { class: 'amt' }, tien(x?.soTien ?? 0)),
            sua ? h('span', { class: 'ra' }, nutIcon('pencil', `Sửa danh mục ${d.tenDanhMuc}`, { loai: 'ghost sm', onclick: () => bieuMau(d) }), nutIcon('trash-2', `Xóa danh mục ${d.tenDanhMuc}`, { loai: 'ghost sm danger', onclick: () => xoa(d, ds) })) : h('span')); })
          : rong('tags', `Chưa có danh mục ${loai === 'Chi' ? 'chi' : 'thu'}`));
    };
    luoi.append(khoiLoai('Chi', chi, 'a'), khoiLoai('Thu', thu, 'b'));
  }
  function bieuMau(d) {
    const ten = h('input', { value: d?.tenDanhMuc ?? '', required: true, maxlength: 40 }); const mau = h('input', { type: 'color', value: d?.mauSac ?? '#1e88e5', 'aria-label': 'Màu danh mục' });
    const loai = chon([['Chi', 'Chi'], ['Thu', 'Thu']], d?.loai ?? 'Chi', { disabled: !!d, 'aria-label': 'Loại danh mục' });
    const dlg = hopThoai(d ? 'Sửa danh mục' : 'Thêm danh mục', h('form', { class: 'form', onsubmit: async (e) => {
      e.preventDefault();
      const body = { tenDanhMuc: ten.value, loai: loai.value, mauSac: mau.value };
      const r = await chay(() => (d ? api('PUT', `/danh-muc/${d.maDanhMuc}`, body) : api('POST', '/danh-muc', body)), dlg);
      if (r !== undefined) { dlg.dong(); thongBao('Đã lưu danh mục'); tai(); }
    } }, truong('Tên danh mục', ten), h('div', { class: 'two' }, truong('Loại', loai), truong('Màu', mau)),
      h('div', { class: 'acts' }, h('button', { type: 'button', class: 'btn', onclick: () => dlg.dong() }, 'Hủy'), h('button', { class: 'btn primary' }, 'Lưu'))));
  }
  function xoa(d, cungLoai) {
    const khac = cungLoai.filter((x) => x.maDanhMuc !== d.maDanhMuc && !x.laHeThong);
    const sel = chon([['', '— Không chuyển (chỉ khi danh mục chưa dùng) —'], ...khac.map((x) => [x.maDanhMuc, x.tenDanhMuc])], '', { 'aria-label': 'Chuyển sang danh mục' });
    const dlg = hopThoai('Xóa danh mục', h('div', { class: 'form' }, h('p', { class: 'dlg-p' }, `Xóa "${d.tenDanhMuc}". Nếu đang được dùng, giao dịch và ngân sách sẽ chuyển sang danh mục cùng loại bạn chọn:`), sel,
      h('div', { class: 'acts' }, h('button', { type: 'button', class: 'btn', onclick: () => dlg.dong() }, 'Hủy'),
        h('button', { type: 'button', class: 'btn danger strong', onclick: async () => {
          const r = await chay(() => api('DELETE', `/danh-muc/${d.maDanhMuc}${sel.value ? `?chuyenSang=${sel.value}` : ''}`), dlg);
          if (r !== undefined) { dlg.dong(); thongBao('Đã xóa danh mục'); tai(); }
        } }, ic('trash-2'), 'Xóa'))));
  }
  await tai();
}

// ================= Giao dịch định kỳ =================
export async function trangDinhKy(root) {
  const dau = h('div', { class: 'page-in' }); const vung = h('div', { class: 'card flush' });
  datHanhDong(nut('Thêm định kỳ', { icon: 'plus', loai: 'primary', ghiNhan: true, onclick: () => bieuMau(null) }));
  root.append(h('ul', { class: 'note-list mot' }, giayNho('Hệ thống tự tạo giao dịch vào ngày đã chọn mỗi tháng (đúng một lần/tháng). Nếu ví không đủ số dư, tháng đó bị bỏ qua và bạn nhận một thông báo.', { mau: 'y', icon: 'repeat', i: 1 })), dau, vung);
  /** Ngày ghi kế tiếp theo ngày trong tháng (tính ở trình duyệt, theo giờ Việt Nam). */
  const ke = (n) => { const [y, m, d] = homNay().split('-').map(Number); let yy = y; let mm = m; if (n < d) { mm += 1; if (mm > 12) { mm = 1; yy += 1; } } return `${yy}-${String(mm).padStart(2, '0')}-${String(n).padStart(2, '0')}`; };
  const cach = (iso) => Math.round((Date.parse(iso) - Date.parse(homNay())) / 86400000);
  async function tai() {
    dangTai(vung, 4); bo(dau);
    const ds = await chay(() => api('GET', '/giao-dich-dinh-ky')); if (!ds) { hienLoi(vung, tai); return; }
    datPhuDe(`${ds.filter((g) => g.dangBat).length} khoản lặp lại mỗi tháng`);
    if (!ds.length) { bo(vung).append(rong('repeat', 'Chưa có giao dịch định kỳ nào', 'Thêm khoản lặp lại hằng tháng như tiền nhà, lương, internet.', nut('Thêm định kỳ', { icon: 'plus', loai: 'primary', onclick: () => bieuMau(null) }))); return; }
    const bat = ds.filter((g) => g.dangBat); const tong = (l) => bat.filter((g) => g.loai === l).reduce((s, g) => s + g.soTien, 0);
    const sap = bat.map((g) => ({ g, ngay: ke(g.ngayTrongThang) })).sort((a, b) => a.ngay.localeCompare(b.ngay))[0];
    bo(dau).append(dai(kpi('Thu định kỳ mỗi tháng', tien(tong('Thu')), kpiPhu(`${bat.filter((g) => g.loai === 'Thu').length} khoản đang chạy`), 'income'), kpi('Chi định kỳ mỗi tháng', tien(tong('Chi')), kpiPhu(`${bat.filter((g) => g.loai === 'Chi').length} khoản đang chạy`), 'expense'),
      kpi('Đang chạy', `${bat.length}/${ds.length}`, kpiPhu(ds.length - bat.length ? `${ds.length - bat.length} khoản tạm dừng` : 'Không có khoản tạm dừng')),
      kpi('Khoản kế tiếp', sap ? (sap.g.ghiChu || sap.g.tenDanhMuc) : '–', kpiPhu(sap ? `${ngayVN(sap.ngay)} · ${cach(sap.ngay) === 0 ? 'hôm nay' : `sau ${cach(sap.ngay)} ngày`}` : 'Chưa có khoản đang chạy'))));
    bo(vung).append(h('div', { class: 'tbl-wrap' }, h('table', { class: 'dk-t' }, h('thead', {}, h('tr', {}, ['Mô tả', 'Danh mục', 'Chu kỳ', 'Lần ghi tiếp theo', 'Ví'].map((t) => h('th', { scope: 'col' }, t)), h('th', { scope: 'col', class: 'r' }, 'Số tiền'), h('th', { scope: 'col', class: 'r' }, 'Trạng thái'), h('th', { scope: 'col' }, h('span', { class: 'sr' }, 'Thao tác')))),
      h('tbody', {}, ds.map((g) => h('tr', { class: g.dangBat ? '' : 'off' },
        h('td', {}, h('span', { class: 'cell-n' }, g.bieuTuong ? tile(g.bieuTuong, 'sm', g.mauSac) : h('span', { class: 'tile sm', 'aria-hidden': 'true' }, ic('repeat')), h('span', {}, g.ghiChu || g.tenDanhMuc))),
        h('td', { class: 'sub', 'data-l': 'Danh mục' }, g.tenDanhMuc), h('td', { class: 'sub', 'data-l': 'Chu kỳ' }, `Hằng tháng · ngày ${String(g.ngayTrongThang).padStart(2, '0')}`), h('td', { class: 'num sub', 'data-l': 'Lần ghi tiếp theo' }, g.dangBat ? ngayVN(ke(g.ngayTrongThang)) : '–'), h('td', { class: 'sub', 'data-l': 'Ví' }, g.tenVi),
        h('td', { class: 'r', 'data-l': 'Số tiền' }, tien(g.loai === 'Thu' ? g.soTien : -g.soTien, { dau: true, lop: g.loai === 'Thu' ? 'income' : 'expense' })),
        h('td', { class: 'r' }, h('span', { class: 'rt' }, h('span', { class: 'xs sub' }, g.dangBat ? 'Đang chạy' : 'Tạm dừng'),
          congTac(`Bật hoặc tắt giao dịch định kỳ ${g.ghiChu || g.tenDanhMuc}`, g.dangBat, async (moi) => { await chay(() => api('PUT', `/giao-dich-dinh-ky/${g.maDinhKy}/bat-tat`, { dangBat: moi })); tai(); }))),
        h('td', {}, h('span', { class: 'ra' }, nutIcon('pencil', 'Sửa giao dịch định kỳ', { loai: 'ghost sm', onclick: () => bieuMau(g) }),
          nutIcon('trash-2', 'Xóa giao dịch định kỳ', { loai: 'ghost sm danger', onclick: async () => { if (await xacNhan('Xóa giao dịch định kỳ này?') && await chay(() => api('DELETE', `/giao-dich-dinh-ky/${g.maDinhKy}`)) !== undefined) { thongBao('Đã xóa'); tai(); } } })))))))));
  }
  async function bieuMau(g) {
    const [dsVi, dsDm] = await Promise.all([api('GET', '/vi'), api('GET', '/danh-muc')]);
    const loai = chon([['Chi', 'Chi'], ['Thu', 'Thu']], g?.loai ?? 'Chi');
    const dm = h('select', {});
    const napDm = () => { dm.replaceChildren(...dsDm.filter((d) => d.loai === loai.value && !d.laHeThong).map((d) => h('option', { value: d.maDanhMuc, selected: g?.maDanhMuc === d.maDanhMuc }, d.tenDanhMuc))); };
    loai.addEventListener('change', napDm); napDm();
    const vi = chon(dsVi.map((v) => [v.maVi, v.tenVi]), g?.maVi ?? dsVi[0]?.maVi);
    const st = h('input', { type: 'number', min: 1, required: true, value: g?.soTien ?? '', inputmode: 'numeric' });
    const ngay = h('input', { type: 'number', min: 1, max: 28, required: true, value: g?.ngayTrongThang ?? 1, inputmode: 'numeric' });
    const gc = h('input', { maxlength: 200, value: g?.ghiChu ?? '' });
    const dlg = hopThoai(g ? 'Sửa giao dịch định kỳ' : 'Thêm giao dịch định kỳ', h('form', { class: 'form', onsubmit: async (e) => {
      e.preventDefault();
      const body = { maVi: +vi.value, maDanhMuc: +dm.value, soTien: Number(st.value), loai: loai.value, ngayTrongThang: Number(ngay.value), ghiChu: gc.value };
      const r = await chay(() => (g ? api('PUT', `/giao-dich-dinh-ky/${g.maDinhKy}`, body) : api('POST', '/giao-dich-dinh-ky', body)), dlg);
      if (r !== undefined) { dlg.dong(); thongBao('Đã lưu'); tai(); }
    } }, h('div', { class: 'two' }, truong('Loại', loai), truong('Danh mục', dm)), h('div', { class: 'two' }, truong('Ví', vi), truong('Số tiền (₫)', st)), h('div', { class: 'two' }, truong('Ngày trong tháng (1-28)', ngay), truong('Ghi chú', gc)),
      h('div', { class: 'acts' }, h('button', { type: 'button', class: 'btn', onclick: () => dlg.dong() }, 'Hủy'), h('button', { class: 'btn primary' }, 'Lưu'))));
  }
  await tai();
}

export { PHIEN };
