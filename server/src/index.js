import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { moCsdl } from './db.js';
import { taoApp } from './app.js';
import { bamMatKhau, DongHoVietNam } from './ha-tang.js';
import { napDuLieuKhoiTao, napDuLieuDemo, MAT_KHAU_DEMO } from './seed.js';

const goc = join(dirname(fileURLToPath(import.meta.url)), '..');
const db = moCsdl(process.env.DB_FILE ?? join(goc, 'data', 'quan-ly-thu-chi.db'));
const dongHo = new DongHoVietNam();
napDuLieuKhoiTao(db, bamMatKhau, dongHo);
if (process.env.NODE_ENV !== 'production' && process.env.KHONG_NAP_DEMO !== '1') {
  if (napDuLieuDemo(db, bamMatKhau, dongHo)) console.log('Đã nạp dữ liệu demo.');
}

const { app, boHenGio } = taoApp({ db, dongHo });
boHenGio.batDau();
const cong = Number(process.env.PORT ?? 5080);
app.listen(cong, () => {
  console.log(`Quản lý thu chi chạy tại http://localhost:${cong}`);
  console.log(`Mật khẩu mọi tài khoản demo: ${MAT_KHAU_DEMO}`);
  console.log('Người dùng: demo@demo.vn | Quản trị viên: admin@demo.vn | Nhân viên hỗ trợ: hotro@demo.vn | Kiểm toán viên: kiemtoan@demo.vn');
});
