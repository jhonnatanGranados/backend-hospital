const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ReporteEstadisticas = sequelize.define('ReporteEstadisticas', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    tipo_reporte: {
      type: DataTypes.ENUM('diario', 'semanal', 'mensual', 'anual', 'personalizado'),
      allowNull: false
    },
    fecha_inicio: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    fecha_fin: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    total_pacientes: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    pacientes_activos: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    pacientes_egresados: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    pacientes_fallecidos: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    ingresos_totales: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0
    },
    ingresos_mes_actual: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0
    },
    costo_promedio: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    datos_detallados: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    fecha_generacion: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    generado_por: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    }
  }, {
    tableName: 'reportes_estadisticas'
  });

  return ReporteEstadisticas;
};