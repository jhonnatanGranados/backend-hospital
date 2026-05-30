const { body, validationResult } = require('express-validator');

const validatePaciente = [
  body('expediente')
    .notEmpty().withMessage('El expediente es obligatorio')
    .isString().withMessage('El expediente debe ser texto'),
  body('nombre')
    .notEmpty().withMessage('El nombre es obligatorio')
    .isString().withMessage('El nombre debe ser texto'),
  body('edad')
    .optional()
    .isInt({ min: 0, max: 150 }).withMessage('La edad debe ser un número entre 0 y 150'),
  body('fecha_ingreso')
    .optional()
    .isDate().withMessage('Fecha de ingreso inválida'),
  handleValidationErrors
];

const validateLogin = [
  body('nombre')
    .notEmpty().withMessage('El nombre de usuario es obligatorio')
    .isString().withMessage('El nombre de usuario debe ser texto')
    .isLength({ min: 3, max: 100 }).withMessage('El nombre debe tener entre 3 y 100 caracteres'),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria')
    .isString().withMessage('La contraseña debe ser texto')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  handleValidationErrors
];

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ Errores de validación:', errors.array());
    return res.status(400).json({ 
      error: 'Error de validación',
      detalles: errors.array() 
    });
  }
  next();
}

module.exports = {
  validatePaciente,
  validateLogin
};