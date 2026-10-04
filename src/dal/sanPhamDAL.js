const {poolPromise,sql}=require('./dbConfig');
class SanPhamDAL{
 async getAll(f={}){const p=await poolPromise;let q=`SELECT sp.*,dm.TenDanhMuc,nd.HoTen TenNguoiBan,nd.SoDienThoai SdtNguoiBan FROM SanPhamDoCu sp JOIN DanhMuc dm ON dm.MaDanhMuc=sp.MaDanhMuc JOIN NguoiDung nd ON nd.MaNguoiDung=sp.MaNguoiBan WHERE sp.TrangThai=N'Đang bán' AND sp.SoLuong>0`;const r=p.request();if(f.keyword){q+=' AND(sp.TenSanPham LIKE @kw OR sp.MoTa LIKE @kw)';r.input('kw',sql.NVarChar,`%${f.keyword}%`);}if(f.maDanhMuc){q+=' AND sp.MaDanhMuc=@cat';r.input('cat',sql.Int,Number(f.maDanhMuc));}if(f.tinhTrang){q+=' AND sp.TinhTrang=@cond';r.input('cond',sql.NVarChar,f.tinhTrang);}if(f.location){q+=' AND sp.DiaChiXemHang LIKE @loc';r.input('loc',sql.NVarChar,`%${f.location}%`);}if(f.minPrice!==undefined&&f.minPrice!==''){q+=' AND sp.GiaBan>=@minPrice';r.input('minPrice',sql.Decimal(18,2),Number(f.minPrice));}if(f.maxPrice!==undefined&&f.maxPrice!==''){q+=' AND sp.GiaBan<=@maxPrice';r.input('maxPrice',sql.Decimal(18,2),Number(f.maxPrice));}const sorts={'newest':'sp.NgayDang DESC','price-asc':'sp.GiaBan ASC','price-desc':'sp.GiaBan DESC'};q+=` ORDER BY ${sorts[f.sort]||sorts.newest},sp.MaSanPham DESC`;return (await r.query(q)).recordset;}
async getById(id) {
    const p = await poolPromise;

    const r = await p.request()
        .input('id', sql.Int, id)
        .query(`
            UPDATE SanPhamDoCu
            SET LuotXem = LuotXem + 1
            WHERE MaSanPham = @id;

            SELECT
                sp.*,
                dm.TenDanhMuc,
                nd.HoTen AS TenNguoiBan,
                nd.Email AS EmailNguoiBan,
                nd.SoDienThoai AS SdtNguoiBan,
                nd.AnhDaiDien AS AnhNguoiBan,
                rating.SoSaoTrungBinh,
                rating.TongDanhGia
            FROM SanPhamDoCu sp
            JOIN DanhMuc dm
                ON dm.MaDanhMuc = sp.MaDanhMuc
            JOIN NguoiDung nd
                ON nd.MaNguoiDung = sp.MaNguoiBan
            OUTER APPLY (
                SELECT CAST(AVG(CAST(dg.SoSao AS DECIMAL(4,2))) AS DECIMAL(4,2)) SoSaoTrungBinh,
                       COUNT(*) TongDanhGia
                FROM DanhGia dg
                JOIN SanPhamDoCu reviewed ON reviewed.MaSanPham=dg.MaSanPham
                WHERE reviewed.MaNguoiBan=sp.MaNguoiBan
            ) rating
            WHERE sp.MaSanPham = @id;

            SELECT
                MaHinhAnh,
                DuongDan,
                LaAnhChinh,
                ThuTu
            FROM SanPhamHinhAnh
            WHERE MaSanPham = @id
            ORDER BY
                LaAnhChinh DESC,
                ThuTu,
                MaHinhAnh;

            SELECT TOP 20 dg.SoSao,dg.NoiDung,dg.NgayDanhGia,nd.HoTen TenNguoiMua
            FROM DanhGia dg
            JOIN SanPhamDoCu reviewed ON reviewed.MaSanPham=dg.MaSanPham
            JOIN NguoiDung nd ON nd.MaNguoiDung=dg.MaNguoiMua
            WHERE reviewed.MaNguoiBan=(SELECT MaNguoiBan FROM SanPhamDoCu WHERE MaSanPham=@id)
            ORDER BY dg.NgayDanhGia DESC;
        `);

    // SELECT sản phẩm
    const product = r.recordsets[0]?.[0] || null;

    if (!product) {
        return null;
    }

    // SELECT danh sách hình ảnh
    product.HinhAnhs = (r.recordsets[1] || [])
        .map(x => x.DuongDan);
    product.DanhGiaNguoiBan = r.recordsets[2] || [];

    return product;
}
 async create(d){
  const p=await poolPromise;
  const main=d.hinhAnh;
  const out=(await p.request()
    .input('seller',sql.Int,d.maNguoiBan).input('cat',sql.Int,d.maDanhMuc)
    .input('name',sql.NVarChar(255),String(d.tenSanPham).trim()).input('desc',sql.NVarChar(sql.MAX),String(d.moTa).trim())
    .input('price',sql.Decimal(18,2),Number(d.giaBan)).input('cond',sql.NVarChar(100),String(d.tinhTrang).trim())
    .input('qty',sql.Int,Math.max(1,Number(d.soLuong||1))).input('address',sql.NVarChar(500),String(d.diaChiXemHang).trim())
    .input('image',sql.VarChar(1000),main).query(`INSERT SanPhamDoCu(MaNguoiBan,MaDanhMuc,TenSanPham,MoTa,GiaBan,TinhTrang,SoLuong,DiaChiXemHang,HinhAnh,TrangThai) VALUES(@seller,@cat,@name,@desc,@price,@cond,@qty,@address,@image,N'Chờ duyệt'); SELECT * FROM SanPhamDoCu WHERE MaSanPham=CONVERT(int,SCOPE_IDENTITY())`)).recordset[0];
  const images=d.hinhAnhs||[];
  for(let i=0;i<images.length;i++){await p.request().input('sp',sql.Int,out.MaSanPham).input('path',sql.VarChar(1000),`/uploads/${images[i].filename}`).input('main',sql.Bit,i===0?1:0).input('order',sql.Int,i+1).query(`INSERT SanPhamHinhAnh(MaSanPham,DuongDan,LaAnhChinh,ThuTu) VALUES(@sp,@path,@main,@order)`);}
  if(main && !images.length){await p.request().input('sp',sql.Int,out.MaSanPham).input('path',sql.VarChar(1000),main).query(`INSERT SanPhamHinhAnh(MaSanPham,DuongDan,LaAnhChinh,ThuTu) VALUES(@sp,@path,1,1)`);}
  return out;
 }
 async updateOwned(id,seller,d,files){const p=await poolPromise;const mainFile=(files?.hinhAnh||[])[0]||null;const r=p.request().input('id',sql.Int,id).input('seller',sql.Int,seller).input('cat',sql.Int,Number(d.maDanhMuc)).input('name',sql.NVarChar(255),String(d.tenSanPham).trim()).input('desc',sql.NVarChar(sql.MAX),String(d.moTa).trim()).input('price',sql.Decimal(18,2),Number(d.giaBan)).input('cond',sql.NVarChar(100),String(d.tinhTrang).trim()).input('qty',sql.Int,Math.max(1,Number(d.soLuong||1))).input('address',sql.NVarChar(500),String(d.diaChiXemHang).trim()); let q=`UPDATE SanPhamDoCu SET MaDanhMuc=@cat,TenSanPham=@name,MoTa=@desc,GiaBan=@price,TinhTrang=@cond,SoLuong=@qty,DiaChiXemHang=@address,TrangThai=N'Chờ duyệt',LyDoTuChoi=NULL,NgayCapNhat=SYSDATETIME()`; if(mainFile){q+=`,HinhAnh=@image`;r.input('image',sql.VarChar(1000),`/uploads/${mainFile.filename}`);} q+=' WHERE MaSanPham=@id AND MaNguoiBan=@seller; SELECT * FROM SanPhamDoCu WHERE MaSanPham=@id AND MaNguoiBan=@seller';const out=(await r.query(q)).recordset[0];if(!out)throw Error('Không tìm thấy tin đăng hoặc bạn không có quyền sửa.');const images=files?.hinhAnhs||[];for(let i=0;i<images.length;i++){await p.request().input('sp',sql.Int,out.MaSanPham).input('path',sql.VarChar(1000),`/uploads/${images[i].filename}`).input('main',sql.Bit,0).input('order',sql.Int,Date.now()%100000+i).query(`INSERT SanPhamHinhAnh(MaSanPham,DuongDan,LaAnhChinh,ThuTu) VALUES(@sp,@path,@main,@order)`);}return out;}
 async deleteOwned(id,seller){const p=await poolPromise;const r=await p.request().input('id',sql.Int,id).input('seller',sql.Int,seller).query(`DELETE FROM SanPhamDoCu WHERE MaSanPham=@id AND MaNguoiBan=@seller`);if(!r.rowsAffected[0])throw Error('Không tìm thấy tin đăng hoặc bạn không có quyền xóa.');return true;}
 async getCategories(){const p=await poolPromise;return (await p.request().query('SELECT * FROM DanhMuc WHERE TrangThai=1 ORDER BY TenDanhMuc')).recordset;}
 async getAllForAdmin(){const p=await poolPromise;return (await p.request().query(`SELECT sp.*,dm.TenDanhMuc,nd.HoTen TenNguoiBan,nd.Email EmailNguoiBan FROM SanPhamDoCu sp JOIN DanhMuc dm ON dm.MaDanhMuc=sp.MaDanhMuc JOIN NguoiDung nd ON nd.MaNguoiDung=sp.MaNguoiBan ORDER BY sp.NgayDang DESC`)).recordset;}
 async updateStatus(id,status,reason=null){const p=await poolPromise;const r=await p.request().input('id',sql.Int,id).input('st',sql.NVarChar(30),status).input('reason',sql.NVarChar(1000),status==='Từ chối'?reason:null).query('UPDATE SanPhamDoCu SET TrangThai=@st,LyDoTuChoi=@reason,NgayCapNhat=SYSDATETIME() WHERE MaSanPham=@id');if(!r.rowsAffected[0])throw Error('Không tìm thấy tin đăng.');}
 async addReview(productId,userId,rating,comment){const p=await poolPromise;const result=await p.request().input('pid',sql.Int,productId).input('uid',sql.Int,userId).input('rating',sql.TinyInt,rating).input('comment',sql.NVarChar(1000),comment||null).query(`DECLARE @orderId INT; SELECT TOP 1 @orderId=dh.MaDonHang FROM DonHang dh JOIN ChiTietDonHang ct ON ct.MaDonHang=dh.MaDonHang WHERE dh.MaNguoiMua=@uid AND dh.TrangThai=N'Đã giao' AND ct.MaSanPham=@pid AND NOT EXISTS(SELECT 1 FROM DanhGia existing WHERE existing.MaDonHang=dh.MaDonHang AND existing.MaSanPham=@pid) ORDER BY dh.NgayCapNhat DESC; IF @orderId IS NULL THROW 50010,N'Chỉ người mua đã nhận hàng mới có thể đánh giá sản phẩm này.',1; INSERT DanhGia(MaDonHang,MaNguoiMua,MaSanPham,SoSao,NoiDung) VALUES(@orderId,@uid,@pid,@rating,@comment);`);return result.rowsAffected;}
 async createReport(productId,userId,reason,details){const p=await poolPromise;const product=(await p.request().input('pid',sql.Int,productId).query(`SELECT MaNguoiBan FROM SanPhamDoCu WHERE MaSanPham=@pid AND TrangThai=N'Đang bán'`)).recordset[0];if(!product)throw Error('Tin đăng không còn hoạt động.');if(Number(product.MaNguoiBan)===Number(userId))throw Error('Bạn không thể báo cáo tin đăng của chính mình.');const existing=await p.request().input('pid',sql.Int,productId).input('uid',sql.Int,userId).query(`SELECT 1 FROM BaoCaoSanPham WHERE MaSanPham=@pid AND MaNguoiBaoCao=@uid AND TrangThai=N'Chờ xử lý'`);if(existing.recordset.length)throw Error('Bạn đã gửi báo cáo cho tin này, vui lòng chờ quản trị viên xử lý.');await p.request().input('pid',sql.Int,productId).input('uid',sql.Int,userId).input('reason',sql.NVarChar(100),reason).input('details',sql.NVarChar(1000),details||null).query(`INSERT BaoCaoSanPham(MaSanPham,MaNguoiBaoCao,LoaiViPham,ChiTiet) VALUES(@pid,@uid,@reason,@details)`);}
}
module.exports=new SanPhamDAL();
