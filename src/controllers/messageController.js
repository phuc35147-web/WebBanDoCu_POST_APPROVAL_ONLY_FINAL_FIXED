const bll = require('../bll/messageBLL');
const realtime = require('../realtime');

exports.conversations = async (req, res) => {
    try {
        res.json(await bll.conversations(req.user.id));
    } catch (e) {
        res.status(500).json({
            message: e.message
        });
    }
};

exports.conversation = async (req, res) => {
    try {
        res.json(
            await bll.conversation(
                req.user.id,
                Number(req.query.userId),
                req.query.productId
                    ? Number(req.query.productId)
                    : null
            )
        );
    } catch (e) {
        res.status(400).json({
            message: e.message
        });
    }
};

exports.send = async (req, res) => {
    try {
        const result = await bll.send(
            req.user.id,
            Number(req.body.userId),
            req.body.productId
                ? Number(req.body.productId)
                : null,
            req.body.noiDung
        );

        // Gửi realtime cho cả người gửi và người nhận
        realtime.broadcastMessage(result);

        res.status(201).json(result);
    } catch (e) {
        res.status(400).json({
            message: e.message
        });
    }
};

exports.read = async (req, res) => {
    try {
        const other = Number(req.body.userId);

        const product = req.body.productId
            ? Number(req.body.productId)
            : null;

        await bll.read(
            req.user.id,
            other,
            product
        );

        realtime.broadcastRead(
            req.user.id,
            other,
            product
        );

        res.json({
            message: 'Đã đánh dấu đã đọc.'
        });
    } catch (e) {
        res.status(400).json({
            message: e.message
        });
    }
};

exports.stream = async (req, res) => {
    res.setHeader(
        'Content-Type',
        'text/event-stream; charset=utf-8'
    );

    res.setHeader(
        'Cache-Control',
        'no-cache, no-transform'
    );

    res.setHeader(
        'Connection',
        'keep-alive'
    );

    res.setHeader(
        'X-Accel-Buffering',
        'no'
    );

    res.flushHeaders?.();

    res.write(
        `event: connected\ndata: ${JSON.stringify({
            userId: req.user.id
        })}\n\n`
    );

    const cleanup = realtime.add(
        req.user.id,
        res
    );

    // Giữ kết nối không bị timeout
    const heartbeat = setInterval(() => {
        try {
            res.write(
                `event: ping\ndata: ${Date.now()}\n\n`
            );
        } catch (_) {}
    }, 25000);

    req.on('close', () => {
        clearInterval(heartbeat);
        cleanup();
    });
};