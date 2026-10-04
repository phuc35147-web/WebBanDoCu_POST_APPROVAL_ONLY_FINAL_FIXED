const bll=require('../bll/sanPhamBLL');
const userDAL=require('../dal/nguoiDungDAL');

// Mọi tài khoản đã đăng nhập đều được phép đăng tin. Không yêu cầu VaiTro='seller'.
// Chỉ Admin mới có quyền đổi trạng thái Chờ duyệt -> Đang bán.
// Nếu token cũ lệch ID sau khi database được reset/reimport, tìm lại theo email.
async function resolveCurrentUser(req){
  const tokenUser=req.user||{};
  let u=null;
  if(Number.isInteger(Number(tokenUser.id)) && Number(tokenUser.id)>0){
    u=await userDAL.findById(Number(tokenUser.id));
  }
  if(!u && tokenUser.email){
    u=await userDAL.findByEmail(tokenUser.email);
  }
  if(!u || !u.TrangThai) throw Error('Tài khoản không tồn tại hoặc đã bị khóa. Vui lòng đăng xuất và đăng nhập lại.');
  return u;
}

exports.getProducts=async(req,res)=>{try{res.json(await bll.fetchProducts(req.query));}catch(e){res.status(500).json({message:e.message});}};
exports.getProductById=async(req,res)=>{try{const p=await bll.getProductById(req.params.id);if(!p)return res.status(404).json({message:'Không tìm thấy sản phẩm.'});res.json(p);}catch(e){res.status(400).json({message:e.message});}};
exports.getCategories=async(req,res)=>{try{res.json(await bll.getCategories());}catch(e){res.status(500).json({message:e.message});}};
exports.review=async(req,res)=>{try{const id=Number(req.params.id),rating=Number(req.body.soSao),comment=String(req.body.noiDung||'').trim();if(!Number.isInteger(id)||id<1)return res.status(400).json({message:'Mã sản phẩm không hợp lệ.'});if(!Number.isInteger(rating)||rating<1||rating>5)return res.status(400).json({message:'Số sao phải từ 1 đến 5.'});if(comment.length>1000)return res.status(400).json({message:'Nhận xét không được vượt quá 1000 ký tự.'});await require('../dal/sanPhamDAL').addReview(id,Number(req.user.id),rating,comment);res.status(201).json({message:'Cảm ơn bạn đã đánh giá người bán.'});}catch(e){res.status(400).json({message:e.message});}};
exports.report=async(req,res)=>{try{const id=Number(req.params.id),reason=String(req.body.loaiViPham||'').trim(),details=String(req.body.chiTiet||'').trim();const allowed=['Hàng giả','Hàng cấm','Thông tin sai sự thật','Nghi ngờ lừa đảo','Lý do khác'];if(!Number.isInteger(id)||id<1)return res.status(400).json({message:'Mã sản phẩm không hợp lệ.'});if(!allowed.includes(reason))return res.status(400).json({message:'Vui lòng chọn lý do báo cáo hợp lệ.'});if(details.length>1000)return res.status(400).json({message:'Nội dung bổ sung không được vượt quá 1000 ký tự.'});await require('../dal/sanPhamDAL').createReport(id,Number(req.user.id),reason,details);res.status(201).json({message:'Đã gửi báo cáo. Quản trị viên sẽ xem xét tin đăng.'});}catch(e){res.status(400).json({message:e.message});}};
exports.createProduct=async(req,res)=>{try{const u=await resolveCurrentUser(req);res.status(201).json({message:'Đăng sản phẩm thành công.',product:await bll.addProduct({...req.body,maNguoiBan:u.MaNguoiDung},req.files)});}catch(e){res.status(400).json({message:e.message});}};
exports.updateProduct=async(req,res)=>{try{const u=await resolveCurrentUser(req);res.json({message:'Cập nhật tin thành công, tin được đưa về trạng thái chờ duyệt.',product:await bll.updateProduct(req.params.id,u.MaNguoiDung,req.body,req.files)});}catch(e){res.status(400).json({message:e.message});}};
exports.deleteProduct=async(req,res)=>{try{const u=await resolveCurrentUser(req);await bll.deleteProduct(req.params.id,u.MaNguoiDung);res.json({message:'Đã xóa tin đăng.'});}catch(e){res.status(400).json({message:e.message});}};
