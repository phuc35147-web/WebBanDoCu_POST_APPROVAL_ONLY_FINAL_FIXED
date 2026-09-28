const bll = require('../bll/messageBLL');
exports.conversations = async(req,res)=>{try{res.json(await bll.conversations(req.user.id));}catch(e){res.status(500).json({message:e.message});}};
exports.conversation = async(req,res)=>{try{res.json(await bll.conversation(req.user.id,Number(req.query.userId),req.query.productId?Number(req.query.productId):null));}catch(e){res.status(400).json({message:e.message});}};
exports.send = async(req,res)=>{try{const r=await bll.send(req.user.id,Number(req.body.userId),req.body.productId?Number(req.body.productId):null,req.body.noiDung);res.status(201).json(r);}catch(e){res.status(400).json({message:e.message});}};
exports.read = async(req,res)=>{try{await bll.read(req.user.id,Number(req.body.userId),req.body.productId?Number(req.body.productId):null);res.json({message:'Đã đánh dấu đã đọc.'});}catch(e){res.status(400).json({message:e.message});}};
