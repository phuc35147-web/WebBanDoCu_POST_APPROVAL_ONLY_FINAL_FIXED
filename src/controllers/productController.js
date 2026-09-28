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
exports.createProduct=async(req,res)=>{try{const u=await resolveCurrentUser(req);res.status(201).json({message:'Đăng sản phẩm thành công.',product:await bll.addProduct({...req.body,maNguoiBan:u.MaNguoiDung},req.files)});}catch(e){res.status(400).json({message:e.message});}};
exports.updateProduct=async(req,res)=>{try{const u=await resolveCurrentUser(req);res.json({message:'Cập nhật tin thành công, tin được đưa về trạng thái chờ duyệt.',product:await bll.updateProduct(req.params.id,u.MaNguoiDung,req.body,req.files)});}catch(e){res.status(400).json({message:e.message});}};
exports.deleteProduct=async(req,res)=>{try{const u=await resolveCurrentUser(req);await bll.deleteProduct(req.params.id,u.MaNguoiDung);res.json({message:'Đã xóa tin đăng.'});}catch(e){res.status(400).json({message:e.message});}};
