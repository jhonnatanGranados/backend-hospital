const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AuditoriaPaciente = sequelize.define('AuditoriaPaciente', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    paciente_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'pacientes',
        key: 'id'
      }
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    usuario_nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Nombre del usuario que realizó la acción (para referencia rápida)'
    },
    accion: {
      type: DataTypes.ENUM('CREATE', 'UPDATE', 'DELETE', 'REACTIVATE', 'EGRESAR'),
      allowNull: false
    },
    campo_modificado: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Nombre del campo modificado (para actualizaciones específicas)'
    },
    valor_anterior: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Valor antes de la modificación'
    },
    valor_nuevo: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Valor después de la modificación'
    },
    cambios_completos: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Objeto JSON con todos los cambios realizados'
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'Dirección IP del usuario'
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Navegador/Sistema operativo del usuario'
    },
    fecha_hora: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false
    }
  }, {
    tableName: 'auditoria_pacientes',
    indexes: [
      {
        fields: ['paciente_id']
      },
      {
        fields: ['usuario_id']
      },
      {
        fields: ['fecha_hora']
      },
      {
        fields: ['accion']
      }
    ]
  });

  // Método estático para registrar auditoría
  AuditoriaPaciente.registrar = async function(data) {
    try {
      return await this.create(data);
    } catch (error) {
      console.error('Error al registrar auditoría:', error);
      // No lanzamos el error para no interrumpir la operación principal
      return null;
    }
  };

  // Método para obtener historial de un paciente
  AuditoriaPaciente.getHistorialPaciente = async function(pacienteId, options = {}) {
    const { limit = 50, offset = 0, accion = null } = options;
    
    const where = { paciente_id: pacienteId };
    if (accion) {
      where.accion = accion;
    }
    
    return await this.findAndCountAll({
      where,
      limit,
      offset,
      order: [['fecha_hora', 'DESC']]
    });
  };

  return AuditoriaPaciente;
};