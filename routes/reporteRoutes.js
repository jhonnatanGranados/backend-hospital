const express = require('express');
const router = express.Router();
const reporteController = require('../controllers/reporteController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/estadisticas', reporteController.getEstadisticas);
router.get('/por-fechas', reporteController.getReportePorFechas);
router.get('/guardados', reporteController.getReportesGuardados);

module.exports = router;