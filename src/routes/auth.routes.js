const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = Router();

/**
 * POST /api/auth/register
 * POST /api/auth/login
 * GET  /api/auth/me
 */
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticate, authController.me);

module.exports = router;
