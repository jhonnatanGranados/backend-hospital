const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  const Usuario = sequelize.define('Usuario', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [3, 100]
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [6, 255]
      }
    },
    rol: {
      type: DataTypes.ENUM('admin', 'superadmin', 'usuario'),
      defaultValue: 'usuario',
      allowNull: false
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    ultimo_acceso: {
      type: DataTypes.DATE,
      allowNull: true
    },
    ip_restringida: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Para SuperAdmin: si requiere IP específica'
    },
    ip_permitida: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IP permitida para SuperAdmin (opcional)'
    }
  }, {
    tableName: 'usuarios',
    hooks: {
      beforeCreate: async (usuario) => {
        if (usuario.password) {
          usuario.password = await bcrypt.hash(usuario.password, 10);
        }
      },
      beforeUpdate: async (usuario) => {
        if (usuario.changed('password')) {
          usuario.password = await bcrypt.hash(usuario.password, 10);
        }
      }
    }
  });

  // Restricción: solo 2 SuperAdmins máximo
  Usuario.beforeCreate(async (usuario, options) => {
    if (usuario.rol === 'superadmin') {
      const count = await Usuario.count({ where: { rol: 'superadmin' } });
      if (count >= 2) {
        throw new Error('Solo se permiten 2 SuperAdmins en el sistema');
      }
    }
    
    // Admins: máximo 4
    if (usuario.rol === 'admin') {
      const count = await Usuario.count({ where: { rol: 'admin' } });
      if (count >= 4) {
        throw new Error('Solo se permiten 4 Administradores en el sistema');
      }
    }
    
    // Usuarios normales: sin límite explícito
  });

  Usuario.prototype.validarPassword = async function(password) {
    return await bcrypt.compare(password, this.password);
  };

  // Verificar si puede acceder a auditoría
  Usuario.prototype.puedeAccederAuditoria = function() {
    return this.rol === 'superadmin'; // Solo SuperAdmin
  };

  // Verificar si puede acceder a logs básicos
  Usuario.prototype.puedeAccederLogs = function() {
    return this.rol === 'admin' || this.rol === 'superadmin';
  };

  // Obtener módulos permitidos
  Usuario.prototype.modulosPermitidos = function() {
    switch(this.rol) {
      case 'superadmin':
        return ['admin', 'auditoria', 'respaldos', 'configuracion_critica'];
      case 'admin':
        return ['configuracion', 'usuarios_normales', 'logs_basicos'];
      case 'usuario':
        return ['dashboard', 'reportes_basicos', 'perfil'];
      default:
        return [];
    }
  };

  Usuario.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    delete values.password;
    return values;
  };

  return Usuario;
};