require('dotenv').config();
const sql = require('mssql');
const bcrypt = require('bcryptjs');

const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'WebBanDoCu',
  port: Number(process.env.DB_PORT || 1433),
  options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true }
};
const poolPromise = new sql.ConnectionPool(config).connect().then(async pool => {
  console.log('✅ SQL Server: WebBanDoCu');
  await pool.request().query(`
    IF OBJECT_ID(N'dbo.TinNhan',N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.TinNhan(
        MaTinNhan INT IDENTITY(1,1) PRIMARY KEY,
        MaNguoiGui INT NOT NULL,
        MaNguoiNhan INT NOT NULL,
        MaSanPham INT NULL,
        NoiDung NVARCHAR(2000) NOT NULL,
        DaDoc BIT NOT NULL DEFAULT 0,
        NgayGui DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        CONSTRAINT FK_TinNhan_Gui FOREIGN KEY(MaNguoiGui) REFERENCES dbo.NguoiDung(MaNguoiDung) ON DELETE NO ACTION,
        CONSTRAINT FK_TinNhan_Nhan FOREIGN KEY(MaNguoiNhan) REFERENCES dbo.NguoiDung(MaNguoiDung) ON DELETE NO ACTION,
        CONSTRAINT FK_TinNhan_SP FOREIGN KEY(MaSanPham) REFERENCES dbo.SanPhamDoCu(MaSanPham) ON DELETE SET NULL
      );
      CREATE INDEX IX_TinNhan_Conversation ON dbo.TinNhan(MaNguoiGui,MaNguoiNhan,MaSanPham,NgayGui);
      CREATE INDEX IX_TinNhan_Inbox ON dbo.TinNhan(MaNguoiNhan,DaDoc,NgayGui);
    END
  `);
  const demoEmail = 'demo.seller@example.com';
  let u = await pool.request().input('email',sql.VarChar(255),demoEmail).query('SELECT MaNguoiDung FROM NguoiDung WHERE Email=@email');
  let sellerId;
  if (!u.recordset.length) {
    const hash = await bcrypt.hash('123456', 10);
    const r = await pool.request()
      .input('hoTen',sql.NVarChar(150),N('Người bán Demo')).input('email',sql.VarChar(255),demoEmail)
      .input('phone',sql.VarChar(20),'0900000001').input('pass',sql.VarChar(255),hash)
      .query("INSERT NguoiDung(HoTen,Email,SoDienThoai,MatKhau,VaiTro,TinhThanh,PhuongXa,DiaChiChiTiet) OUTPUT INSERTED.MaNguoiDung VALUES(@hoTen,@email,@phone,@pass,'seller',N'TP. Hồ Chí Minh',N'Phường Bến Nghé',N'Địa chỉ demo')");
    sellerId=r.recordset[0].MaNguoiDung;
  } else sellerId=u.recordset[0].MaNguoiDung;
  const cat=await pool.request().query('SELECT TOP 9 MaDanhMuc FROM DanhMuc ORDER BY MaDanhMuc');
  const count=await pool.request().query('SELECT COUNT(*) total FROM SanPhamDoCu');
  if(Number(count.recordset[0].total)===0 && sellerId && cat.recordset.length){
    const products=[
      ['iPhone 13 Pro 128GB','Máy đẹp, đầy đủ chức năng, pin ổn.',12500000,'Đã qua sử dụng (còn tốt)','TP. Hồ Chí Minh'],
      ['MacBook Air M1 2020','Phù hợp học tập và văn phòng.',14500000,'Đã qua sử dụng (còn tốt)','TP. Hồ Chí Minh'],
      ['Tai nghe Sony WH-1000XM4','Chống ồn tốt, hoạt động ổn định.',4200000,'Cũ / Có trầy xước','Đà Nẵng'],
      ['Xe máy Honda Vision 2021','Xe bảo dưỡng định kỳ, giấy tờ đầy đủ.',26500000,'Đã qua sử dụng (còn tốt)','TP. Hồ Chí Minh'],
      ['Bàn học gỗ','Bàn chắc chắn, còn đẹp.',850000,'Cũ / Có trầy xước','Hà Nội'],
      ['Sách Java cơ bản','Sách phù hợp sinh viên CNTT.',120000,'Mới 99%','TP. Hồ Chí Minh']
    ];
    for(let i=0;i<products.length;i++){
      const p=products[i];
      await pool.request().input('seller',sql.Int,sellerId).input('cat',sql.Int,cat.recordset[i%cat.recordset.length].MaDanhMuc)
       .input('name',sql.NVarChar(255),p[0]).input('desc',sql.NVarChar(sql.MAX),p[1]).input('price',sql.Decimal(18,2),p[2])
       .input('condition',sql.NVarChar(100),p[3]).input('address',sql.NVarChar(500),p[4])
       .input('image',sql.VarChar(1000),i%2?'/uploads/1789292864980-923735277.jpg':'/uploads/1789292862629-134554614.jpg')
       .query("INSERT SanPhamDoCu(MaNguoiBan,MaDanhMuc,TenSanPham,MoTa,GiaBan,TinhTrang,SoLuong,DiaChiXemHang,HinhAnh,TrangThai) VALUES(@seller,@cat,@name,@desc,@price,@condition,1,@address,@image,N'Đang bán')");
    }
  }
  const imageRows = await pool.request().query(`SELECT sp.MaSanPham,sp.HinhAnh FROM SanPhamDoCu sp LEFT JOIN SanPhamHinhAnh ha ON ha.MaSanPham=sp.MaSanPham WHERE ha.MaHinhAnh IS NULL AND sp.HinhAnh IS NOT NULL`);
  for(const row of imageRows.recordset){
    await pool.request().input('sp',sql.Int,row.MaSanPham).input('path',sql.VarChar(1000),row.HinhAnh).query(`INSERT SanPhamHinhAnh(MaSanPham,DuongDan,LaAnhChinh,ThuTu) VALUES(@sp,@path,1,1)`);
  }
  if(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD){
    const email=String(process.env.ADMIN_EMAIL).trim().toLowerCase();
    const exists=await pool.request().input('email',sql.VarChar(255),email).query('SELECT MaNguoiDung FROM NguoiDung WHERE Email=@email');
    if(!exists.recordset.length){
      const hash=await bcrypt.hash(String(process.env.ADMIN_PASSWORD),12);
      await pool.request().input('name',sql.NVarChar(150),process.env.ADMIN_NAME||'Quản trị viên').input('email',sql.VarChar(255),email).input('phone',sql.VarChar(20),process.env.ADMIN_PHONE||'0900000099').input('pass',sql.VarChar(255),hash).query("INSERT NguoiDung(HoTen,Email,SoDienThoai,MatKhau,VaiTro) VALUES(@name,@email,@phone,@pass,'admin')");
    }
  }
  return pool;
}).catch(err=>{console.error('❌ SQL:',err.message);throw err;});
function N(s){return s;}
module.exports={sql,poolPromise};
