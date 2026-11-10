// Actor "Bộ hẹn giờ": nhắc ghi chép hằng ngày, nhắc mục tiêu chậm tiến độ, tổng kết cuối tháng.
import { LoaiThongBao } from './domain/index.js';
import { nap } from './services/index.js';

export class BoHenGio {
  constructor(db, S, dongHo) { this.db = db; this.S = S; this.dongHo = dongHo; this.timer = null; }

  /** Xử lý người dùng có gioNhac bằng giờ:phút hiện tại; mỗi loại thông báo tối đa 1 lần/ngày/người. */
  nhacNhoHangNgay() {
    const { db, S, dongHo } = this;
    const hhmm = dongHo.bayGio().slice(11, 16); const homNay = dongHo.homNay();
    let soTao = 0;
    for (const c of db.all('SELECT * FROM CaiDatNhacNho WHERE gioNhac=?', hhmm)) {
      db.giaoDich(() => {
        if (c.nhacHangNgay && !db.get('SELECT 1 x FROM GiaoDich WHERE maTaiKhoan=? AND substr(ngayGiaoDich,1,10)=?', c.maTaiKhoan, homNay)
          && !S.thongBao.daGuiHomNay(c.maTaiKhoan, LoaiThongBao.NhacGhiChep)) {
          S.thongBao.tao(c.maTaiKhoan, LoaiThongBao.NhacGhiChep, 'Hôm nay bạn chưa ghi chép giao dịch nào. Hãy cập nhật thu chi nhé!'); soTao++;
        }
        if (c.nhacMucTieu && !S.thongBao.daGuiHomNay(c.maTaiKhoan, LoaiThongBao.NhacMucTieu)) {
          const cham = db.all('SELECT * FROM MucTieuTietKiem WHERE maTaiKhoan=?', c.maTaiKhoan).map(nap.mucTieu).filter((m) => m.laChamTienDo(homNay));
          if (cham.length) { S.thongBao.tao(c.maTaiKhoan, LoaiThongBao.NhacMucTieu, `Mục tiêu "${cham[0].tenMucTieu}" đang chậm tiến độ. Hãy nạp thêm tiền!`); soTao++; }
        }
      });
    }
    return soTao;
  }

  /** Chạy 23:00–23:59 ngày cuối tháng (idempotent theo R9). */
  tongKetThang() {
    const t = this.dongHo.bayGio(); const thang = +t.slice(5, 7); const nam = +t.slice(0, 4); const ngay = +t.slice(8, 10); const gio = +t.slice(11, 13);
    const cuoiThang = ngay === new Date(Date.UTC(nam, thang, 0)).getUTCDate();
    if (!(cuoiThang && gio === 23)) return 0;
    return this.S.baoCao.tongKetTatCa(thang, nam);
  }

  batDau() {
    this.timer = setInterval(() => {
      for (const f of [() => this.nhacNhoHangNgay(), () => this.tongKetThang()]) {
        try { f(); } catch (e) { console.error('Lỗi bộ hẹn giờ:', e); }
      }
    }, 60_000);
    this.timer.unref();
  }
  dung() { clearInterval(this.timer); }
}
