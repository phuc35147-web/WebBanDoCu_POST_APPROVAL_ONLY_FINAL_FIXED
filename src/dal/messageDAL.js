const { poolPromise, sql } = require('./dbConfig');

class MessageDAL {

    async getConversations(userId) {
        const p = await poolPromise;

        const r = await p.request()
            .input('userId', sql.Int, userId)
            .query(`
                WITH ranked AS (
                    SELECT
                        tm.*,

                        ROW_NUMBER() OVER(
                            PARTITION BY
                                CASE
                                    WHEN tm.MaNguoiGui = @userId
                                    THEN tm.MaNguoiNhan
                                    ELSE tm.MaNguoiGui
                                END,

                                ISNULL(tm.MaSanPham, 0)

                            ORDER BY
                                tm.NgayGui DESC,
                                tm.MaTinNhan DESC
                        ) rn

                    FROM TinNhan tm

                    WHERE
                        tm.MaNguoiGui = @userId
                        OR tm.MaNguoiNhan = @userId
                ),

                unread AS (
                    SELECT

                        CASE
                            WHEN tm.MaNguoiGui = @userId
                            THEN tm.MaNguoiNhan
                            ELSE tm.MaNguoiGui
                        END AS MaDoiPhuong,

                        ISNULL(tm.MaSanPham, 0)
                            AS MaSanPhamKey,

                        COUNT(*) AS ChuaDoc

                    FROM TinNhan tm

                    WHERE
                        tm.MaNguoiNhan = @userId
                        AND tm.DaDoc = 0

                    GROUP BY

                        CASE
                            WHEN tm.MaNguoiGui = @userId
                            THEN tm.MaNguoiNhan
                            ELSE tm.MaNguoiGui
                        END,

                        ISNULL(tm.MaSanPham, 0)
                )

                SELECT

                    r.MaTinNhan,
                    r.MaSanPham,
                    r.NoiDung,
                    r.NgayGui,
                    r.DaDoc,

                    r.MaNguoiGui,
                    r.MaNguoiNhan,

                    nd.MaNguoiDung AS MaDoiPhuong,
                    nd.HoTen AS TenDoiPhuong,
                    nd.AnhDaiDien AS AnhDoiPhuong,

                    sp.TenSanPham,
                    sp.HinhAnh,
                    sp.GiaBan,

                    ISNULL(u.ChuaDoc, 0) AS ChuaDoc

                FROM ranked r

                JOIN NguoiDung nd
                    ON nd.MaNguoiDung =
                        CASE
                            WHEN r.MaNguoiGui = @userId
                            THEN r.MaNguoiNhan
                            ELSE r.MaNguoiGui
                        END

                LEFT JOIN SanPhamDoCu sp
                    ON sp.MaSanPham = r.MaSanPham

                LEFT JOIN unread u
                    ON u.MaDoiPhuong = nd.MaNguoiDung
                    AND u.MaSanPhamKey =
                        ISNULL(r.MaSanPham, 0)

                WHERE r.rn = 1

                ORDER BY
                    r.NgayGui DESC,
                    r.MaTinNhan DESC
            `);

        return r.recordset;
    }


    async getConversation(
        userId,
        otherUserId,
        productId
    ) {
        const p = await poolPromise;

        const r = await p.request()
            .input('me', sql.Int, userId)
            .input('other', sql.Int, otherUserId)
            .input(
                'product',
                sql.Int,
                productId || null
            )
            .query(`
                SELECT

                    tm.MaTinNhan,
                    tm.MaNguoiGui,
                    tm.MaNguoiNhan,
                    tm.MaSanPham,

                    tm.NoiDung,
                    tm.DaDoc,
                    tm.NgayGui,

                    sender.HoTen AS TenNguoiGui,
                    sender.AnhDaiDien AS AnhNguoiGui,

                    receiver.HoTen AS TenNguoiNhan,

                    sp.TenSanPham,
                    sp.GiaBan,
                    sp.HinhAnh

                FROM TinNhan tm

                JOIN NguoiDung sender
                    ON sender.MaNguoiDung =
                        tm.MaNguoiGui

                JOIN NguoiDung receiver
                    ON receiver.MaNguoiDung =
                        tm.MaNguoiNhan

                LEFT JOIN SanPhamDoCu sp
                    ON sp.MaSanPham =
                        tm.MaSanPham

                WHERE
                    (
                        tm.MaNguoiGui = @me
                        AND tm.MaNguoiNhan = @other
                    )

                    OR

                    (
                        tm.MaNguoiGui = @other
                        AND tm.MaNguoiNhan = @me
                    )

                AND
                    (
                        (
                            @product IS NULL
                            AND tm.MaSanPham IS NULL
                        )

                        OR

                        tm.MaSanPham = @product
                    )

                ORDER BY
                    tm.NgayGui ASC,
                    tm.MaTinNhan ASC
            `);

        return r.recordset;
    }


