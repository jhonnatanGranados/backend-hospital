const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const os = require('os');
require('dotenv').config();

const { sequelize } = require('./models');
const authRoutes = require('./routes/authRoutes');
const pacienteRoutes = require('./routes/pacienteRoutes');
const reporteRoutes = require('./routes/reporteRoutes');
const auditoriaRoutes = require('./routes/auditoriaRoutes');

const app = express();

// ============================================
// FUNCIÓN PARA OBTENER IPs DE LA RED
// ============================================

const getNetworkIPs = () => {
  const interfaces = os.networkInterfaces();
  const ips = [];
  
  for (const interfaceName in interfaces) {
    const networkInterface = interfaces[interfaceName];
    for (const iface of networkInterface) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({
          address: iface.address,
          interface: interfaceName,
          mac: iface.mac
        });
      }
    }
  }
  return ips;
};

// ============================================
// CONFIGURACIÓN DE SEGURIDAD AVANZADA
// ============================================

// 1. Rate Limiting - Prevenir ataques de fuerza bruta
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'Demasiadas peticiones desde esta IP, por favor intenta nuevamente en 15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Demasiados intentos de inicio de sesión, por favor intenta nuevamente en 15 minutos'
  },
  skipSuccessfulRequests: true
});

// 2. Compresión
app.use(compression());

// 3. Cookie Parser
app.use(cookieParser(process.env.COOKIE_SECRET || 'secret-key'));

// 4. Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.API_URL || 'http://localhost:3000', 'http://192.168.56.1:3000'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginEmbedderPolicy: false,
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true
}));

// 5. Prevenir XSS
app.use(xss());

// 6. Prevenir HTTP Parameter Pollution
app.use(hpp({
  whitelist: ['sort', 'order', 'page', 'limit']
}));

// 7. CORS Configuración - ACEPTA TODAS LAS DIRECCIONES DE RED
const corsOptions = {
  origin: function (origin, callback) {
    // Lista de orígenes permitidos
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://192.168.56.1:3000',  // <-- DIRECCIÓN DEL FRONTEND
      'http://192.168.56.1:5173',
      // También permitir cualquier IP de la red local (opcional)
    ];

    // Si no hay origin (como en peticiones Postman) o está en la lista
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // En desarrollo, permitir cualquier origen
      if (process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('No permitido por CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Cache-Control', 
    'Pragma', 
    'Expires',
    'X-Requested-With',
    'X-CSRF-Token',
    'Cookie'
  ],
  exposedHeaders: ['Content-Length', 'X-Content-Type-Options', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// 8. Aplicar rate limiting
app.use('/api', limiter);
app.use('/api/auth', authLimiter);

// 9. Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('tiny'));
}

// 10. Parseo de JSON y datos de formularios
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      res.status(400).json({ error: 'JSON inválido' });
      throw new Error('JSON inválido');
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 1000
}));

// 11. Sanitización de query params
app.use((req, res, next) => {
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].replace(/[<>{}]/g, '');
      }
    });
  }
  next();
});

// ============================================
// RUTAS DE LA API
// ============================================

