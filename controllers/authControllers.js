const User = require('../models/Users');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const PendingUser = require('../models/PendingUser');
const { sendMail } = require('../utils/mailer');
const PendingUserPasswordReset = require('../models/PendingUserPasswordReset');

// ===== Helpers cho flow đăng ký xác minh =====
function generateCode(len = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// Hàm gửi email xác minh
async function sendVerificationCode(email, code) {
  try {
    const APP_NAME = process.env.APP_NAME || 'TroChung';
    const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'no-reply@example.com';
    const VERIFY_EXPIRE_MIN = 10;  // Số phút mà mã xác minh có hiệu lực

    // Nội dung email HTML
    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #eee;border-radius:10px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <img src="${process.env.BRAND_LOGO_URL || ''}" alt="${APP_NAME}" style="height:32px"/>
          <h2 style="margin:0;font-size:18px;color:#111">${APP_NAME}</h2>
        </div>
        <h1 style="font-size:22px;margin:16px 0 8px;color:#111">Mã xác minh của bạn</h1>
        <p style="margin:0 0 12px;color:#444">Nhập mã dưới đây để hoàn tất đăng ký. Mã có hiệu lực trong ${VERIFY_EXPIRE_MIN} phút.</p>

        <div style="margin:18px 0;padding:14px 18px;border-radius:12px;background:#f4f6ff;border:1px dashed #7f9cff;display:inline-block">
          <div style="font-size:28px;letter-spacing:8px;font-weight:700;color:#1a3cff">${code}</div>
        </div>

        <p style="margin:12px 0;color:#666">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email hoặc liên hệ hỗ trợ: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
        <p style="font-size:12px;color:#999;margin:0">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
      </div>`;

    const text = `Mã xác minh của bạn: ${code} (hiệu lực ${VERIFY_EXPIRE_MIN} phút).`;

    // Gửi email
    const response = await sendMail({ to: email, subject: `[${APP_NAME}] Mã xác minh đăng ký`, html, text });

    // Kiểm tra kết quả gửi mail
    if (!response || response.accepted.length === 0) {
      throw new Error('Không thể gửi email. Kiểm tra lại cấu hình gửi mail.');
    }
  } catch (err) {
    console.error('Lỗi gửi email:', err.message || err);
    throw err; // Ném lại lỗi cho phần gọi phía trên để thông báo cho người dùng
  }
}

// ============================================================
// ✅ Gộp toàn bộ các hàm vào 1 object duy nhất
// ============================================================

const authControllers = {
  // ====== Đăng ký tài khoản ======
  register: async (req, res) => {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json('All fields are required');
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = new User({
        username: username,
        email: email,
        password: hashedPassword,
      });

      const savedUser = await newUser.save();

      const { password: userPassword, ...userWithoutPassword } = savedUser._doc;
      res.status(201).json({
        message: 'User registered successfully',
        user: userWithoutPassword,
      });
    } catch (error) {
      console.error('Register error:', error);
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(400).json(`${field} already exists`);
      }
      res.status(500).json('Error registering user');
    }
  },

  generateAccessToken: (user) => {
    return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30s' });
  },

  generateRefreshToken: (user) => {
    return jwt.sign({ id: user._id, role: user.role }, process.env.REFRESH_JWT_SECRET, { expiresIn: '30d' });
  },

  // ====== Đăng nhập ======
  login: async (req, res) => {
    try {
      const user = await User.findOne({ username: req.body.username });
      if (!user) return res.status(404).send('username not found');

      const isMatch = await bcrypt.compare(req.body.password, user.password);
      if (!isMatch) return res.status(400).send('wrong password');

      if (user && isMatch) {
        console.log('=== LOGIN SUCCESS ===');
        console.log('User:', user.username);

        const accessToken = authControllers.generateAccessToken(user);
        const refreshToken = authControllers.generateRefreshToken(user);

        // Hash the refresh token before saving to DB
        try {
          const salt = await bcrypt.genSalt(10);
          const hashedRetoken = await bcrypt.hash(refreshToken, salt);
          // save hashed refresh token to user document
          user.retoken = hashedRetoken;
          await user.save();
        } catch (hashErr) {
          console.error('Error hashing/saving refresh token:', hashErr);
        }

        // Set cookie with refresh token (httpOnly)
        console.log('Setting refreshToken cookie... (login)');
        const cookieOpts = {
          httpOnly: true,
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000,
        };
        console.log('Cookie options:', cookieOpts);
        res.cookie('refreshToken', refreshToken, cookieOpts);
        console.log('Cookie set successfully (login)');

        const { password, ...userAuth } = user._doc;
        res.status(200).json({ user: userAuth, accessToken });
      }
    } catch (error) {
      console.error('Login error stack:', error);
      res.status(500).send('Error logging in');
    }
  },

  // ====== Đăng xuất ======
  logout: (req, res) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      // If cookie present, try to find the user and clear stored retoken
      if (refreshToken) {
        // decode to get user id
        try {
          const payload = jwt.verify(refreshToken, process.env.REFRESH_JWT_SECRET);
          User.findByIdAndUpdate(payload.id, { $set: { retoken: null } }).catch((e) => console.error('Error clearing retoken:', e));
        } catch (e) {
          // invalid token — nothing to clear by id
        }
      }
      res.clearCookie('refreshToken');
      return res.status(200).json({ success: true, message: 'User logged out' });
    } catch (err) {
      console.error('Error during logout:', err);
      res.clearCookie('refreshToken');
      return res.status(500).json({ success: false, error: 'Logout failed' });
    }
  },

  // ====== Làm mới token ======
  refreshToken: (req, res) => {
    console.log('=== REFRESH TOKEN REQUEST ===');
    console.log('Origin header:', req.headers.origin || 'N/A');
    console.log('Cookies received:', req.cookies);
    console.log('RefreshToken from cookie:', req.cookies.refreshToken ? 'EXISTS' : 'NOT FOUND');

    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      console.warn('No refresh token found on incoming request');
      return res.status(401).json('No refresh token provided');
    }

    jwt.verify(refreshToken, process.env.REFRESH_JWT_SECRET, async (err, payload) => {
      if (err) {
        console.warn('JWT verify error for refresh token:', err && err.message ? err.message : err);
        return res.status(403).json('Invalid refresh token');
      }

      try {
        // find user and compare hashed retoken
        const userDoc = await User.findById(payload.id);
        if (!userDoc) {
          console.warn('User not found for refresh token id:', payload.id);
          return res.status(404).json('User not found');
        }

        if (!userDoc.retoken) {
          console.warn('User has no stored retoken (revoked) for user:', userDoc._id.toString());
          return res.status(403).json('Refresh token revoked');
        }

        const matches = await bcrypt.compare(refreshToken, userDoc.retoken);
        console.log('Refresh token bcrypt.compare result:', !!matches);
        if (!matches) {
          console.warn('Refresh token mismatch for user:', userDoc._id.toString());
          return res.status(403).json('Refresh token mismatch');
        }

        // valid: issue new access token and rotate refresh token
        const newAccessToken = authControllers.generateAccessToken({ _id: userDoc._id, role: userDoc.role });
        const newRefreshToken = authControllers.generateRefreshToken({ _id: userDoc._id, role: userDoc.role });

        // hash and store new refresh token
        try {
          const salt2 = await bcrypt.genSalt(10);
          const newHashed = await bcrypt.hash(newRefreshToken, salt2);
          userDoc.retoken = newHashed;
          await userDoc.save();
        } catch (hashErr) {
          console.error('Error hashing new refresh token:', hashErr);
        }

        const cookieOpts = {
          httpOnly: true,
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000,
        };
        console.log('Setting rotated refreshToken cookie with options:', cookieOpts);
        res.cookie('refreshToken', newRefreshToken, cookieOpts);

        return res.status(200).json({ accessToken: newAccessToken });
      } catch (e) {
        console.error('Error in refresh token handler:', e);
        return res.status(500).json('Server error');
      }
    });
  },

  // ====== Đăng ký + xác minh email ======
  startRegistration: async (req, res) => {
    try {
      const { firstName, lastName, phone, email, password } = req.body || {};
      console.log('=== START REGISTRATION ===');
      console.log('Incoming registration payload:', { firstName, lastName, phone, email, password });

      // Kiểm tra các trường dữ liệu
      const missing = [];
      if (!firstName) missing.push('firstName');
      if (!lastName) missing.push('lastName');
      if (!phone) missing.push('phone');
      if (!email) missing.push('email');
      if (!password) missing.push('password');
      if (missing.length > 0) {
        console.warn('Registration failed - missing fields:', missing);
        return res.status(400).json({ success: false, error: 'Thiếu thông tin.', missing });
      }

      // Kiểm tra nếu email đã tồn tại trong PendingUser
      const pendingUserExists = await PendingUser.findOne({ email });
      if (pendingUserExists) {
        return res.status(409).json({ success: false, error: 'Email đã tồn tại trong danh sách chờ xác minh.' });
      }

      // Kiểm tra email trong Users (tránh trùng lặp với người dùng đã xác minh)
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(409).json({ success: false, error: 'Email đã tồn tại trong hệ thống.' });
      }

      const code = generateCode(8);  // Tạo mã xác minh
      const hashed = await bcrypt.hash(password, 10);  // Mã hóa mật khẩu
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);  // Mã hết hạn sau 10 phút

      // Lưu thông tin vào PendingUser
      const pendingUser = new PendingUser({
        firstName, lastName, phone, email, password: hashed, verificationCode: code, expiresAt
      });
      await pendingUser.save();

      // Gửi email xác minh (không chặn response) - chạy bất đồng bộ
      sendVerificationCode(email, code)
        .then(() => console.log('Verification email sent (async)'))
        .catch((mailErr) => console.error('sendVerificationCode failed (async):', mailErr));

      return res.json({ success: true, message: 'Đã gửi mã xác minh tới email.' });
    } catch (err) {
      console.error('Error during registration:', err);
      return res.status(500).json({ success: false, error: 'Lỗi máy chủ.' });
    }
  },

  verifyRegistration: async (req, res) => {
    try {
      const { email, code } = req.body || {};
      if (!email || !code) return res.status(400).json({ success: false, error: 'Thiếu email hoặc mã xác minh.' });

      // Tìm PendingUser
      const pending = await PendingUser.findOne({ email });
      if (!pending) return res.status(404).json({ success: false, error: 'Không tìm thấy yêu cầu đăng ký.' });

      // Kiểm tra mã xác minh
      if (pending.verificationCode !== code) {
        return res.status(400).json({ success: false, error: 'Mã xác minh không đúng.' });
      }

      // Kiểm tra mã hết hạn
      if (pending.expiresAt < new Date()) {
        await PendingUser.deleteOne({ _id: pending._id });
        return res.status(410).json({ success: false, error: 'Mã xác minh đã hết hạn.' });
      }

      // Tạo người dùng mới
      const newUser = new User({
        username: email,   // Bạn có thể thay thế bằng `firstName` hoặc bất kỳ trường nào khác
        email,
        password: pending.password,  // Sử dụng mật khẩu đã mã hóa từ PendingUser
        role: 'user',   // Gán role mặc định hoặc lấy từ input
      });

      // Lưu người dùng vào bảng Users
      await newUser.save();

      // Xóa PendingUser để tránh trùng lặp
      await PendingUser.deleteOne({ _id: pending._id });

      // Tạo JWT tokens cho người dùng
      const accessToken = jwt.sign({ id: newUser._id, role: newUser.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
      const refreshToken = jwt.sign({ id: newUser._id, role: newUser.role }, process.env.REFRESH_JWT_SECRET, { expiresIn: '30d' });

      // Hash & save refresh token to user.retoken
      try {
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(refreshToken, salt);
        newUser.retoken = hashed;
        await newUser.save();
      } catch (e) {
        console.error('Error saving retoken on registration verify:', e);
      }

      // Set cookie
      const cookieOptsReg = {
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      };
      console.log('Setting refreshToken cookie on registration with options:', cookieOptsReg);
      res.cookie('refreshToken', refreshToken, cookieOptsReg);

      // Trả về thông tin người dùng và accessToken (refresh stored in cookie)
      const { password, ...userSafe } = newUser._doc;
      return res.json({ success: true, message: 'Đăng ký thành công.', data: { user: userSafe, accessToken } });
    } catch (err) {
      console.error('Error verifying registration:', err);
      return res.status(500).json({ success: false, error: 'Lỗi máy chủ.' });
    }
  },


  verifyPasswordResetCode: async (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Thiếu email hoặc mã xác minh.' });
    }

    try {
      const pendingUser = await PendingUserPasswordReset.findOne({ email });
      if (!pendingUser) return res.status(404).json({ success: false, error: 'Không tìm thấy yêu cầu quên mật khẩu.' });

      if (pendingUser.verificationCode !== code) {
        return res.status(400).json({ success: false, error: 'Mã xác minh không đúng.' });
      }

      if (pendingUser.expiresAt < new Date()) {
        await PendingUserPasswordReset.deleteOne({ email });
        return res.status(410).json({ success: false, error: 'Mã xác minh đã hết hạn.' });
      }

      // Mã xác minh hợp lệ, cho phép người dùng thay đổi mật khẩu
      return res.json({ success: true, message: 'Mã xác minh hợp lệ. Bạn có thể thay đổi mật khẩu.' });
    } catch (err) {
      console.error('Error in verifyPasswordResetCode:', err);
      return res.status(500).json({ success: false, error: 'Lỗi máy chủ.' });
    }
  },

  // backend/controllers/authControllers.js

  forgotPassword: async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email không hợp lệ.' });
    }

    try {
      // Kiểm tra email có trong hệ thống không
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ success: false, error: 'Email không tồn tại.' });

      // Tạo mã xác minh
      const code = Math.floor(100000 + Math.random() * 900000);  // Tạo mã 6 chữ số
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);  // Hết hạn trong 10 phút

      // Kiểm tra xem email đã tồn tại trong PendingUserPasswordReset chưa
      const existingPendingUser = await PendingUserPasswordReset.findOne({ email });

      if (existingPendingUser) {
        // Nếu đã tồn tại, cập nhật lại mã xác minh và thời gian hết hạn
        existingPendingUser.verificationCode = code;
        existingPendingUser.expiresAt = expiresAt;
        await existingPendingUser.save();
        console.log('Đã cập nhật mã xác minh cho email:', email);
      } else {
        // Nếu chưa tồn tại, tạo mới PendingUserPasswordReset
        const pendingUser = new PendingUserPasswordReset({
          email,
          verificationCode: code,
          expiresAt,
        });
        await pendingUser.save();
        console.log('Đã tạo mới yêu cầu reset mật khẩu cho email:', email);
      }

      // Gửi mã xác minh qua email
      await sendVerificationCode(email, code);

      return res.json({ success: true, message: 'Mã xác minh đã được gửi tới email của bạn.' });
    } catch (err) {
      console.error('Error in forgotPassword:', err);
      return res.status(500).json({ success: false, error: 'Lỗi máy chủ.' });
    }
  },



  resetPassword: async (req, res) => {
    let { email, code, newPassword, password } = req.body;
    newPassword = newPassword || password; // chấp nhận password

    if (!email || !code || !newPassword) {
      return res.status(400).json({ success: false, error: 'Thiếu email, mã xác minh hoặc mật khẩu mới.' });
    }


    try {
      const pending = await PendingUserPasswordReset.findOne({ email });
      if (!pending) return res.status(404).json({ success: false, error: 'Không tìm thấy yêu cầu quên mật khẩu.' });

      if (pending.verificationCode !== code) {
        return res.status(400).json({ success: false, error: 'Mã xác minh không đúng.' });
      }

      if (pending.expiresAt < new Date()) {
        await PendingUserPasswordReset.deleteOne({ _id: pending._id });
        return res.status(410).json({ success: false, error: 'Mã xác minh đã hết hạn.' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Cập nhật mật khẩu mới vào bảng Users
      await User.findOneAndUpdate({ email }, { password: hashedPassword }, { new: true });

      // Xóa PendingUserPasswordReset
      await PendingUserPasswordReset.deleteOne({ _id: pending._id });

      return res.json({ success: true, message: 'Mật khẩu đã được thay đổi thành công.' });
    } catch (err) {
      console.error('Error resetting password:', err);
      return res.status(500).json({ success: false, error: 'Lỗi máy chủ.' });
    }
  },


// tool bẩn 


// ĐĂNG KÝ NGAY – KHÔNG CẦN XÁC MINH EMAIL
registerDirect: async (req, res) => {
  const where = 'authControllers.registerDirect';
  try {
    const { username, email, password } = req.body || {};
    console.log(`[${where}] body:`, req.body);

    // 1) Validate
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, error: 'Thiếu username, email hoặc password.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Mật khẩu phải từ 8 ký tự trở lên.' });
    }

    // 2) Check trùng
    const existed = await User.findOne({ $or: [{ email }, { username }] });
    if (existed) {
      const duplicated = existed.email === email ? 'Email' : 'Username';
      return res.status(409).json({ success: false, error: `${duplicated} đã tồn tại.` });
    }

    // 3) Hash & tạo user
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      password: hashed,
      role: 'user',
    });

    // 4) Tạo token – kiểm tra secret trước khi ký để khỏi quăng 500
    const { JWT_SECRET, REFRESH_JWT_SECRET } = process.env;
    if (!JWT_SECRET || !REFRESH_JWT_SECRET) {
      console.error(`[${where}] Missing JWT secrets. JWT_SECRET=${!!JWT_SECRET} REFRESH_JWT_SECRET=${!!REFRESH_JWT_SECRET}`);
      return res.status(500).json({ success: false, error: 'Thiếu JWT secret. Kiểm tra .env backend.' });
    }

    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '15m' }
    );
    const refreshToken = jwt.sign(
      { id: user._id, role: user.role },
      REFRESH_JWT_SECRET,
      { expiresIn: process.env.REFRESH_JWT_EXPIRE || '7d' }
    );

    // 5) Đặt cookie refresh
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      path: '/',
      secure: false, // nếu production https -> true
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const { password: pw, ...userSafe } = user.toObject();
    return res.status(201).json({
      success: true,
      message: 'Đăng ký thành công (không cần xác minh email).',
      data: { user: userSafe, accessToken, refreshToken },
    });
  } catch (err) {
    // In log thật chi tiết ra console
    console.error('RegisterDirect error:', err?.message || err);
    if (err?.code === 11000) {
      const field = Object.keys(err.keyPattern || { field: 'unknown' })[0];
      return res.status(409).json({ success: false, error: `${field} đã tồn tại.` });
    }
    // trả message để bạn dễ debug (khi xong có thể đổi lại cho “an toàn”)
    return res.status(500).json({ success: false, error: err?.message || 'Lỗi máy chủ.' });
  }
},


  resendCode: async (req, res) => {
    try {
      const { email } = req.body || {};
      if (!email) return res.status(400).json({ success: false, error: 'Thiếu email.' });

      const pending = await PendingUser.findOne({ email });
      if (!pending) return res.status(404).json({ success: false, error: 'Không có yêu cầu đăng ký đang chờ.' });

      const code = generateCode(8);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      pending.verificationCode = code;
      pending.expiresAt = expiresAt;
      await pending.save();

      await sendVerificationCode(email, code);
      return res.json({ success: true, message: 'Đã gửi lại mã.', data: { email, expiresAt } });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, error: 'Lỗi máy chủ.' });
    }
  },
};

module.exports = authControllers;
