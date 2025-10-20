const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { verifyToken } = require('../middleware/middlewareControllers');

// ✅ Route này ai cũng gọi được (hiển thị captcha)
router.get('/captcha', supportController.captcha);

// ✅ Còn các route bên dưới phải đăng nhập mới được
router.post('/', verifyToken, supportController.create);
router.get('/mine', verifyToken, supportController.listMine);

module.exports = router;
