import { api, qs, h, bo, vnd, so, ngayVN, gioVN, homNay, thangNay, tachThang, thongBao, hopThoai, xacNhan, truong, truongMatKhau, truongAn, chon, chay, ic, nut, nutIcon, tien, tile, tileIcon, chip, rong, dangTai, hienLoi, datHanhDong, datPhuDe, phanDoan, chonThang, congTac, CHE_DO, trangThaiNS, kpi, dai, kpiPhu, rutGon } from './core.js';
import { heo, hu, bieuDoThuChi, chuGiai, thanhXep, giayNho, dauMoc, markTien, mauTrangThai, hoaDon, bangDinh } from './ve.js';
import { chonNgay } from './lich.js';

const acts = (dong, nhan = 'Lưu') => h('div', { class: 'acts' }, h('button', { type: 'button', class: 'btn', onclick: () => dong() }, 'Hủy'), h('button', { class: 'btn primary' }, nhan));
/** Khóa nút gửi của biểu mẫu trong lúc chờ máy chủ, tránh bấm hai lần. */
async function khoaNut(form, fn) {
  const b = form.querySelector('button:not([type])'); if (b) { b.disabled = true; b.setAttribute('aria-busy', 'true'); }
  try { return await fn(); } finally { if (b) { b.disabled = false; b.removeAttribute('aria-busy'); } }
}
const thanhTab = (ds, cur, doi) => h('div', { class: 'tabs', role: 'tablist' }, ds.map(([k, t]) => h('button', { type: 'button', role: 'tab', 'aria-selected': String(cur === k), onclick: () => doi(k) }, t)));
const card = (tieuDe, ...con) => h('div', { class: 'card' }, tieuDe ? h('div', { class: 'card-h' }, h('h2', {}, tieuDe)) : null, ...con);

