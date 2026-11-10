// Tầng Service: tải thực thể -> gọi phương thức domain -> lưu trong một transaction -> tạo thông báo nếu cần.
import ExcelJS from 'exceljs';
import {
  DomainError, NotFoundError, LoaiGiaoDich, LoaiVi, LoaiThongBao, TrangThaiTaiKhoan, KetQuaCanhBao,
  TaiKhoan, NguoiDung, QuanTriVien, NhanVienHoTro, KiemToanVien, CaiDatNhacNho, Vi, DanhMuc, GiaoDich, HoaDon, ChiTietHoaDon, NganSach, MucTieuTietKiem, BaoCaoThang,
} from '../domain/index.js';

const b = (x) => !!x;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n);
const mm = (thang) => String(thang).padStart(2, '0');
const batDauThang = (thang, nam) => `${nam}-${mm(thang)}-01T00:00:00`;
const thangKe = (thang, nam) => (thang === 12 ? [1, nam + 1] : [thang + 1, nam]);
const gioiHanThang = (thang, nam) => { const [t, n] = thangKe(thang, nam); return [batDauThang(thang, nam), batDauThang(t, n)]; };
const kiemTraThang = (thang, nam) => {
  if (!Number.isInteger(thang) || thang < 1 || thang > 12 || !Number.isInteger(nam) || nam < 2000 || nam > 2100) throw new DomainError('Tháng hoặc năm không hợp lệ');
};
const soTien = (x, ten = 'Số tiền') => {
  const n = Number(x);
  if (!Number.isInteger(n) || n <= 0) throw new DomainError(`${ten} phải là số nguyên lớn hơn 0`);
  return n;
};

// ---- nạp/lưu thực thể (ánh xạ bảng <-> lớp domain)
export const nap = {
  taiKhoan(r) {
    if (!r) return null;
    const init = { ...r, trangThai: r.trangThai };
    const lop = { QuanTriVien, NhanVienHoTro, KiemToanVien }[r.loaiTaiKhoan] ?? NguoiDung;
    return new lop(init);
  },
  vi: (r) => (r ? new Vi(r) : null),
  danhMuc: (r) => (r ? new DanhMuc({ ...r, laMacDinh: b(r.laMacDinh), laHeThong: b(r.laHeThong) }) : null),
  nganSach: (r) => (r ? new NganSach({ ...r, daCanhBaoNguong: b(r.daCanhBaoNguong), daCanhBaoVuot: b(r.daCanhBaoVuot) }) : null),
  mucTieu: (r) => (r ? new MucTieuTietKiem(r) : null),
};

