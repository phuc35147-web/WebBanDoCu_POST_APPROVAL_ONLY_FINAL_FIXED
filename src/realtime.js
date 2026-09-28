const clients = new Map();

function add(userId, res) {
    const id = Number(userId);

    if (!Number.isInteger(id) || id < 1) {
        return () => {};
    }

    if (!clients.has(id)) {
        clients.set(id, new Set());
    }

    const set = clients.get(id);
    set.add(res);

    const cleanup = () => {
        set.delete(res);

        if (!set.size) {
            clients.delete(id);
        }
    };

    res.on('close', cleanup);

    return cleanup;
}

function send(userId, event, data) {
    const set = clients.get(Number(userId));

    if (!set) return;

    const payload =
        `event: ${event}\n` +
        `data: ${JSON.stringify(data)}\n\n`;

    for (const res of [...set]) {
        try {
            res.write(payload);
        } catch (_) {
            try {
                res.end();
            } catch (_) {}

            set.delete(res);
        }
    }

    if (!set.size) {
        clients.delete(Number(userId));
    }
}

function broadcastMessage(message) {
    if (!message) return;

    const payload = {
        MaTinNhan: message.MaTinNhan,
        MaNguoiGui: message.MaNguoiGui,
        MaNguoiNhan: message.MaNguoiNhan,
        MaSanPham: message.MaSanPham ?? null,
        NoiDung: message.NoiDung,
        DaDoc: message.DaDoc,
        NgayGui: message.NgayGui,
        TenNguoiGui: message.TenNguoiGui || '',
        TenNguoiNhan: message.TenNguoiNhan || '',
        TenSanPham: message.TenSanPham || '',
        GiaBan: message.GiaBan ?? null,
        HinhAnh: message.HinhAnh || ''
    };

    send(message.MaNguoiGui, 'message', payload);
    send(message.MaNguoiNhan, 'message', payload);
}

function broadcastRead(userId, otherUserId, productId) {
    send(otherUserId, 'read', {
        userId: Number(userId),
        otherUserId: Number(otherUserId),
        productId: productId ? Number(productId) : null
    });
}

module.exports = {
    add,
    send,
    broadcastMessage,
    broadcastRead
};