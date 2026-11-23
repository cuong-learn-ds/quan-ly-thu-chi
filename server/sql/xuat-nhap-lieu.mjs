// Xuất dữ liệu đang có trong CSDL QuanLyThuChi thành script 02_nhap_lieu.sql (INSERT giữ nguyên mã khóa).
// Chạy: node sql/xuat-nhap-lieu.mjs   (cần đã chạy web hoặc nạp dữ liệu demo một lần)
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { moCsdl } from '../src/db.js';

// Thứ tự theo khóa ngoại: bảng cha trước, bảng con sau
const BANG = [
  ['TaiKhoan', 'Tài khoản (4 vai trò; mật khẩu demo: Demo@123, lưu dạng băm BCrypt)'],
  ['CaiDatNhacNho', 'Cài đặt nhắc nhở của từng người dùng'],
  ['Vi', 'Ví của người dùng'],
  ['DanhMuc', 'Danh mục: maTaiKhoan NULL là danh mục mặc định dùng chung'],
  ['MucTieuTietKiem', 'Mục tiêu tiết kiệm'],
  ['GiaoDich', 'Giao dịch thu chi (số dư ví ở bảng Vi đã khớp với các giao dịch này)'],
  ['ChuyenTien', 'Chuyển tiền giữa các ví'],
  ['GiaoDichDinhKy', 'Lịch giao dịch định kỳ hằng tháng'],
  ['HoaDon', 'Hóa đơn của giao dịch quét từ ảnh'],
  ['ChiTietHoaDon', 'Mặt hàng trong hóa đơn'],
  ['NganSach', 'Ngân sách theo danh mục và tháng (gồm các ngân sách do kế hoạch tháng tạo)'],
  ['KeHoachThang', 'Kế hoạch tài chính tháng'],
  ['ThongBao', 'Thông báo'],
  ['BaoCaoThang', 'Báo cáo tổng kết tháng'],
];

const giaTri = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (typeof v === 'number') return String(v);
  return `N'${String(v).replaceAll("'", "''")}'`;
};

const db = moCsdl();
const ra = [];
ra.push('/* ==========================================================================');
ra.push('   NHẬP LIỆU MẪU: QUẢN LÝ THU CHI CÁ NHÂN VÀ LẬP KẾ HOẠCH TÀI CHÍNH');
ra.push('   Chạy sau 01_tao_csdl.sql. Mỗi bảng có ít nhất 9 dòng.');
ra.push('   Script xóa dữ liệu cũ rồi chèn lại với đúng mã khóa nên chạy lại nhiều lần vẫn cho cùng kết quả.');
ra.push('   ========================================================================== */');
ra.push('USE QuanLyThuChi;', 'GO', 'SET NOCOUNT ON;', '');
ra.push('-- Xóa dữ liệu cũ (bảng con trước, bảng cha sau)');
for (const [ten] of [...BANG].reverse()) ra.push(`DELETE FROM dbo.${ten};`);
ra.push('GO', '');
const thongKe = [];
for (const [ten, moTa] of BANG) {
  const hang = db.all(`SELECT * FROM ${ten} ORDER BY 1`);
  thongKe.push([ten, hang.length]);
  if (!hang.length) continue;
  const cot = Object.keys(hang[0]);
  ra.push(`/* ${ten}: ${moTa} (${hang.length} dòng) */`);
  ra.push(`SET IDENTITY_INSERT dbo.${ten} ON;`);
  for (let i = 0; i < hang.length; i += 50) { // mỗi lệnh INSERT tối đa 50 dòng
    ra.push(`INSERT INTO dbo.${ten} (${cot.join(', ')}) VALUES`);
    ra.push(hang.slice(i, i + 50).map((h) => `  (${cot.map((c) => giaTri(h[c])).join(', ')})`).join(',\n') + ';');
  }
  ra.push(`SET IDENTITY_INSERT dbo.${ten} OFF;`, 'GO', '');
}
ra.push('-- Kiểm tra số dòng của từng bảng');
ra.push(BANG.map(([ten]) => `SELECT N'${ten}' AS Bang, COUNT(*) AS SoDong FROM dbo.${ten}`).join('\nUNION ALL ') + ';');
ra.push('GO');
const dich = join(dirname(fileURLToPath(import.meta.url)), '02_nhap_lieu.sql');
writeFileSync(dich, ra.join('\n') + '\n', 'utf8');
db.dong();
console.log('Đã ghi', dich);
for (const [t, n] of thongKe) console.log(t.padEnd(16), n);
