const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Paciente = sequelize.define('Paciente', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    expediente: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    fecha_ingreso: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    nombre: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    edad: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 150
      }
    },
    direccion: {
      type: DataTypes.TEXT,
      defaultValue: ''
    },
    telefono: {
      type: DataTypes.STRING(20),
      defaultValue: ''
    },
    motivo_ingreso: {
      type: DataTypes.TEXT,
      defaultValue: ''
    },
    procedimiento: {
      type: DataTypes.STRING(255),
      defaultValue: ''
    },
    costo: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    sanatorio: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    honorarios: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    anestesia: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    nombre_anestesia: {
      type: DataTypes.STRING(100),
      defaultValue: ''
    },
    otros: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    usg: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    lab: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    ekg: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    rx: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    med_referente: {
      type: DataTypes.STRING(100),
      defaultValue: ''
    },
    medico1: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    nombre_medico1: {
      type: DataTypes.STRING(100),
      defaultValue: ''
    },
    costo_medico1: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    medico2: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    nombre_medico2: {
      type: DataTypes.STRING(100),
      defaultValue: ''
    },
    costo_medico2: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    medico3: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    nombre_medico3: {
      type: DataTypes.STRING(100),
      defaultValue: ''
    },
    costo_medico3: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    medico4: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    nombre_medico4: {
      type: DataTypes.STRING(100),
      defaultValue: ''
    },
    costo_medico4: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    fecha_egreso: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    fallecimiento: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    fecha_registro: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'pacientes',
    hooks: {
      beforeCreate: (paciente) => {
        paciente.costo = paciente.calcularTotal();
      },
      beforeUpdate: (paciente) => {
        paciente.costo = paciente.calcularTotal();
      }
    }
  });

  Paciente.prototype.calcularTotal = function() {
    let total = 0;
    total += parseFloat(this.sanatorio || 0);
    total += parseFloat(this.honorarios || 0);
    total += parseFloat(this.anestesia || 0);
    total += parseFloat(this.otros || 0);
    total += parseFloat(this.usg || 0);
    total += parseFloat(this.lab || 0);
    total += parseFloat(this.ekg || 0);
    total += parseFloat(this.rx || 0);
    
    if (this.medico1) total += parseFloat(this.costo_medico1 || 0);
    if (this.medico2) total += parseFloat(this.costo_medico2 || 0);
    if (this.medico3) total += parseFloat(this.costo_medico3 || 0);
    if (this.medico4) total += parseFloat(this.costo_medico4 || 0);
    
    return parseFloat(total.toFixed(2));
  };

  Paciente.prototype.obtenerResumenCostos = function() {
    const total = this.calcularTotal();
    const estudios = parseFloat(this.usg || 0) + parseFloat(this.lab || 0) + 
                    parseFloat(this.ekg || 0) + parseFloat(this.rx || 0);
    const medicos = (this.medico1 ? parseFloat(this.costo_medico1 || 0) : 0) +
                    (this.medico2 ? parseFloat(this.costo_medico2 || 0) : 0) +
                    (this.medico3 ? parseFloat(this.costo_medico3 || 0) : 0) +
                    (this.medico4 ? parseFloat(this.costo_medico4 || 0) : 0);

    return {
      sanatorio: {
        monto: parseFloat(this.sanatorio || 0),
        porcentaje: total > 0 ? parseFloat(((this.sanatorio || 0) / total * 100).toFixed(2)) : 0
      },
      honorarios: {
        monto: parseFloat(this.honorarios || 0),
        porcentaje: total > 0 ? parseFloat(((this.honorarios || 0) / total * 100).toFixed(2)) : 0
      },
      anestesia: {
        monto: parseFloat(this.anestesia || 0),
        porcentaje: total > 0 ? parseFloat(((this.anestesia || 0) / total * 100).toFixed(2)) : 0
      },
      otros: {
        monto: parseFloat(this.otros || 0),
        porcentaje: total > 0 ? parseFloat(((this.otros || 0) / total * 100).toFixed(2)) : 0
      },
      estudios: {
        monto: estudios,
        porcentaje: total > 0 ? parseFloat((estudios / total * 100).toFixed(2)) : 0
      },
      medicos: {
        monto: medicos,
        porcentaje: total > 0 ? parseFloat((medicos / total * 100).toFixed(2)) : 0
      },
      total: total
    };
  };

  return Paciente;
};