// ================= Ngân sách (UC 3.7) =================
export async function trangNganSach(root) {
  let thang = thangNay(); let boLoc = 'all'; let ds = []; let bt = {};
  const dau = h('div', { class: 'page-in' }); const vung = h('div', { class: 'page-in' });
  datPhuDe('Mỗi danh mục là một hũ');
  datHanhDong(chonThang(thang, (v) => { thang = v; tai(); }), nut('Thêm hũ mới', { icon: 'plus', loai: 'primary', ghiNhan: true, onclick: () => bieuMau(null) }));
  root.append(dau, vung);

  async function tai() {
    const [t, n] = tachThang(thang);
    bo(dau); dangTai(vung, 5);
    const [r, dm] = await Promise.all([chay(() => api('GET', `/ngan-sach?${qs({ thang: t, nam: n })}`)), chay(() => api('GET', '/danh-muc?loai=Chi'))]);
    if (!r) { hienLoi(vung, tai); return; }
    bt = Object.fromEntries((dm ?? []).map((d) => [d.maDanhMuc, d.bieuTuong]));
    ds = [...r].sort((a, b) => b.tienDo - a.tienDo);
    ve();
  }
  function ve() {
    const [t] = tachThang(thang);
    const trang = (x) => trangThaiNS(x.tienDo, x.nguongCanhBao);
    const canChuY = ds.filter((x) => trang(x).cls);
    const tongHan = ds.reduce((s, x) => s + x.hanMuc, 0); const tongChi = ds.reduce((s, x) => s + x.soDaChi, 0);
    const tp = tongHan ? Math.round((tongChi / tongHan) * 100) : 0;
    bo(dau); bo(vung);
    if (!ds.length) { vung.append(h('div', { class: 'card' }, rong('gauge', 'Chưa có hũ nào cho tháng này', 'Đặt hạn mức chi cho từng danh mục để được cảnh báo khi sắp vượt.', nut('Thêm hũ mới', { icon: 'plus', loai: 'primary', onclick: () => bieuMau(null) }), hu({ day: 0, kich: 110 })))); return; }
    // Thẻ tóm tắt tháng: câu, thanh lớn có vạch hạn mức
    const vuotTong = tongChi > tongHan; const trangTong = vuotTong ? 'bad' : canChuY.length ? 'warn' : 'ok';
    const thang_ = Math.max(tongHan, tongChi, 1);
    dau.append(h('section', { class: 'card ns-tt', 'aria-label': `Tóm tắt ngân sách tháng ${t}` },
      h('span', { class: `tt-ic ${trangTong}`, 'aria-hidden': 'true' }, ic(trangTong === 'ok' ? 'circle-check' : 'triangle-alert', 'nhoe-nho')),
      h('p', { class: 'cau' }, `Tháng ${t} bạn đặt `, h('b', { class: 'num' }, vnd(tongHan)), ` cho ${ds.length} hũ, đã chi `, h('b', { class: 'num' }, vnd(tongChi)), ', tức là ', vuotTong ? markTien(`vượt ${vnd(tongChi - tongHan)}`, 'chi') : markTien(`còn ${vnd(tongHan - tongChi)}`, 'thu'), '.'),
      h('div', { class: 'ns-thanh' }, h('div', { class: `bar to ${trangTong === 'bad' ? 'bad' : trangTong === 'warn' ? 'warn' : ''}`, role: 'progressbar', 'aria-valuenow': Math.min(100, tp), 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuetext': `Đã dùng ${tp}% tổng hạn mức`, 'aria-label': 'Tổng ngân sách đã dùng' },
        h('i', { style: `width:${(tongChi / thang_) * 100}%` }), h('u', { style: `left:${(tongHan / thang_) * 100}%` })),
      h('span', { class: 'ns-nhan' }, h('span', {}, `đã dùng ${tp}%`), h('span', {}, `${canChuY.length}/${ds.length} hũ cần để ý`)))));
    const hien = boLoc === 'all' ? ds : boLoc === 'attn' ? canChuY : ds.filter((x) => !trang(x).cls);
    const cnt = (n) => h('span', { class: 'num cnt2' }, String(n));
    vung.append(phanDoan('Lọc ngân sách', [['all', ['Tất cả ', cnt(ds.length)]], ['attn', ['Cần để ý ', cnt(canChuY.length)]], ['ok', ['Trong hạn mức ', cnt(ds.length - canChuY.length)]]], boLoc, (v) => { boLoc = v; ve(); }, { kieu: 'tab-hu' }));
    // Kệ hũ
    const dsNguong = [...new Set(ds.map((x) => x.nguongCanhBao))];
    const chuThich = dsNguong.length === 1 ? `Vạch đứt trong hũ là ngưỡng cảnh báo ${dsNguong[0]}%. Hũ tràn nắp là đã vượt hạn mức.` : 'Vạch đứt trong hũ là ngưỡng cảnh báo của từng hũ. Hũ tràn nắp là đã vượt hạn mức.';
    const theHu = (x, i) => {
      const m = mauTrangThai(x.tienDo, x.nguongCanhBao); const pc = Math.round(x.tienDo);
      const conLai = x.hanMuc - x.soDaChi;
      const tt = x.tienDo > 100 ? `Tràn ra ${vnd(-conLai)}` : x.tienDo === 100 ? 'Vừa chạm hạn mức' : x.tienDo >= x.nguongCanhBao ? `Còn ${vnd(conLai)}, qua vạch cảnh báo` : `Còn ${vnd(conLai)}`;
      return h('article', { class: 'hu-the', style: `border-radius:var(${i % 2 ? '--ra' : '--rb'})`, 'aria-labelledby': `hu-${x.maNganSach}` },
        dauMoc(m.moc, m.loai, [8, -6, 5, -4][i % 4], 'goc'),
        hu({ day: x.tienDo / 100, canhBao: x.nguongCanhBao / 100, mau: m.to, kich: 150, nhan: `Hũ ${x.tenDanhMuc} đã dùng ${pc}%, vạch cảnh báo ${x.nguongCanhBao}%` }),
        h('h2', { id: `hu-${x.maNganSach}` }, tile(bt[x.maDanhMuc], 'sm', x.mauSac), x.tenDanhMuc),
        h('p', { class: 'hu-so num' }, h('b', {}, so(x.soDaChi)), ` / ${vnd(x.hanMuc)}`), h('p', { class: `hu-tt ${m.loai}` }, tt),
        nutIcon('pencil', `Sửa hũ ${x.tenDanhMuc}`, { onclick: () => bieuMau(x) }));
    };
    vung.append(h('section', { class: 'ke-hu', 'aria-label': 'Kệ hũ ngân sách' },
      hien.length ? h('div', { class: 'hu-luoi' }, hien.map(theHu)) : h('div', { class: 'card' }, rong('inbox', 'Không có hũ nào trong nhóm này')),
      h('svg:svg', { class: 'ke-go', 'aria-hidden': 'true', viewBox: '0 0 1000 24', preserveAspectRatio: 'none' }, h('svg:path', { class: 'nhoe', d: 'M4 8 C 300 12, 700 4, 996 9 L 990 20 C 700 17, 300 22, 10 18 Z', 'stroke-width': 2.6, 'stroke-linejoin': 'round' })),
      h('p', { class: 'ke-chu' }, chuThich)));
    // Bảng số liệu chi tiết (giữ .brow.row cho từng dòng)
    const dong = (x) => {
      const tt = trang(x); const vuot = x.tienDo > 100; const pc = Math.round(x.tienDo);
      return h('tr', { class: `brow row${tt.cls ? ` is-${tt.cls}` : ''}` },
        h('th', { scope: 'row' }, h('span', { class: 'cell-n' }, tile(bt[x.maDanhMuc], 'sm', x.mauSac), h('span', { class: 'cn-t' }, x.tenDanhMuc, h('small', {}, `Cảnh báo từ ${x.nguongCanhBao}%`)))),
        h('td', { 'data-l': 'Mức đã dùng' }, h('span', { class: 'bcell' }, h('div', { class: `bar ${tt.cls}`.trim(), role: 'progressbar', 'aria-valuenow': Math.min(100, pc), 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuetext': `${pc}% hạn mức${vuot ? ', vượt hạn mức' : ''}`, 'aria-label': `Đã dùng hạn mức ${x.tenDanhMuc}` }, h('i', { style: `width:${Math.min(100, x.tienDo)}%` }), h('u', { style: `left:${x.nguongCanhBao}%`, title: `Ngưỡng cảnh báo ${x.nguongCanhBao}%` })),
          h('b', { class: `num pcc ${tt.cls ? `${tt.cls}-t` : ''}`.trim() }, `${pc}%`))),
        h('td', { class: 'r', 'data-l': 'Đã chi' }, tien(x.soDaChi)), h('td', { class: 'r', 'data-l': 'Hạn mức' }, tien(x.hanMuc)),
        h('td', { class: `r ${vuot ? 'bad-t' : ''}`.trim(), 'data-l': vuot ? 'Vượt' : 'Còn lại' }, h('b', {}, vuot ? `vượt ${vnd(x.soDaChi - x.hanMuc)}` : `còn ${vnd(x.hanMuc - x.soDaChi)}`)),
        h('td', { class: 'tt-ra' }, h('span', { class: 'ra' }, nutIcon('pencil', `Sửa hạn mức ${x.tenDanhMuc}`, { loai: 'ghost sm', onclick: () => bieuMau(x) }),
          nutIcon('trash-2', `Xóa ngân sách ${x.tenDanhMuc}`, { loai: 'ghost sm danger', onclick: async () => { if (await xacNhan(`Xóa ngân sách ${x.tenDanhMuc}?`) && await chay(() => api('DELETE', `/ngan-sach/${x.maNganSach}`)) !== undefined) { thongBao('Đã xóa ngân sách'); tai(); } } }))));
    };
    const chiH = hien.reduce((t, x) => t + x.soDaChi, 0); const hanH = hien.reduce((t, x) => t + x.hanMuc, 0);
    const tpH = hanH ? Math.round((chiH / hanH) * 100) : 0; const vuotCong = chiH > hanH;
    const ttCong = trangThaiNS(hanH ? (chiH / hanH) * 100 : 0, dsNguong.length === 1 ? dsNguong[0] : 101);
    vung.append(h('section', { class: 'bang-sec', 'aria-labelledby': 'h-bang' }, h('h2', { id: 'h-bang', class: 'sec-h' }, 'Số liệu chi tiết'),
      h('div', { class: 'card flush bud-table' }, h('div', { class: 'tbl-wrap' }, h('table', { class: 'bud-t' },
        h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Danh mục'), h('th', { scope: 'col' }, 'Mức đã dùng'), h('th', { scope: 'col', class: 'r' }, 'Đã chi'), h('th', { scope: 'col', class: 'r' }, 'Hạn mức'), h('th', { scope: 'col', class: 'r' }, 'Còn lại / vượt'), h('th', { scope: 'col' }, h('span', { class: 'sr' }, 'Thao tác')))),
        h('tbody', {}, hien.map(dong)),
        h('tfoot', {}, h('tr', {}, h('th', { scope: 'row' }, 'Cộng'), h('td', { 'data-l': 'Mức đã dùng' }, h('span', { class: 'bcell' }, h('div', { class: `bar ${ttCong.cls}`.trim(), role: 'progressbar', 'aria-valuenow': Math.min(100, tpH), 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuetext': `${tpH}% tổng hạn mức${vuotCong ? ', vượt hạn mức' : ''}`, 'aria-label': 'Tổng mức đã dùng' }, h('i', { style: `width:${Math.min(100, tpH)}%` })), h('b', { class: `num pcc ${ttCong.cls ? `${ttCong.cls}-t` : ''}`.trim() }, `${tpH}%`))),
          h('td', { class: 'r', 'data-l': 'Đã chi' }, tien(chiH)), h('td', { class: 'r', 'data-l': 'Hạn mức' }, tien(hanH)),
          h('td', { class: `r ${vuotCong ? 'bad-t' : ''}`.trim(), 'data-l': vuotCong ? 'Vượt' : 'Còn lại' }, h('b', {}, vuotCong ? `vượt ${vnd(chiH - hanH)}` : `còn ${vnd(hanH - chiH)}`)), h('td', {}))))))));
  }
  async function bieuMau(x) {
    const dm = x ? [] : await chay(() => api('GET', '/danh-muc?loai=Chi')); if (!dm) return;
    const [t, n] = tachThang(thang);
    const daCo = new Set(ds.map((d) => d.maDanhMuc));
    const conLai = dm.filter((d) => !d.laHeThong && !daCo.has(d.maDanhMuc));
    if (!x && !conLai.length) { thongBao('Mọi danh mục chi đã có ngân sách trong tháng này', true); return; }
    const sel = chon(conLai.map((d) => [d.maDanhMuc, d.tenDanhMuc]), '', { 'aria-label': 'Danh mục chi' });
    const han = h('input', { type: 'number', min: 1, required: true, value: x?.hanMuc ?? '', inputmode: 'numeric' });
    const ng = h('input', { type: 'number', min: 1, max: 100, value: x?.nguongCanhBao ?? 80, inputmode: 'numeric' });
    const dlg = hopThoai(x ? `Sửa ngân sách ${x.tenDanhMuc}` : `Lập ngân sách tháng ${String(t).padStart(2, '0')}/${n}`, h('form', { class: 'form', onsubmit: (e) => { e.preventDefault(); khoaNut(e.target, async () => {
      const r = await chay(() => (x ? api('PUT', `/ngan-sach/${x.maNganSach}`, { hanMuc: Number(han.value), nguongCanhBao: Number(ng.value) })
        : api('POST', '/ngan-sach', { maDanhMuc: +sel.value, hanMuc: Number(han.value), thang: t, nam: n, nguongCanhBao: Number(ng.value) })), dlg);
      if (r) { dlg.dong(); thongBao('Đã lưu ngân sách'); tai(); }
    }); } }, x ? null : truong('Danh mục chi', sel), truong('Hạn mức chi tiêu (₫)', han), truong('Ngưỡng cảnh báo (%)', ng, 'Bạn được cảnh báo khi đã dùng đến mức này của hạn mức.'), acts(() => dlg.dong())));
  }
  await tai();
}

// ================= Mục tiêu tiết kiệm (UC 3.8) =================
export async function trangMucTieu(root) {
  const luoi = h('div', { class: 'gcards' });
  const vuaNap = new Map(); // lời nhắn "Đã bỏ ống ..." giữ lại sau khi vẽ lại thẻ
  datHanhDong(nut('Nuôi heo mới', { icon: 'plus', loai: 'primary', ghiNhan: true, onclick: () => bieuMau(null) }));
  root.append(luoi);
  /** Số tháng còn lại, suy ra từ số tiền còn thiếu và số cần góp mỗi tháng do máy chủ tính. */
  const soThang = (m) => (m.soTienCanMoiThang > 0 ? Math.max(1, Math.round((m.soTienMucTieu - m.soTienHienTai) / m.soTienCanMoiThang)) : 0);
  async function tai() {
    dangTai(luoi, 3);
    const ds = await chay(() => api('GET', '/muc-tieu')); if (!ds) { hienLoi(luoi, tai); return; }
    datPhuDe(`Đã để dành tổng cộng ${vnd(ds.reduce((s, m) => s + m.soTienHienTai, 0))}`);
    bo(luoi);
    const them = h('button', { type: 'button', class: 'gc-them', onclick: () => bieuMau(null) }, h('span', { class: 'gt-heo' }, heo({ day: 0, kich: 120, xu: false })), h('span', { class: 'gt-t' }, h('span', {}, 'Nuôi thêm một con heo'), h('span', {}, 'Đặt tên, số tiền cần và ngày muốn đạt. Ví dụ: quỹ dự phòng.')));
    luoi.append(...ds.map((m, i) => {
      const xong = m.daHoanThanh; const p = Math.max(0, Math.min(100, Math.round(m.tienDo))); const thieu = Math.max(0, m.soTienMucTieu - m.soTienHienTai);
      const dau = xong ? ['XONG RỒI!', 'ok'] : m.chamTienDo ? ['CHẬM NHỊP', 'warn'] : ['ĐÚNG NHỊP', 'ok'];
      const chipTien = [...new Set([100000, 500000, 1000000].map((v) => Math.min(v, Math.round(thieu))))].filter((v) => v > 0);
      const o = (nhan, giaTri) => h('div', {}, h('dt', {}, nhan), ...giaTri);
      return h('article', { class: 'card gcard', style: `border-radius:var(${i % 2 ? '--rb' : '--ra'})`, 'aria-labelledby': `mt-${m.maMucTieu}` },
        dauMoc(dau[0], dau[1], i % 2 ? -5 : 6, 'goc'),
        h('div', { class: 'gc-heo' }, heo({ day: Math.min(1, m.tienDo / 100), kich: 210, xu: false })),
        h('div', { class: 'gc-main' },
          h('div', { class: 'gc-hd' }, h('h2', { id: `mt-${m.maMucTieu}` }, m.tenMucTieu), h('p', {}, xong ? `Hạn ${ngayVN(m.hanChot)} · đã đạt` : `Hạn ${ngayVN(m.hanChot)} · còn ${soThang(m)} tháng`)),
          h('div', { class: `duong${m.chamTienDo && m.tienDo < 50 && !xong ? ' cham' : ''}`, style: `--p:${p}`, role: 'progressbar', 'aria-valuenow': p, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': `Tiến độ mục tiêu ${m.tenMucTieu}` },
            h('span', { class: 'duong-in', 'aria-hidden': 'true' }, h('span', { class: 'd-net' }), h('span', { class: 'd-vet' }), h('span', { class: 'd-dau' }), h('span', { class: 'd-moc' }, `${p}%`)), h('span', { class: 'd-co', 'aria-hidden': 'true' }, ic('flag'))),
          h('dl', { class: 'gc-so' }, o('Đã có', [h('dd', { class: 'num' }, vnd(m.soTienHienTai)), h('dd', { class: 'phu num' }, `trên ${vnd(m.soTienMucTieu)}`)]), o('Còn thiếu', [h('dd', { class: 'num' }, vnd(thieu))]), o('Mỗi tháng nên bỏ', [h('dd', { class: 'num' }, vnd(xong ? 0 : m.soTienCanMoiThang))])),
          h('div', { class: 'gc-bo' },
            xong ? null : h('span', { class: 'bo-nhan' }, 'Bỏ ống nhanh:'),
            xong ? null : chipTien.map((v, k) => h('button', { type: 'button', class: `chip-nap${k === chipTien.length - 1 ? ' vang' : ''}`, 'aria-label': `Bỏ ống ${vnd(v)} vào ${m.tenMucTieu}`, onclick: () => napTien(m, v) }, `+${so(v)}`)),
            xong ? null : h('button', { type: 'button', class: 'chip-nap', onclick: () => napTien(m) }, ic('plus'), 'Góp tiền khác'),
            h('span', { class: 'fill' }), nutIcon('pencil', `Sửa mục tiêu ${m.tenMucTieu}`, { onclick: () => bieuMau(m) }),
            nutIcon('trash-2', `Xóa mục tiêu ${m.tenMucTieu}`, { loai: 'ghost danger', onclick: async () => { if (await xacNhan(`Xóa mục tiêu "${m.tenMucTieu}"?`) && await chay(() => api('DELETE', `/muc-tieu/${m.maMucTieu}`)) !== undefined) { thongBao('Đã xóa mục tiêu'); tai(); } } })),
          h('p', { class: 'gc-tt', role: 'status' }, vuaNap.get(m.maMucTieu) ?? '')));
    }), them);
    if (!ds.length) luoi.prepend(h('p', { class: 'note-p' }, 'Đặt một khoản cần tiết kiệm và hạn chót, hệ thống sẽ tính số tiền cần góp mỗi tháng.'));
  }
  function bieuMau(m) {
    const ten = h('input', { value: m?.tenMucTieu ?? '', required: true, maxlength: 60 }); const st = h('input', { type: 'number', min: 1, required: true, value: m?.soTienMucTieu ?? '', inputmode: 'numeric' });
    const han = chonNgay({ giaTri: m?.hanChot ?? '', nhan: 'Hạn chót', batBuoc: true });
    const dlg = hopThoai(m ? 'Sửa mục tiêu' : 'Tạo mục tiêu tiết kiệm', h('form', { class: 'form', onsubmit: (e) => { e.preventDefault(); if (!han.value) { dlg.loi('Hãy chọn hạn chót'); return; } khoaNut(e.target, async () => {
      const body = { tenMucTieu: ten.value, soTienMucTieu: Number(st.value), hanChot: han.value };
      const r = await chay(() => (m ? api('PUT', `/muc-tieu/${m.maMucTieu}`, body) : api('POST', '/muc-tieu', body)), dlg);
      if (r) { dlg.dong(); thongBao('Đã lưu mục tiêu'); tai(); }
    }); } }, truong('Tên mục tiêu', ten), h('div', { class: 'two' }, truong('Số tiền mục tiêu (₫)', st), truong('Hạn chót', han)), acts(() => dlg.dong())));
  }
  /** Hộp thoại nạp tiền; soTien có thì điền sẵn (chip "bỏ ống nhanh"), người dùng vẫn chọn ví rồi mới nạp. */
  async function napTien(m, soTien) {
    const vis = await chay(() => api('GET', '/vi')); if (!vis) return;
    const sel = chon(vis.map((v) => [v.maVi, `${v.tenVi} (${vnd(v.soDu)})`]), vis[0]?.maVi); const st = h('input', { type: 'number', min: 1, required: true, value: soTien ?? (Math.round(m.soTienCanMoiThang) || ''), inputmode: 'numeric' });
    const dlg = hopThoai(`Nạp tiền vào "${m.tenMucTieu}"`, h('form', { class: 'form', onsubmit: (e) => { e.preventDefault(); khoaNut(e.target, async () => {
      const r = await chay(() => api('POST', `/muc-tieu/${m.maMucTieu}/nap-tien`, { maVi: +sel.value, soTien: Number(st.value) }), dlg);
      if (r) { dlg.dong(); vuaNap.set(m.maMucTieu, `Đã bỏ ống ${vnd(Number(st.value))}.`); thongBao(r.daHoanThanh ? 'Chúc mừng, bạn đã hoàn thành mục tiêu' : 'Đã nạp tiền vào mục tiêu'); tai(); }
    }); } }, truong('Ví nguồn', sel), truong('Số tiền nạp (₫)', st), acts(() => dlg.dong(), 'Nạp tiền')));
  }
  await tai();
}

// ================= Báo cáo (UC 3.9, 3.12) =================
async function taiExcel(tu, den) {
  const b = await chay(() => api('GET', `/bao-cao/excel?${qs({ tu, den })}`, undefined, { blob: true })); if (!b) return;
  const a = h('a', { href: URL.createObjectURL(b), download: `bao-cao-${tu}-${den}.xlsx` }); document.body.append(a); a.click(); a.remove();
  thongBao('Đã tạo file Excel');
}
const SO_CHU = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín', 'mười', 'mười một', 'mười hai'];

export async function trangBaoCao(root) {
  let ky = '6';
  const KY = [['1', 'Tháng này'], ['3', '3 tháng'], ['6', '6 tháng'], ['y', 'Năm nay']];
  const bar = h('div', { class: 'bc-tab' }); const vung = h('div', { class: 'page-in' });
  datPhuDe('Nhìn lại sổ thu chi');
  let tu = ''; let den = '';
  datHanhDong(nut('In báo cáo', { icon: 'printer', ghiNhan: true, onclick: () => window.print() }), nut('Xuất Excel', { icon: 'file-spreadsheet', loai: 'primary', ghiNhan: true, onclick: () => taiExcel(tu, den) }));
  root.append(bar, vung);
  const veBar = () => bo(bar).append(phanDoan('Khoảng thời gian', KY, ky, (v) => { ky = v; veBar(); tai(); }, { kieu: 'tab-so' }));
  /** Danh sách {nam, thang} của n tháng kết thúc ở tháng hiện tại. */
  const dsThang = (n) => { const [t, y] = tachThang(thangNay()); return Array.from({ length: n }, (_, i) => { const m = t - (n - 1 - i); return m >= 1 ? { nam: y, thang: m } : { nam: y - 1, thang: m + 12 }; }); };
  const ngayDau = (x) => `${x.nam}-${String(x.thang).padStart(2, '0')}-01`;
  const pc = (thu, chi) => (thu > 0 ? `${Math.round(((thu - chi) / thu) * 100)}%` : '–');
  const nhanKyThang = (a, b) => (a.nam === b.nam ? `T${a.thang} – T${b.thang}/${b.nam}` : `T${a.thang}/${a.nam} – T${b.thang}/${b.nam}`);
  async function tai() {
    dangTai(vung, 4);
    const [tNow] = tachThang(thangNay());
    const soKy = ky === 'y' ? tNow : Number(ky); const soVe = Math.max(soKy, 6);
    const ve = dsThang(soVe); const trongKy = ve.slice(-soKy);
    tu = ngayDau(trongKy[0]); den = homNay();
    const nams = [...new Set(ve.map((x) => x.nam))];
    const prev = dsThang(2)[0]; const cur = dsThang(2)[1];
    const [chuoi, cat, catHt, catTr, tk] = await Promise.all([
      Promise.all(nams.map((n) => api('GET', `/bao-cao/theo-thoi-gian?nam=${n}`).then((r) => [n, r]))).catch(() => null),
      chay(() => api('GET', `/bao-cao/theo-danh-muc?${qs({ tu, den, loai: 'Chi' })}`)),
      chay(() => api('GET', `/bao-cao/theo-danh-muc?${qs({ tu: ngayDau(cur), den, loai: 'Chi' })}`)),
      chay(() => api('GET', `/bao-cao/theo-danh-muc?${qs({ tu: ngayDau(prev), den: new Date(Date.parse(ngayDau(cur)) - 86400000).toISOString().slice(0, 10), loai: 'Chi' })}`)),
      chay(() => api('GET', '/bao-cao/thang'))]);
    if (!chuoi || !cat) { hienLoi(vung, tai); return; }
    const map = Object.fromEntries(chuoi.map(([n, r]) => [n, r]));
    const hang = ve.map((x) => ({ ...x, thu: map[x.nam]?.[x.thang - 1]?.thu ?? 0, chi: map[x.nam]?.[x.thang - 1]?.chi ?? 0 }));
    const kyHang = hang.slice(-soKy);
    const T = kyHang.reduce((s, x) => s + x.thu, 0); const C = kyHang.reduce((s, x) => s + x.chi, 0);
    const nhanKy = KY.find(([k]) => k === ky)[1];
    const tongCat = cat.reduce((s, x) => s + x.soTien, 0);
    const dm = new Map(); for (const x of catTr ?? []) dm.set(x.maDanhMuc, { ten: x.tenDanhMuc, tr: x.soTien, ht: 0 }); for (const x of catHt ?? []) dm.set(x.maDanhMuc, { ten: x.tenDanhMuc, tr: dm.get(x.maDanhMuc)?.tr ?? 0, ht: x.soTien });
    const sd = [...dm.values()].sort((a, b) => b.ht - a.ht); const sTr = sd.reduce((s, x) => s + x.tr, 0); const sHt = sd.reduce((s, x) => s + x.ht, 0);
    const doi = (a, b) => { if (!a) return b ? h('span', { class: 'dl bad' }, ic('arrow-up-right'), 'mới') : h('span', { class: 'muted' }, '0%'); const p = Math.round(((b - a) / a) * 100); return p === 0 ? h('span', { class: 'muted num' }, '0%') : h('span', { class: `dl ${p > 0 ? 'bad' : 'good'}` }, ic(p > 0 ? 'arrow-up-right' : 'arrow-down-right'), h('span', { class: 'num' }, `${p > 0 ? '+' : '−'}${Math.abs(p)}%`)); };
    // Dòng tăng mạnh nhất so với tháng trước (chỉ xét danh mục tháng trước đã có chi)
    const tang = sd.filter((x) => x.tr > 0 && x.ht > x.tr).sort((a, b) => b.ht / b.tr - a.ht / a.tr)[0];
    const cauTang = tang ? (tang.ht / tang.tr >= 2 ? `${tang.ten} tăng gấp khoảng ${(tang.ht / tang.tr).toFixed(1).replace('.', ',')} lần so với tháng trước.` : `${tang.ten} tăng ${Math.round(((tang.ht - tang.tr) / tang.tr) * 100)}% so với tháng trước.`) : null;
    // Phiếu tổng kết
    const phanTramGiu = T > 0 ? Math.round(((T - C) / T) * 100) : null;
    const nhanPhieu = soKy === 1 ? `Tháng này · T${trongKy[0].thang}/${trongKy[0].nam}` : `${nhanKy} · ${trongKy[0].nam === trongKy.at(-1).nam ? `T${trongKy[0].thang} đến T${trongKy.at(-1).thang}/${trongKy.at(-1).nam}` : `T${trongKy[0].thang}/${trongKy[0].nam} đến T${trongKy.at(-1).thang}/${trongKy.at(-1).nam}`}`;
    const phieu = hoaDon(h('div', { class: 'pt' },
      h('h2', { id: 'h-phieu' }, 'PHIẾU TỔNG KẾT'), h('p', { class: 'pt-ky' }, nhanKy === 'Tháng này' ? nhanPhieu : nhanPhieu),
      h('div', { class: 'pt-khoi' }, h('p', {}, h('span', {}, 'Tổng thu'), h('b', { class: 'income num' }, `+${vnd(T)}`)), h('p', {}, h('span', {}, 'Tổng chi'), h('b', { class: 'expense num' }, `−${vnd(C)}`))),
      h('div', { class: 'pt-khoi' }, h('p', { class: 'to' }, h('span', {}, 'Giữ lại'), h('b', { class: 'num' }, `${T - C > 0 ? '+' : ''}${vnd(T - C)}`)), h('p', { class: 'phu' }, h('span', {}, 'Trung bình mỗi tháng'), h('b', { class: 'num' }, vnd(Math.round((T - C) / soKy))))),
      h('div', { class: 'pt-moc' }, h('span', { class: `dau-tron ${phanTramGiu === null || phanTramGiu >= 0 ? 'ok' : 'bad'}` }, h('b', {}, phanTramGiu === null ? '—' : `${phanTramGiu}%`), h('span', {}, phanTramGiu !== null && phanTramGiu < 0 ? 'CHI QUÁ' : 'GIỮ LẠI')), h('span', { class: 'pt-chu' }, `trên tổng thu của ${soKy} tháng`))), { xoay: -0.8, lop: 'phieu-tk' });
    phieu.setAttribute('aria-labelledby', 'h-phieu');
    // Bảng từng tháng, gộp các tháng trống liền nhau
    const dongThang = []; let i = 0;
    while (i < kyHang.length) {
      const x = kyHang[i];
      if (!x.thu && !x.chi) {
        let j = i; while (j + 1 < kyHang.length && !kyHang[j + 1].thu && !kyHang[j + 1].chi) j++;
        const n = j - i + 1;
        dongThang.push(h('tr', { class: 'trong' }, h('th', { scope: 'row' }, n > 1 ? nhanKyThang(x, kyHang[j]) : `T${x.thang}/${x.nam}`), h('td', { colspan: 4 }, n > 1 ? `${SO_CHU[n] ?? n} tháng này chưa ghi khoản nào` : 'chưa ghi khoản nào')));
        i = j + 1;
      } else {
        dongThang.push(h('tr', {}, h('th', { scope: 'row' }, `T${x.thang}/${x.nam}`), h('td', { class: 'r' }, tien(x.thu, { dau: true, lop: 'income' })), h('td', { class: 'r' }, tien(-x.chi, { dau: true, lop: 'expense' })), h('td', { class: 'r' }, tien(x.thu - x.chi, { dau: true })), h('td', { class: 'r num' }, pc(x.thu, x.chi))));
        i++;
      }
    }
    bo(vung).append(
      h('div', { class: 'row2 bc-1' }, h('div', { class: 'fixed phieu-w' }, phieu), h('section', { class: 'card b grow', 'aria-labelledby': 'h-bd' }, h('div', { class: 'card-h' }, h('h2', { id: 'h-bd' }, `Thu chi ${soVe} tháng`)), bieuDoThuChi(hang))),
      h('div', { class: 'row2' },
        h('section', { class: 'card fixed bc-dm', 'aria-labelledby': 'h-dm' }, h('div', { class: 'card-h' }, h('h2', { id: 'h-dm' }, 'Chi theo danh mục'), cat.length ? h('b', { class: 'num' }, vnd(tongCat)) : null), h('p', { class: 'pk-ky' }, nhanKy),
          cat.length ? [thanhXep(cat, { tong: tongCat, tieuDe: `Chi theo danh mục ${nhanKy.toLowerCase()}` }), chuGiai(cat, { tong: tongCat, toiDa: 6 })] : rong('inbox', 'Không có khoản chi trong khoảng này')),
        h('section', { class: 'so-sanh grow', 'aria-labelledby': 'h-bdg' }, h('h2', { id: 'h-bdg', class: 'sec-h' }, `Tháng ${cur.thang} so với tháng ${prev.thang}`),
          sd.length ? [h('div', { class: 'card flush' }, h('div', { class: 'tbl-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Danh mục'), h('th', { scope: 'col', class: 'r' }, `T${prev.thang}`), h('th', { scope: 'col', class: 'r' }, `T${cur.thang}`), h('th', { scope: 'col', class: 'r' }, 'Thay đổi'))),
            h('tbody', {}, sd.map((x) => h('tr', { class: x === tang ? 'hl' : '' }, h('th', { scope: 'row' }, x.ten), h('td', { class: 'r' }, tien(x.tr)), h('td', { class: 'r' }, tien(x.ht)), h('td', { class: 'r' }, x === tang ? h('span', { class: 'khoanh' }, doi(x.tr, x.ht), h('svg:svg', { class: 'nhoe', viewBox: '0 0 100 40', preserveAspectRatio: 'none', 'aria-hidden': 'true' }, h('svg:ellipse', { cx: 50, cy: 20, rx: 48, ry: 18, fill: 'none', 'stroke-width': 2.4 }))) : doi(x.tr, x.ht))))),
            h('tfoot', {}, h('tr', {}, h('th', { scope: 'row' }, 'Cộng'), h('td', { class: 'r' }, tien(sTr)), h('td', { class: 'r' }, tien(sHt)), h('td', { class: 'r' }, doi(sTr, sHt))))))),
            h('p', { class: `so-cau${cauTang ? ' bad' : ' good'}` }, ic(cauTang ? 'trending-up' : 'circle-check'), cauTang ?? 'Không danh mục nào chi nhiều hơn tháng trước.')]
            : h('div', { class: 'card' }, rong('inbox', 'Chưa có chi tiêu để so sánh')))),
      h('section', { class: 'bang-sec', 'aria-labelledby': 'h-thang' }, h('h2', { id: 'h-thang', class: 'sec-h' }, 'Từng tháng'),
        h('div', { class: 'card flush' }, h('div', { class: 'tbl-wrap' }, h('table', { class: 'tung-thang' }, h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Tháng'), h('th', { scope: 'col', class: 'r' }, 'Thu'), h('th', { scope: 'col', class: 'r' }, 'Chi'), h('th', { scope: 'col', class: 'r' }, 'Chênh lệch'), h('th', { scope: 'col', class: 'r' }, 'Giữ lại'))),
          h('tbody', {}, dongThang),
          h('tfoot', {}, h('tr', {}, h('th', { scope: 'row' }, `Cộng ${soKy} tháng`), h('td', { class: 'r' }, tien(T, { dau: true, lop: 'income' })), h('td', { class: 'r' }, tien(-C, { dau: true, lop: 'expense' })), h('td', { class: 'r' }, tien(T - C, { dau: true })), h('td', { class: 'r num' }, pc(T, C)))))))),
      (tk ?? []).length
        ? h('section', { class: 'bang-sec', 'aria-labelledby': 'h-tk' }, h('h2', { id: 'h-tk', class: 'sec-h' }, 'Tổng kết tháng đã lập'), h('div', { class: 'card flush' }, h('div', { class: 'tbl-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Tháng'), h('th', { scope: 'col', class: 'r' }, 'Tổng thu'), h('th', { scope: 'col', class: 'r' }, 'Tổng chi'), h('th', { scope: 'col', class: 'r' }, 'Danh mục vượt ngân sách'), h('th', { scope: 'col' }, 'Ngày lập'))),
          h('tbody', {}, tk.map((b2) => h('tr', {}, h('th', { scope: 'row', class: 'num' }, `${String(b2.thang).padStart(2, '0')}/${b2.nam}`), h('td', { class: 'r' }, tien(b2.tongThu, { lop: 'income' })), h('td', { class: 'r' }, tien(b2.tongChi, { lop: 'expense' })), h('td', { class: 'r num' }, b2.soDanhMucVuot), h('td', { class: 'num muted' }, ngayVN(b2.ngayLap)))))))))
        : h('section', { class: 'khung-gach', 'aria-label': 'Phiếu tổng kết theo tháng' }, h('span', { class: 'tile big t-sky', 'aria-hidden': 'true' }, ic('calendar')), h('div', {}, h('b', {}, 'Chưa có phiếu tổng kết tháng nào'), h('p', {}, 'Sổ tự lập phiếu lúc 23:00 ngày cuối mỗi tháng.'))));
  }
  veBar(); await tai();
}

// ================= Thông báo (UC 3.11) =================
// Màu ô icon của thông báo: đặt theo loại (class token), không dùng mã màu cứng
const TILE_ICON = { 'alarm-clock': 't-sky', gauge: 't-peach', target: 't-mint', 'chart-column': 't-sky', repeat: 't-mint', 'life-buoy': 't-lilac', bell: 't-sky', 'circle-alert': 't-tomato', 'octagon-alert': 't-peach', 'triangle-alert': 't-peach' };
const LOAI_TB = { NhacGhiChep: ['alarm-clock', 'Nhắc ghi chép'], CanhBaoNganSach: ['gauge', 'Ngân sách'], NhacMucTieu: ['target', 'Mục tiêu'], TongKetThang: ['chart-column', 'Tổng kết'], HoTro: ['life-buoy', 'Hỗ trợ'], DinhKy: ['repeat', 'Định kỳ'] };

export async function trangThongBao(root, capNhatChuong) {
  let boLoc = 'all';
  const bar = h('div', { class: 'toolbar' }); const ds = h('section', { class: 'so-ke le-nho', 'aria-label': 'Danh sách thông báo' });
  root.append(bar, ds);
  let dsTb = [];
  async function tai() {
    if (!dsTb.length) dangTai(ds, 5);
    const r = await chay(() => api('GET', '/thong-bao')); if (!r) { bo(bar); hienLoi(ds, tai); return; }
    dsTb = r; ve();
  }
  const lamMoi = async () => { await tai(); capNhatChuong?.(); };
  function ve() {
    const chuaDoc = dsTb.filter((t) => !t.daDoc).length;
    datPhuDe(chuaDoc ? `${chuaDoc} tin chưa đọc` : 'Đã đọc hết');
    bo(bar).append(phanDoan('Lọc thông báo', [['all', `Tất cả (${dsTb.length})`], ['unread', `Chưa đọc (${chuaDoc})`]], boLoc, (v) => { boLoc = v; ve(); }), h('div', { class: 'sp' }),
      nut('Đánh dấu đã đọc tất cả', { icon: 'check-check', ghiNhan: true, disabled: chuaDoc === 0, onclick: async () => { if (await chay(() => api('PUT', '/thong-bao/da-doc-tat-ca')) !== undefined) lamMoi(); } }));
    const hien = boLoc === 'unread' ? dsTb.filter((t) => !t.daDoc) : dsTb;
    bo(ds).append(h('span', { class: 'le', 'aria-hidden': 'true' }));
    if (!hien.length) { ds.append(h('div', { class: 'so-rong' }, rong(boLoc === 'unread' ? 'circle-check' : 'bell', boLoc === 'unread' ? 'Bạn đã đọc hết thông báo' : 'Chưa có thông báo nào', boLoc === 'unread' ? null : 'Cảnh báo ngân sách, nhắc nhở và tổng kết tháng sẽ xuất hiện ở đây.', null, heo({ day: 0, kich: 130, xu: true })))); return; }
    ds.append(...hien.map((t) => {
      let [icon] = LOAI_TB[t.loai] ?? ['bell'];
      let tt = null;
      if (t.loai === 'CanhBaoNganSach') { const nd = t.noiDung.toLowerCase(); tt = nd.includes('vượt') ? ['bad', 'Vượt hạn mức', 'circle-alert'] : nd.includes('hết') ? ['warn', 'Hết hạn mức', 'octagon-alert'] : ['warn', 'Sắp vượt', 'triangle-alert']; icon = tt[2]; }
      return h('div', { class: `txr noti ${t.daDoc ? 'read' : 'unread'}` }, tileIcon(icon, TILE_ICON[icon] ?? ''),
        h('div', {}, h('div', { class: 't1' }, t.daDoc ? null : h('span', { class: 'sr' }, 'Chưa đọc: '), h('span', {}, t.noiDung)), h('div', { class: 't2' }, `${ngayVN(t.ngayTao).slice(0, 5)} · ${gioVN(t.ngayTao)}`)),
        tt ? chip(tt[0], tt[1], tt[2]) : h('span'),
        h('span', { class: 'ra' }, t.daDoc ? null : nutIcon('check', 'Đánh dấu đã đọc', { loai: 'ghost sm', onclick: async () => { if (await chay(() => api('PUT', `/thong-bao/${t.maThongBao}/da-doc`)) !== undefined) lamMoi(); } }),
          nutIcon('trash-2', 'Xóa thông báo', { loai: 'ghost sm danger', onclick: async () => { if (await chay(() => api('DELETE', `/thong-bao/${t.maThongBao}`)) !== undefined) lamMoi(); } })));
    }));
  }
  await tai();
}

// ================= Nhắc nhở (cài đặt thông báo, UC 3.11) =================
const NHAC = [
  ['nhacHangNgay', 'alarm-clock', 'Ghi chép thu chi hằng ngày', 'Nhắc bạn ghi lại các khoản thu chi trong ngày', 'Hằng ngày'],
  ['nhacNganSach', 'gauge', 'Cảnh báo ngân sách', 'Báo khi một ngân sách sắp hoặc đã vượt hạn mức', 'Khi có thay đổi'],
  ['nhacMucTieu', 'target', 'Nạp tiền cho mục tiêu', 'Báo khi mục tiêu tiết kiệm đang chậm tiến độ', 'Khi chậm tiến độ']];

export async function trangCaiDat(root) {
  const c0 = await chay(() => api('GET', '/thong-bao/cai-dat'));
  if (!c0) { hienLoi(root, () => { bo(root); trangCaiDat(root); }); return; }
  let cur = { ...c0 };
  const dau = h('div', { class: 'page-in' }); const sapToi = h('div', { class: 'card flush' }); const daTat = h('div', { class: 'card flush b' });
  datHanhDong(nut('Khôi phục mặc định', { icon: 'rotate-cw', ghiNhan: true, onclick: async () => { const d = await chay(() => api('POST', '/thong-bao/cai-dat/khoi-phuc')); if (d) { cur = { ...d }; ve(); thongBao('Đã khôi phục cài đặt mặc định'); } } }));
  root.append(dau, sapToi, daTat);
  /** Lưu ngay khi bật/tắt hoặc đổi giờ; lỗi thì trả giao diện về trạng thái đã lưu. */
  async function luu(thayDoi) {
    const moi = { ...cur, ...thayDoi };
    const r = await chay(() => api('PUT', '/thong-bao/cai-dat', { nhacHangNgay: moi.nhacHangNgay, gioNhac: moi.gioNhac, nhacNganSach: moi.nhacNganSach, nhacMucTieu: moi.nhacMucTieu }));
    if (r) { cur = moi; thongBao('Đã lưu cài đặt'); }
    ve();
  }
  const dong = ([khoa, icon, ten, mo, chu]) => h('div', { class: 'txr rem' }, tileIcon(icon, TILE_ICON[icon] ?? ''),
    h('div', {}, h('div', { class: 't1' }, h('span', {}, ten)), h('div', { class: 't2' }, khoa === 'nhacHangNgay' ? `${mo} · lúc ${cur.gioNhac}` : mo)),
    khoa === 'nhacHangNgay' ? h('input', { type: 'time', class: 'tm', value: cur.gioNhac, required: true, disabled: !cur[khoa], 'aria-label': 'Giờ nhắc hằng ngày', onchange: (e) => { if (e.target.value) luu({ gioNhac: e.target.value }); } }) : h('span'),
    h('span', { class: 'rt' }, chip('', chu, 'repeat'), h('span', { class: 'xs sub tt-bat' }, cur[khoa] ? 'Đang bật' : 'Đã tắt'),
      congTac(`Bật hoặc tắt nhắc nhở: ${ten}`, cur[khoa], (v) => luu({ [khoa]: v }))));
  function ve() {
    const bat = NHAC.filter((n) => cur[n[0]]); const tat = NHAC.filter((n) => !cur[n[0]]);
    datPhuDe(`${bat.length} nhắc nhở đang bật`);
    const gioHT = new Date(Date.now() + 7 * 3600e3).toISOString().slice(11, 16);
    bo(dau).append(dai(kpi('Đang bật', String(bat.length), kpiPhu('nhắc nhở')),
      kpi('Sắp tới', cur.nhacHangNgay ? 'Ghi chép thu chi' : bat[0] ? bat[0][2] : '–', kpiPhu(cur.nhacHangNgay ? `${cur.gioNhac > gioHT ? 'hôm nay' : 'ngày mai'} · ${cur.gioNhac}` : bat[0] ? bat[0][4] : 'Không có nhắc nhở đang bật')),
      kpi('Đã tắt', String(tat.length), kpiPhu('nhắc nhở'))));
    bo(sapToi).append(h('div', { class: 'card-h' }, h('h2', {}, 'Sắp tới')), ...(bat.length ? bat.map(dong) : [rong('alarm-clock', 'Không có nhắc nhở nào đang bật', 'Bật một nhắc nhở ở nhóm Đã tắt bên dưới.')]));
    daTat.hidden = !tat.length; bo(daTat).append(h('div', { class: 'card-h' }, h('h2', {}, 'Đã tắt')), ...tat.map(dong));
  }
  ve();
}

// ================= Tài khoản (UC 3.2) =================
const VAI_TRO_NHAN = { NguoiDung: 'Người dùng', QuanTriVien: 'Quản trị viên', NhanVienHoTro: 'Nhân viên hỗ trợ', KiemToanVien: 'Kiểm toán viên' };

/** Thanh độ mạnh mật khẩu (chỉ là gợi ý trên trình duyệt; máy chủ yêu cầu từ 6 ký tự). Luôn có chữ, không chỉ dựa vào màu. */
function thanhDoManh(input) {
  const NH = ['', 'Quá ngắn', 'Yếu', 'Khá', 'Mạnh'];
  const el = h('div', { class: 'meter', 'data-l': '0' }, [1, 2, 3, 4].map(() => h('i')), h('span', { class: 't', 'aria-live': 'polite' }));
  const cap = () => {
    const m = input.value; const s = (m.length >= 10) + (/[a-zA-Z]/.test(m) && /\d/.test(m)) + ((/[a-z]/.test(m) && /[A-Z]/.test(m)) || /[^a-zA-Z0-9]/.test(m));
    const l = !m ? 0 : m.length < 6 ? 1 : Math.min(4, 2 + s);
    el.dataset.l = String(l); [...el.querySelectorAll('i')].forEach((x, i) => x.classList.toggle('on', i < l)); el.querySelector('.t').textContent = NH[l];
  };
  input.addEventListener('input', cap); cap();
  return el;
}

// Màu xem trước giao diện: giấy, thanh bên, mực, vàng (khớp bộ màu sổ tay sáng/tối)
const PV = { sang: ['#fbfaf5', '#efe6d2', '#22201c', '#ffd84d'], toi: ['#1b1915', '#25211b', '#f2ebdb', '#ffd84d'] };
const mini = ([bg, sf, ln, ac]) => h('span', { class: 'tp-m', style: `--p-bg:${bg};--p-sf:${sf};--p-ln:${ln};--p-ac:${ac}` }, h('i', { class: 's' }), h('i', { class: 'l1' }), h('i', { class: 'l2' }), h('i', { class: 'dot' }));

/** Chọn giao diện: Sáng, Tối, hoặc theo hệ thống. Có xem trước thu nhỏ; chọn là áp dụng ngay. */
function chonGiaoDien() {
  const DS = [['sang', 'Sáng', 'sun'], ['toi', 'Tối', 'moon'], [null, 'Theo hệ thống', 'monitor']];
  const g = h('div', { class: 'tp', role: 'radiogroup', 'aria-label': 'Giao diện' });
  const dat = (v, tieuDiem) => { CHE_DO.dat(v); ve(); if (tieuDiem) g.querySelector('[aria-checked="true"]')?.focus(); };
  const ve = () => {
    const cur = CHE_DO.get() || null;
    g.replaceChildren(...DS.map(([v, t, icon], i) => h('button', { type: 'button', role: 'radio', class: 'tp-o', 'aria-checked': String(cur === v), tabindex: cur === v ? '0' : '-1',
      onclick: () => dat(v, false), onkeydown: (e) => {
        const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!d) return;
        e.preventDefault(); dat(DS[(i + d + DS.length) % DS.length][0], true);
      } },
    h('span', { class: `tp-pv${v === null ? ' sys' : ''}` }, v === null ? [mini(PV.sang), mini(PV.toi)] : mini(PV[v]), cur === v ? ic('check', 'tp-ok') : null),
    h('span', { class: 'tp-n' }, ic(icon), t))));
  };
  ve();
  return g;
}

/** Tên trình duyệt và hệ điều hành đoán từ userAgent, chỉ để hiển thị cho người dùng nhận ra thiết bị. */
function thietBi() {
  const u = navigator.userAgent;
  const tr = /Edg\//.test(u) ? 'Edge' : /OPR\//.test(u) ? 'Opera' : /Firefox\//.test(u) ? 'Firefox' : /Chrome\//.test(u) ? 'Chrome' : /Safari\//.test(u) ? 'Safari' : 'Trình duyệt';
  const os = /Windows/.test(u) ? 'Windows' : /Android/.test(u) ? 'Android' : /iPhone|iPad/.test(u) ? 'iOS' : /Mac OS/.test(u) ? 'macOS' : /Linux/.test(u) ? 'Linux' : 'thiết bị này';
  return `${tr} trên ${os}`;
}

export async function trangTaiKhoan(root) {
  const t = await chay(() => api('GET', '/tai-khoan/toi')); if (!t) { hienLoi(root, () => { bo(root); trangTaiKhoan(root); }); return; }
  datPhuDe(t.email);
  const ten = h('input', { value: t.hoTen, required: true, maxlength: 100, autocomplete: 'name' });
  const cu = h('input', { type: 'password', required: true, autocomplete: 'current-password' });
  const moi = h('input', { type: 'password', required: true, minlength: 6, autocomplete: 'new-password' });
  const lai = h('input', { type: 'password', required: true, autocomplete: 'new-password' });
  const loiMk = h('div', { class: 'err', role: 'alert' });
  const tenHT = h('h2', {}, t.hoTen); const chuCai = h('span', { class: 'prof-av', 'aria-hidden': 'true' }, (t.hoTen[0] ?? '?').toUpperCase());
  // Thống kê chỉ có với người dùng cá nhân (các vai trò nội bộ không dùng ví/giao dịch).
  const thongKe = ['Giao dịch', 'Ví', 'Mục tiêu'].map((k) => h('div', { class: 'pst' }, h('span', { class: 'k' }, k), h('span', { class: 'v num' }, '–')));
  if (t.vaiTro === 'NguoiDung') {
    Promise.allSettled([api('GET', '/giao-dich?trang=1'), api('GET', '/vi'), api('GET', '/muc-tieu')]).then((kq) => kq.forEach((r, i) => {
      if (r.status === 'fulfilled') thongKe[i].querySelector('.v').textContent = String(i === 0 ? r.value.tongSo : r.value.length);
    }));
  }
  root.append(h('div', { class: 'page-in' },
    h('section', { class: 'card prof' }, bangDinh('y', { trai: '48px', xoay: -3 }), chuCai, h('div', { class: 'prof-i' }, tenHT, h('span', { class: 'muted' }, t.email), chip('ok', VAI_TRO_NHAN[t.vaiTro] ?? 'Người dùng', 'shield-check')),
      t.vaiTro === 'NguoiDung' ? h('div', { class: 'prof-st' }, thongKe) : null),
    h('div', { class: 'row2 eq' },
      h('div', { class: 'stack-col fill' },
        card('Thông tin cá nhân', h('form', { class: 'form', onsubmit: (e) => { e.preventDefault(); khoaNut(e.target, async () => {
          if (await chay(() => api('PUT', '/tai-khoan/toi', { hoTen: ten.value })) !== undefined) {
            const v = ten.value.trim(); try { localStorage.setItem('hoTen', v); } catch { /* bỏ qua */ }
            tenHT.textContent = v; chuCai.textContent = (v[0] ?? '?').toUpperCase(); thongBao('Đã cập nhật thông tin'); document.dispatchEvent(new Event('doi-ten'));
          }
        }); } }, truong('Email', h('input', { value: t.email, disabled: true }), 'Email dùng để đăng nhập, không đổi được.'), truong('Họ tên', ten), h('div', { class: 'acts start' }, h('button', { class: 'btn primary' }, 'Lưu thay đổi')))),
        card('Giao diện', h('p', { class: 'note-p', style: 'margin-bottom:12px' }, 'Chọn là áp dụng ngay, ghi nhớ trên trình duyệt này.'), chonGiaoDien())),
      h('div', { class: 'stack-col fill' },
        card('Đổi mật khẩu', h('form', { class: 'form', onsubmit: (e) => { e.preventDefault(); loiMk.replaceChildren();
          if (moi.value !== lai.value) { loiMk.append(ic('circle-alert'), h('span', {}, 'Mật khẩu nhập lại chưa khớp.')); lai.setAttribute('aria-invalid', 'true'); lai.focus(); return; }
          lai.removeAttribute('aria-invalid');
          khoaNut(e.target, async () => {
            if (await chay(() => api('PUT', '/tai-khoan/mat-khau', { matKhauCu: cu.value, matKhauMoi: moi.value })) !== undefined) { cu.value = ''; moi.value = ''; lai.value = ''; moi.dispatchEvent(new Event('input')); thongBao('Đã đổi mật khẩu'); }
          }); } },
          truongMatKhau('Mật khẩu hiện tại', cu), truongMatKhau('Mật khẩu mới', moi, 'Từ 6 ký tự. Dài hơn, có chữ lẫn số thì mạnh hơn.'), thanhDoManh(moi), truongMatKhau('Nhập lại mật khẩu mới', lai), loiMk,
          h('div', { class: 'acts start' }, h('button', { class: 'btn primary' }, 'Đổi mật khẩu')))),
        card('Phiên đăng nhập', h('div', { class: 'sess' }, h('span', { class: 'tile', 'aria-hidden': 'true' }, ic('laptop')),
          h('div', { class: 'sess-t' }, h('span', { class: 'sess-n' }, h('b', {}, 'Thiết bị này'), chip('ok', 'Đang hoạt động')), h('span', { class: 'muted xs' }, thietBi())),
          nut('Đăng xuất', { icon: 'log-out', loai: 'danger', onclick: () => document.dispatchEvent(new Event('dang-xuat')) })))))));
}

// ================= Quản trị và các vai trò nội bộ (UC 3.10) =================
export async function trangQuanTri(root) {
  let tab = 'nd'; const tabs = h('div'); const vung = h('div', { class: 'page-in' });
  root.append(tabs, vung);
  const ve = () => { tabs.replaceChildren(thanhTab([['nd', 'Người dùng'], ['dm', 'Danh mục mặc định'], ['tk', 'Thống kê và tổng kết']], tab, (k) => { tab = k; ve(); })); datHanhDong(); bo(vung); ({ nd: (v) => tabNguoiDung(v, { khoa: true }), dm: tabDmMacDinh, tk: (v) => tabThongKe(v, { chay: true }) })[tab](vung); };
  ve();
}

/** Nhân viên hỗ trợ: xem/tìm người dùng, gửi thông báo hỗ trợ (không khóa được). */
export async function trangHoTro(root) { await tabNguoiDung(root, { guiTb: true }); }

/** Kiểm toán viên: chỉ đọc thống kê và danh sách người dùng. */
export async function trangKiemToan(root) {
  const a = h('div', { class: 'page-in' }); const b = h('div', { class: 'page-in' });
  root.append(a, h('h2', { class: 'sec-h' }, 'Danh sách người dùng'), b);
  await tabThongKe(a, { chay: false });
  await tabNguoiDung(b, {});
}

async function tabNguoiDung(vung, { khoa: coKhoa = false, guiTb = false } = {}) {
  let q = ''; let tm; const bang = h('div', { class: 'card flush' });
  vung.append(h('div', { class: 'toolbar' }, h('label', { class: 'ico-in' }, h('span', { class: 'sr' }, 'Tìm người dùng'), ic('search'), h('input', { type: 'search', placeholder: 'Tên hoặc email', oninput: (e) => { clearTimeout(tm); tm = setTimeout(() => { q = e.target.value; tai(); }, 250); } }))), bang);
  async function tai() {
    dangTai(bang, 5);
    const r = await chay(() => api('GET', `/admin/nguoi-dung?${qs({ q })}`)); if (!r) { hienLoi(bang, tai); return; }
    const hanhDong = (u) => (coKhoa
      ? (u.trangThai === 'BiKhoa' ? nut('Mở khóa', { icon: 'lock-open', loai: 'sm', onclick: async () => { if (await chay(() => api('PUT', `/admin/nguoi-dung/${u.maTaiKhoan}/mo-khoa`)) !== undefined) { thongBao('Đã mở khóa tài khoản'); tai(); } } })
        : nut('Khóa', { icon: 'lock', loai: 'sm danger', onclick: () => khoa(u) }))
      : guiTb ? nut('Gửi thông báo', { icon: 'send', loai: 'sm', onclick: () => guiThongBao(u) }) : null);
    bo(bang).append(r.length ? h('div', { class: 'tbl-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Họ tên'), h('th', { scope: 'col' }, 'Email'), h('th', { scope: 'col', class: 'r' }, 'Giao dịch'), h('th', { scope: 'col' }, 'Ngày tạo'), h('th', { scope: 'col' }, 'Trạng thái'), h('th', { scope: 'col', class: 'r' }, h('span', { class: 'sr' }, 'Thao tác')))),
      h('tbody', {}, r.map((u) => h('tr', {}, h('td', {}, h('b', {}, u.hoTen)), h('td', { class: 'sub' }, u.email), h('td', { class: 'r num' }, u.soGiaoDich), h('td', { class: 'num muted' }, ngayVN(u.ngayTao)),
        h('td', {}, u.trangThai === 'BiKhoa' ? chip('bad', 'Bị khóa', 'lock', u.lyDoKhoa ?? '') : chip('', 'Hoạt động', 'circle-check')),
        h('td', { class: 'r' }, hanhDong(u))))))) : rong('search', 'Không tìm thấy người dùng', 'Thử tên hoặc email khác.'));
  }
  function khoa(u) {
    const ly = h('input', { required: true, placeholder: 'VD: Vi phạm điều khoản sử dụng' });
    const dlg = hopThoai(`Khóa tài khoản ${u.email}`, h('form', { class: 'form', onsubmit: (e) => { e.preventDefault(); khoaNut(e.target, async () => {
      if (await chay(() => api('PUT', `/admin/nguoi-dung/${u.maTaiKhoan}/khoa`, { lyDo: ly.value }), dlg) !== undefined) { dlg.dong(); thongBao('Đã khóa tài khoản'); tai(); }
    }); } }, truong('Lý do khóa', ly, 'Người dùng sẽ nhận được thông báo kèm lý do này.'), h('div', { class: 'acts' }, h('button', { type: 'button', class: 'btn', onclick: () => dlg.dong() }, 'Hủy'), h('button', { class: 'btn danger strong' }, ic('lock'), 'Xác nhận khóa'))));
  }
  function guiThongBao(u) {
    const nd = h('textarea', { required: true, rows: 4, maxlength: 300, placeholder: 'Nội dung hỗ trợ gửi tới người dùng (tối đa 300 ký tự)' });
    const dlg = hopThoai(`Gửi thông báo hỗ trợ cho ${u.hoTen}`, h('form', { class: 'form', onsubmit: (e) => { e.preventDefault(); khoaNut(e.target, async () => {
      if (await chay(() => api('POST', `/admin/nguoi-dung/${u.maTaiKhoan}/thong-bao`, { noiDung: nd.value }), dlg) !== undefined) { dlg.dong(); thongBao('Đã gửi thông báo hỗ trợ'); }
    }); } }, truong('Nội dung', nd), acts(() => dlg.dong(), 'Gửi')));
  }
  await tai();
}

