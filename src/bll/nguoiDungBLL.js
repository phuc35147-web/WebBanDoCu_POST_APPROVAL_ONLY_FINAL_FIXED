const dal=require('../dal/nguoiDungDAL');const bcrypt=require('bcryptjs');const jwt=require('jsonwebtoken');
const SECRET=process.env.JWT_SECRET||'WebBanDoCu_SECRET_2026';const PHONE=/^0\d{9}$/;
class B{async register(d){if(!d.hoTen||!d.email||!d.soDienThoai||!d.matKhau||!d.tinhThanh||!d.phuongXa||!d.diaChiChiTiet)throw Error('Vui lòng điền đầy đủ thông tin.');if(!PHONE.test(d.soDienThoai))throw Error('Số điện thoại phải gồm 10 số và bắt đầu bằng 0.');if(String(d.matKhau).length<6)throw Error('Mật khẩu tối thiểu 6 ký tự.');if(await dal.findByEmail(d.email))throw Error('Email đã được sử dụng.');if(await dal.findByPhone(d.soDienThoai))throw Error('Số điện thoại đã được sử dụng.');const hash=await bcrypt.hash(d.matKhau,12);await dal.create({...d,matKhau:hash});return this.login(d.email,d.matKhau);}
 async login(identifier,password){const u=String(identifier||'').includes('@')?await dal.findByEmail(identifier):await dal.findByPhone(identifier);if(!u||!u.TrangThai||!(await bcrypt.compare(String(password||''),u.MatKhau)))throw Error('Email/số điện thoại hoặc mật khẩu không chính xác.');const token=jwt.sign({id:u.MaNguoiDung,hoTen:u.HoTen,email:u.Email,vaiTro:u.VaiTro},SECRET,{expiresIn:'7d'});return {token,user:{id:u.MaNguoiDung,hoTen:u.HoTen,email:u.Email,soDienThoai:u.SoDienThoai,vaiTro:u.VaiTro}};}
 async checkPhone(p){if(!PHONE.test(String(p||'')))throw Error('Số điện thoại không hợp lệ.');return {exists:!!(await dal.findByPhone(p)),canContinue:!(await dal.findByPhone(p))};}
 verifyToken(t){return jwt.verify(t,SECRET);}
}
module.exports=new B();
