// Dữ liệu khởi tạo (idempotent) và dữ liệu demo (chỉ khi chưa có demo@demo.vn).
import { GiaoDich, MucTieuTietKiem, NganSach, LoaiGiaoDich, LoaiVi, Vi } from './domain/index.js';
import { nap, taoDichVu } from './services/index.js';

export const MAT_KHAU_DEMO = 'Demo@123';

export function napDuLieuKhoiTao(db, bam, dongHo) {
  db.giaoDich(() => {
    if (!db.get('SELECT 1 x FROM DanhMuc WHERE maTaiKhoan IS NULL')) {
      const chi = [['Ăn uống', 'restaurant', '#ef6c00'], ['Đi lại', 'directions_bus', '#1e88e5'], ['Mua sắm', 'shopping_bag', '#8e24aa'], ['Hóa đơn', 'receipt_long', '#6d4c41'],
        ['Giải trí', 'movie', '#e53935'], ['Sức khỏe', 'favorite', '#43a047'], ['Giáo dục', 'school', '#3949ab'], ['Khác', 'category', '#757575']];
      const thu = [['Lương', 'payments', '#2e7d32'], ['Thưởng', 'card_giftcard', '#f9a825'], ['Khác', 'category', '#757575']];
      const them = (t, i, m, loai, he = 0) => db.run('INSERT INTO DanhMuc (maTaiKhoan, tenDanhMuc, loai, bieuTuong, mauSac, laMacDinh, laHeThong) VALUES (NULL,?,?,?,?,1,?)', t, loai, i, m, he);
      chi.forEach(([t, i, m]) => them(t, i, m, 'Chi'));
      thu.forEach(([t, i, m]) => them(t, i, m, 'Thu'));
      them('Tiết kiệm', 'savings', '#00897b', 'Chi', 1); // danh mục hệ thống, không sửa/xóa được
    }
    db.run("DELETE FROM TaiKhoan WHERE email='danhmuc@demo.vn' AND loaiTaiKhoan='QuanLyDanhMuc'"); // vai trò đã bỏ ở bản cũ
    for (const [loai, ten, email] of [['QuanTriVien', 'Quản trị viên', 'admin@demo.vn'],
      ['NhanVienHoTro', 'Nhân viên hỗ trợ', 'hotro@demo.vn'], ['KiemToanVien', 'Kiểm toán viên', 'kiemtoan@demo.vn']]) {
      if (!db.get('SELECT 1 x FROM TaiKhoan WHERE email=?', email))
        db.run("INSERT INTO TaiKhoan (loaiTaiKhoan, hoTen, email, matKhauHash, trangThai, ngayTao) VALUES (?,?,?,?, 'HoatDong', ?)", loai, ten, email, bam.bam(MAT_KHAU_DEMO), dongHo.bayGio());
    }
  });
}