async function tabDmMacDinh(vung) {
  const ds = h('div', { class: 'card flush' });
  vung.append(h('div', { class: 'toolbar' }, h('div', { class: 'sp' }), nut('Thêm danh mục mặc định', { icon: 'plus', loai: 'primary', ghiNhan: true, onclick: () => bieuMau(null) })), ds);
  async function tai() {
    dangTai(ds, 6);
    const r = await chay(() => api('GET', '/admin/danh-muc-mac-dinh')); if (!r) { hienLoi(ds, tai); return; }
    bo(ds).append(...r.map((d) => h('div', { class: 'txr' }, tile(d.bieuTuong, '', d.mauSac),
      h('div', {}, h('div', { class: 't1' }, h('i', { class: `swatch${d.mauSac ? ' c' : ''}`, style: d.mauSac ? `--c:${d.mauSac}` : null, 'aria-hidden': 'true' }), h('span', {}, d.tenDanhMuc)), h('div', { class: 't2' }, d.loai === 'Chi' ? 'Danh mục chi' : 'Danh mục thu')),
      d.laHeThong ? chip('', 'Hệ thống', 'lock') : h('span'),
      d.laHeThong ? h('span') : h('span', { class: 'ra' }, nutIcon('pencil', `Sửa danh mục ${d.tenDanhMuc}`, { loai: 'ghost sm', onclick: () => bieuMau(d) }),
        nutIcon('trash-2', `Xóa danh mục ${d.tenDanhMuc}`, { loai: 'ghost sm danger', onclick: async () => { if (await xacNhan(`Xóa danh mục mặc định "${d.tenDanhMuc}"?`) && await chay(() => api('DELETE', `/admin/danh-muc-mac-dinh/${d.maDanhMuc}`)) !== undefined) { thongBao('Đã xóa'); tai(); } } })))));
  }
  function bieuMau(d) {
    const ten = h('input', { value: d?.tenDanhMuc ?? '', required: true }); const loai = chon([['Chi', 'Chi'], ['Thu', 'Thu']], d?.loai ?? 'Chi', { disabled: !!d }); const mau = h('input', { type: 'color', value: d?.mauSac ?? '#1e88e5', 'aria-label': 'Màu danh mục' });
    const dlg = hopThoai(d ? 'Sửa danh mục mặc định' : 'Thêm danh mục mặc định', h('form', { class: 'form', onsubmit: (e) => { e.preventDefault(); khoaNut(e.target, async () => {
      const body = { tenDanhMuc: ten.value, loai: loai.value, mauSac: mau.value };
      if (await chay(() => (d ? api('PUT', `/admin/danh-muc-mac-dinh/${d.maDanhMuc}`, body) : api('POST', '/admin/danh-muc-mac-dinh', body)), dlg)) { dlg.dong(); thongBao('Đã lưu'); tai(); }
    }); } }, truong('Tên', ten), truong('Loại', loai), truong('Màu', mau), acts(() => dlg.dong())));
  }
  await tai();
}

