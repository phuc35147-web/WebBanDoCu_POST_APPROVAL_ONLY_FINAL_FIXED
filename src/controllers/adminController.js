const sanPhamBLL=require('../bll/sanPhamBLL');const adminBLL=require('../bll/adminBLL');
exports.getProducts=async(req,res)=>{try{res.json(await sanPhamBLL.fetchAllForAdmin());}catch(e){res.status(500).json({message:e.message});}};
exports.updateProductStatus=async(req,res)=>{try{await sanPhamBLL.changeStatus(Number(req.params.id),req.body.trangThai);res.json({message:'Đã cập nhật trạng thái sản phẩm.'});}catch(e){res.status(400).json({message:e.message});}};
exports.getHomepageContent=async(req,res)=>{try{res.json(await adminBLL.getHomepageContent()||{});}catch(e){res.status(500).json({message:e.message});}};
exports.updateHomepageContent=async(req,res)=>{try{const c=await adminBLL.getHomepageContent();const image=req.file?`/uploads/${req.file.filename}`:(req.body.heroImageUrl||c?.HeroImageUrl||null);res.json({message:'Đã cập nhật trang chủ.',content:await adminBLL.saveHomepageContent({heroTitle:req.body.heroTitle,heroSubtitle:req.body.heroSubtitle,heroDescription:req.body.heroDescription,heroImageUrl:image})});}catch(e){res.status(400).json({message:e.message});}};
exports.stats=async(req,res)=>{try{res.json(await adminBLL.stats());}catch(e){res.status(500).json({message:e.message});}};
exports.orders=async(req,res)=>{try{res.json(await adminBLL.getOrders());}catch(e){res.status(500).json({message:e.message});}};
exports.updateOrder=async(req,res)=>{try{await adminBLL.updateOrderStatus(Number(req.params.id),req.body.trangThai);res.json({message:'Đã cập nhật đơn hàng.'});}catch(e){res.status(400).json({message:e.message});}};
