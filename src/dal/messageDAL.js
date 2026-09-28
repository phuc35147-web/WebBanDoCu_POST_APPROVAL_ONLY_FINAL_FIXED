const { poolPromise, sql } = require('./dbConfig');

class MessageDAL {
  async getConversations(userId) {
    const p = await poolPromise;
    const r = await p.request().input('userId', sql.Int, userId).query(`
      WITH ranked AS (
        SELECT tm.*, ROW_NUMBER() OVER(PARTITION BY
          CASE WHEN tm.MaNguoiGui=@userId THEN tm.MaNguoiNhan ELSE tm.MaNguoiGui END,
          ISNULL(tm.MaSanPham,0)
          ORDER BY tm.NgayGui DESC) rn
        FROM TinNhan tm
        WHERE tm.MaNguoiGui=@userId OR tm.MaNguoiNhan=@userId
      )
      SELECT r.MaTinNhan, r.MaSanPham, r.NoiDung, r.NgayGui, r.DaDoc,
             r.MaNguoiGui, r.MaNguoiNhan,
             nd.MaNguoiDung AS MaDoiPhuong, nd.HoTen AS TenDoiPhuong,
             sp.TenSanPham, sp.HinhAnh
      FROM ranked r
      JOIN NguoiDung nd ON nd.MaNguoiDung=CASE WHEN r.MaNguoiGui=@userId THEN r.MaNguoiNhan ELSE r.MaNguoiGui END
      LEFT JOIN SanPhamDoCu sp ON sp.MaSanPham=r.MaSanPham
      WHERE r.rn=1
      ORDER BY r.NgayGui DESC`);
    return r.recordset;
  }

  async getConversation(userId, otherUserId, productId) {
    const p = await poolPromise;
    const r = await p.request()
      .input('me', sql.Int, userId)
      .input('other', sql.Int, otherUserId)
      .input('product', sql.Int, productId || null)
      .query(`
        SELECT tm.MaTinNhan, tm.MaNguoiGui, tm.MaNguoiNhan, tm.MaSanPham,
               tm.NoiDung, tm.DaDoc, tm.NgayGui,
               nd.HoTen AS TenNguoiGui
        FROM TinNhan tm
        JOIN NguoiDung nd ON nd.MaNguoiDung=tm.MaNguoiGui
        WHERE ((tm.MaNguoiGui=@me AND tm.MaNguoiNhan=@other)
            OR (tm.MaNguoiGui=@other AND tm.MaNguoiNhan=@me))
          AND ((@product IS NULL AND tm.MaSanPham IS NULL) OR tm.MaSanPham=@product)
        ORDER BY tm.NgayGui ASC`);
    return r.recordset;
  }

  async send(userId, otherUserId, productId, content) {
    const p = await poolPromise;
    const text = String(content || '').trim();
    if (!text) throw new Error('Nội dung tin nhắn không được để trống.');
    if (text.length > 2000) throw new Error('Tin nhắn tối đa 2000 ký tự.');
    const r = await p.request()
      .input('from', sql.Int, userId)
      .input('to', sql.Int, otherUserId)
      .input('product', sql.Int, productId || null)
      .input('content', sql.NVarChar(2000), text)
      .query(`
        INSERT TinNhan(MaNguoiGui,MaNguoiNhan,MaSanPham,NoiDung)
        OUTPUT INSERTED.*
        VALUES(@from,@to,@product,@content)`);
    return r.recordset[0];
  }

  async markRead(userId, otherUserId, productId) {
    const p = await poolPromise;
    await p.request()
      .input('me', sql.Int, userId)
      .input('other', sql.Int, otherUserId)
      .input('product', sql.Int, productId || null)
      .query(`UPDATE TinNhan SET DaDoc=1
              WHERE MaNguoiGui=@other AND MaNguoiNhan=@me
              AND ((@product IS NULL AND MaSanPham IS NULL) OR MaSanPham=@product)`);
  }
}
module.exports = new MessageDAL();
