// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validateLogin } = require('../middleware/validation');

// ✅ El login NO debe tener authenticate
router.post('/login', validateLogin, authController.login);
router.get('/perfil', authenticate, authController.getPerfil);
router.put('/cambiar-password', authenticate, authController.updatePassword);

module.exports = router;