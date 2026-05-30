const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AuditoriaAcceso = sequelize.define('AuditoriaAcceso', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      },
      comment: 'Puede ser NULL si el usuario no existe'
    },
    usuario_nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Nombre del usuario que intentó acceder'
    },
    modulo_solicitado: {
      type: DataTypes.ENUM('auditoria', 'admin', 'superadmin', 'configuracion_critica', 'respaldos'),
      allowNull: false
    },
    accion: {
      type: DataTypes.ENUM('INTENTO_ACCESO', 'ACCESO_DENEGADO', 'ACCESO_CONCEDIDO'),
      defaultValue: 'INTENTO_ACCESO'
    },
    resultado: {
      type: DataTypes.ENUM('exitoso', 'fallido_por_rol', 'fallido_por_ip', 'fallido_usuario_inexistente'),
      allowNull: false
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    mensaje_error: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    fecha_hora: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'auditoria_accesos',
    indexes: [
      {
        fields: ['usuario_id']
      },
      {
        fields: ['fecha_hora']
      },
      {
        fields: ['modulo_solicitado']
      },
      {
        fields: ['resultado']
      }
    ]
  });

  // Método para registrar intento de acceso denegado
  AuditoriaAcceso.registrarIntentoDenegado = async function(data) {
    try {
      return await this.create({
        usuario_id: data.usuario_id || null,
        usuario_nombre: data.usuario_nombre,
        modulo_solicitado: data.modulo_solicitado,
        accion: 'ACCESO_DENEGADO',
        resultado: data.resultado || 'fallido_por_rol',
        ip_address: data.ip_address,
        user_agent: data.user_agent,
        mensaje_error: data.mensaje_error || 'No tiene permisos para acceder a este módulo'
      });
    } catch (error) {
      console.error('Error al registrar intento denegado:', error);
      return null;
    }
  };

  // Método para registrar acceso exitoso
  AuditoriaAcceso.registrarAccesoExitoso = async function(data) {
    try {
      return await this.create({
        usuario_id: data.usuario_id,
        usuario_nombre: data.usuario_nombre,
        modulo_solicitado: data.modulo_solicitado,
        accion: 'ACCESO_CONCEDIDO',
        resultado: 'exitoso',
        ip_address: data.ip_address,
        user_agent: data.user_agent
      });
    } catch (error) {
      console.error('Error al registrar acceso exitoso:', error);
      return null;
    }
  };

  // Obtener intentos fallidos por usuario
  AuditoriaAcceso.getIntentosFallidosPorUsuario = async function(usuarioId, options = {}) {
    const { limit = 50, offset = 0 } = options;
    
    return await this.findAndCountAll({
      where: {
        usuario_id: usuarioId,
        resultado: { [sequelize.Op.like]: 'fallido%' }
      },
      limit,
      offset,
      order: [['fecha_hora', 'DESC']]
    });
  };

  return AuditoriaAcceso;
};