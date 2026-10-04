const dal=require('../dal/sanPhamDAL');
class B{
 async fetchProducts(f){const filters={...f};for(const key of ['minPrice','maxPrice']){if(filters[key]!==undefined&&filters[key]!==''){const price=Number(filters[key]);if(!Number.isFinite(price)||price<0)throw Error('Khoảng giá không hợp lệ.');filters[key]=price;}}if(filters.minPrice!==undefined&&filters.maxPrice!==undefined&&filters.maxPrice!==''&&filters.minPrice>filters.maxPrice)throw Error('Giá tối thiểu không được lớn hơn giá tối đa.');const validConditions=['Mới 99%','Đã qua sử dụng (còn tốt)','Cũ / Có trầy xước','Hỏng nhẹ / Cần sửa chữa'];if(filters.tinhTrang&&!validConditions.includes(filters.tinhTrang))throw Error('Tình trạng sản phẩm không hợp lệ.');if(!['newest','price-asc','price-desc'].includes(filters.sort))filters.sort='newest';return dal.getAll(filters);}
 async getProductById(id){id=Number(id);if(!Number.isInteger(id)||id<1)throw Error('Mã sản phẩm không hợp lệ.');return dal.getById(id);}
 async addProduct(d,files){
  const all=[...(files?.hinhAnh||[]),...(files?.hinhAnhs||[])];
  const file=all[0];
  if(!d.maDanhMuc||!d.tenSanPham||!d.tinhTrang||!d.moTa||!d.diaChiXemHang||!d.giaBan||Number(d.giaBan)<=0)throw Error('Vui lòng điền đầy đủ thông tin sản phẩm.');
  if(!['Mới 99%','Đã qua sử dụng (còn tốt)','Cũ / Có trầy xước','Hỏng nhẹ / Cần sửa chữa'].includes(d.tinhTrang))throw Error('Vui lòng chọn tình trạng theo danh mục quy chuẩn.');
  if(String(d.tenSanPham).trim().length<5)throw Error('Tên sản phẩm phải có ít nhất 5 ký tự.');
  if(String(d.moTa).trim().length<20)throw Error('Mô tả sản phẩm phải có ít nhất 20 ký tự.');
  if(!file)throw Error('Bạn phải chọn ít nhất 1 ảnh minh họa.');
  return dal.create({...d,maDanhMuc:Number(d.maDanhMuc),giaBan:Number(d.giaBan),soLuong:Math.max(1,Number(d.soLuong||1)),hinhAnh:`/uploads/${file.filename}`,hinhAnhs:all});
 }
 async updateProduct(id,seller,d,files){if(!d.maDanhMuc||!d.tenSanPham||!d.tinhTrang||!d.moTa||!d.diaChiXemHang||!d.giaBan||Number(d.giaBan)<=0)throw Error('Vui lòng điền đầy đủ thông tin sản phẩm.');if(!['Mới 99%','Đã qua sử dụng (còn tốt)','Cũ / Có trầy xước','Hỏng nhẹ / Cần sửa chữa'].includes(d.tinhTrang))throw Error('Vui lòng chọn tình trạng theo danh mục quy chuẩn.');if(String(d.tenSanPham).trim().length<5)throw Error('Tên sản phẩm phải có ít nhất 5 ký tự.');if(String(d.moTa).trim().length<20)throw Error('Mô tả sản phẩm phải có ít nhất 20 ký tự.');return dal.updateOwned(Number(id),seller,d,files);} async deleteProduct(id,seller){return dal.deleteOwned(Number(id),seller);} async getCategories(){return dal.getCategories();}
 async fetchAllForAdmin(){return dal.getAllForAdmin();}
 async changeStatus(id,status,reason){if(!['Chờ duyệt','Đang bán','Đã bán','Ẩn','Từ chối'].includes(status))throw Error('Trạng thái không hợp lệ.');if(status==='Từ chối'&&!String(reason||'').trim())throw Error('Vui lòng nhập lý do từ chối.');return dal.updateStatus(Number(id),status,reason);}
}
module.exports=new B();
