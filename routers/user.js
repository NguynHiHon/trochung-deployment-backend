const middlewareControllers = require('../middleware/middlewareControllers');
const userControllers = require('../controllers/userController');

const router = require('express').Router();

router.get('/:id', middlewareControllers.verifyToken, userControllers.getUser);
router.get('/', middlewareControllers.verifyAdmin, userControllers.getAllUsers);
router.put('/:id', middlewareControllers.verifyToken, userControllers.updateUser);
router.delete('/:id', middlewareControllers.verifyAdmin, userControllers.deleteUser);

module.exports = router;