const cong = (iso, thang) => { // cộng/trừ tháng cho chuỗi ISO ngày
  const d = new Date(iso.slice(0, 10) + 'T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() + thang); return d.toISOString().slice(0, 10);
};

export function napDuLieuDemo(db, bam, dongHo) {
  if (db.get("SELECT 1 x FROM TaiKhoan WHERE email='demo@demo.vn'")) return false;
  const now = dongHo.bayGio(); const hom = dongHo.homNay();
  const thangNay = +now.slice(5, 7); const namNay = +now.slice(0, 4); const ngayNay = +now.slice(8, 10);
  db.giaoDich(() => {
    const maTk = db.run("INSERT INTO TaiKhoan (loaiTaiKhoan, hoTen, email, matKhauHash, trangThai, ngayTao) VALUES ('NguoiDung', ?, 'demo@demo.vn', ?, 'HoatDong', ?)",
      'Cường Hoàng', bam.bam(MAT_KHAU_DEMO), cong(hom, -3) + 'T08:00:00').id;
    db.run('INSERT INTO CaiDatNhacNho (maTaiKhoan) VALUES (?)', maTk);
    const taoVi = (ten, loai, sd) => nap.vi(db.get('SELECT * FROM Vi WHERE maVi=?', db.run('INSERT INTO Vi (maTaiKhoan, tenVi, loaiVi, soDu, ngayTao) VALUES (?,?,?,?,?)', maTk, ten, loai, sd, cong(hom, -3) + 'T08:00:00').id));
    const tm = taoVi('Tiền mặt', LoaiVi.TienMat, 8_000_000);
    const nh = taoVi('Vietcombank', LoaiVi.NganHang, 20_000_000);
    const dt = taoVi('Momo', LoaiVi.ViDienTu, 6_000_000);
    const dm = (ten, loai) => nap.danhMuc(db.get('SELECT * FROM DanhMuc WHERE maTaiKhoan IS NULL AND tenDanhMuc=? AND loai=?', ten, loai));

    let seed = 42; const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; }; // ngẫu nhiên tái lập được
    const ghiAn = ['Cơm trưa', 'Cà phê', 'Ăn tối với bạn', 'Trà sữa', 'Siêu thị', 'Bún bò'];
    const chiThang = { 'Ăn uống': 0, 'Mua sắm': 0, 'Đi lại': 0 };
    let soGd = 0;
    const them = (vi, danhMuc, tien, loai, ngay, ghiChu, maMucTieu = null) => {
      const gd = GiaoDich.tao(maTk, vi, danhMuc, tien, loai, ngay, ghiChu, maMucTieu);
      gd.ghiNhan();
      db.run('INSERT INTO GiaoDich (maTaiKhoan, maVi, maDanhMuc, maMucTieu, soTien, loai, ngayGiaoDich, ghiChu) VALUES (?,?,?,?,?,?,?,?)', maTk, vi.maVi, danhMuc.maDanhMuc, maMucTieu, tien, loai, ngay, ghiChu);
      soGd++;
      if (ngay.slice(5, 7) === String(thangNay).padStart(2, '0') && ngay.slice(0, 4) === String(namNay) && loai === 'Chi' && danhMuc.tenDanhMuc in chiThang) chiThang[danhMuc.tenDanhMuc] += tien;
    };

    for (let back = 2; back >= 0; back--) {
      const dau = cong(`${namNay}-${String(thangNay).padStart(2, '0')}-01`, -back);
      const soNgay = back === 0 ? ngayNay : new Date(Date.UTC(+dau.slice(0, 4), +dau.slice(5, 7), 0)).getUTCDate();
      const ngay = (d) => `${dau.slice(0, 8)}${String(Math.min(Math.max(d, 1), soNgay)).padStart(2, '0')}T${String(8 + rnd(12)).padStart(2, '0')}:${String(rnd(60)).padStart(2, '0')}:00`;
      them(nh, dm('Lương', 'Thu'), 15_000_000, 'Thu', ngay(1), 'Lương tháng');
      if (back !== 0) them(nh, dm('Thưởng', 'Thu'), 1_000_000 + rnd(3) * 500_000, 'Thu', ngay(15), 'Thưởng dự án');
      const n = back === 0 ? Math.max(12, soNgay) : 33;
      for (let i = 0; i < n; i++) {
        const d = back === 0 ? 1 + Math.floor((i * soNgay) / n) : 1 + rnd(soNgay);
        const p = rnd(10);
        if (p < 4) them(rnd(2) === 0 ? tm : dt, dm('Ăn uống', 'Chi'), (2 + rnd(10)) * 10_000, 'Chi', ngay(d), ghiAn[rnd(ghiAn.length)]);
        else if (p < 6) them(dt, dm('Đi lại', 'Chi'), (2 + rnd(8)) * 10_000, 'Chi', ngay(d), 'Grab / xăng xe');
        else if (p < 7) them(nh, dm('Mua sắm', 'Chi'), (5 + rnd(25)) * 20_000, 'Chi', ngay(d), 'Mua đồ');
        else if (p < 8) them(nh, dm('Hóa đơn', 'Chi'), (10 + rnd(30)) * 20_000, 'Chi', ngay(d), 'Điện, nước, internet');
        else if (p < 9) them(tm, dm('Giải trí', 'Chi'), (5 + rnd(15)) * 10_000, 'Chi', ngay(d), 'Xem phim');
        else them(tm, dm('Sức khỏe', 'Chi'), (3 + rnd(12)) * 10_000, 'Chi', ngay(d), 'Thuốc, khám bệnh');
      }
    }
    // Bảo đảm tháng hiện tại có chi ăn uống và mua sắm để minh họa cảnh báo ngân sách.
    them(nh, dm('Ăn uống', 'Chi'), 800_000, 'Chi', `${hom}T07:00:00`, 'Đi ăn buffet');
    them(nh, dm('Mua sắm', 'Chi'), 1_500_000, 'Chi', `${hom}T06:30:00`, 'Mua giày');

    for (const v of [tm, nh, dt]) db.run('UPDATE Vi SET soDu=? WHERE maVi=?', v.soDu, v.maVi);

    // Ngân sách tháng hiện tại: Ăn uống ~85% (đã cảnh báo ngưỡng), Mua sắm > 100% (đã cảnh báo vượt), Đi lại ~40%.
    for (const [ten, heSo] of [['Ăn uống', 0.85], ['Mua sắm', 1.25], ['Đi lại', 0.4]]) {
      const chi = chiThang[ten]; const han = Math.max(100_000, Math.round(chi / heSo / 50_000) * 50_000);
      const ns = new NganSach({ maTaiKhoan: maTk, maDanhMuc: dm(ten, 'Chi').maDanhMuc, thang: thangNay, nam: namNay });
      ns.capNhatHanMuc(han, chi);
      db.run('INSERT INTO NganSach (maTaiKhoan, maDanhMuc, hanMuc, thang, nam, nguongCanhBao, daCanhBaoNguong, daCanhBaoVuot) VALUES (?,?,?,?,?,?,?,?)', maTk, ns.maDanhMuc, ns.hanMuc, thangNay, namNay, 80, +ns.daCanhBaoNguong, +ns.daCanhBaoVuot);
    }

    // 2 mục tiêu: "Du lịch" đúng tiến độ, "Mua laptop" chậm.
    const tietKiem = nap.danhMuc(db.get('SELECT * FROM DanhMuc WHERE laHeThong=1'));
    const taoMt = (ten, so, han) => nap.mucTieu(db.get('SELECT * FROM MucTieuTietKiem WHERE maMucTieu=?',
      db.run('INSERT INTO MucTieuTietKiem (maTaiKhoan, tenMucTieu, soTienMucTieu, soTienHienTai, hanChot, ngayTao) VALUES (?,?,?,0,?,?)', maTk, ten, so, han, cong(hom, -2)).id));
    for (const [m, tien] of [[taoMt('Mua laptop', 20_000_000, cong(hom, 6)), 3_000_000], [taoMt('Du lịch Đà Lạt', 6_000_000, cong(hom, 3)), 4_000_000]]) {
      m.napTien(nh, tien);
      db.run('UPDATE MucTieuTietKiem SET soTienHienTai=? WHERE maMucTieu=?', m.soTienHienTai, m.maMucTieu);
      db.run('INSERT INTO GiaoDich (maTaiKhoan, maVi, maDanhMuc, maMucTieu, soTien, loai, ngayGiaoDich, ghiChu) VALUES (?,?,?,?,?,?,?,?)',
        maTk, nh.maVi, tietKiem.maDanhMuc, m.maMucTieu, tien, 'Chi', cong(hom, 0) === hom ? `${cong(hom, -1)}T10:00:00` : `${hom}T10:00:00`, `Nạp mục tiêu: ${m.tenMucTieu}`);
      soGd++;
    }
    db.run('UPDATE Vi SET soDu=? WHERE maVi=?', nh.soDu, nh.maVi);
    db.run("INSERT INTO ThongBao (maTaiKhoan, loai, noiDung, daDoc, ngayTao) VALUES (?,?,?,0,?)", maTk, 'CanhBaoNganSach', `Ngân sách Ăn uống tháng ${String(thangNay).padStart(2, '0')}/${namNay} đã dùng 85%`, now);
    db.run("INSERT INTO ThongBao (maTaiKhoan, loai, noiDung, daDoc, ngayTao) VALUES (?,?,?,0,?)", maTk, 'CanhBaoNganSach', `Ngân sách Mua sắm tháng ${String(thangNay).padStart(2, '0')}/${namNay} đã vượt hạn mức`, now);
  });
  napDuLieuMoRong(db, bam, dongHo);
  return true;
}