    async getProduct(productId) {
        if (!productId) {
            return null;
        }

        const p = await poolPromise;

        const r = await p.request()
            .input(
                'id',
                sql.Int,
                productId
            )
            .query(`
                SELECT TOP 1

                    MaSanPham,
                    TenSanPham,
                    GiaBan,
                    HinhAnh

                FROM SanPhamDoCu

                WHERE MaSanPham = @id
            `);

        return r.recordset[0] || null;
    }


    async send(
        userId,
        otherUserId,
        productId,
        content
    ) {
        const p = await poolPromise;

        const text = String(
            content || ''
        ).trim();

        if (!text) {
            throw new Error(
                'Nội dung tin nhắn không được để trống.'
            );
        }

        if (text.length > 2000) {
            throw new Error(
                'Tin nhắn tối đa 2000 ký tự.'
            );
        }

        const r = await p.request()
            .input(
                'from',
                sql.Int,
                userId
            )
            .input(
                'to',
                sql.Int,
                otherUserId
            )
            .input(
                'product',
                sql.Int,
                productId || null
            )
            .input(
                'content',
                sql.NVarChar(2000),
                text
            )
            .query(`
                INSERT TinNhan(
                    MaNguoiGui,
                    MaNguoiNhan,
                    MaSanPham,
                    NoiDung
                )

                OUTPUT INSERTED.*

                VALUES(
                    @from,
                    @to,
                    @product,
                    @content
                )
            `);

        const message = r.recordset[0];

        // Lấy lại thông tin đầy đủ để gửi realtime
        const detail = await p.request()
            .input(
                'id',
                sql.Int,
                message.MaTinNhan
            )
            .query(`
                SELECT

                    tm.MaTinNhan,
                    tm.MaNguoiGui,
                    tm.MaNguoiNhan,
                    tm.MaSanPham,

                    tm.NoiDung,
                    tm.DaDoc,
                    tm.NgayGui,

                    sender.HoTen AS TenNguoiGui,
                    receiver.HoTen AS TenNguoiNhan,

                    sp.TenSanPham,
                    sp.GiaBan,
                    sp.HinhAnh

                FROM TinNhan tm

                JOIN NguoiDung sender
                    ON sender.MaNguoiDung =
                        tm.MaNguoiGui

                JOIN NguoiDung receiver
                    ON receiver.MaNguoiDung =
                        tm.MaNguoiNhan

                LEFT JOIN SanPhamDoCu sp
                    ON sp.MaSanPham =
                        tm.MaSanPham

                WHERE tm.MaTinNhan = @id
            `);

        return detail.recordset[0] || message;
    }


    async markRead(
        userId,
        otherUserId,
        productId
    ) {
        const p = await poolPromise;

        await p.request()
            .input(
                'me',
                sql.Int,
                userId
            )
            .input(
                'other',
                sql.Int,
                otherUserId
            )
            .input(
                'product',
                sql.Int,
                productId || null
            )
            .query(`
                UPDATE TinNhan

                SET DaDoc = 1

                WHERE
                    MaNguoiGui = @other
                    AND MaNguoiNhan = @me

                    AND
                    (
                        (
                            @product IS NULL
                            AND MaSanPham IS NULL
                        )

                        OR

                        MaSanPham = @product
                    )
            `);
    }
}

module.exports = new MessageDAL();