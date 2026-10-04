# WebBanDoCu - bản hoàn thiện + SQL Server mới

## 1. CSDL mới
Database hoàn toàn mới: **WebBanDoCu**.

File:
`database/WebBanDoCu_NEW.sql`

Script sẽ xóa database `WebBanDoCu` cũ nếu có và tạo lại sạch từ đầu. Không chạy trên database cũ nếu bạn còn dữ liệu cần giữ.

### Các bảng chính
- `NguoiDung`: tài khoản, vai trò, trạng thái
- `DanhMuc`: danh mục sản phẩm
- `NguoiBan`: hồ sơ người bán và duyệt người bán
- `SanPhamDoCu`: tin đăng, giá, số lượng, trạng thái, lượt xem
- `SanPhamHinhAnh`: nhiều ảnh cho sản phẩm
- `DiaChiNguoiDung`: nhiều địa chỉ nhận hàng
- `DonHang`: đơn hàng + phí vận chuyển + thanh toán
- `ChiTietDonHang`: chi tiết sản phẩm trong đơn
- `YeuThich`: sản phẩm yêu thích
- `DanhGia`: đánh giá sau mua
- `ThongBao`: thông báo người bán
- `HomepageContent`: nội dung trang chủ
- `AdminLog`: nhật ký quản trị

Có thêm view `vw_SanPhamDangBan` và `vw_ThongKeBanHang` để phục vụ web/thống kê.

## 2. Điểm mới đã làm ở web
- Đăng ký / đăng nhập bằng email hoặc số điện thoại.
- Mật khẩu được hash bằng bcrypt.
- JWT cho phiên đăng nhập.
- Đăng ký người bán và admin duyệt.
- Người bán đăng sản phẩm có ảnh.
- Tìm kiếm sản phẩm theo từ khóa, danh mục, tình trạng.
- Chi tiết sản phẩm + liên hệ người bán.
- Mua sản phẩm thật qua `POST /api/orders`.
- SQL transaction + `UPDLOCK/HOLDLOCK` để tránh 2 người mua cùng một món đồ cũ.
- Sau khi đặt hàng, sản phẩm được chuyển `Đã bán` và số lượng về 0.
- Người mua xem lịch sử mua hàng.
- Người bán xem lịch sử bán hàng.
- Có API hủy đơn trong trạng thái `Chờ xác nhận` và hoàn lại sản phẩm.
- Admin quản lý sản phẩm, duyệt người bán, quản lý đơn hàng, xem thống kê và sửa banner trang chủ.

## 3. Cài đặt
1. SQL Server + SSMS: chạy `database/WebBanDoCu_NEW.sql`.
2. Copy `.env.example` thành `.env`.
3. Điền mật khẩu SQL Server.
4. Có thể cấu hình:
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `ADMIN_NAME`
   - `ADMIN_PHONE`
5. Chạy:
```bash
npm install
npm start
```
6. Mở `http://localhost:5000`.

## 4. Tài khoản demo
Server tự tạo người bán demo:
- Email: `demo.seller@example.com`
- Mật khẩu: `123456`

Admin được tạo theo `.env`.

## 5. API chính
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/seller-registration`
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products/:id/reviews` (đơn hàng phải đã giao)
- `POST /api/products/:id/reports`
- `POST /api/products`
- `POST /api/orders`
- `GET /api/orders/:id`
- `PATCH /api/orders/:id/cancel`
- `GET /api/account`
- `GET /api/admin/stats`
- `GET /api/admin/reports`
- `PATCH /api/admin/reports/:id`
- `GET /api/admin/orders`
- `PATCH /api/admin/orders/:id/status`

## 6. Lưu ý
- Không đưa `.env` thật lên GitHub.
- Không cần nộp `node_modules`.
- Nếu SQL Server không dùng port 1433, sửa `DB_PORT`.
- Nếu dùng Windows Authentication thay vì SQL Login, cần đổi cấu hình `mssql` trong `src/dal/dbConfig.js`.


## Luồng đăng tin hiện tại
- Mọi tài khoản đang hoạt động sau khi đăng nhập đều có thể bấm **Đăng tin**.
- Tin mới luôn có trạng thái **Chờ duyệt**.
- Admin vào **Quản lý tin đăng** và đổi trạng thái sang **Đang bán** để tin xuất hiện trên trang chủ.
- Không còn bước đăng ký/duyệt làm người bán trước khi đăng tin.
- Khi sửa tin, tin sẽ quay lại **Chờ duyệt** để admin kiểm tra lại.


LUONG DANG TIN FINAL
- Moi tai khoan dang nhap deu duoc phep dang tin.
- Khong co buoc dang ky nguoi ban.
- Tin moi: Cho duyet.
- Chi Admin duyet tin: Dang ban/Tu choi/An/Da ban.
- Khong can chay quy trinh seller registration.

## Các tính năng an toàn tin đăng
- Với CSDL đang sử dụng, chạy `database/FEATURE_QUICK_WINS_MIGRATION.sql` trong SSMS trước khi khởi động phiên bản mã mới.
- Admin phải nhập lý do khi từ chối tin; người đăng xem lý do trong mục tin đăng của tài khoản.
- Người dùng đã đăng nhập có thể báo cáo tin vi phạm. Admin xem danh sách báo cáo và có thể ẩn tin, xử lý hoặc bỏ qua.
- Người mua chỉ được đánh giá người bán sau khi đơn hàng ở trạng thái `Đã giao`; điểm trung bình và nhận xét hiển thị trên trang chi tiết sản phẩm.
- Tình trạng đồ dùng được giới hạn ở bốn mức chuẩn. Danh sách sản phẩm hỗ trợ lọc theo khu vực, giá, tình trạng và sắp xếp theo thời gian/giá.
