// routes/auditoriaRoutes.js
const express = require('express');
const router = express.Router();
const auditoriaController = require('../controllers/auditoriaController');
const { authenticate, authorizeModule } = require('../middleware/auth');

// ✅ PROTEGIDA - Requiere autenticación y rol de auditoría
router.use(authenticate);
router.use(authorizeModule('auditoria'));

router.get('/', auditoriaController.getAllAuditorias);
router.get('/resumen', auditoriaController.getResumenActividades);
router.get('/paciente/:id/historial', auditoriaController.getHistorialPaciente);
router.get('/paciente/:id/ultima', auditoriaController.getUltimaModificacion);

console.log('✅ Rutas de auditoría PROTEGIDAS');

module.exports = router;