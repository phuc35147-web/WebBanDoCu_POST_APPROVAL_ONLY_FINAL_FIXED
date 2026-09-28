require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

require('./src/dal/dbConfig');

const auth = require('./src/controllers/authController');
const product = require('./src/controllers/productController');
const account = require('./src/controllers/accountController');
const admin = require('./src/controllers/adminController');
const order = require('./src/controllers/orderController');
const message = require('./src/controllers/messageController');

const app = express();

const PORT = Number(process.env.PORT || 5000);

const publicDir = path.join(__dirname, 'public');
const uploadDir = path.join(__dirname, 'uploads');

/* =========================
   TẠO THƯ MỤC UPLOAD
========================= */

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, {
        recursive: true
    });
}

/* =========================
   MULTER
========================= */

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);

        cb(
            null,
            Date.now() +
            '-' +
            Math.round(Math.random() * 1e9) +
            ext
        );
    }
});

const upload = multer({
    storage,

    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {
        const allowed = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp'
        ];

        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ được upload ảnh JPG, JPEG, PNG hoặc WEBP.'));
        }
    }
});

/* =========================
   MIDDLEWARE
========================= */

app.use(cors());

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);

/*
 * QUAN TRỌNG:
 * Cho phép truy cập toàn bộ file trong public
 *
 * public/account.html
 * -> http://localhost:5000/account.html
 *
 * public/css/account.css
 * -> http://localhost:5000/css/account.css
 */
app.use(
    express.static(publicDir)
);

/*
 * Thư mục upload
 */
app.use(
    '/uploads',
    express.static(uploadDir)
);

/* =========================
   TEST SERVER
========================= */

app.get('/api/health', (req, res) => {
    res.json({
        ok: true,
        database: process.env.DB_NAME || 'WebBanDoCu',
        time: new Date().toISOString()
    });
});

/* =========================
   AUTH
========================= */

app.post(
    '/api/auth/register',
    auth.register
);

app.post(
    '/api/auth/login',
    auth.login
);

app.post(
    '/api/auth/check-phone',
    auth.checkPhone
);

app.post(
    '/api/admin/auth/login',
    auth.adminLogin
);

/* =========================
   ACCOUNT
========================= */

app.get(
    '/api/account',
    auth.verifyTokenMiddleware,
    account.getAccount
);

app.get(
    '/api/account/profile',
    auth.verifyTokenMiddleware,
    account.getAccount
);

app.get(
    '/api/account/transactions',
    auth.verifyTokenMiddleware,
    account.getTransactions
);

app.get(
    '/api/account/orders',
    auth.verifyTokenMiddleware,
    account.getTransactions
);

app.put(
    '/api/account',
    auth.verifyTokenMiddleware,
    account.updateAccount
);

app.get(
    '/api/account/listings',
    auth.verifyTokenMiddleware,
    account.getListings
);


/* =========================
   CHAT GIỮA NGƯỜI MUA / NGƯỜI BÁN
========================= */
app.get('/api/messages/conversations', auth.verifyTokenMiddleware, message.conversations);
app.get('/api/messages', auth.verifyTokenMiddleware, message.conversation);
app.post('/api/messages', auth.verifyTokenMiddleware, message.send);
app.patch('/api/messages/read', auth.verifyTokenMiddleware, message.read);

/* =========================
   PRODUCTS
========================= */

app.get(
    '/api/categories',
    product.getCategories
);

app.get(
    '/api/products',
    product.getProducts
);

app.get(
    '/api/products/:id',
    product.getProductById
);

app.post(
    '/api/products',
    auth.verifyTokenMiddleware,
    upload.fields([{name:'hinhAnh',maxCount:1},{name:'hinhAnhs',maxCount:8}]),
    product.createProduct
);

app.patch(
    '/api/products/:id',
    auth.verifyTokenMiddleware,
    upload.fields([{name:'hinhAnh',maxCount:1},{name:'hinhAnhs',maxCount:8}]),
    product.updateProduct
);

app.delete(
    '/api/products/:id',
    auth.verifyTokenMiddleware,
    product.deleteProduct
);

/* =========================
   ORDERS
========================= */

app.post(
    '/api/orders',
    auth.verifyTokenMiddleware,
    order.create
);

app.get(
    '/api/orders/:id',
    auth.verifyTokenMiddleware,
    order.getOne
);

app.patch(
    '/api/orders/:id/cancel',
    auth.verifyTokenMiddleware,
    order.cancel
);

/* =========================
   ADMIN
========================= */

app.get(
    '/api/admin/products',
    auth.verifyAdminMiddleware,
    admin.getProducts
);

app.patch(
    '/api/admin/products/:id/status',
    auth.verifyAdminMiddleware,
    admin.updateProductStatus
);

app.get(
    '/api/admin/stats',
    auth.verifyAdminMiddleware,
    admin.stats
);

app.get(
    '/api/admin/orders',
    auth.verifyAdminMiddleware,
    admin.orders
);

app.patch(
    '/api/admin/orders/:id/status',
    auth.verifyAdminMiddleware,
    admin.updateOrder
);

/* =========================
   HOMEPAGE
========================= */

app.get(
    '/api/homepage-content',
    admin.getHomepageContent
);

app.put(
    '/api/admin/homepage-content',
    auth.verifyAdminMiddleware,
    upload.single('image'),
    admin.updateHomepageContent
);

app.get(
    '/api/config/maps',
    (req, res) => {
        res.json({
            apiKey: process.env.GOOGLE_MAPS_API_KEY || ''
        });
    }
);

/* =========================
   ERROR
========================= */

app.use((err, req, res, next) => {

    console.error(err);

    res.status(500).json({
        message: 'Lỗi máy chủ.',
        detail:
            process.env.NODE_ENV === 'development'
                ? err.message
                : undefined
    });

});

/* =========================
   TRANG SPA FALLBACK
========================= */

/*
 * ĐẶT CUỐI CÙNG
 */
app.get('*', (req, res) => {

    res.sendFile(
        path.join(publicDir, 'index.html')
    );

});

/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {

    console.log('');
    console.log('🚀 Chợ Đồ Cũ: http://localhost:' + PORT);
    console.log(
        '📦 Database: ' +
        (process.env.DB_NAME || 'WebBanDoCu')
    );
    console.log('');

});