/**
 * Dữ liệu mở rộng để MỖI BẢNG có ít nhất 9 dòng (yêu cầu nhập liệu của học phần).
 * Tạo qua tầng nghiệp vụ (services) nên số dư ví, cảnh báo ngân sách và các quy tắc R1–R13 đều được áp dụng như thao tác thật.
 */
function napDuLieuMoRong(db, bam, dongHo) {
  const S = taoDichVu({ db, dongHo, bam, jwt: { taoToken: () => '' } });
  const hom = dongHo.homNay();
  const thangNay = +hom.slice(5, 7); const namNay = +hom.slice(0, 4); const ngayNay = +hom.slice(8, 10);
  const kyNay = hom.slice(0, 7);
  const p2 = (n) => String(n).padStart(2, '0');
  const thangTruoc = (k) => { const d = new Date(Date.UTC(namNay, thangNay - 1 - k, 1)); return [d.getUTCMonth() + 1, d.getUTCFullYear()]; };
  let seed = 7; const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
  const dmChung = (ten, loai) => db.get('SELECT maDanhMuc FROM DanhMuc WHERE maTaiKhoan IS NULL AND tenDanhMuc=? AND loai=?', ten, loai).maDanhMuc;
  const maDemo = db.get("SELECT maTaiKhoan FROM TaiKhoan WHERE email='demo@demo.vn'").maTaiKhoan;
  const viDemo = Object.fromEntries(db.all('SELECT maVi, tenVi FROM Vi WHERE maTaiKhoan=?', maDemo).map((v) => [v.tenVi, v.maVi]));

  // ---- Người dùng demo: hóa đơn quét (9 hóa đơn, mỗi hóa đơn 2–3 mặt hàng), chuyển tiền, lịch định kỳ
  const hoaDon = [
    ['Siêu thị Co.opmart', [['Gạo ST25 5kg', 1, 180_000], ['Dầu ăn', 2, 45_000], ['Trứng gà (10 quả)', 1, 38_000]]],
    ['Bách Hóa Xanh', [['Rau củ các loại', 1, 62_000], ['Thịt heo 500g', 1, 75_000]]],
    ['Highlands Coffee', [['Phin sữa đá', 2, 39_000], ['Bánh mì que', 2, 25_000]]],
    ['Nhà thuốc Long Châu', [['Vitamin C', 1, 120_000], ['Khẩu trang (hộp)', 1, 35_000]]],
    ['Điện Máy Xanh', [['Bóng đèn LED', 3, 59_000], ['Ổ cắm điện', 1, 145_000]]],
    ['Circle K', [['Nước suối', 3, 10_000], ['Mì ly', 2, 15_000]]],
    ['Phở Hà Nội', [['Phở bò tái', 2, 55_000], ['Trà đá', 2, 5_000]]],
    ['Nhà sách Fahasa', [['Sách UML Distilled', 1, 210_000], ['Bút bi (hộp)', 1, 48_000]]],
    ['Lotte Mart', [['Sữa tươi 1L', 4, 32_000], ['Bánh quy', 2, 41_000], ['Nước giặt', 1, 165_000]]],
  ];
  const dmHoaDon = ['Ăn uống', 'Ăn uống', 'Ăn uống', 'Sức khỏe', 'Mua sắm', 'Ăn uống', 'Ăn uống', 'Giáo dục', 'Mua sắm'];
  hoaDon.forEach(([cuaHang, matHang], i) => {
    const ngay = `${kyNay}-${p2(Math.max(1, Math.min(ngayNay, 1 + i * 3)))}T${p2(9 + (i % 9))}:15:00`;
    S.giaoDich.them(maDemo, { maVi: viDemo.Vietcombank, maDanhMuc: dmChung(dmHoaDon[i], 'Chi'), loai: 'Chi', ngayGiaoDich: ngay,
      soTien: matHang.reduce((s, [, sl, gia]) => s + sl * gia, 0), ghiChu: `Hóa đơn ${cuaHang}`,
      hoaDon: { tenCuaHang: cuaHang, ngayHoaDon: ngay, anhHoaDon: '', chiTiet: matHang.map(([tenMatHang, soLuong, donGia]) => ({ tenMatHang, soLuong, donGia })) } });
  });
  S.chuyenTien.them(maDemo, { maViNguon: viDemo.Vietcombank, maViDich: viDemo['Tiền mặt'], soTien: 2_000_000, ghiChu: 'Rút tiền mặt' });
  S.chuyenTien.them(maDemo, { maViNguon: viDemo.Vietcombank, maViDich: viDemo.Momo, soTien: 500_000, ghiChu: 'Nạp Momo' });
  const dinhKy = (maTk, maVi, ten, loai, soTien, ngay, ghiChu) => {
    const g = S.dinhKy.tao(maTk, { maVi, maDanhMuc: dmChung(ten, loai), soTien, loai, ngayTrongThang: ngay, ghiChu });
    // Tháng này đã ghi tay rồi nên đánh dấu đã chạy, bộ hẹn giờ sẽ tạo từ tháng sau
    if (ngay <= ngayNay) db.run('UPDATE GiaoDichDinhKy SET thangDaChay=? WHERE maDinhKy=?', kyNay, g.maDinhKy);
  };
  dinhKy(maDemo, viDemo.Vietcombank, 'Lương', 'Thu', 15_000_000, 1, 'Lương tháng');
  dinhKy(maDemo, viDemo.Vietcombank, 'Hóa đơn', 'Chi', 450_000, 15, 'Tiền điện nước, internet');
  dinhKy(maDemo, viDemo.Momo, 'Giáo dục', 'Chi', 300_000, 20, 'Học phí tiếng Anh');

  // ---- 8 người dùng mẫu, mỗi người có ví, giao dịch 3 tháng, định kỳ, chuyển tiền, mục tiêu, kế hoạch
  const nguoi = [['Nguyễn Văn An', 'an', 12_000_000], ['Trần Thị Bình', 'binh', 9_000_000], ['Lê Hoàng Châu', 'chau', 18_000_000], ['Phạm Minh Dũng', 'dung', 7_500_000],
    ['Hoàng Thu Hà', 'ha', 14_000_000], ['Võ Thanh Khoa', 'khoa', 10_000_000], ['Đặng Ngọc Lan', 'lan', 8_000_000], ['Bùi Quốc Nam', 'nam', 11_000_000]];
  const rieng = ['Cà phê', 'Thú cưng', 'Gửi bố mẹ', 'Thể thao', 'Làm đẹp', 'Quà tặng', 'Sách', 'Du lịch'];
  const mucTieu = [['Mua xe máy', 30_000_000], ['Quỹ khẩn cấp', 20_000_000], ['Du lịch Nhật Bản', 45_000_000], ['Mua điện thoại', 12_000_000],
    ['Học thạc sĩ', 60_000_000], ['Mua laptop', 25_000_000], ['Đám cưới', 80_000_000], ['Sửa nhà', 40_000_000]];
  const ds = [];
  nguoi.forEach(([hoTen, ten, luong], i) => {
    const email = `${ten}@demo.vn`;
    if (db.get('SELECT 1 x FROM TaiKhoan WHERE email=?', email)) return;
    const maTk = S.taiKhoan.dangKy({ hoTen, email, matKhau: MAT_KHAU_DEMO });
    db.run('UPDATE TaiKhoan SET ngayTao=? WHERE maTaiKhoan=?', `${cong(hom, -3)}T08:${p2(i * 5)}:00`, maTk);
    const tm = db.get('SELECT maVi FROM Vi WHERE maTaiKhoan=?', maTk).maVi;
    const nh = S.vi.them(maTk, { tenVi: i % 2 ? 'Techcombank' : 'MB Bank', loaiVi: 'NganHang', soDuBanDau: 2_000_000 + i * 500_000 }).maVi;
    const dmRieng = S.danhMuc.them(maTk, { tenDanhMuc: rieng[i], loai: 'Chi' }).maDanhMuc;
    for (let back = 2; back >= 0; back--) {
      const [t, n] = thangTruoc(back);
      const soNgay = back === 0 ? ngayNay : new Date(Date.UTC(n, t, 0)).getUTCDate();
      const ngay = (d) => `${n}-${p2(t)}-${p2(Math.min(Math.max(d, 1), soNgay))}T${p2(8 + rnd(12))}:${p2(rnd(60))}:00`;
      S.giaoDich.them(maTk, { maVi: nh, maDanhMuc: dmChung('Lương', 'Thu'), soTien: luong, loai: 'Thu', ngayGiaoDich: ngay(1), ghiChu: 'Lương tháng' });
      if (back === 2) S.chuyenTien.them(maTk, { maViNguon: nh, maViDich: tm, soTien: 1_000_000 + rnd(4) * 500_000, ghiChu: 'Rút tiền mặt' });
      const chi = [['Ăn uống', tm, 4], ['Đi lại', nh, 2], ['Hóa đơn', nh, 1], ['Mua sắm', nh, 1], ['Giải trí', tm, 1]];
      for (const [dmTen, vi, lan] of chi) {
        for (let k = 0; k < lan; k++) {
          const so = Math.round((luong * (dmTen === 'Ăn uống' ? 0.05 : 0.04) * (0.6 + rnd(8) / 10)) / 10_000) * 10_000;
          try { S.giaoDich.them(maTk, { maVi: vi, maDanhMuc: dmChung(dmTen, 'Chi'), soTien: so, loai: 'Chi', ngayGiaoDich: ngay(2 + rnd(soNgay)), ghiChu: dmTen }); } catch { /* ví hết tiền thì bỏ qua */ }
        }
      }
      try { S.giaoDich.them(maTk, { maVi: tm, maDanhMuc: dmRieng, soTien: 100_000 + rnd(5) * 50_000, loai: 'Chi', ngayGiaoDich: ngay(10 + rnd(10)), ghiChu: rieng[i] }); } catch { /* bỏ qua */ }
    }
    dinhKy(maTk, nh, 'Lương', 'Thu', luong, 1, 'Lương tháng');
    if (i % 2 === 0) dinhKy(maTk, nh, 'Hóa đơn', 'Chi', 300_000 + i * 50_000, 10, 'Điện nước');
    const [tenMt, soMt] = mucTieu[i];
    const mt = S.mucTieu.tao(maTk, { tenMucTieu: tenMt, soTienMucTieu: soMt, hanChot: cong(hom, 6 + i) });
    S.mucTieu.napTien(maTk, mt.maMucTieu, { maVi: nh, soTien: 500_000 + rnd(4) * 250_000 });
    ds.push(maTk);
  });

  // ---- Kế hoạch tháng: người dùng demo 3 tháng (giữ ngân sách minh họa cảnh báo), người dùng mẫu tháng hiện tại
  const apDung = (maTk, t, n, phuongPhap, giuHienTai = false) => {
    const g = S.keHoach.goiY(maTk, t, n, phuongPhap);
    S.keHoach.apDung(maTk, { thang: t, nam: n, thuNhapDuKien: g.thuNhapDuKien || 10_000_000, tietKiemDuKien: g.tietKiem, phuongPhap,
      phanBo: g.phanBo.map((p) => ({ maDanhMuc: p.maDanhMuc, hanMuc: giuHienTai && p.hienTai ? p.hienTai : p.deXuat })) });
  };
  for (const back of [2, 1]) { const [t, n] = thangTruoc(back); apDung(maDemo, t, n, '50-30-20'); } // tháng cũ chưa đủ 3 tháng lịch sử
  apDung(maDemo, thangNay, namNay, 'LichSu', true);
  ds.forEach((maTk, i) => apDung(maTk, thangNay, namNay, i % 2 ? '50-30-20' : 'LichSu'));

  // ---- Tổng kết 2 tháng trước cho mọi người dùng (BaoCaoThang + thông báo tổng kết), một tài khoản bị khóa để minh họa quản trị
  for (const back of [2, 1]) { const [t, n] = thangTruoc(back); S.baoCao.tongKetTatCa(t, n); }
  const maAdmin = db.get("SELECT maTaiKhoan FROM TaiKhoan WHERE email='admin@demo.vn'")?.maTaiKhoan;
  const maNam = db.get("SELECT maTaiKhoan FROM TaiKhoan WHERE email='nam@demo.vn'")?.maTaiKhoan;
  if (maAdmin && maNam) S.quanTri.khoa(maAdmin, maNam, 'Tài khoản dùng chung, vi phạm điều khoản sử dụng');
  const maHoTro = db.get("SELECT maTaiKhoan FROM TaiKhoan WHERE email='hotro@demo.vn'")?.maTaiKhoan;
  if (maHoTro) S.quanTri.guiThongBaoHoTro(maHoTro, maDemo, 'Chào bạn, nhóm hỗ trợ đã kiểm tra: bạn có thể dùng trang Kế hoạch để lập ngân sách cả tháng chỉ với một lần bấm.');
}
