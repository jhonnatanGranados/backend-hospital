const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { sequelize } = require('./models');
const authRoutes = require('./routes/authRoutes');
const pacienteRoutes = require('./routes/pacienteRoutes');
const reporteRoutes = require('./routes/reporteRoutes');
const auditoriaRoutes = require('./routes/auditoriaRoutes'); 

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/pacientes', pacienteRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/auditoria', auditoriaRoutes); 

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'API funcionando correctamente',
    timestamp: new Date()
  });
});

// Manejo de errores 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3001;
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida');
    
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: false});
      console.log('✅ Modelos sincronizados');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📊 APIs disponibles:`);
      console.log(`   - POST   /api/auth/login`);
      console.log(`   - GET    /api/pacientes`);
      console.log(`   - GET    /api/reportes`);
      console.log(`   - GET    /api/auditoria`); 
      console.log(`   - GET    /api/auditoria/resumen`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar:', error);
    process.exit(1);
  }
};

startServer();