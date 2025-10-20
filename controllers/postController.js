const Post = require('../models/Post');
const Room = require('../models/Room');
const User = require('../models/Users');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Lấy danh sách tất cả phòng trọ với thông tin chi tiết
exports.getAllRooms = async (req, res) => {
    try {
        const rooms = await Room.find()
            .populate('post', 'title overviewDescription status createdAt postType')
            .populate('user', 'username email phone')
            .sort({ createdAt: -1 });

        // Filter out rooms without posts or with rejected posts
        const validRooms = rooms.filter(room => room.post && room.post.status !== 'rejected');
        
        console.log(`Found ${rooms.length} total rooms, ${validRooms.length} valid rooms`);

        // Format data để phù hợp với frontend
        const formattedRooms = validRooms.map(room => ({
            id: room._id.toString(),
            postId: room.post?._id?.toString() || null,
            title: room.post?.title || 'Không có tiêu đề',
            postType: room.post?.postType || 'room_rental',
            price: room.price,
            unit: room.unit,
            area: room.area,
            roomType: room.roomType,
            address: room.address,
            city: room.province,
            district: room.district,
            ward: room.ward,
            image: room.images && room.images.length > 0 ? room.images[0] : '/logo512.png',
            images: room.images || [],
            videos: room.videos || [],
            utilities: room.utilities || [],
            additionalCosts: room.additionalCosts || [],
            notes: room.notes || '',
            author: room.user?.username || 'Người đăng',
            phone: room.user?.phone || '',
            email: room.user?.email || '',
            description: room.post?.overviewDescription || '',
            status: room.post?.status || 'pending',
            postedAt: room.post?.createdAt || room.createdAt,
            location: {
                lat: 10.77653, // Default coordinates for HCM
                lng: 106.70098,
                address: `${room.address}, ${room.district}, ${room.province}`
            }
        }));

        res.json({
            success: true,
            rooms: formattedRooms,
            total: formattedRooms.length
        });
    } catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách phòng trọ',
            error: error.message
        });
    }
};

// Lấy chi tiết một phòng trọ theo ID
exports.getRoomById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const room = await Room.findById(id)
            .populate('post', 'title overviewDescription status createdAt')
            .populate('user', 'username email phone');

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phòng trọ'
            });
        }

        // Format data để phù hợp với frontend
        const formattedRoom = {
            id: room._id.toString(),
            postId: room.post?._id?.toString() || null,
            title: room.post?.title || 'Không có tiêu đề',
            price: room.price,
            unit: room.unit,
            area: room.area,
            roomType: room.roomType,
            address: room.address,
            city: room.province,
            district: room.district,
            ward: room.ward,
            image: room.images && room.images.length > 0 ? room.images[0] : '/logo512.png',
            images: room.images || [],
            videos: room.videos || [],
            utilities: room.utilities || [],
            additionalCosts: room.additionalCosts || [],
            notes: room.notes || '',
            author: room.user?.username || 'Người đăng',
            phone: room.user?.phone || '',
            email: room.user?.email || '',
            description: room.post?.overviewDescription || '',
            status: room.post?.status || 'pending',
            postedAt: room.post?.createdAt || room.createdAt,
            location: {
                lat: 10.77653, // Default coordinates for HCM
                lng: 106.70098,
                address: `${room.address}, ${room.district}, ${room.province}`
            }
        };

        res.json({
            success: true,
            room: formattedRoom
        });
    } catch (error) {
        console.error('Error fetching room by ID:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy chi tiết phòng trọ',
            error: error.message
        });
    }
};