app.use('/api/auth', authRoutes);
app.use('/api/pacientes', pacienteRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/auditoria', auditoriaRoutes);

// ============================================
// RUTAS DE PRUEBA Y HEALTH CHECK
// ============================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Ruta para verificar CORS (preflight)
app.options('/api/*', cors(corsOptions));

// ============================================
// MANEJO DE ERRORES
// ============================================

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error:', {
      name: err.name,
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip
    });
  } else {
    console.error('❌ Error:', err.message, {
      path: req.path,
      method: req.method
    });
  }
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Error de validación',
      details: err.message,
      fields: err.fields || null,
      timestamp: new Date().toISOString()
    });
  }
  
  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'No autorizado',
      message: 'Token inválido o expirado',
      timestamp: new Date().toISOString()
    });
  }
  
  if (err.name === 'SequelizeError' || err.name === 'SequelizeDatabaseError') {
    return res.status(500).json({
      error: 'Error en la base de datos',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Error interno del servidor',
      code: err.code || null,
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'SequelizeConnectionError') {
    return res.status(503).json({
      error: 'Servicio no disponible',
      message: 'No se pudo conectar a la base de datos',
      timestamp: new Date().toISOString()
    });
  }

  if (err.code === 'RATE_LIMIT') {
    return res.status(429).json({
      error: 'Demasiadas peticiones',
      message: 'Por favor, espera antes de hacer más peticiones',
      timestamp: new Date().toISOString()
    });
  }
  
  res.status(err.status || 500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Ocurrió un error inesperado',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// INICIO DEL SERVIDOR
// ============================================

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida');
    
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: false });
      console.log('✅ Modelos sincronizados correctamente');
    }

    const server = app.listen(PORT, '0.0.0.0', () => {  // <-- ESCUCHA EN TODAS LAS INTERFACES
      const networkIPs = getNetworkIPs();
      
      console.log('\n=================================');
      console.log(`🚀 Servidor corriendo en:`);
      console.log(`   📍 Local:   http://localhost:${PORT}`);
      console.log(`   📍 Local:   http://127.0.0.1:${PORT}`);
      
      // Mostrar todas las IPs de red disponibles
      if (networkIPs.length > 0) {
        console.log('\n   🌐 En tu red:');
        networkIPs.forEach(ip => {
          console.log(`      http://${ip.address}:${PORT} (${ip.interface})`);
        });
      }
      
      console.log('\n=================================');
      console.log('📊 ENDPOINTS DISPONIBLES:');
      console.log('   🔐 AUTENTICACIÓN:');
      console.log('   ├── POST   /api/auth/login');
      console.log('   ├── POST   /api/auth/register');
      console.log('   ├── POST   /api/auth/logout');
      console.log('   ├── GET    /api/auth/verify');
      console.log('   └── POST   /api/auth/refresh-token');
      console.log('\n   👤 PACIENTES:');
      console.log('   ├── GET    /api/pacientes');
      console.log('   ├── GET    /api/pacientes/:id');
      console.log('   ├── POST   /api/pacientes');
      console.log('   ├── PUT    /api/pacientes/:id');
      console.log('   ├── PATCH  /api/pacientes/:id');
      console.log('   └── DELETE /api/pacientes/:id');
      console.log('\n   📊 REPORTES:');
      console.log('   ├── GET    /api/reportes');
      console.log('   ├── GET    /api/reportes/:id');
      console.log('   ├── POST   /api/reportes');
      console.log('   ├── PUT    /api/reportes/:id');
      console.log('   └── DELETE /api/reportes/:id');
      console.log('\n   🛡️ AUDITORÍA:');
      console.log('   ├── GET    /api/auditoria');
      console.log('   ├── GET    /api/auditoria/:id');
      console.log('   └── GET    /api/auditoria/resumen');
      console.log('\n   ❤️ HEALTH CHECK:');
      console.log('   └── GET    /api/health');
      console.log('\n=================================');
      console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 CORS permitidos:`);
      console.log(`   - http://localhost:3000`);
      console.log(`   - http://localhost:5173`);
      console.log(`   - http://127.0.0.1:3000`);
      console.log(`   - http://127.0.0.1:5173`);
      console.log(`   - http://192.168.56.1:3000 ✅ (FRONTEND)`);
      console.log(`   - http://192.168.56.1:5173`);
      console.log(`   - Cualquier IP de red local (en desarrollo)`);
      console.log(`🛡️ Security: Helmet, XSS, HPP, Rate Limiter, CORS`);
      console.log(`📊 Rate Limit: 100 requests por 15 minutos`);
      console.log(`🔐 Auth Rate Limit: 5 intentos por 15 minutos`);
      console.log('=================================\n');
      
      console.log('💡 Para conectar desde otro dispositivo:');
      networkIPs.forEach(ip => {
        console.log(`   http://${ip.address}:${PORT}`);
      });
      console.log('');
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ El puerto ${PORT} ya está en uso.`);
        process.exit(1);
      } else if (error.code === 'EACCES') {
        console.error(`❌ No tienes permisos para usar el puerto ${PORT}.`);
        process.exit(1);
      } else {
        console.error('❌ Error en el servidor:', error);
        process.exit(1);
      }
    });

    server.timeout = 30000;
    server.keepAliveTimeout = 60000;

  } catch (error) {
    console.error('❌ Error al iniciar el servidor:');
    console.error(`   - ${error.message}`);
    
    if (error.name === 'SequelizeConnectionError') {
      console.error('   ⚠️ Verifica las credenciales de la base de datos en el archivo .env');
      console.error(`   - DB_HOST: ${process.env.DB_HOST || 'localhost'}`);
      console.error(`   - DB_USER: ${process.env.DB_USER || 'root'}`);
      console.error(`   - DB_NAME: ${process.env.DB_NAME || 'database'}`);
      console.error(`   - DB_PORT: ${process.env.DB_PORT || '3306'}`);
    }
    
    process.exit(1);
  }
};

// ============================================
// MANEJO DE CIERRE LIMPIO
// ============================================

let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    console.log('⚠️ Ya está en proceso de cierre, esperando...');
    return;
  }
  
  isShuttingDown = true;
  console.log(`\n🛑 Recibida señal ${signal}. Cerrando servidor...`);
  
  const forceShutdown = setTimeout(() => {
    console.error('❌ Tiempo de cierre agotado. Forzando salida...');
    process.exit(1);
  }, 10000);

  try {
    await sequelize.close();
    console.log('✅ Conexión a la base de datos cerrada');
    
    await new Promise((resolve) => {
      app.close(() => {
        console.log('✅ Servidor HTTP cerrado');
        resolve();
      });
    });
    
    clearTimeout(forceShutdown);
    console.log('✅ Cierre completado exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante el cierre:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

process.on('uncaughtException', (err) => {
  console.error('❌ Error no capturado:', err);
  if (err.code === 'ECONNRESET' || err.code === 'EPIPE') {
    console.log('⚠️ Error de conexión, continuando...');
    return;
  }
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
  gracefulShutdown('unhandledRejection');
});



startServer();