const { Sequelize } = require('sequelize');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuración de Sequelize
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: false
  }
);

// 🔧 CREAR BASE DE DATOS SI NO EXISTE
(async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    console.log('✅ Base de datos asegurada');
    await connection.end();
  } catch (error) {
    console.log('⚠️ No se pudo crear la base de datos:', error.message);
  }
})();

// Importar modelos
const UsuarioModel = require('./Usuario');
const PacienteModel = require('./Paciente');
const ReporteEstadisticasModel = require('./ReporteEstadisticas');
const AuditoriaPacienteModel = require('./AuditoriaPaciente');
const AuditoriaAccesoModel = require('./AuditoriaAcceso');

// Inicializar modelos
const Usuario = UsuarioModel(sequelize);
const Paciente = PacienteModel(sequelize);
const ReporteEstadisticas = ReporteEstadisticasModel(sequelize);
const AuditoriaPaciente = AuditoriaPacienteModel(sequelize);
const AuditoriaAcceso = AuditoriaAccesoModel(sequelize);

// Relaciones existentes
Usuario.hasMany(ReporteEstadisticas, { foreignKey: 'generado_por' });
ReporteEstadisticas.belongsTo(Usuario, { foreignKey: 'generado_por' });

// Relaciones de auditoría de pacientes
Paciente.hasMany(AuditoriaPaciente, { foreignKey: 'paciente_id' });
AuditoriaPaciente.belongsTo(Paciente, { foreignKey: 'paciente_id' });

Usuario.hasMany(AuditoriaPaciente, { foreignKey: 'usuario_id' });
AuditoriaPaciente.belongsTo(Usuario, { foreignKey: 'usuario_id' });

// NUEVAS RELACIONES DE AUDITORÍA DE ACCESOS
Usuario.hasMany(AuditoriaAcceso, { foreignKey: 'usuario_id' });
AuditoriaAcceso.belongsTo(Usuario, { foreignKey: 'usuario_id' });

const initializeDatabase = async (options = {}) => {
  const {
    sync = true,  // Cambiado a true por defecto
    force = false,
    alter = false
  } = options;

  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida');

    if (sync) {
      console.log('🔄 Verificando/Creando tablas...');
      
      if (force) {
        console.log('⚠️ Modo FORCE activado - Se recrearán las tablas');
      }
      
      if (alter) {
        console.log('📝 Modo ALTER activado - Se actualizará la estructura');
      }

      // sync: false solo crea tablas si no existen
      // force: true elimina y recrea tablas
      // alter: true modifica estructura existente
      await sequelize.sync({ force, alter });
      console.log('✅ Tablas verificadas/creadas correctamente');
      
      // Verificar y crear usuario SuperAdmin por defecto (solo si está vacío)
      const superadminCount = await Usuario.count({ where: { rol: 'superadmin' } });
      if (superadminCount === 0) {
        await Usuario.create({
          nombre: 'superadmin',
          password: 'SuperAdmin123',
          rol: 'superadmin',
          activo: true
        });
        console.log('✅ Usuario SuperAdmin creado: superadmin / SuperAdmin123');
      } else {
        console.log('ℹ️ Usuario SuperAdmin ya existe');
      }
      
      const adminCount = await Usuario.count({ where: { rol: 'admin' } });
      if (adminCount === 0) {
        await Usuario.create({
          nombre: 'admin',
          password: 'Admin123',
          rol: 'admin',
          activo: true
        });
        console.log('✅ Usuario Admin creado: admin / Admin123');
      } else {
        console.log('ℹ️ Usuario Admin ya existe');
      }
      
      return {
        success: true,
        message: 'Base de datos inicializada correctamente',
        sync: { force, alter }
      };
    }

    return {
      success: true,
      message: 'Conexión establecida sin sincronización',
      sync: false
    };

  } catch (error) {
    console.error('❌ Error al inicializar base de datos:', error);
    throw new Error(`Error de base de datos: ${error.message}`);
  }
};

// Función para verificar si las tablas existen
const checkTablesExist = async () => {
  try {
    const tables = await sequelize.getQueryInterface().showAllTables();
    const requiredTables = ['Usuarios', 'Pacientes', 'ReporteEstadisticas', 'AuditoriaPacientes', 'AuditoriaAccesos'];
    const missingTables = requiredTables.filter(table => !tables.includes(table));
    
    if (missingTables.length > 0) {
      console.log(`⚠️ Tablas faltantes: ${missingTables.join(', ')}`);
      return false;
    }
    console.log('✅ Todas las tablas existen');
    return true;
  } catch (error) {
    console.error('❌ Error verificando tablas:', error);
    return false;
  }
};

module.exports = {
  sequelize,
  Usuario,
  Paciente,
  ReporteEstadisticas,
  AuditoriaPaciente,
  AuditoriaAcceso,
  initializeDatabase,
  checkTablesExist  // Exportar función de verificación
};