export function taoDichVu(ctx) {
  const { db, dongHo, bam, jwt } = ctx;
  const S = {};

  // ============ Thông báo (UC 2.9, 3.11) ============
  S.thongBao = {
    /** Chỉ ghi dòng thông báo; chạy trong transaction của người gọi. */
    tao(maTk, loai, noiDung) {
      db.run('INSERT INTO ThongBao (maTaiKhoan, loai, noiDung, daDoc, ngayTao) VALUES (?,?,?,0,?)', maTk, loai, noiDung, dongHo.bayGio());
    },
    daGuiHomNay(maTk, loai) {
      const h = dongHo.homNay();
      return !!db.get('SELECT 1 x FROM ThongBao WHERE maTaiKhoan=? AND loai=? AND substr(ngayTao,1,10)=?', maTk, loai, h);
    },
    danhSach: (maTk) => db.all('SELECT * FROM ThongBao WHERE maTaiKhoan=? ORDER BY ngayTao DESC, maThongBao DESC LIMIT 100', maTk).map((t) => ({ ...t, daDoc: b(t.daDoc) })),
    soChuaDoc: (maTk) => db.get('SELECT COUNT(*) n FROM ThongBao WHERE maTaiKhoan=? AND daDoc=0', maTk).n,
    _lay(maTk, id) {
      const t = db.get('SELECT * FROM ThongBao WHERE maThongBao=? AND maTaiKhoan=?', id, maTk);
      if (!t) throw new NotFoundError();
      return t;
    },
    daDoc(maTk, id) { this._lay(maTk, id); db.run('UPDATE ThongBao SET daDoc=1 WHERE maThongBao=?', id); },
    daDocTatCa(maTk) { db.run('UPDATE ThongBao SET daDoc=1 WHERE maTaiKhoan=?', maTk); },
    xoa(maTk, id) { this._lay(maTk, id); db.run('DELETE FROM ThongBao WHERE maThongBao=?', id); },
    layCaiDat(maTk) {
      const c = db.get('SELECT * FROM CaiDatNhacNho WHERE maTaiKhoan=?', maTk);
      if (!c) throw new NotFoundError();
      return { nhacHangNgay: b(c.nhacHangNgay), gioNhac: c.gioNhac, nhacNganSach: b(c.nhacNganSach), nhacMucTieu: b(c.nhacMucTieu) };
    },
    luuCaiDat(maTk, d) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d?.gioNhac ?? '')) throw new DomainError('Giờ nhắc phải có dạng HH:mm');
      const c = new CaiDatNhacNho(db.get('SELECT * FROM CaiDatNhacNho WHERE maTaiKhoan=?', maTk));
      Object.assign(c, { nhacHangNgay: b(d.nhacHangNgay), gioNhac: d.gioNhac, nhacNganSach: b(d.nhacNganSach), nhacMucTieu: b(d.nhacMucTieu) });
      db.run('UPDATE CaiDatNhacNho SET nhacHangNgay=?, gioNhac=?, nhacNganSach=?, nhacMucTieu=? WHERE maTaiKhoan=?', +c.nhacHangNgay, c.gioNhac, +c.nhacNganSach, +c.nhacMucTieu, maTk);
      return this.layCaiDat(maTk);
    },
    khoiPhucMacDinh(maTk) {
      const c = new CaiDatNhacNho(db.get('SELECT * FROM CaiDatNhacNho WHERE maTaiKhoan=?', maTk));
      c.khoiPhucMacDinh();
      db.run('UPDATE CaiDatNhacNho SET nhacHangNgay=1, gioNhac=?, nhacNganSach=1, nhacMucTieu=1 WHERE maTaiKhoan=?', c.gioNhac, maTk);
      return this.layCaiDat(maTk);
    },
  };

  // ============ Tài khoản (UC 2.1, 3.1, 3.2) ============
  S.taiKhoan = {
    dangKy({ hoTen, email, matKhau } = {}) {
      if (!hoTen?.trim()) throw new DomainError('Họ tên không được để trống');
      if (!EMAIL.test(email ?? '')) throw new DomainError('Email không hợp lệ');
      if (!matKhau || matKhau.length < 6) throw new DomainError('Mật khẩu phải có ít nhất 6 ký tự');
      const e = email.trim().toLowerCase();
      if (db.get('SELECT 1 x FROM TaiKhoan WHERE email=?', e)) throw new DomainError('Email đã được sử dụng');
      return db.giaoDich(() => {
        const { id } = db.run("INSERT INTO TaiKhoan (loaiTaiKhoan, hoTen, email, matKhauHash, trangThai, ngayTao, donViTienTe) VALUES ('NguoiDung',?,?,?,?,?,'VND')",
          hoTen.trim(), e, bam.bam(matKhau), TrangThaiTaiKhoan.HoatDong, dongHo.bayGio());
        db.run('INSERT INTO CaiDatNhacNho (maTaiKhoan) VALUES (?)', id);
        db.run('INSERT INTO Vi (maTaiKhoan, tenVi, loaiVi, soDu, ngayTao) VALUES (?,?,?,0,?)', id, 'Tiền mặt', LoaiVi.TienMat, dongHo.bayGio());
        return id;
      });
    },
    dangNhap({ email, matKhau } = {}) {
      const tk = nap.taiKhoan(db.get('SELECT * FROM TaiKhoan WHERE email=?', String(email ?? '').trim().toLowerCase()));
      if (!tk || !tk.dangNhap(String(matKhau ?? ''), bam)) throw new DomainError('Email hoặc mật khẩu không đúng');
      return { token: jwt.taoToken(tk), vaiTro: tk.vaiTro, hoTen: tk.hoTen };
    },
    toi(maTk) {
      const tk = nap.taiKhoan(db.get('SELECT * FROM TaiKhoan WHERE maTaiKhoan=?', maTk));
      if (!tk) throw new NotFoundError();
      return { maTaiKhoan: tk.maTaiKhoan, hoTen: tk.hoTen, email: tk.email, vaiTro: tk.vaiTro, ngayTao: tk.ngayTao };
    },
    capNhat(maTk, hoTen) {
      const tk = nap.taiKhoan(db.get('SELECT * FROM TaiKhoan WHERE maTaiKhoan=?', maTk));
      tk.capNhatThongTin(hoTen);
      db.run('UPDATE TaiKhoan SET hoTen=? WHERE maTaiKhoan=?', tk.hoTen, maTk);
    },
    doiMatKhau(maTk, { matKhauCu, matKhauMoi } = {}) {
      const tk = nap.taiKhoan(db.get('SELECT * FROM TaiKhoan WHERE maTaiKhoan=?', maTk));
      if (!tk.doiMatKhau(String(matKhauCu ?? ''), String(matKhauMoi ?? ''), bam)) throw new DomainError('Mật khẩu hiện tại không đúng');
      db.run('UPDATE TaiKhoan SET matKhauHash=? WHERE maTaiKhoan=?', tk.matKhauHash, maTk);
    },
  };

  // ============ Ví (UC 2.2, 3.3) ============
  const dtoVi = (v) => ({ maVi: v.maVi, tenVi: v.tenVi, loaiVi: v.loaiVi, soDu: v.soDu });
  S.vi = {
    layCuaToi(maTk, maVi) {
      const v = nap.vi(db.get('SELECT * FROM Vi WHERE maVi=? AND maTaiKhoan=?', maVi, maTk));
      if (!v) throw new NotFoundError(); // R10
      return v;
    },
    danhSach: (maTk) => db.all('SELECT * FROM Vi WHERE maTaiKhoan=? ORDER BY maVi', maTk).map((r) => dtoVi(nap.vi(r))),
    them(maTk, { tenVi, loaiVi, soDuBanDau } = {}) {
      const ten = String(tenVi ?? '').trim();
      if (!ten) throw new DomainError('Tên ví không được để trống');
      if (!Object.values(LoaiVi).includes(loaiVi)) throw new DomainError('Loại ví không hợp lệ');
      const sd = Number(soDuBanDau ?? 0);
      if (!Number.isInteger(sd) || sd < 0) throw new DomainError('Số dư ban đầu không hợp lệ');
      if (db.get('SELECT 1 x FROM Vi WHERE maTaiKhoan=? AND tenVi=?', maTk, ten)) throw new DomainError('Tên ví đã tồn tại'); // R4
      const { id } = db.run('INSERT INTO Vi (maTaiKhoan, tenVi, loaiVi, soDu, ngayTao) VALUES (?,?,?,?,?)', maTk, ten, loaiVi, sd, dongHo.bayGio());
      return dtoVi(this.layCuaToi(maTk, id));
    },
    sua(maTk, id, { tenVi, loaiVi } = {}) {
      const v = this.layCuaToi(maTk, id);
      const ten = String(tenVi ?? '').trim();
      if (!ten) throw new DomainError('Tên ví không được để trống');
      if (db.get('SELECT 1 x FROM Vi WHERE maTaiKhoan=? AND tenVi=? AND maVi<>?', maTk, ten, id)) throw new DomainError('Tên ví đã tồn tại');
      db.run('UPDATE Vi SET tenVi=?, loaiVi=? WHERE maVi=?', ten, loaiVi ?? v.loaiVi, id);
      return dtoVi(this.layCuaToi(maTk, id));
    },
    xoa(maTk, id) {
      this.layCuaToi(maTk, id);
      if (db.get('SELECT 1 x FROM GiaoDich WHERE maVi=?', id)) throw new DomainError('Ví còn giao dịch, không thể xóa'); // R4
      db.run('DELETE FROM Vi WHERE maVi=?', id);
    },
    luuSoDu: (v) => db.run('UPDATE Vi SET soDu=? WHERE maVi=?', v.soDu, v.maVi),
  };

  // ============ Danh mục (UC 2.3, 3.4) ============
  const dtoDm = (d) => ({ maDanhMuc: d.maDanhMuc, tenDanhMuc: d.tenDanhMuc, loai: d.loai, bieuTuong: d.bieuTuong, mauSac: d.mauSac, laMacDinh: d.laMacDinh, laHeThong: d.laHeThong });
  S.danhMuc = {
    layDungDuoc(maTk, ma) {
      const d = nap.danhMuc(db.get('SELECT * FROM DanhMuc WHERE maDanhMuc=?', ma));
      if (!d || (d.maTaiKhoan !== null && d.maTaiKhoan !== maTk)) throw new NotFoundError(); // R10
      return d;
    },
    danhSach(maTk, loai) {
      const rows = loai
        ? db.all('SELECT * FROM DanhMuc WHERE (maTaiKhoan IS NULL OR maTaiKhoan=?) AND loai=? ORDER BY laHeThong, maDanhMuc', maTk, loai)
        : db.all('SELECT * FROM DanhMuc WHERE maTaiKhoan IS NULL OR maTaiKhoan=? ORDER BY laHeThong, maDanhMuc', maTk);
      return rows.map((r) => dtoDm(nap.danhMuc(r)));
    },
    _kiemTraTen(maTk, ten, loai, boQua) {
      if (db.get('SELECT 1 x FROM DanhMuc WHERE (maTaiKhoan IS NULL OR maTaiKhoan=?) AND loai=? AND tenDanhMuc=? AND maDanhMuc<>?', maTk, loai, ten, boQua ?? -1))
        throw new DomainError('Tên danh mục đã tồn tại');
    },
    them(maTk, { tenDanhMuc, loai, bieuTuong, mauSac } = {}) {
      const ten = String(tenDanhMuc ?? '').trim();
      if (!ten) throw new DomainError('Tên danh mục không được để trống');
      if (!Object.values(LoaiGiaoDich).includes(loai)) throw new DomainError('Loại danh mục không hợp lệ');
      this._kiemTraTen(maTk, ten, loai);
      const { id } = db.run('INSERT INTO DanhMuc (maTaiKhoan, tenDanhMuc, loai, bieuTuong, mauSac, laMacDinh, laHeThong) VALUES (?,?,?,?,?,0,0)', maTk, ten, loai, bieuTuong || 'category', mauSac || '#607d8b');
      return dtoDm(this.layDungDuoc(maTk, id));
    },
    sua(maTk, id, { tenDanhMuc, bieuTuong, mauSac } = {}) {
      const d = this.layDungDuoc(maTk, id);
      if (d.laMacDinh || d.laHeThong) throw new DomainError('Không thể sửa danh mục mặc định'); // R5
      const ten = String(tenDanhMuc ?? '').trim();
      if (!ten) throw new DomainError('Tên danh mục không được để trống');
      this._kiemTraTen(maTk, ten, d.loai, id);
      db.run('UPDATE DanhMuc SET tenDanhMuc=?, bieuTuong=?, mauSac=? WHERE maDanhMuc=?', ten, bieuTuong || d.bieuTuong, mauSac || d.mauSac, id);
      return dtoDm(this.layDungDuoc(maTk, id));
    },
    /** R5: danh mục đang dùng phải chuyển sang danh mục cùng loại; ngân sách trùng thì gộp hạn mức. */
    xoa(maTk, id, chuyenSang) {
      const d = this.layDungDuoc(maTk, id);
      if (d.laMacDinh || d.laHeThong) throw new DomainError('Không thể xóa danh mục mặc định');
      const coGd = b(db.get('SELECT 1 x FROM GiaoDich WHERE maDanhMuc=?', id));
      const coNs = b(db.get('SELECT 1 x FROM NganSach WHERE maDanhMuc=?', id));
      db.giaoDich(() => {
        if (d.dangDuocSuDung(coGd, coNs)) {
          if (!chuyenSang) throw new DomainError('Danh mục đang được sử dụng, vui lòng chọn danh mục để chuyển sang');
          const dich = this.layDungDuoc(maTk, Number(chuyenSang));
          if (dich.loai !== d.loai || dich.maDanhMuc === id) throw new DomainError('Danh mục chuyển sang phải cùng loại');
          db.run('UPDATE GiaoDich SET maDanhMuc=? WHERE maDanhMuc=?', dich.maDanhMuc, id);
          for (const ns of db.all('SELECT * FROM NganSach WHERE maDanhMuc=?', id)) {
            const trung = db.get('SELECT * FROM NganSach WHERE maTaiKhoan=? AND maDanhMuc=? AND thang=? AND nam=?', ns.maTaiKhoan, dich.maDanhMuc, ns.thang, ns.nam);
            if (trung) { db.run('UPDATE NganSach SET hanMuc=hanMuc+? WHERE maNganSach=?', ns.hanMuc, trung.maNganSach); db.run('DELETE FROM NganSach WHERE maNganSach=?', ns.maNganSach); }
            else db.run('UPDATE NganSach SET maDanhMuc=? WHERE maNganSach=?', dich.maDanhMuc, ns.maNganSach);
          }
        }
        db.run('DELETE FROM DanhMuc WHERE maDanhMuc=?', id);
      });
    },
  };

  // ============ Ngân sách (UC 2.5, 3.7) ============
  S.nganSach = {
    soDaChi(maTk, maDm, thang, nam) {
      const [tu, den] = gioiHanThang(thang, nam);
      return db.get("SELECT COALESCE(SUM(soTien),0) s FROM GiaoDich WHERE maTaiKhoan=? AND maDanhMuc=? AND loai='Chi' AND ngayGiaoDich>=? AND ngayGiaoDich<?", maTk, maDm, tu, den).s;
    },
    _dto(n) {
      const chi = this.soDaChi(n.maTaiKhoan, n.maDanhMuc, n.thang, n.nam);
      const d = db.get('SELECT tenDanhMuc, mauSac FROM DanhMuc WHERE maDanhMuc=?', n.maDanhMuc);
      return { maNganSach: n.maNganSach, maDanhMuc: n.maDanhMuc, tenDanhMuc: d.tenDanhMuc, mauSac: d.mauSac, hanMuc: n.hanMuc, soDaChi: chi,
        tienDo: Math.round(n.tinhTienDo(chi) * 10) / 10, nguongCanhBao: n.nguongCanhBao, thang: n.thang, nam: n.nam };
    },
    danhSachTheoThang(maTk, thang, nam) {
      kiemTraThang(thang, nam);
      return db.all('SELECT * FROM NganSach WHERE maTaiKhoan=? AND thang=? AND nam=?', maTk, thang, nam).map((r) => this._dto(nap.nganSach(r))).sort((a, c) => c.tienDo - a.tienDo);
    },
    lap(maTk, { maDanhMuc, hanMuc, thang, nam, nguongCanhBao } = {}) {
      kiemTraThang(Number(thang), Number(nam));
      const han = soTien(hanMuc, 'Hạn mức');
      const dm = S.danhMuc.layDungDuoc(maTk, Number(maDanhMuc));
      if (dm.loai !== LoaiGiaoDich.Chi) throw new DomainError('Chỉ lập ngân sách cho danh mục chi');
      if (db.get('SELECT 1 x FROM NganSach WHERE maTaiKhoan=? AND maDanhMuc=? AND thang=? AND nam=?', maTk, dm.maDanhMuc, Number(thang), Number(nam)))
        throw new DomainError('Danh mục này đã có ngân sách trong tháng'); // R6
      const ng = Number(nguongCanhBao) > 0 && Number(nguongCanhBao) <= 100 ? Number(nguongCanhBao) : 80;
      const ns = new NganSach({ maTaiKhoan: maTk, maDanhMuc: dm.maDanhMuc, hanMuc: han, thang: Number(thang), nam: Number(nam), nguongCanhBao: ng });
      ns.capNhatHanMuc(han, this.soDaChi(maTk, dm.maDanhMuc, ns.thang, ns.nam)); // tháng đã chi sẵn thì tính cờ ngay
      const { id } = db.run('INSERT INTO NganSach (maTaiKhoan, maDanhMuc, hanMuc, thang, nam, nguongCanhBao, daCanhBaoNguong, daCanhBaoVuot) VALUES (?,?,?,?,?,?,?,?)',
        maTk, ns.maDanhMuc, ns.hanMuc, ns.thang, ns.nam, ns.nguongCanhBao, +ns.daCanhBaoNguong, +ns.daCanhBaoVuot);
      return this._dto(nap.nganSach(db.get('SELECT * FROM NganSach WHERE maNganSach=?', id)));
    },
    _lay(maTk, id) {
      const n = nap.nganSach(db.get('SELECT * FROM NganSach WHERE maNganSach=? AND maTaiKhoan=?', id, maTk));
      if (!n) throw new NotFoundError();
      return n;
    },
    sua(maTk, id, { hanMuc, nguongCanhBao } = {}) {
      const n = this._lay(maTk, id);
      if (Number(nguongCanhBao) > 0 && Number(nguongCanhBao) <= 100) n.nguongCanhBao = Number(nguongCanhBao);
      n.capNhatHanMuc(soTien(hanMuc, 'Hạn mức'), this.soDaChi(maTk, n.maDanhMuc, n.thang, n.nam));
      db.run('UPDATE NganSach SET hanMuc=?, nguongCanhBao=?, daCanhBaoNguong=?, daCanhBaoVuot=? WHERE maNganSach=?', n.hanMuc, n.nguongCanhBao, +n.daCanhBaoNguong, +n.daCanhBaoVuot, id);
      return this._dto(this._lay(maTk, id));
    },
    xoa(maTk, id) { this._lay(maTk, id); db.run('DELETE FROM NganSach WHERE maNganSach=?', id); },
    /** Chỉ tính cho tháng/năm của giao dịch (không phải tháng hiện tại). Chạy trong transaction của người gọi. */
    kiemTraSauGiaoDich(maTk, maDm, thang, nam) {
      const ns = nap.nganSach(db.get('SELECT * FROM NganSach WHERE maTaiKhoan=? AND maDanhMuc=? AND thang=? AND nam=?', maTk, maDm, thang, nam));
      if (!ns) return;
      const chi = this.soDaChi(maTk, maDm, thang, nam);
      const kq = ns.kiemTraVuot(chi);
      db.run('UPDATE NganSach SET daCanhBaoNguong=?, daCanhBaoVuot=? WHERE maNganSach=?', +ns.daCanhBaoNguong, +ns.daCanhBaoVuot, ns.maNganSach);
      if (kq === KetQuaCanhBao.KhongCo) return;
      const bat = db.get('SELECT nhacNganSach n FROM CaiDatNhacNho WHERE maTaiKhoan=?', maTk)?.n ?? 1;
      if (!bat) return;
      const ten = db.get('SELECT tenDanhMuc t FROM DanhMuc WHERE maDanhMuc=?', maDm).t;
      const ky = `${mm(thang)}/${nam}`;
      S.thongBao.tao(maTk, LoaiThongBao.CanhBaoNganSach, kq === KetQuaCanhBao.Vuot
        ? `Ngân sách ${ten} tháng ${ky} đã vượt hạn mức`
        : `Ngân sách ${ten} tháng ${ky} đã dùng ${Math.round(ns.tinhTienDo(chi))}%`);
    },
  };

  // ============ Giao dịch (UC 2.4, 3.5) ============
  const KICH_THUOC_TRANG = 20;
  const SEL_GD = `SELECT g.*, v.tenVi, d.tenDanhMuc, d.mauSac, d.bieuTuong, (SELECT COUNT(*) FROM HoaDon h WHERE h.maGiaoDich=g.maGiaoDich) coHoaDon
                  FROM GiaoDich g JOIN Vi v ON v.maVi=g.maVi JOIN DanhMuc d ON d.maDanhMuc=g.maDanhMuc`;
  const dtoGd = (r) => ({ maGiaoDich: r.maGiaoDich, soTien: r.soTien, loai: r.loai, ngayGiaoDich: r.ngayGiaoDich, ghiChu: r.ghiChu, maVi: r.maVi, tenVi: r.tenVi,
    maDanhMuc: r.maDanhMuc, tenDanhMuc: r.tenDanhMuc, mauSac: r.mauSac, bieuTuong: r.bieuTuong, maMucTieu: r.maMucTieu, coHoaDon: r.coHoaDon > 0 });
  const chuanHoaNgay = (n, macDinh) => {
    if (!n) return macDinh;
    const s = String(n);
    if (!/^\d{4}-\d{2}-\d{2}/.test(s) || Number.isNaN(Date.parse(s))) throw new DomainError('Ngày không hợp lệ');
    return s.length === 10 ? `${s}T12:00:00` : s.slice(0, 19).padEnd(19, ':00').slice(0, 19);
  };

  S.giaoDich = {
    timKiem(maTk, { tu, den, loai, viId, danhMucId, q, trang } = {}) {
      if (tu && den && tu > den) throw new DomainError('Khoảng thời gian không hợp lệ: ngày bắt đầu sau ngày kết thúc');
      const w = ['g.maTaiKhoan=?']; const p = [maTk];
      if (tu) { w.push('g.ngayGiaoDich>=?'); p.push(String(tu).slice(0, 10) + 'T00:00:00'); }
      if (den) { w.push('substr(g.ngayGiaoDich,1,10)<=?'); p.push(String(den).slice(0, 10)); }
      if (loai) { w.push('g.loai=?'); p.push(loai); }
      if (viId) { w.push('g.maVi=?'); p.push(Number(viId)); }
      if (danhMucId) { w.push('g.maDanhMuc=?'); p.push(Number(danhMucId)); }
      if (q) { w.push('(g.ghiChu LIKE ? OR d.tenDanhMuc LIKE ?)'); p.push(`%${q}%`, `%${q}%`); }
      const t = Math.max(1, Number.parseInt(trang, 10) || 1);
      const tong = db.get(`SELECT COUNT(*) n FROM GiaoDich g JOIN DanhMuc d ON d.maDanhMuc=g.maDanhMuc WHERE ${w.join(' AND ')}`, ...p).n;
      const muc = db.all(`${SEL_GD} WHERE ${w.join(' AND ')} ORDER BY g.ngayGiaoDich DESC, g.maGiaoDich DESC LIMIT ? OFFSET ?`, ...p, KICH_THUOC_TRANG, (t - 1) * KICH_THUOC_TRANG).map(dtoGd);
      return { muc, trang: t, tongSo: tong, kichThuocTrang: KICH_THUOC_TRANG };
    },
    gan: (maTk, n = 5) => db.all(`${SEL_GD} WHERE g.maTaiKhoan=? ORDER BY g.ngayGiaoDich DESC, g.maGiaoDich DESC LIMIT ?`, maTk, n).map(dtoGd),
    _lay(maTk, id) {
      const r = db.get('SELECT * FROM GiaoDich WHERE maGiaoDich=? AND maTaiKhoan=?', id, maTk);
      if (!r) throw new NotFoundError(); // R10
      return r;
    },
    _hydrate(r) {
      const gd = new GiaoDich({ ...r });
      gd.vi = S.vi.layCuaToi(r.maTaiKhoan, r.maVi);
      gd.danhMuc = nap.danhMuc(db.get('SELECT * FROM DanhMuc WHERE maDanhMuc=?', r.maDanhMuc));
      return gd;
    },
    _luuHoaDon(maGd, h, ngayMacDinh) {
      const ct = (h.chiTiet ?? []).map((c) => new ChiTietHoaDon({ tenMatHang: String(c.tenMatHang ?? '').trim() || 'Mặt hàng', soLuong: Math.max(1, Number(c.soLuong) || 1), donGia: Math.max(0, Number(c.donGia) || 0) }));
      const hd = new HoaDon({ tenCuaHang: h.tenCuaHang ?? null, ngayHoaDon: chuanHoaNgay(h.ngayHoaDon, ngayMacDinh), anhHoaDon: h.anhHoaDon ?? '', chiTiet: ct });
      hd.tongTien = hd.tinhTongTien();
      const { id } = db.run('INSERT INTO HoaDon (maGiaoDich, tenCuaHang, ngayHoaDon, tongTien, anhHoaDon) VALUES (?,?,?,?,?)', maGd, hd.tenCuaHang, hd.ngayHoaDon, hd.tongTien, hd.anhHoaDon);
      for (const c of ct) db.run('INSERT INTO ChiTietHoaDon (maHoaDon, tenMatHang, soLuong, donGia) VALUES (?,?,?,?)', id, c.tenMatHang, c.soLuong, c.donGia);
    },
    /** Giao dịch + ví + cảnh báo ngân sách (+ hóa đơn) trong MỘT transaction. */
    them(maTk, r = {}, { maMucTieu = null, daTruVi = false } = {}) {
      return db.giaoDich(() => {
        const vi = S.vi.layCuaToi(maTk, Number(r.maVi));
        const dm = S.danhMuc.layDungDuoc(maTk, Number(r.maDanhMuc));
        const ngay = chuanHoaNgay(r.ngayGiaoDich, dongHo.bayGio());
        const gd = GiaoDich.tao(maTk, vi, dm, Number(r.soTien), r.loai, ngay, r.ghiChu, maMucTieu);
        if (!daTruVi) gd.ghiNhan();
        S.vi.luuSoDu(vi);
        const { id } = db.run('INSERT INTO GiaoDich (maTaiKhoan, maVi, maDanhMuc, maMucTieu, soTien, loai, ngayGiaoDich, ghiChu) VALUES (?,?,?,?,?,?,?,?)',
          maTk, vi.maVi, dm.maDanhMuc, maMucTieu, gd.soTien, gd.loai, ngay, gd.ghiChu);
        if (r.hoaDon) this._luuHoaDon(id, r.hoaDon, ngay);
        if (gd.loai === LoaiGiaoDich.Chi) S.nganSach.kiemTraSauGiaoDich(maTk, dm.maDanhMuc, +ngay.slice(5, 7), +ngay.slice(0, 4));
        return dtoGd(db.get(`${SEL_GD} WHERE g.maGiaoDich=?`, id));
      });
    },
    sua(maTk, id, r = {}) {
      return db.giaoDich(() => {
        const gd = this._hydrate(this._lay(maTk, id));
        const cu = { dm: gd.maDanhMuc, thang: +gd.ngayGiaoDich.slice(5, 7), nam: +gd.ngayGiaoDich.slice(0, 4), chi: gd.loai === LoaiGiaoDich.Chi };
        const viCu = gd.vi;
        const vi = Number(r.maVi) === viCu.maVi ? viCu : S.vi.layCuaToi(maTk, Number(r.maVi));
        const dm = S.danhMuc.layDungDuoc(maTk, Number(r.maDanhMuc));
        const ngay = chuanHoaNgay(r.ngayGiaoDich, gd.ngayGiaoDich);
        gd.capNhat(vi, dm, Number(r.soTien), r.loai, ngay, r.ghiChu); // R3: lỗi (ví âm...) -> rollback, CSDL không đổi
        S.vi.luuSoDu(viCu); if (vi !== viCu) S.vi.luuSoDu(vi);
        db.run('UPDATE GiaoDich SET maVi=?, maDanhMuc=?, soTien=?, loai=?, ngayGiaoDich=?, ghiChu=? WHERE maGiaoDich=?', vi.maVi, dm.maDanhMuc, gd.soTien, gd.loai, ngay, gd.ghiChu, id);
        if (cu.chi) S.nganSach.kiemTraSauGiaoDich(maTk, cu.dm, cu.thang, cu.nam);
        if (gd.loai === LoaiGiaoDich.Chi) S.nganSach.kiemTraSauGiaoDich(maTk, dm.maDanhMuc, +ngay.slice(5, 7), +ngay.slice(0, 4));
        return dtoGd(db.get(`${SEL_GD} WHERE g.maGiaoDich=?`, id));
      });
    },
    xoa(maTk, id) {
      db.giaoDich(() => {
        const gd = this._hydrate(this._lay(maTk, id));
        if (gd.maMucTieu) throw new DomainError('Giao dịch nạp mục tiêu không xóa trực tiếp được');
        gd.huy();
        S.vi.luuSoDu(gd.vi);
        db.run('DELETE FROM GiaoDich WHERE maGiaoDich=?', id);
        if (gd.loai === LoaiGiaoDich.Chi) S.nganSach.kiemTraSauGiaoDich(maTk, gd.maDanhMuc, +gd.ngayGiaoDich.slice(5, 7), +gd.ngayGiaoDich.slice(0, 4));
      });
    },
    chiTietHoaDon(maTk, id) {
      this._lay(maTk, id);
      const h = db.get('SELECT * FROM HoaDon WHERE maGiaoDich=?', id);
      if (!h) return null;
      return { ...h, chiTiet: db.all('SELECT tenMatHang, soLuong, donGia FROM ChiTietHoaDon WHERE maHoaDon=?', h.maHoaDon) };
    },
  };

  // ============ Mục tiêu tiết kiệm (UC 2.6, 3.8) ============
  const dtoMt = (m) => {
    const h = dongHo.homNay();
    return { maMucTieu: m.maMucTieu, tenMucTieu: m.tenMucTieu, soTienMucTieu: m.soTienMucTieu, soTienHienTai: m.soTienHienTai, hanChot: m.hanChot,
      tienDo: Math.round(m.tinhTienDo() * 10) / 10, soTienCanMoiThang: m.soTienCanMoiThang(h), daHoanThanh: m.daHoanThanh(), chamTienDo: m.laChamTienDo(h) };
  };
  S.mucTieu = {
    _lay(maTk, id) {
      const m = nap.mucTieu(db.get('SELECT * FROM MucTieuTietKiem WHERE maMucTieu=? AND maTaiKhoan=?', id, maTk));
      if (!m) throw new NotFoundError();
      return m;
    },
    danhSach: (maTk) => db.all('SELECT * FROM MucTieuTietKiem WHERE maTaiKhoan=? ORDER BY hanChot', maTk).map((r) => dtoMt(nap.mucTieu(r))),
    _kiemTra({ tenMucTieu, soTienMucTieu, hanChot }) {
      if (!String(tenMucTieu ?? '').trim()) throw new DomainError('Tên mục tiêu không được để trống');
      const so = soTien(soTienMucTieu, 'Số tiền mục tiêu');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(hanChot ?? '')) || String(hanChot) <= dongHo.homNay()) throw new DomainError('Hạn chót phải sau hôm nay');
      return so;
    },
    tao(maTk, r = {}) {
      const so = this._kiemTra(r);
      const { id } = db.run('INSERT INTO MucTieuTietKiem (maTaiKhoan, tenMucTieu, soTienMucTieu, soTienHienTai, hanChot, ngayTao) VALUES (?,?,?,0,?,?)', maTk, r.tenMucTieu.trim(), so, r.hanChot, dongHo.homNay());
      return dtoMt(this._lay(maTk, id));
    },
    sua(maTk, id, r = {}) {
      this._lay(maTk, id);
      const so = this._kiemTra(r);
      db.run('UPDATE MucTieuTietKiem SET tenMucTieu=?, soTienMucTieu=?, hanChot=? WHERE maMucTieu=?', r.tenMucTieu.trim(), so, r.hanChot, id);
      return dtoMt(this._lay(maTk, id));
    },
    xoa(maTk, id) {
      this._lay(maTk, id);
      if (db.get('SELECT 1 x FROM GiaoDich WHERE maMucTieu=?', id)) throw new DomainError('Mục tiêu đã có giao dịch nạp tiền, không thể xóa');
      db.run('DELETE FROM MucTieuTietKiem WHERE maMucTieu=?', id);
    },
    /** R7: trừ ví + cộng mục tiêu + tạo giao dịch chi "Tiết kiệm" (+ thông báo hoàn thành lần đầu) trong một transaction. */
    napTien(maTk, id, { maVi, soTien: st } = {}) {
      return db.giaoDich(() => {
        const m = this._lay(maTk, id);
        const vi = S.vi.layCuaToi(maTk, Number(maVi));
        const tk = nap.danhMuc(db.get("SELECT * FROM DanhMuc WHERE laHeThong=1 AND loai='Chi'"));
        const vuaXong = m.napTien(vi, soTien(st));
        S.vi.luuSoDu(vi);
        db.run('UPDATE MucTieuTietKiem SET soTienHienTai=? WHERE maMucTieu=?', m.soTienHienTai, id);
        db.run('INSERT INTO GiaoDich (maTaiKhoan, maVi, maDanhMuc, maMucTieu, soTien, loai, ngayGiaoDich, ghiChu) VALUES (?,?,?,?,?,?,?,?)',
          maTk, vi.maVi, tk.maDanhMuc, id, Number(st), LoaiGiaoDich.Chi, dongHo.bayGio(), `Nạp mục tiêu: ${m.tenMucTieu}`);
        if (vuaXong) S.thongBao.tao(maTk, LoaiThongBao.NhacMucTieu, `Chúc mừng! Bạn đã hoàn thành mục tiêu ${m.tenMucTieu}`);
        return dtoMt(this._lay(maTk, id));
      });
    },
  };

  // ============ Quét hóa đơn (UC 3.6) ============
  S.hoaDon = {
    /** Trả BẢN NHÁP (chưa lưu giao dịch). Lỗi OCR -> 400 "Không nhận dạng được hóa đơn" (giao diện chuyển sang nhập tay). */
    async quet(file) {
      const { url, buffer, mime } = ctx.luuTep.luuAnh(file);
      const kq = await ctx.ocr.nhanDang(buffer, mime);
      const matHang = (kq.matHang ?? []).map((m) => ({ ten: m.ten, soLuong: m.soLuong || 1, donGia: m.donGia || 0 }));
      const tong = kq.tongTien ?? matHang.reduce((s, m) => s + m.soLuong * m.donGia, 0);
      return { anhUrl: url, tenCuaHang: kq.tenCuaHang ?? null, ngay: kq.ngay ?? null, tongTien: tong, matHang };
    },
  };

  // ============ Báo cáo (UC 2.7, 3.9, 3.12) ============
  S.baoCao = {
    _tongThuChi(maTk, tu, den) {
      const r = db.all("SELECT loai, COALESCE(SUM(soTien),0) s FROM GiaoDich WHERE maTaiKhoan=? AND ngayGiaoDich>=? AND ngayGiaoDich<? GROUP BY loai", maTk, tu, den);
      return { thu: r.find((x) => x.loai === 'Thu')?.s ?? 0, chi: r.find((x) => x.loai === 'Chi')?.s ?? 0 };
    },
    tongQuan(maTk, thang, nam) {
      kiemTraThang(thang, nam);
      const [tu, den] = gioiHanThang(thang, nam);
      const { thu, chi } = this._tongThuChi(maTk, tu, den);
      const tongSoDu = db.get('SELECT COALESCE(SUM(soDu),0) s FROM Vi WHERE maTaiKhoan=?', maTk).s;
      const chiTheoDanhMuc = this.theoDanhMuc(maTk, tu.slice(0, 10), `${nam}-${mm(thang)}-31`, 'Chi');
      const sapVuot = S.nganSach.danhSachTheoThang(maTk, thang, nam).filter((n) => n.tienDo >= n.nguongCanhBao);
      return { tongThu: thu, tongChi: chi, chenhLech: thu - chi, tongSoDu, chiTheoDanhMuc, sapVuot, ganDay: S.giaoDich.gan(maTk, 5) };
    },
    theoDanhMuc(maTk, tu, den, loai = 'Chi') {
      if (!tu || !den) throw new DomainError('Vui lòng chọn khoảng thời gian');
      if (tu > den) throw new DomainError('Khoảng thời gian không hợp lệ: ngày bắt đầu sau ngày kết thúc');
      const rows = db.all(`SELECT d.maDanhMuc, d.tenDanhMuc, d.mauSac, SUM(g.soTien) soTien FROM GiaoDich g JOIN DanhMuc d ON d.maDanhMuc=g.maDanhMuc
        WHERE g.maTaiKhoan=? AND g.loai=? AND substr(g.ngayGiaoDich,1,10)>=? AND substr(g.ngayGiaoDich,1,10)<=? GROUP BY d.maDanhMuc ORDER BY soTien DESC`, maTk, loai, String(tu).slice(0, 10), String(den).slice(0, 10));
      const tong = rows.reduce((s, r) => s + r.soTien, 0);
      return rows.map((r) => ({ ...r, tyLe: tong ? Math.round((r.soTien / tong) * 1000) / 10 : 0 }));
    },
    /** Luôn đủ 12 tháng, tháng trống bằng 0. */
    theoThoiGian(maTk, nam) {
      const rows = db.all("SELECT CAST(substr(ngayGiaoDich,6,2) AS INTEGER) m, loai, SUM(soTien) s FROM GiaoDich WHERE maTaiKhoan=? AND substr(ngayGiaoDich,1,4)=? GROUP BY m, loai", maTk, String(nam));
      return Array.from({ length: 12 }, (_, i) => ({ thang: i + 1,
        thu: rows.find((r) => r.m === i + 1 && r.loai === 'Thu')?.s ?? 0, chi: rows.find((r) => r.m === i + 1 && r.loai === 'Chi')?.s ?? 0 }));
    },
    danhSachBaoCaoThang: (maTk) => db.all('SELECT * FROM BaoCaoThang WHERE maTaiKhoan=? ORDER BY nam DESC, thang DESC', maTk),
    /** R9: idempotent. Chạy lại chỉ cập nhật số liệu, không tạo bản trùng, không gửi thông báo trùng. */
    tongKetThang(maTk, thang, nam) {
      kiemTraThang(thang, nam);
      db.giaoDich(() => {
        const [tu, den] = gioiHanThang(thang, nam);
        const { thu, chi } = this._tongThuChi(maTk, tu, den);
        const soVuot = S.nganSach.danhSachTheoThang(maTk, thang, nam).filter((n) => n.tienDo > 100).length;
        const cu = db.get('SELECT * FROM BaoCaoThang WHERE maTaiKhoan=? AND thang=? AND nam=?', maTk, thang, nam);
        const bc = new BaoCaoThang(cu ?? { maTaiKhoan: maTk, thang, nam });
        bc.lapBaoCao(thu, chi, soVuot, dongHo.bayGio());
        if (cu) db.run('UPDATE BaoCaoThang SET tongThu=?, tongChi=?, soDanhMucVuot=?, ngayLap=? WHERE maBaoCao=?', thu, chi, soVuot, bc.ngayLap, cu.maBaoCao);
        else {
          db.run('INSERT INTO BaoCaoThang (maTaiKhoan, thang, nam, tongThu, tongChi, soDanhMucVuot, ngayLap) VALUES (?,?,?,?,?,?,?)', maTk, thang, nam, thu, chi, soVuot, bc.ngayLap);
          S.thongBao.tao(maTk, LoaiThongBao.TongKetThang, `Tổng kết tháng ${mm(thang)}/${nam}: thu ${fmt(thu)}đ, chi ${fmt(chi)}đ, ${soVuot} danh mục vượt ngân sách.`);
          const [t2, n2] = thangKe(thang, nam);
          if (!db.get('SELECT 1 x FROM NganSach WHERE maTaiKhoan=? AND thang=? AND nam=?', maTk, t2, n2))
            S.thongBao.tao(maTk, LoaiThongBao.TongKetThang, `Bạn chưa lập ngân sách cho tháng ${mm(t2)}/${n2}. Hãy lập ngân sách tháng mới!`);
        }
      });
    },
    tongKetTatCa(thang, nam) {
      const ds = db.all("SELECT maTaiKhoan FROM TaiKhoan WHERE loaiTaiKhoan='NguoiDung' AND trangThai='HoatDong'");
      for (const { maTaiKhoan } of ds) this.tongKetThang(maTaiKhoan, thang, nam);
      return ds.length;
    },
    async xuatExcel(maTk, tu, den) {
      if (!tu || !den) throw new DomainError('Vui lòng chọn khoảng thời gian');
      if (tu > den) throw new DomainError('Khoảng thời gian không hợp lệ: ngày bắt đầu sau ngày kết thúc');
      const rows = db.all(`${SEL_GD} WHERE g.maTaiKhoan=? AND substr(g.ngayGiaoDich,1,10)>=? AND substr(g.ngayGiaoDich,1,10)<=? ORDER BY g.ngayGiaoDich`, maTk, String(tu).slice(0, 10), String(den).slice(0, 10));
      if (rows.length === 0) throw new DomainError('Không có dữ liệu trong khoảng thời gian đã chọn');
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Giao dịch');
      ws.columns = [{ header: 'Ngày', key: 'n', width: 18 }, { header: 'Loại', key: 'l', width: 8 }, { header: 'Danh mục', key: 'd', width: 18 },
        { header: 'Ví', key: 'v', width: 16 }, { header: 'Số tiền', key: 's', width: 16 }, { header: 'Ghi chú', key: 'g', width: 36 }];
      ws.getRow(1).font = { bold: true };
      for (const r of rows) ws.addRow({ n: r.ngayGiaoDich.replace('T', ' ').slice(0, 16), l: r.loai, d: r.tenDanhMuc, v: r.tenVi, s: r.soTien, g: r.ghiChu ?? '' });
      ws.getColumn('s').numFmt = '#,##0';
      const ws2 = wb.addWorksheet('Tổng hợp');
      const thu = rows.filter((r) => r.loai === 'Thu').reduce((s, r) => s + r.soTien, 0);
      const chi = rows.filter((r) => r.loai === 'Chi').reduce((s, r) => s + r.soTien, 0);
      ws2.addRows([['Tổng thu', thu], ['Tổng chi', chi], ['Chênh lệch', thu - chi], [], ['Chi theo danh mục']]);
      ws2.getRow(5).font = { bold: true };
      const nhom = new Map();
      for (const r of rows.filter((x) => x.loai === 'Chi')) nhom.set(r.tenDanhMuc, (nhom.get(r.tenDanhMuc) ?? 0) + r.soTien);
      for (const [k, v] of [...nhom].sort((a, c) => c[1] - a[1])) ws2.addRow([k, v]);
      ws2.getColumn(1).width = 24; ws2.getColumn(2).width = 16; ws2.getColumn(2).numFmt = '#,##0';
      return Buffer.from(await wb.xlsx.writeBuffer());
    },
  };

  // ============ Quản trị (UC 2.8, 3.10) ============
  S.quanTri = {
    danhSachNguoiDung(q) {
      const like = `%${q ?? ''}%`;
      return db.all(`SELECT t.maTaiKhoan, t.hoTen, t.email, t.trangThai, t.lyDoKhoa, t.ngayTao,
        (SELECT COUNT(*) FROM GiaoDich g WHERE g.maTaiKhoan=t.maTaiKhoan) soGiaoDich
        FROM TaiKhoan t WHERE t.loaiTaiKhoan='NguoiDung' AND (t.hoTen LIKE ? OR t.email LIKE ?) ORDER BY t.maTaiKhoan`, like, like);
    },
    _admin(ma) { const a = nap.taiKhoan(db.get("SELECT * FROM TaiKhoan WHERE maTaiKhoan=? AND loaiTaiKhoan='QuanTriVien'", ma)); if (!a) throw new NotFoundError(); return a; },
    _tk(id) { const t = nap.taiKhoan(db.get('SELECT * FROM TaiKhoan WHERE maTaiKhoan=?', id)); if (!t) throw new NotFoundError(); return t; },
    khoa(maAdmin, id, lyDo) {
      db.giaoDich(() => {
        const admin = this._admin(maAdmin); const tk = this._tk(id);
        admin.khoaTaiKhoan(tk, lyDo);
        db.run('UPDATE TaiKhoan SET trangThai=?, lyDoKhoa=? WHERE maTaiKhoan=?', tk.trangThai, tk.lyDoKhoa, id);
        S.thongBao.tao(id, LoaiThongBao.TongKetThang, `Tài khoản của bạn đã bị khóa. Lý do: ${tk.lyDoKhoa}`);
      });
    },
    moKhoa(maAdmin, id) {
      const admin = this._admin(maAdmin); const tk = this._tk(id);
      admin.moKhoaTaiKhoan(tk);
      db.run('UPDATE TaiKhoan SET trangThai=?, lyDoKhoa=NULL WHERE maTaiKhoan=?', tk.trangThai, id);
    },
    thongKe() {
      const d = dongHo.bayGio().slice(0, 7);
      const c = (sql, ...p) => db.get(sql, ...p).n;
      return {
        soNguoiDung: c("SELECT COUNT(*) n FROM TaiKhoan WHERE loaiTaiKhoan='NguoiDung'"),
        soDangHoatDong: c("SELECT COUNT(*) n FROM TaiKhoan WHERE loaiTaiKhoan='NguoiDung' AND trangThai='HoatDong'"),
        soBiKhoa: c("SELECT COUNT(*) n FROM TaiKhoan WHERE loaiTaiKhoan='NguoiDung' AND trangThai='BiKhoa'"),
        soGiaoDich: c('SELECT COUNT(*) n FROM GiaoDich'),
        soGiaoDichThangNay: c('SELECT COUNT(*) n FROM GiaoDich WHERE substr(ngayGiaoDich,1,7)=?', d),
      };
    },
    danhMucMacDinh: () => db.all('SELECT * FROM DanhMuc WHERE maTaiKhoan IS NULL ORDER BY laHeThong, maDanhMuc').map((r) => dtoDm(nap.danhMuc(r))),
    themMacDinh(maTk, { tenDanhMuc, loai, bieuTuong, mauSac } = {}) {
      const ql = nap.taiKhoan(db.get('SELECT * FROM TaiKhoan WHERE maTaiKhoan=?', maTk));
      const dm = ql.taoDanhMucMacDinh(tenDanhMuc, loai, bieuTuong, mauSac); // domain kiểm tra tên, loại
      if (db.get('SELECT 1 x FROM DanhMuc WHERE maTaiKhoan IS NULL AND loai=? AND tenDanhMuc=?', dm.loai, dm.tenDanhMuc)) throw new DomainError('Tên danh mục đã tồn tại');
      const { id } = db.run('INSERT INTO DanhMuc (maTaiKhoan, tenDanhMuc, loai, bieuTuong, mauSac, laMacDinh, laHeThong) VALUES (NULL,?,?,?,?,1,0)', dm.tenDanhMuc, dm.loai, dm.bieuTuong, dm.mauSac);
      return dtoDm(nap.danhMuc(db.get('SELECT * FROM DanhMuc WHERE maDanhMuc=?', id)));
    },
    _macDinh(id) {
      const d = nap.danhMuc(db.get('SELECT * FROM DanhMuc WHERE maDanhMuc=? AND maTaiKhoan IS NULL', id));
      if (!d) throw new NotFoundError();
      if (d.laHeThong) throw new DomainError('Không thể sửa hoặc xóa danh mục hệ thống');
      return d;
    },
    suaMacDinh(id, { tenDanhMuc, bieuTuong, mauSac } = {}) {
      const d = this._macDinh(id);
      const ten = String(tenDanhMuc ?? '').trim();
      if (!ten) throw new DomainError('Tên danh mục không được để trống');
      db.run('UPDATE DanhMuc SET tenDanhMuc=?, bieuTuong=?, mauSac=? WHERE maDanhMuc=?', ten, bieuTuong || d.bieuTuong, mauSac || d.mauSac, id);
      return dtoDm(nap.danhMuc(db.get('SELECT * FROM DanhMuc WHERE maDanhMuc=?', id)));
    },
    xoaMacDinh(id) {
      this._macDinh(id);
      if (db.get('SELECT 1 x FROM GiaoDich WHERE maDanhMuc=?', id) || db.get('SELECT 1 x FROM NganSach WHERE maDanhMuc=?', id))
        throw new DomainError('Danh mục mặc định đang được người dùng sử dụng, không thể xóa');
      db.run('DELETE FROM DanhMuc WHERE maDanhMuc=?', id);
    },
    chayTongKet(thang, nam) { return S.baoCao.tongKetTatCa(thang, nam); },
    /** Nhân viên hỗ trợ gửi thông báo hỗ trợ cho một người dùng. */
    guiThongBaoHoTro(maNv, idNguoiDung, noiDung) {
      const nv = nap.taiKhoan(db.get('SELECT * FROM TaiKhoan WHERE maTaiKhoan=?', maNv));
      const nd = nap.taiKhoan(db.get("SELECT * FROM TaiKhoan WHERE maTaiKhoan=? AND loaiTaiKhoan='NguoiDung'", idNguoiDung));
      if (!nd) throw new NotFoundError();
      const tb = nv.guiThongBaoHoTro(nd, noiDung, dongHo.bayGio());
      S.thongBao.tao(tb.maTaiKhoan, tb.loai, tb.noiDung);
    },
  };

  return S;
}
