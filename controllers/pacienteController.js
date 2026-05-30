const { Paciente, AuditoriaPaciente } = require('../models');
const { Op } = require('sequelize');
const { getClientInfo } = require('../middleware/audit'); 

const pacienteController = {
  async create(req, res) {
    try {
      const pacienteData = req.body;
      
      const existente = await Paciente.findOne({ 
        where: { expediente: pacienteData.expediente } 
      });
      
      if (existente) {
        return res.status(400).json({ 
          error: 'Ya existe un paciente con este número de expediente' 
        });
      }

      const paciente = await Paciente.create(pacienteData);
      
      // REGISTRAR AUDITORÍA - CREACIÓN
      const clientInfo = getClientInfo(req);
      await AuditoriaPaciente.registrar({
        paciente_id: paciente.id,
        usuario_id: req.usuario.id,
        usuario_nombre: req.usuario.nombre,
        accion: 'CREATE',
        cambios_completos: paciente.toJSON(),
        ip_address: clientInfo.ip_address,
        user_agent: clientInfo.user_agent
      });
      
      res.status(201).json({
        message: 'Paciente registrado exitosamente',
        paciente
      });
    } catch (error) {
      console.error('Error al crear paciente:', error);
      res.status(500).json({ error: 'Error al crear paciente' });
    }
  },

  async getAll(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        activo, 
        search,
        fecha_desde,
        fecha_hasta 
      } = req.query;

      const where = {};
      
      if (activo !== undefined) {
        where.activo = activo === 'true';
      }

      if (search) {
        where[Op.or] = [
          { nombre: { [Op.like]: `%${search}%` } },
          { expediente: { [Op.like]: `%${search}%` } },
          { telefono: { [Op.like]: `%${search}%` } }
        ];
      }

      if (fecha_desde || fecha_hasta) {
        where.fecha_ingreso = {};
        if (fecha_desde) where.fecha_ingreso[Op.gte] = fecha_desde;
        if (fecha_hasta) where.fecha_ingreso[Op.lte] = fecha_hasta;
      }

      const offset = (page - 1) * limit;

      const { count, rows } = await Paciente.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['fecha_registro', 'DESC']]
      });

      res.json({
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
        data: rows
      });
    } catch (error) {
      console.error('Error al obtener pacientes:', error);
      res.status(500).json({ error: 'Error al obtener pacientes' });
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;
      const paciente = await Paciente.findByPk(id);

      if (!paciente) {
        return res.status(404).json({ error: 'Paciente no encontrado' });
      }

      const pacienteData = paciente.toJSON();
      pacienteData.resumen_costos = paciente.obtenerResumenCostos();

      res.json(pacienteData);
    } catch (error) {
      console.error('Error al obtener paciente:', error);
      res.status(500).json({ error: 'Error al obtener paciente' });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const paciente = await Paciente.findByPk(id);

      if (!paciente) {
        return res.status(404).json({ error: 'Paciente no encontrado' });
      }

      if (req.body.expediente && req.body.expediente !== paciente.expediente) {
        const existente = await Paciente.findOne({ 
          where: { 
            expediente: req.body.expediente,
            id: { [Op.ne]: id }
          } 
        });
        
        if (existente) {
          return res.status(400).json({ 
            error: 'Ya existe otro paciente con este número de expediente' 
          });
        }
      }

      // Guardar valores anteriores para auditoría
      const valoresAnteriores = paciente.toJSON();
      
      await paciente.update(req.body);
      
      // REGISTRAR AUDITORÍA - ACTUALIZACIÓN
      const valoresNuevos = paciente.toJSON();
      const cambios = {};
      const cambiosDetallados = [];
      
      // Comparar y registrar solo los campos que cambiaron
      Object.keys(valoresNuevos).forEach(key => {
        if (valoresAnteriores[key] !== valoresNuevos[key] && 
            key !== 'updatedAt' && 
            key !== 'costo') { // costo se recalcula automáticamente
          cambios[key] = {
            anterior: valoresAnteriores[key],
            nuevo: valoresNuevos[key]
          };
          cambiosDetallados.push({
            campo: key,
            anterior: valoresAnteriores[key],
            nuevo: valoresNuevos[key]
          });
        }
      });
      
      const clientInfo = getClientInfo(req);
      
      // Si hay muchos cambios, registrar todos juntos
      if (Object.keys(cambios).length > 0) {
        // Registrar cambios individuales o un registro general
        if (Object.keys(cambios).length === 1) {
          const [campo, valores] = Object.entries(cambios)[0];
          await AuditoriaPaciente.registrar({
            paciente_id: paciente.id,
            usuario_id: req.usuario.id,
            usuario_nombre: req.usuario.nombre,
            accion: 'UPDATE',
            campo_modificado: campo,
            valor_anterior: String(valores.anterior),
            valor_nuevo: String(valores.nuevo),
            cambios_completos: cambios,
            ip_address: clientInfo.ip_address,
            user_agent: clientInfo.user_agent
          });
        } else {
          await AuditoriaPaciente.registrar({
            paciente_id: paciente.id,
            usuario_id: req.usuario.id,
            usuario_nombre: req.usuario.nombre,
            accion: 'UPDATE',
            campo_modificado: 'MULTIPLES_CAMPOS',
            cambios_completos: cambios,
            ip_address: clientInfo.ip_address,
            user_agent: clientInfo.user_agent
          });
        }
      }

      res.json({
        message: 'Paciente actualizado exitosamente',
        paciente
      });
    } catch (error) {
      console.error('Error al actualizar paciente:', error);
      res.status(500).json({ error: 'Error al actualizar paciente' });
    }
  },

  async egresar(req, res) {
    try {
      const { id } = req.params;
      const { fecha_egreso, fallecimiento } = req.body;

      const paciente = await Paciente.findByPk(id);

      if (!paciente) {
        return res.status(404).json({ error: 'Paciente no encontrado' });
      }

      const valoresAnteriores = {
        activo: paciente.activo,
        fecha_egreso: paciente.fecha_egreso,
        fallecimiento: paciente.fallecimiento
      };

      await paciente.update({
        activo: false,
        fecha_egreso: fecha_egreso || new Date().toISOString().split('T')[0],
        fallecimiento: fallecimiento || false
      });
      
      // REGISTRAR AUDITORÍA - EGRESO
      const clientInfo = getClientInfo(req);
      await AuditoriaPaciente.registrar({
        paciente_id: paciente.id,
        usuario_id: req.usuario.id,
        usuario_nombre: req.usuario.nombre,
        accion: 'EGRESAR',
        campo_modificado: fallecimiento ? 'FALLECIMIENTO' : 'EGRESO',
        valor_anterior: JSON.stringify(valoresAnteriores),
        valor_nuevo: JSON.stringify({
          activo: false,
          fecha_egreso: paciente.fecha_egreso,
          fallecimiento: paciente.fallecimiento
        }),
        ip_address: clientInfo.ip_address,
        user_agent: clientInfo.user_agent
      });

      res.json({
        message: fallecimiento ? 'Fallecimiento registrado' : 'Paciente egresado exitosamente',
        paciente
      });
    } catch (error) {
      console.error('Error al egresar paciente:', error);
      res.status(500).json({ error: 'Error al egresar paciente' });
    }
  },

   
