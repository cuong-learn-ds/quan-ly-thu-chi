// Hạ tầng: đồng hồ giờ Việt Nam, băm mật khẩu, JWT, OCR (Gemini / bản giả), lưu ảnh hóa đơn.
import bcrypt from 'bcryptjs';
import jwtLib from 'jsonwebtoken';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DomainError } from './domain/index.js';

/** Giờ Việt Nam (UTC+7). Chuỗi dạng 'YYYY-MM-DDTHH:mm:ss' (không múi giờ). Không dùng Date.now() ngoài lớp này. */
export class DongHoVietNam {
  constructor(layMocUtc = () => Date.now()) { this.layMocUtc = layMocUtc; }
  bayGio() { return new Date(this.layMocUtc() + 7 * 3600 * 1000).toISOString().slice(0, 19); }
  homNay() { return this.bayGio().slice(0, 10); }
}

/** Đồng hồ giả cho kiểm thử. */
export class DongHoGia extends DongHoVietNam {
  constructor(bayGio) { super(); this.gia = bayGio; }
  bayGio() { return this.gia; }
  datBayGio(v) { this.gia = v; }
}

export const bamMatKhau = {
  bam: (matKhau) => bcrypt.hashSync(matKhau, 10),
  kiemTra: (matKhau, hash) => { try { return bcrypt.compareSync(matKhau, hash); } catch { return false; } },
};

export class JwtService {
  constructor(khoa) { this.khoa = khoa; }
  taoToken(tk) { return jwtLib.sign({ sub: String(tk.maTaiKhoan), role: tk.vaiTro }, this.khoa, { expiresIn: '8h' }); }
  xacThuc(token) { return jwtLib.verify(token, this.khoa); }
}

// ---- OCR
export class FakeDichVuOcr {
  constructor(dongHo) { this.dongHo = dongHo; }
  async nhanDang() {
    return { tenCuaHang: 'Cửa hàng Tiện Lợi (dữ liệu mẫu)', ngay: this.dongHo.homNay(), tongTien: 50000,
      matHang: [{ ten: 'Sữa tươi', soLuong: 2, donGia: 15000 }, { ten: 'Bánh mì', soLuong: 1, donGia: 20000 }] };
  }
}

/** Tách riêng để kiểm thử: chấp nhận JSON bọc trong ```json ... ```. */
export function phanTichKetQuaGemini(text) {
  try {
    const s = String(text).trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    const r = JSON.parse(s);
    return {
      tenCuaHang: typeof r.tenCuaHang === 'string' ? r.tenCuaHang : null,
      ngay: typeof r.ngay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.ngay) ? r.ngay : null,
      tongTien: typeof r.tongTien === 'number' ? Math.round(r.tongTien) : null,
      matHang: (Array.isArray(r.matHang) ? r.matHang : []).map((m) => ({ ten: String(m.ten ?? ''), soLuong: Number(m.soLuong) || 1, donGia: Math.round(Number(m.donGia)) || 0 })),
    };
  } catch { throw new DomainError('Không nhận dạng được hóa đơn'); }
}

export class GeminiDichVuOcr {
  constructor(cfg) { this.cfg = cfg; }
  async nhanDang(buffer, mime) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.cfg.model}:generateContent`;
      const res = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.cfg.apiKey }, signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          contents: [{ parts: [
            { text: 'Đọc ảnh hóa đơn và trả về JSON: tenCuaHang (string|null), ngay (yyyy-MM-dd|null), tongTien (number|null, VND), matHang (mảng {ten, soLuong, donGia}).' },
            { inline_data: { mime_type: mime, data: buffer.toString('base64') } }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      return phanTichKetQuaGemini(j.candidates[0].content.parts[0].text);
    } catch (e) {
      if (e instanceof DomainError) throw e;
      throw new DomainError('Không nhận dạng được hóa đơn');
    }
  }
}

/** Chỉ nhận JPG/PNG, tối đa 5 MB. Lưu uploads/hoa-don/{guid}.{ext}. */
export class LuuTepService {
  constructor(thuMuc) { this.thuMuc = thuMuc; }
  luuAnh(file) {
    if (!file) throw new DomainError('Vui lòng chọn ảnh hóa đơn');
    const mime = String(file.mimetype ?? '').toLowerCase();
    if (!['image/jpeg', 'image/png'].includes(mime)) throw new DomainError('Chỉ nhận ảnh JPG hoặc PNG');
    if (file.size > 5 * 1024 * 1024) throw new DomainError('Ảnh vượt quá 5 MB');
    const ten = `${randomUUID().replaceAll('-', '')}.${mime === 'image/png' ? 'png' : 'jpg'}`;
    mkdirSync(join(this.thuMuc, 'hoa-don'), { recursive: true });
    writeFileSync(join(this.thuMuc, 'hoa-don', ten), file.buffer);
    return { url: `/uploads/hoa-don/${ten}`, buffer: file.buffer, mime };
  }
}