exports.createPost = async (req, res) => {
    try {
        const reqStart = process.hrtime.bigint();
        const timings = { media: [], contract: [] };
    // logging tối thiểu: chỉ log lỗi ở dưới
        // frontend may send the payload in multiple shapes:
        // 1) { data: JSON.stringify({ form: { ... } }) }  (legacy from some clients)
        // 2) { form: { ... } }                         (direct shape)
        // 3) { ...formFields }                         (direct top-level fields)
        // Be permissive: try to extract a `form` object from these shapes.
        let form = {};
        try {
            if (req.body && typeof req.body === 'object' && req.body.form && typeof req.body.form === 'object') {
                // shape (2)
                form = req.body.form;
            } else if (req.body && typeof req.body === 'object' && typeof req.body.data === 'string') {
                // shape (1) - parse the string
                const parsed = JSON.parse(req.body.data || '{}');
                // parsed might be { form: { ... } } or might be the form itself
                form = (parsed && typeof parsed === 'object') ? (parsed.form || parsed) : {};
            } else if (req.body && typeof req.body === 'object') {
                // shape (3) - assume top-level fields are the form
                form = req.body;
            } else {
                form = {};
            }
        } catch (parseErr) {
            console.error('Failed to parse incoming form payload:', parseErr);
            form = {};
        }

        if (!form || Object.keys(form).length === 0) {
            console.log('Parsed form is empty or missing. Raw req.body:', req.body);
            return res.status(400).json({ success: false, message: 'Missing form data' });
        }

        // DEBUG: log the parsed form for troubleshooting (will appear in server console)
        console.log('Parsed form for createPost:', Object.keys(form).length ? {
            title: form.title,
            overviewDescription: form.overviewDescription,
            category: form.category,
            priceFrom: form.priceFrom,
            area: form.area,
            location: form.location || form.mapLocation || form.fullAddress || null
        } : form);

        // kiểm tra các trường bắt buộc (thay đổi theo yêu cầu của bạn)

        // yêu cầu tên địa phương dễ đọc (không phải mã) hoặc một chuỗi địa chỉ đầy đủ
        const required = ['title', 'overviewDescription', 'category', 'priceFrom', 'area', 'province', 'district', 'address'];
        const missing = required.filter(k => {
            const top = form[k];
            const loc = form.location || {};
            if (k === 'province') {
                return !(top || loc.provinceName || loc.province);
            }
            if (k === 'district') {
                return !(top || loc.districtName || loc.district);
            }
            if (k === 'address') {
                return !(top || form.mapLocation || form.fullAddress || loc.detailAddress || loc.address);
            }
            return !(top || loc[k]);
        });
        if (missing.length) {
            // dọn các file tạm nếu có (hỗ trợ req.files là array hoặc object khi dùng upload.fields)
            try {
                if (req.files) {
                    const fs = require('fs');
                    if (Array.isArray(req.files)) {
                        req.files.forEach(f => { try { fs.unlinkSync(f.path); } catch (e) { } });
                    } else {
                        // req.files is an object: { media: [...], contract: [...] }
                        Object.values(req.files).forEach(arr => { if (Array.isArray(arr)) arr.forEach(f => { try { fs.unlinkSync(f.path); } catch (e) { } }); });
                    }
                }
            } catch (cleanupErr) { /* ignore cleanup errors */ }
            return res.status(400).json({ success: false, message: `Missing fields: ${missing.join(', ')}` });
        }

        // when multer.fields used, req.files is object { media: [...], contract: [...] }
        const mediaFiles = (req.files && req.files.media) ? req.files.media : [];
        const contractFiles = (req.files && req.files.contract) ? req.files.contract : [];

        // Enforce single contract: frontend MUST send URL lists only
        // - form.images: array of image URL strings
        // - form.videos: array of video URL strings
        // - form.contractImages: array of contract image URL strings
        // Reject any file bodies (req.files) or legacy mediaUploaded/contractUploaded shapes.
        if ((req.files && (Array.isArray(req.files) ? req.files.length > 0 : Object.values(req.files).some(a => Array.isArray(a) && a.length > 0)))) {
            return res.status(400).json({ success: false, message: 'Server no longer accepts file bodies. Upload files to Cloudinary from the frontend and send URL lists in form.images / form.videos / form.contractImages.' });
        }

        if (Array.isArray(form.mediaUploaded) || Array.isArray(form.contractUploaded)) {
            return res.status(400).json({ success: false, message: 'Legacy metadata shapes (mediaUploaded/contractUploaded) are deprecated. Send arrays of URL strings: form.images, form.videos, form.contractImages.' });
        }

        const imageUrls = Array.isArray(form.images) ? form.images : [];
        const videoUrls = Array.isArray(form.videos) ? form.videos : [];
        const contractUrls = Array.isArray(form.contractImages) ? form.contractImages : [];

        // Validate that arrays contain strings
        const notString = (arr) => arr.some(i => typeof i !== 'string');
        if (notString(imageUrls)) return res.status(400).json({ success: false, message: 'form.images must be an array of URL strings' });
        if (notString(videoUrls)) return res.status(400).json({ success: false, message: 'form.videos must be an array of URL strings' });
        if (notString(contractUrls)) return res.status(400).json({ success: false, message: 'form.contractImages must be an array of URL strings' });

        // We no longer verify Cloudinary resources server-side. Trust the client-provided URL lists.
        const mediaUploaded = [
            ...imageUrls.map(u => ({ url: u, type: 'image' })),
            ...videoUrls.map(u => ({ url: u, type: 'video' }))
        ];
        const contractUploaded = contractUrls.map(u => ({ url: u, type: 'image' }));

    // contractUploaded available for Room creation

        // tạo Post tối giản trước (title, postType, user)
        // If this is an invite-roommate post, ensure only one exists per user
        const requestedPostType = (form.postType || '').toString().trim() || (form.type || '').toString().trim() || '';
        const isInvite = requestedPostType.toLowerCase() === 'invite roomate' || !!form.roommatePreferences;

        // enforce uniqueness: user can only have one active invite-roommate post
        if (isInvite) {
            const existing = await Post.findOne({ user: req.user?.id || form.user, postType: 'invite roomate' });
            if (existing) {
                return res.status(409).json({ success: false, message: 'Người dùng đã có bài đăng tìm bạn cùng phòng' });
            }
        }

        const post = new Post({
            title: form.title || form.name || '',
            postType: isInvite ? 'invite roomate' : (form.postType || 'room_rental'),
            postTier: (form.postTier && ['svip','vip','normal'].includes(String(form.postTier)) ? String(form.postTier) : 'normal'),
            user: req.user?.id || form.user,
            overviewDescription: form.overviewDescription || form.description || ''
        });

        // If invite type, upsert the user's UserInfo document (create if missing, update if exists)
        if (isInvite) {
            try {
                const UserInfos = require('../models/UserInfo');
                const uid = req.user?.id || form.user;
                const prefs = form.roommatePreferences || {};
                const update = {
                    $set: {
                        // Do not overwrite personal fields here; only set preferences and keep existing personal info
                        interests: Array.isArray(prefs.interests) ? prefs.interests : (prefs.interests ? [prefs.interests] : []),
                        habits: Array.isArray(prefs.habits) ? prefs.habits : (prefs.habits ? [prefs.habits] : []),
                        dislikes: Array.isArray(prefs.dislikes) ? prefs.dislikes : (prefs.dislikes ? [prefs.dislikes] : [])
                    },
                    $setOnInsert: {
                        userId: uid,
                        fullName: null,
                        age: null,
                        gender: null,
                        profession: null
                    }
                };
                const ui = await UserInfos.findOneAndUpdate({ userId: uid }, update, { new: true, upsert: true });
                if (ui) post.userInfo = ui._id;
            } catch (uiErr) {
                console.warn('Failed to upsert userInfo for invite post:', uiErr);
            }
        }

        await post.save();

    // post created

        // Chuẩn hóa một số trường trước khi tạo Room để tránh lỗi validate (ví dụ incoming _id không hợp lệ)
        const sanitizedAdditionalCosts = (Array.isArray(form.additionalCosts) ? form.additionalCosts : []).map(item => {
            // copy và loại bỏ các trường id/_id do client có thể gửi các giá trị không phù hợp với ObjectId
            const copy = Object.assign({}, item);
            if (copy._id) delete copy._id;
            if (copy.id) delete copy.id;
            return copy;
        });

        // tạo Room (chi tiết phòng theo Room schema)
        let room;
        try {
            room = await Room.create({
            // lưu tên dạng có thể đọc được (ưu tiên tên, không phải mã)
            province:   form.location?.province || form.location?.city || '',
            district:   form.location?.district || '',
            ward: form.location?.wardName || form.location?.ward || '',
            address: form.location?.detailAddress || '',
            roomType: form.roomType || form.category || '',
            price: Number(form.price || form.priceFrom) || 0,
            unit: form.unit || 'VND',
            area: Number(form.area) || 0,
            utilities: Array.isArray(form.utilities) ? form.utilities : (form.utilities ? [form.utilities] : []),
            additionalCosts: sanitizedAdditionalCosts,
            images: mediaUploaded.filter(f => f.type === 'image').map(f => f.url),
            videos: mediaUploaded.filter(f => f.type === 'video').map(f => f.url),
            contractImages: contractUploaded.map(f => f.url),
            notes: form.notes || '',
            post: post._id,
            user: req.user?.id || form.user
        });
        } catch (roomErr) {
            console.error('Failed to create Room, rolling back Post:', roomErr);
            // nếu tạo Room thất bại, xóa Post đã tạo trước đó để giữ nhất quán
            try { await Post.findByIdAndDelete(post._id); } catch (delErr) { console.error('Failed to delete post during rollback:', delErr); }
            throw roomErr; // propagate error to outer catch which will cleanup files
        }

        // liên kết room vào post và lưu
        try {
            post.room = room._id;
            await post.save();
        } catch (postSaveErr) {
            console.error('Failed to save Post after Room created, rolling back Room and Post:', postSaveErr);
            // delete the room and the post to maintain atomicity
            try { 
                await Room.findByIdAndDelete(room._id); 

            } catch (delRoomErr) { console.error('Failed to delete room during rollback:', delRoomErr); }
            try { await Post.findByIdAndDelete(post._id); } catch (delPostErr) { console.error('Failed to delete post during rollback:', delPostErr); }
            throw postSaveErr;
        }

    // room created
        const reqEnd = process.hrtime.bigint();
        const totalMs = Number(reqEnd - reqStart) / 1e6;
    // Tính toán tổng thời gian xử lý
        const uploadTotalMs = (timings.media.reduce((s, x) => s + (x.uploadMs || 0), 0) + timings.contract.reduce((s, x) => s + (x.uploadMs || 0), 0));
        timings.uploadTotalMs = uploadTotalMs;
        timings.totalMs = totalMs;
    // timings collected in response

        return res.status(201).json({ success: true, post, timings });
    } catch (err) {
        console.error('createPost error', err);
        // dọn file tạm khi có lỗi (hỗ trợ req.files là array hoặc object)
        try {
            if (req.files) {
                const fs = require('fs');
                if (Array.isArray(req.files)) {
                    req.files.forEach(f => { try { fs.unlinkSync(f.path); } catch (e) { } });
                } else {
                    Object.values(req.files).forEach(arr => { if (Array.isArray(arr)) arr.forEach(f => { try { fs.unlinkSync(f.path); } catch (e) { } }); });
                }
            }
        } catch (cleanupErr) { /* ignore cleanup errors */ }

        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// listMyPosts: list posts created by the authenticated user (protected)
// - Purpose: provide a simple, authenticated endpoint for the *current* user to
//   retrieve all their posts. This is convenient for user dashboards and avoids
//   the need for clients to pass the user's id.
// - Response shape: { success: true, posts: [...] }
exports.listMyPosts = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        // Find posts owned by the authenticated user and include the room document
        const posts = await Post.find({ user: userId }).populate('room').sort({ createdAt: -1 });
        return res.json({ success: true, posts });
    } catch (err) {
        console.error('listMyPosts error', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// list posts by a specific user (public)
exports.listByUser = async (req, res) => {
    try {
        const userId = req.params.userId;
        if (!userId) return res.status(400).json({ success: false, message: 'Missing userId' });

        const { page = 1, limit = 20 } = req.query;
        const q = { user: userId };

        const p = Math.max(1, Number(page) || 1);
        const lim = Math.min(100, Math.max(1, Number(limit) || 20));
        const skip = (p - 1) * lim;

        const [total, posts] = await Promise.all([
            Post.countDocuments(q),
            Post.find(q).populate('room').sort({ createdAt: -1 }).skip(skip).limit(lim)
        ]);

        return res.json({ success: true, posts, total, page: p, limit: lim });
    } catch (err) {
        console.error('listByUser error', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// getPostById: return a single post with populated room and user
exports.getPostById = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id) return res.status(400).json({ success: false, message: 'Missing post id' });

    // Populate userInfo so invite posts can expose roommate preferences
    const post = await Post.findById(id).populate('room').populate('user').populate('userInfo');
        if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

        return res.json({ success: true, post });
    } catch (err) {
        console.error('getPostById error', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// getPostByRoom: find the post that references the given room id
exports.getPostByRoom = async (req, res) => {
    try {
        const roomId = req.params.roomId;
        if (!roomId) return res.status(400).json({ success: false, message: 'Missing room id' });

    // populate userInfo as well
    const post = await Post.findOne({ room: roomId }).populate('room').populate('user').populate('userInfo');
        if (!post) return res.status(404).json({ success: false, message: 'Post not found for room' });

        return res.json({ success: true, post });
    } catch (err) {
        console.error('getPostByRoom error', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// updatePost: update post metadata and associated room (only owner or admin)
exports.updatePost = async (req, res) => {
    try {
        const postId = req.params.id;
        if (!postId) return res.status(400).json({ success: false, message: 'Missing post id' });

        const post = await Post.findById(postId).populate('room');
        if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

        const requesterId = req.user?.id;
        const requesterRole = req.user?.role;
        if (!requesterId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        // Only the owner or admin may update
        if (String(post.user) !== String(requesterId) && requesterRole !== 'admin') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

    const { title, overviewDescription, postType, room: roomFields, postTier } = req.body || {};

        // Update post fields
        if (typeof title === 'string') post.title = title;
        if (typeof overviewDescription === 'string') post.overviewDescription = overviewDescription;
        if (typeof postType === 'string') post.postType = postType;
    if (typeof postTier === 'string' && ['svip','vip','normal'].includes(postTier)) post.postTier = postTier;

        // Update room if provided
        if (post.room && roomFields && typeof roomFields === 'object') {
            const RoomModel = require('../models/Room');
            try {
                await RoomModel.findByIdAndUpdate(post.room._id || post.room, roomFields, { new: true });
            } catch (e) {
                console.error('Failed to update room fields:', e);
            }
        }

        await post.save();
        const updated = await Post.findById(postId).populate('room').populate('user');
        return res.json({ success: true, post: updated });
    } catch (err) {
        console.error('updatePost error', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};
