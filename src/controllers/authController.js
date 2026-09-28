const user=require('../bll/nguoiDungBLL');const admin=require('../bll/adminBLL');
exports.register=async(req,res)=>{try{res.status(201).json({message:'Đăng ký thành công!',...(await user.register(req.body))});}catch(e){res.status(400).json({message:e.message});}};
exports.login=async(req,res)=>{try{res.json({message:'Đăng nhập thành công!',...(await user.login(req.body.identifier||req.body.email||req.body.soDienThoai,req.body.matKhau||req.body.password))});}catch(e){res.status(401).json({message:e.message});}};
exports.adminLogin=async(req,res)=>{try{res.json({message:'Đăng nhập quản trị thành công!',...(await admin.login(req.body.email,req.body.password))});}catch(e){res.status(401).json({message:e.message});}};
exports.checkPhone=async(req,res)=>{try{res.json(await user.checkPhone(req.body.soDienThoai||req.body.phone));}catch(e){res.status(400).json({message:e.message});}};

exports.verifyTokenMiddleware=(req,res,next)=>{try{const h=req.headers.authorization||'';if(!h.startsWith('Bearer '))return res.status(401).json({message:'Bạn chưa đăng nhập.'});req.user=user.verifyToken(h.slice(7));next();}catch(e){res.status(403).json({message:'Phiên đăng nhập hết hạn.'});}};
exports.verifyAdminMiddleware=(req,res,next)=>{try{const h=req.headers.authorization||'';if(!h.startsWith('Bearer '))return res.status(401).json({message:'Bạn chưa đăng nhập quản trị.'});req.admin=admin.verifyToken(h.slice(7));next();}catch(e){res.status(403).json({message:'Phiên quản trị hết hạn.'});}};
