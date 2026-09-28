const dal=require('../dal/orderDAL');
exports.create=async(req,res)=>{try{const r=await dal.create(req.user.id,req.body);res.status(201).json({message:'Đặt hàng thành công.',...r});}catch(e){res.status(400).json({message:e.message});}};
exports.getOne=async(req,res)=>{try{const r=await dal.getById(req.user.id,Number(req.params.id));if(!r)return res.status(404).json({message:'Không tìm thấy đơn hàng.'});res.json(r);}catch(e){res.status(400).json({message:e.message});}};
exports.cancel=async(req,res)=>{try{await dal.cancel(req.user.id,Number(req.params.id));res.json({message:'Đã hủy đơn hàng.'});}catch(e){res.status(400).json({message:e.message});}};