async function tabThongKe(vung, { chay: choChay = true } = {}) {
  dangTai(vung, 3);
  const t = await chay(() => api('GET', '/admin/thong-ke')); if (!t) { hienLoi(vung, () => tabThongKe(vung, { chay: choChay })); return; }
  const o = h('input', { type: 'month', value: thangNay(), 'aria-label': 'Tháng tổng kết' });
  const ty = t.soNguoiDung ? Math.round((t.soDangHoatDong / t.soNguoiDung) * 100) : 0;
  const chayBtn = nut('Chạy tổng kết', { icon: 'rotate-cw', loai: 'primary', onclick: async () => {
    const [m, n] = tachThang(o.value); chayBtn.disabled = true; chayBtn.setAttribute('aria-busy', 'true');
    const r = await chay(() => api('POST', `/admin/chay-tong-ket?${qs({ thang: m, nam: n })}`));
    chayBtn.disabled = false; chayBtn.removeAttribute('aria-busy');
    if (r) thongBao(`Đã tổng kết cho ${r.soNguoiDaXuLy} người dùng`);
  } });
  bo(vung).append(...[dai(kpi('Người dùng', so(t.soNguoiDung)), kpi('Đang hoạt động', so(t.soDangHoatDong), kpiPhu(`${ty}% tổng số`)), kpi('Bị khóa', so(t.soBiKhoa)), kpi('Giao dịch tháng này', so(t.soGiaoDichThangNay))),
    dai(kpi('Người dùng mới tháng này', so(t.soNguoiMoiThangNay ?? 0)), kpi('Tổng số giao dịch', so(t.soGiaoDich ?? 0)),
      kpi('Tỷ lệ tài khoản hoạt động', `${ty}%`, h('div', { class: 'bar kpi-bar' }, h('i', { style: `width:${ty}%` })))),
    !choChay ? null : card('Chạy tổng kết tháng thủ công', h('p', { class: 'note-p' }, 'Dùng để demo mà không phải chờ đến cuối tháng. Chạy lại nhiều lần không tạo báo cáo hoặc thông báo trùng.'),
      h('div', { class: 'toolbar', style: 'margin:12px 0 0' }, o, chayBtn))].filter(Boolean));
}
