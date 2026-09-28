/* =========================================================
   CHỢ ĐỒ CŨ
   MESSAGES.JS

   API ĐANG DÙNG:

   GET    /api/account
   GET    /api/messages/conversations
   GET    /api/messages
   POST   /api/messages
   PATCH  /api/messages/read
   GET    /api/messages/stream

========================================================= */

(() => {

    'use strict';


    /* =====================================================
       VARIABLES
    ===================================================== */

    const token =
        localStorage.getItem('token');


    let me = 0;

    let meName = 'Bạn';

    let current = null;

    let conversationsCache = [];

    let activeFilter = 'all';

    let realtimeController = null;

    let reconnectTimer = null;

    let reconnecting = false;


    const $ = id =>
        document.getElementById(id);


    /* =====================================================
       HELPER
    ===================================================== */

    function esc(value) {

        return String(value ?? '')
            .replace(/[&<>'"]/g, char => {

                return {

                    '&': '&amp;',

                    '<': '&lt;',

                    '>': '&gt;',

                    "'": '&#39;',

                    '"': '&quot;'

                }[char];

            });

    }


    function getInitial(name) {

        const value =
            String(name || 'N').trim();

        return esc(
            value.charAt(0).toUpperCase()
        );

    }


    function formatTime(value) {

        if (!value) {
            return '';
        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return '';

        }


        return date.toLocaleString(
            'vi-VN',
            {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }
        );

    }


    function shortTime(value) {

        if (!value) {
            return '';
        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return '';

        }


        const now =
            new Date();


        const sameDay =
            date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear();


        if (sameDay) {

            return date.toLocaleTimeString(
                'vi-VN',
                {
                    hour: '2-digit',
                    minute: '2-digit'
                }
            );

        }


        return date.toLocaleDateString(
            'vi-VN',
            {
                day: '2-digit',
                month: '2-digit'
            }
        );

    }


    /* =====================================================
       REALTIME STATUS
    ===================================================== */

    function setRealtimeStatus(
        online,
        text
    ) {

        const textElement =
            $('realtimeText');

        const dotElement =
            $('realtimeDot');


        if (textElement) {

            textElement.textContent =
                text;

        }


        if (dotElement) {

            dotElement.classList.toggle(
                'offline',
                !online
            );

        }

    }


    /* =====================================================
       LOAD CURRENT USER
    ===================================================== */

    async function loadCurrentUser() {

        try {

            const saved =
                JSON.parse(
                    localStorage.getItem(
                        'user'
                    ) || '{}'
                );


            me = Number(

                saved.MaNguoiDung ??

                saved.maNguoiDung ??

                saved.id ??

                saved.userId ??

                0

            );


            meName =

                saved.HoTen ??

                saved.hoTen ??

                saved.name ??

                'Bạn';


        } catch (error) {

            console.warn(
                'Không đọc được user:',
                error
            );

        }


        if (!me) {

            const response =
                await fetch(
                    '/api/account',
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`
                        }
                    }
                );


            const data =
                await response.json();


            me = Number(

                data.profile?.MaNguoiDung ??

                data.profile?.maNguoiDung ??

                data.profile?.id ??

                0

            );


            meName =

                data.profile?.HoTen ??

                data.profile?.hoTen ??

                data.profile?.name ??

                'Bạn';

        }

    }


    /* =====================================================
       RENDER CONVERSATIONS
    ===================================================== */

    function renderConversations() {

        const list =
            $('conversationList');


        const count =
            $('conversationCount');


        let rows =
            conversationsCache;


        const keyword =
            (
                $('conversationSearch')
                    ?.value || ''
            )
            .trim()
            .toLowerCase();


        /* FILTER */

        if (
            activeFilter === 'unread'
        ) {

            rows =
                rows.filter(item => {

                    return Number(

                        item.SoTinChuaDoc ||

                        item.UnreadCount ||

                        item.SoTinMoi ||

                        0

                    ) > 0;

                });

        }


        if (
            activeFilter === 'hidden'
        ) {

            rows = [];

        }


        /* SEARCH */

        if (keyword) {

            rows =
                rows.filter(item => {

                    const text = [

                        item.TenDoiPhuong,

                        item.TenSanPham,

                        item.NoiDung

                    ]

                        .filter(Boolean)

                        .join(' ')

                        .toLowerCase();


                    return text.includes(
                        keyword
                    );

                });

        }


        count.textContent =
            conversationsCache.length;


        if (!rows.length) {

            list.innerHTML = `

                <div
                    style="
                        text-align:center;
                        padding:45px 20px;
                        color:#9ca3af;
                    "
                >

                    <i
                        class="bi bi-chat-dots"
                        style="
                            display:block;
                            font-size:35px;
                            margin-bottom:10px;
                        "
                    ></i>

                    Chưa có cuộc trò chuyện.

                </div>

            `;

            return;

        }


        list.innerHTML =
            rows.map(item => {

                const userId =
                    Number(
                        item.MaDoiPhuong
                    );


                const productId =
                    Number(
                        item.MaSanPham || 0
                    );


                const unread =
                    Number(

                        item.SoTinChuaDoc ||

                        item.UnreadCount ||

                        item.SoTinMoi ||

                        0

                    );


                const active =
                    current &&

                    Number(
                        current.userId
                    ) === userId &&

                    Number(
                        current.productId || 0
                    ) === productId;


                const name =
                    item.TenDoiPhuong ||
                    'Người dùng';


                const product =
                    item.TenSanPham ||
                    'Trao đổi sản phẩm';


                const lastMessage =
                    item.NoiDung ||
                    'Chưa có tin nhắn';


                const time =
                    shortTime(

                        item.NgayGui ||

                        item.ThoiGian ||

                        item.updatedAt

                    );


                return `

                    <div
                        class="
                            conversation-item
                            ${active ? 'active' : ''}
                            ${unread > 0 ? 'has-new' : ''}
                        "
                        data-user-id="${userId}"
                        data-product-id="${productId}"
                    >

                        <div class="conv-avatar">

                            ${getInitial(name)}

                        </div>


                        <div class="conv-content">

                            <div class="conv-top">

                                <div class="conv-name">

                                    ${esc(name)}

                                </div>


                                ${
                                    time
                                        ? `
                                            <div
                                                class="conv-time"
                                            >
                                                ${time}
                                            </div>
                                        `
                                        : ''
                                }

                            </div>


                            <div class="conv-product">

                                <i
                                    class="bi bi-box-seam"
                                ></i>

                                ${esc(product)}

                            </div>


                            <div
                                style="
                                    display:flex;
                                    align-items:center;
                                    gap:7px;
                                "
                            >

                                <div
                                    class="conv-message"
                                    style="flex:1"
                                >
                                    ${esc(lastMessage)}
                                </div>


                                ${
                                    unread > 0
                                        ? `
                                            <span
                                                class="chat-unread"
                                            >
                                                ${
                                                    unread > 99
                                                        ? '99+'
                                                        : unread
                                                }
                                            </span>
                                        `
                                        : ''
                                }

                            </div>

                        </div>

                    </div>

                `;

            }).join('');


        /* CLICK */

        list
            .querySelectorAll(
                '.conversation-item'
            )
            .forEach(item => {

                item.addEventListener(
                    'click',
                    () => {

                        const userId =
                            Number(
                                item.dataset.userId
                            );


                        const productId =
                            Number(
                                item.dataset.productId ||
                                0
                            );


                        const conversation =
                            conversationsCache.find(
                                x =>

                                    Number(
                                        x.MaDoiPhuong
                                    ) === userId &&

                                    Number(
                                        x.MaSanPham || 0
                                    ) === productId
                            );


                        openConversation(

                            userId,

                            productId,

                            conversation?.TenDoiPhuong ||
                                'Người dùng',

                            conversation?.TenSanPham ||
                                ''

                        );

                    }
                );

            });

    }


    /* =====================================================
       LOAD CONVERSATIONS
    ===================================================== */

    async function loadConversations() {

        try {

            const response =
                await fetch(
                    '/api/messages/conversations',
                    {

                        headers: {

                            Authorization:
                                `Bearer ${token}`

                        },

                        cache: 'no-store'

                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(

                    data.message ||

                    'Không tải được cuộc trò chuyện.'

                );

            }


            conversationsCache =
                Array.isArray(data)
                    ? data
                    : [];


            renderConversations();


        } catch (error) {

            console.error(
                'LOAD CONVERSATIONS:',
                error
            );


            $('conversationList')
                .innerHTML = `

                    <div
                        style="
                            padding:30px;
                            text-align:center;
                            color:#ef4444;
                        "
                    >

                        Không thể tải cuộc trò chuyện.

                        <br>

                        <small>
                            ${esc(error.message)}
                        </small>

                    </div>

                `;

        }

    }


    /* =====================================================
       CHAT HEADER
    ===================================================== */

    function renderChatHeader() {

        const head =
            $('chatHead');


        if (!current) {

            head.innerHTML = `

                <div class="chat-not-selected">

                    <div class="chat-header-icon">

                        <i
                            class="bi bi-chat-dots"
                        ></i>

                    </div>


                    <div>

                        <strong>
                            Chọn một cuộc trò chuyện
                        </strong>


                        <div class="realtime-status">

                            <span
                                id="realtimeDot"
                                class="
                                    realtime-dot
                                    offline
                                "
                            ></span>

                            <span id="realtimeText">
                                Đang kết nối...
                            </span>

                        </div>

                    </div>

                </div>


                <div class="chat-header-actions">

                    <button type="button">
                        <i class="bi bi-tag"></i>
                    </button>

                    <button type="button">
                        <i
                            class="
                                bi
                                bi-three-dots-vertical
                            "
                        ></i>
                    </button>

                </div>

            `;

            return;

        }


        head.innerHTML = `

            <div class="chat-user">

                <div class="chat-avatar">

                    ${getInitial(current.name)}

                </div>


                <div>

                    <div class="chat-user-name">

                        ${esc(current.name)}

                    </div>


                    <div class="chat-status">

                        <span
                            class="realtime-dot"
                        ></span>

                        Đang trao đổi trên
                        Chợ Đồ Cũ

                    </div>

                </div>

            </div>


            <div
                class="chat-header-actions"
            >

                ${
                    current.product
                        ? `

                            <a
                                href="
                                    /product-detail.html?id=${
                                        encodeURIComponent(
                                            current.productId
                                        )
                                    }
                                "
                                class="
                                    chat-product-link
                                "
                                title="Xem tin đăng"
                            >

                                <i
                                    class="
                                        bi
                                        bi-box-seam
                                    "
                                ></i>

                                <span>
                                    ${esc(
                                        current.product
                                    )}
                                </span>

                            </a>

                        `
                        : ''
                }


                <button type="button">

                    <i class="bi bi-tag"></i>

                </button>


                <button type="button">

                    <i
                        class="
                            bi
                            bi-three-dots-vertical
                        "
                    ></i>

                </button>

            </div>

        `;

    }


    /* =====================================================
       RENDER MESSAGE
    ===================================================== */

    function renderMessage(message) {

        const senderId =
            Number(
                message.MaNguoiGui
            );


        const isMe =
            senderId === Number(me);


        const senderName =
            isMe
                ? meName
                : (
                    message.TenNguoiGui ||
                    current?.name ||
                    'Người dùng'
                );


        const read =
            Number(
                message.DaDoc
            ) === 1;


        return `

            <div
                class="
                    message-row
                    ${isMe ? 'me' : 'them'}
                "
                data-message-id="${
                    Number(
                        message.MaTinNhan || 0
                    )
                }"
            >

                <div class="message-wrap">

                    <div class="message-name">

                        ${esc(senderName)}

                    </div>


                    <div
                        class="
                            msg
                            ${isMe ? 'me' : 'them'}
                        "
                    >

                        ${esc(
                            message.NoiDung
                        )}


                        <div class="msg-meta">

                            <span>

                                ${formatTime(
                                    message.NgayGui
                                )}

                            </span>


                            ${
                                isMe
                                    ? `
                                        <span
                                            class="
                                                msg-status
                                                ${read ? 'read' : ''}
                                            "
                                        >
                                            ${
                                                read
                                                    ? '✓✓ Đã xem'
                                                    : '✓ Đã gửi'
                                            }
                                        </span>
                                    `
                                    : ''
                            }

                        </div>

                    </div>

                </div>

            </div>

        `;

    }


    /* =====================================================
       CHECK CURRENT CHAT
    ===================================================== */

    function belongsToCurrentChat(
        message
    ) {

        if (!current) {
            return false;
        }


        const sender =
            Number(
                message.MaNguoiGui
            );


        const receiver =
            Number(
                message.MaNguoiNhan
            );


        const other =
            Number(
                current.userId
            );


        const myId =
            Number(me);


        const peopleMatch =

            (
                sender === myId &&
                receiver === other
            )

            ||

            (
                sender === other &&
                receiver === myId
            );


        if (!peopleMatch) {
            return false;
        }


        if (
            !current.productId
        ) {

            return true;

        }


        if (
            message.MaSanPham == null
        ) {

            return false;

        }


        return (

            Number(
                message.MaSanPham
            )

            ===

            Number(
                current.productId
            )

        );

    }


    /* =====================================================
       APPEND MESSAGE
    ===================================================== */

    function appendMessage(
        message,
        scroll = true
    ) {

        if (
            !belongsToCurrentChat(
                message
            )
        ) {

            return false;

        }


        const body =
            $('messagesBody');


        const id =
            Number(
                message.MaTinNhan || 0
            );


        if (
            id &&
            body.querySelector(
                `[data-message-id="${id}"]`
            )
        ) {

            return false;

        }


        body
            .querySelector(
                '.chat-empty'
            )
            ?.remove();


        body.insertAdjacentHTML(
            'beforeend',
            renderMessage(message)
        );


        if (scroll) {

            body.scrollTop =
                body.scrollHeight;

        }


        if (
            Number(
                message.MaNguoiGui
            ) !== Number(me)
        ) {

            markRead();

        }


        return true;

    }


    /* =====================================================
       OPEN CHAT
    ===================================================== */

    async function openConversation(
        userId,
        productId,
        name,
        product
    ) {

        current = {

            userId:
                Number(userId),

            productId:
                Number(productId || 0),

            name:
                name || 'Người dùng',

            product:
                product || ''

        };


        renderChatHeader();


        $('messageForm')
            .classList
            .remove('d-none');


        $('quickReplies')
            .classList
            .remove('d-none');


        await loadMessages();


        await markRead();


        await loadConversations();


        $('messageInput')
            ?.focus();

    }


    /* =====================================================
       LOAD MESSAGES
    ===================================================== */

    async function loadMessages() {

        if (!current) {
            return;
        }


        const body =
            $('messagesBody');


        body.innerHTML = `

            <div class="chat-loading">

                <span class="chat-spinner"></span>

                <span>
                    Đang tải tin nhắn...
                </span>

            </div>

        `;


        try {

            const params =
                new URLSearchParams();


            params.set(
                'userId',
                current.userId
            );


            if (
                current.productId
            ) {

                params.set(
                    'productId',
                    current.productId
                );

            }


            const response =
                await fetch(
                    `/api/messages?${params.toString()}`,
                    {

                        headers: {

                            Authorization:
                                `Bearer ${token}`

                        },

                        cache: 'no-store'

                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(

                    data.message ||

                    'Không tải được tin nhắn.'

                );

            }


            const messages =

                Array.isArray(data)

                    ? data

                    : (
                        Array.isArray(
                            data.messages
                        )
                            ? data.messages
                            : []
                    );


            if (!messages.length) {

                body.innerHTML = `

                    <div class="chat-empty">

                        <div
                            class="chat-empty-icon"
                        >

                            <i
                                class="
                                    bi
                                    bi-chat-square-text
                                "
                            ></i>

                        </div>


                        <h2>
                            Bắt đầu cuộc trò chuyện
                        </h2>


                        <p>
                            Hãy gửi tin nhắn đầu tiên
                            cho người mua hoặc người bán.
                        </p>

                    </div>

                `;

            } else {

                body.innerHTML =
                    messages
                        .map(renderMessage)
                        .join('');

            }


            body.scrollTop =
                body.scrollHeight;


        } catch (error) {

            console.error(
                'LOAD MESSAGES:',
                error
            );


            body.innerHTML = `

                <div class="chat-empty">

                    <div
                        class="chat-empty-icon"
                    >

                        <i
                            class="
                                bi
                                bi-exclamation-triangle
                            "
                        ></i>

                    </div>


                    <h2>
                        Không thể tải tin nhắn
                    </h2>


                    <p>
                        ${esc(error.message)}
                    </p>

                </div>

            `;

        }

    }


    /* =====================================================
       MARK READ
    ===================================================== */

    async function markRead() {

        if (!current) {
            return;
        }


        try {

            await fetch(
                '/api/messages/read',
                {

                    method: 'PATCH',

                    headers: {

                        'Content-Type':
                            'application/json',

                        Authorization:
                            `Bearer ${token}`

                    },

                    body:
                        JSON.stringify({

                            userId:
                                Number(
                                    current.userId
                                ),

                            productId:
                                current.productId
                                    ? Number(
                                        current.productId
                                    )
                                    : null

                        })

                }
            );

        } catch (error) {

            console.warn(
                'MARK READ:',
                error
            );

        }

    }


    /* =====================================================
       SEND
    ===================================================== */

    async function sendMessage() {

        if (!current) {
            return;
        }


        const input =
            $('messageInput');


        const button =
            $('sendButton');


        const text =
            input.value.trim();


        if (!text) {
            return;
        }


        input.disabled = true;

        button.disabled = true;


        try {

            const response =
                await fetch(
                    '/api/messages',
                    {

                        method: 'POST',

                        headers: {

                            'Content-Type':
                                'application/json',

                            Authorization:
                                `Bearer ${token}`

                        },

                        body:
                            JSON.stringify({

                                userId:
                                    Number(
                                        current.userId
                                    ),

                                productId:
                                    current.productId
                                        ? Number(
                                            current.productId
                                        )
                                        : null,

                                noiDung:
                                    text

                            })

                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(

                    data.message ||

                    data.error ||

                    'Không gửi được tin nhắn.'

                );

            }


            input.value = '';

            input.style.height =
                '42px';


            if (
                data &&
                typeof data === 'object' &&
                (
                    data.MaTinNhan ||
                    data.NoiDung
                )
            ) {

                appendMessage(
                    data,
                    true
                );

            } else {

                await loadMessages();

            }


            await loadConversations();


        } catch (error) {

            console.error(
                'SEND MESSAGE:',
                error
            );


            alert(
                error.message ||
                'Không gửi được tin nhắn.'
            );


        } finally {

            input.disabled = false;

            button.disabled = false;

            input.focus();

        }

    }


    /* =====================================================
       REALTIME SSE
    ===================================================== */

    function processSSEEvent(
        rawEvent
    ) {

        if (!rawEvent) {
            return;
        }


        const lines =
            rawEvent.split(
                /\r?\n/
            );


        let eventName =
            'message';


        const dataLines = [];


        for (
            const line of lines
        ) {

            if (
                line.startsWith(
                    'event:'
                )
            ) {

                eventName =
                    line
                        .substring(6)
                        .trim();

            }


            if (
                line.startsWith(
                    'data:'
                )
            ) {

                dataLines.push(
                    line
                        .substring(5)
                        .trim()
                );

            }

        }


        if (!dataLines.length) {
            return;
        }


        const dataText =
            dataLines.join('\n');


        if (
            eventName === 'ping'
        ) {

            return;

        }


        if (
            eventName === 'connected'
        ) {

            setRealtimeStatus(
                true,
                'Đang hoạt động realtime'
            );

            return;

        }


        if (

            eventName === 'message' ||

            eventName === 'new_message' ||

            eventName === 'newMessage'

        ) {

            try {

                const message =
                    JSON.parse(
                        dataText
                    );


                const displayed =
                    appendMessage(
                        message,
                        true
                    );


                loadConversations();


                if (
                    !displayed &&
                    Number(
                        message.MaNguoiGui
                    ) !== Number(me)
                ) {

                    document.title =
                        'Tin nhắn mới - Chợ Đồ Cũ';

                }


            } catch (error) {

                console.error(
                    'SSE MESSAGE:',
                    error
                );

            }

            return;

        }


        if (

            eventName === 'read' ||

            eventName === 'message_read'

        ) {

            document
                .querySelectorAll(
                    '.message-row.me .msg-status'
                )
                .forEach(status => {

                    status.textContent =
                        '✓✓ Đã xem';

                    status.classList.add(
                        'read'
                    );

                });

        }

    }


    async function connectRealtime() {

        if (!token) {
            return;
        }


        if (realtimeController) {

            realtimeController.abort();

        }


        realtimeController =
            new AbortController();


        try {

            setRealtimeStatus(
                false,
                'Đang kết nối...'
            );


            const response =
                await fetch(
                    '/api/messages/stream',
                    {

                        method: 'GET',

                        headers: {

                            Authorization:
                                `Bearer ${token}`,

                            Accept:
                                'text/event-stream',

                            'Cache-Control':
                                'no-cache'

                        },

                        cache: 'no-store',

                        signal:
                            realtimeController.signal

                    }
                );


            if (!response.ok) {

                throw new Error(
                    `Realtime HTTP ${response.status}`
                );

            }


            if (!response.body) {

                throw new Error(
                    'Trình duyệt không hỗ trợ realtime.'
                );

            }


            setRealtimeStatus(
                true,
                'Đang hoạt động realtime'
            );


            reconnecting = false;


            const reader =
                response.body.getReader();


            const decoder =
                new TextDecoder(
                    'utf-8'
                );


            let buffer = '';


            while (true) {

                const {
                    value,
                    done
                } =
                    await reader.read();


                if (done) {

                    throw new Error(
                        'Realtime stream đã đóng.'
                    );

                }


                buffer +=
                    decoder.decode(
                        value,
                        {
                            stream: true
                        }
                    );


                const events =
                    buffer.split(
                        /\r?\n\r?\n/
                    );


                buffer =
                    events.pop() || '';


                for (
                    const event of events
                ) {

                    processSSEEvent(
                        event
                    );

                }

            }


        } catch (error) {

            if (
                error.name ===
                'AbortError'
            ) {

                return;

            }


            console.warn(
                'REALTIME DISCONNECTED:',
                error
            );


            setRealtimeStatus(
                false,
                'Mất kết nối - đang kết nối lại...'
            );


            scheduleReconnect();

        }

    }


    /* =====================================================
       RECONNECT
    ===================================================== */

    function scheduleReconnect() {

        if (reconnecting) {
            return;
        }


        reconnecting = true;


        clearTimeout(
            reconnectTimer
        );


        reconnectTimer =
            setTimeout(
                () => {

                    reconnecting =
                        false;

                    connectRealtime();

                },
                1500
            );

    }


    /* =====================================================
       UI
    ===================================================== */

    function setupUI() {

        const form =
            $('messageForm');


        const input =
            $('messageInput');


        /* SEND */

        form.addEventListener(
            'submit',
            event => {

                event.preventDefault();

                sendMessage();

            }
        );


        /* ENTER */

        input.addEventListener(
            'keydown',
            event => {

                if (
                    event.key === 'Enter' &&
                    !event.shiftKey
                ) {

                    event.preventDefault();

                    sendMessage();

                }

            }
        );


        /* AUTO HEIGHT */

        input.addEventListener(
            'input',
            () => {

                input.style.height =
                    '42px';


                input.style.height =
                    Math.min(
                        input.scrollHeight,
                        120
                    ) + 'px';

            }
        );


        /* SEARCH */

        $('conversationSearch')
            .addEventListener(
                'input',
                renderConversations
            );


        /* FILTER */

        document
            .querySelectorAll(
                '.conversation-tab'
            )
            .forEach(tab => {

                tab.addEventListener(
                    'click',
                    () => {

                        document
                            .querySelectorAll(
                                '.conversation-tab'
                            )
                            .forEach(
                                item =>
                                    item.classList
                                        .remove(
                                            'active'
                                        )
                            );


                        tab.classList.add(
                            'active'
                        );


                        activeFilter =
                            tab.dataset.filter ||
                            'all';


                        renderConversations();

                    }
                );

            });


        /* QUICK REPLY */

        document
            .querySelectorAll(
                '#quickReplies button'
            )
            .forEach(button => {

                button.addEventListener(
                    'click',
                    () => {

                        input.value =
                            button.dataset.message ||
                            '';

                        input.focus();

                        input.dispatchEvent(
                            new Event(
                                'input'
                            )
                        );

                    }
                );

            });

    }


    /* =====================================================
       TAB VISIBILITY
    ===================================================== */

    document.addEventListener(
        'visibilitychange',
        () => {

            if (!document.hidden) {

                document.title =
                    'Tin nhắn - Chợ Đồ Cũ';


                if (current) {

                    loadMessages();

                    markRead();

                }


                loadConversations();

            }

        }
    );


    /* =====================================================
       INIT
    ===================================================== */

    async function init() {

        if (!token) {

            location.href =
                '/auth.html?mode=login';

            return;

        }


        try {

            await loadCurrentUser();

            setupUI();

            await loadConversations();

            connectRealtime();


        } catch (error) {

            console.error(
                'INIT ERROR:',
                error
            );

        }

    }


    /* GLOBAL */

    window.openConversation =
        openConversation;

    window.sendMessage =
        sendMessage;

    window.loadMessages =
        loadMessages;


    /* START */

    init();

})();