// controllers/pacienteController.js
async delete(req, res) {
  try {
    const { id } = req.params;
    
    const paciente = await Paciente.findByPk(id);
    
    if (!paciente) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }
    
    // ✅ Guardar datos para auditoría ANTES de eliminar
    const pacienteData = paciente.toJSON();
    
    // Registrar en auditoría antes de eliminar
    const clientInfo = getClientInfo(req);
    await AuditoriaPaciente.registrar({
      paciente_id: paciente.id,
      usuario_id: req.usuario.id,
      usuario_nombre: req.usuario.nombre,
      accion: 'DELETE',
      campo_modificado: 'ELIMINACION_FISICA',
      valor_anterior: JSON.stringify(pacienteData),
      valor_nuevo: 'ELIMINADO',
      cambios_completos: pacienteData,
      ip_address: clientInfo.ip_address,
      user_agent: clientInfo.user_agent
    });
    
    // ✅ ELIMINAR FÍSICAMENTE de la base de datos
    await paciente.destroy({ force: true }); // force: true para eliminar físicamente
    
    res.json({ 
      message: 'Paciente eliminado permanentemente del sistema',
      deletedId: id
    });
  } catch (error) {
    console.error('Error al eliminar paciente:', error);
    res.status(500).json({ error: 'Error al eliminar paciente' });
  }
},

  async getResumenCostos(req, res) {
    try {
      const { id } = req.params;
      const paciente = await Paciente.findByPk(id);

      if (!paciente) {
        return res.status(404).json({ error: 'Paciente no encontrado' });
      }

      const resumen = paciente.obtenerResumenCostos();
      
      res.json(resumen);
    } catch (error) {
      console.error('Error al obtener resumen de costos:', error);
      res.status(500).json({ error: 'Error al obtener resumen de costos' });
    }
  },

  async reactivar(req, res) {
    try {
      const { id } = req.params;

      const paciente = await Paciente.findByPk(id);

      if (!paciente) {
        return res.status(404).json({ error: 'Paciente no encontrado' });
      }

      await paciente.update({ activo: true });
      
      // REGISTRAR AUDITORÍA - REACTIVACIÓN
      const clientInfo = getClientInfo(req);
      await AuditoriaPaciente.registrar({
        paciente_id: paciente.id,
        usuario_id: req.usuario.id,
        usuario_nombre: req.usuario.nombre,
        accion: 'REACTIVATE',
        campo_modificado: 'activo',
        valor_anterior: 'false',
        valor_nuevo: 'true',
        ip_address: clientInfo.ip_address,
        user_agent: clientInfo.user_agent
      });

      res.json({ 
        message: 'Paciente reactivado exitosamente',
        paciente 
      });
    } catch (error) {
      console.error('Error al reactivar paciente:', error);
      res.status(500).json({ error: 'Error al reactivar paciente' });
    }
  }
};

module.exports = pacienteController;