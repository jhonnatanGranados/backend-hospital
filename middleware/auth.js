// middleware/auth.js
const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

const authenticate = async (req, res, next) => {
  console.log('========================================');
  console.log('🔐 [AUTHENTICATE] Iniciando...');
  
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    console.log(`📌 Token recibido: ${token ? 'SI (length: ' + token.length + ')' : 'NO'}`);
    
    if (!token) {
      console.log('❌ [AUTHENTICATE] No token proporcionado');
      return res.status(401).json({ error: 'No token proporcionado' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET no está definido');
      return res.status(500).json({ error: 'Error de configuración del servidor' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(`📌 Token decodificado - ID: ${decoded.id}, Nombre: ${decoded.nombre}, Rol: ${decoded.rol}`);
    
    const usuario = await Usuario.findByPk(decoded.id);
    
    if (!usuario) {
      console.log('❌ [AUTHENTICATE] Usuario no encontrado en BD');
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    
    if (!usuario.activo) {
      console.log('❌ [AUTHENTICATE] Usuario inactivo');
      return res.status(401).json({ error: 'Usuario inactivo' });
    }

    req.usuario = usuario;
    req.token = token;
    console.log(`✅ [AUTHENTICATE] Usuario autenticado: ${usuario.nombre} (${usuario.rol})`);
    console.log('========================================');
    next();
  } catch (error) {
    console.error('❌ [AUTHENTICATE] Error:', error.message);
    console.log('========================================');
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    
    res.status(401).json({ error: 'Por favor autentíquese' });
  }
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    console.log('========================================');
    console.log('🔑 [AUTHORIZE] Verificando roles...');
    console.log(`📌 Roles permitidos: ${allowedRoles.join(', ')}`);
    
    if (!req.usuario) {
      console.log('❌ [AUTHORIZE] Usuario no autenticado');
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    if (allowedRoles.length === 0) {
      console.log('✅ [AUTHORIZE] Sin restricciones, acceso permitido');
      console.log('========================================');
      return next();
    }
    
    if (!allowedRoles.includes(req.usuario.rol)) {
      console.log(`❌ [AUTHORIZE] ACCESO DENEGADO - Rol ${req.usuario.rol} no permitido`);
      console.log(`   Roles requeridos: ${allowedRoles.join(', ')}`);
      console.log('========================================');
      
      return res.status(403).json({ 
        error: `No tiene permisos. Roles requeridos: ${allowedRoles.join(', ')}`,
        su_rol: req.usuario.rol,
        roles_requeridos: allowedRoles
      });
    }
    
    console.log(`✅ [AUTHORIZE] ACCESO PERMITIDO - Rol ${req.usuario.rol} autorizado`);
    console.log('========================================');
    next();
  };
};

const authorizeModule = (moduleName) => {
  return async (req, res, next) => {
    console.log('========================================');
    console.log(`📦 [AUTHORIZE_MODULE] Verificando módulo: ${moduleName}`);
    
    if (!req.usuario) {
      console.log('❌ [AUTHORIZE_MODULE] Usuario no autenticado');
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    console.log(`📌 Usuario: ${req.usuario.nombre}`);
    console.log(`📌 Rol del usuario: ${req.usuario.rol}`);
    
    const modulePermissions = {
      'auditoria': ['superadmin', 'admin'],
      'admin': ['superadmin', 'admin'],
      'dashboard': ['superadmin', 'admin', 'usuario'],
      'reportes': ['superadmin', 'admin', 'usuario'],
      'pacientes': ['superadmin', 'admin', 'usuario']
    };
    
    const allowedRoles = modulePermissions[moduleName];
    console.log(`📌 Roles permitidos para ${moduleName}: ${allowedRoles?.join(', ')}`);
    
    if (!allowedRoles) {
      console.log(`❌ [AUTHORIZE_MODULE] Módulo ${moduleName} no definido`);
      return res.status(404).json({ error: 'Módulo no definido' });
    }
    
    if (!allowedRoles.includes(req.usuario.rol)) {
      console.log(`❌ [AUTHORIZE_MODULE] ACCESO DENEGADO`);
      console.log(`   Rol del usuario: ${req.usuario.rol}`);
      console.log(`   Roles requeridos: ${allowedRoles.join(', ')}`);
      console.log('========================================');
      
      return res.status(403).json({ 
        error: `No tiene permisos para acceder al módulo: ${moduleName}`,
        su_rol: req.usuario.rol,
        roles_requeridos: allowedRoles
      });
    }
    
    console.log(`✅ [AUTHORIZE_MODULE] ACCESO PERMITIDO`);
    console.log(`   Usuario: ${req.usuario.nombre} (${req.usuario.rol}) → ${moduleName}`);
    console.log('========================================');
    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  authorizeModule
};