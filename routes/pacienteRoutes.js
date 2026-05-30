// routes/pacienteRoutes.js
const express = require('express');
const router = express.Router();
const pacienteController = require('../controllers/pacienteController');
const { authenticate, authorize } = require('../middleware/auth');
const { validatePaciente } = require('../middleware/validation');

// Todas requieren autenticación
router.use(authenticate);

// Rutas con diferentes niveles de permiso
router.get('/', pacienteController.getAll); // Todos los autenticados pueden ver
router.get('/:id', pacienteController.getById); // Todos los autenticados pueden ver
router.get('/:id/resumen-costos', pacienteController.getResumenCostos);

// Solo admin y superadmin pueden crear, actualizar, eliminar
router.post('/', authorize('superadmin', 'admin'), validatePaciente, pacienteController.create);
router.put('/:id', authorize('superadmin', 'admin'), validatePaciente, pacienteController.update);
router.put('/:id/egresar', authorize('superadmin', 'admin'), pacienteController.egresar);
router.put('/:id/reactivar', authorize('superadmin', 'admin'), pacienteController.reactivar);
router.delete('/:id', authorize('superadmin', 'admin'), pacienteController.delete);

module.exports = router;