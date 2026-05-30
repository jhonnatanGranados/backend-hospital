// backend/middleware/audit.js

/**
 * Obtiene información del cliente desde la request
 * @param {Object} req - Objeto de request de Express
 * @returns {Object} Información del cliente
 */
const getClientInfo = (req) => {
  // Obtener IP real considerando proxies
  const ip_address = req.headers['x-forwarded-for']?.split(',')[0] || 
                     req.connection?.remoteAddress || 
                     req.socket?.remoteAddress || 
                     req.ip || 
                     '0.0.0.0';
  
  // Limpiar IPv6 loopback
  const cleanIp = ip_address === '::1' ? '127.0.0.1' : ip_address;
  
  return {
    ip_address: cleanIp,
    user_agent: req.get('user-agent') || 'unknown'
  };
};

// Middleware opcional para agregar clientInfo a todas las requests
const auditMiddleware = (req, res, next) => {
  req.clientInfo = getClientInfo(req);
  next();
};

module.exports = {
  getClientInfo,
  auditMiddleware
};