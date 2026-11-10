// Dữ liệu khởi tạo (idempotent) và dữ liệu demo (chỉ khi chưa có demo@demo.vn).
import { GiaoDich, MucTieuTietKiem, NganSach, LoaiGiaoDich, LoaiVi, Vi } from './domain/index.js';
import { nap } from './services/index.js';

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
    const maTk = db.run("INSERT INTO TaiKhoan (loaiTaiKhoan, hoTen, email, matKhauHash, trangThai, ngayTao) VALUES ('NguoiDung','Nguyễn Văn Demo','demo@demo.vn',?, 'HoatDong', ?)",
      bam.bam(MAT_KHAU_DEMO), cong(hom, -3) + 'T08:00:00').id;
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
  return true;
}
