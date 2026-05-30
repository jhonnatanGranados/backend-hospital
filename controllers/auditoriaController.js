const { AuditoriaPaciente, Usuario, Paciente } = require('../models');
const { Op } = require('sequelize');

const auditoriaController = {
  async getHistorialPaciente(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20, accion = null } = req.query;
      
      const offset = (page - 1) * limit;
      
      const where = { paciente_id: id };
      if (accion) {
        where.accion = accion;
      }
      
      const { count, rows } = await AuditoriaPaciente.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['fecha_hora', 'DESC']],
        include: [
          {
            model: Usuario,
            attributes: ['id', 'nombre', 'rol']
          },
          {
            model: Paciente,
            attributes: ['id', 'expediente', 'nombre']
          }
        ]
      });
      
      res.json({
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
        data: rows
      });
    } catch (error) {
      console.error('Error al obtener historial:', error);
      res.status(500).json({ error: 'Error al obtener historial' });
    }
  },
  
  // Obtener todas las auditorías con filtros
  async getAllAuditorias(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        fecha_desde, 
        fecha_hasta,
        usuario_id,
        accion,
        paciente_id
      } = req.query;
      
      const where = {};
      
      if (fecha_desde || fecha_hasta) {
        where.fecha_hora = {};
        if (fecha_desde) where.fecha_hora[Op.gte] = new Date(fecha_desde);
        if (fecha_hasta) where.fecha_hora[Op.lte] = new Date(fecha_hasta);
      }
      
      if (usuario_id) where.usuario_id = usuario_id;
      if (accion) where.accion = accion;
      if (paciente_id) where.paciente_id = paciente_id;
      
      const offset = (page - 1) * limit;
      
      const { count, rows } = await AuditoriaPaciente.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['fecha_hora', 'DESC']],
        include: [
          {
            model: Usuario,
            attributes: ['id', 'nombre', 'rol']
          },
          {
            model: Paciente,
            attributes: ['id', 'expediente', 'nombre']
          }
        ]
      });
      
      res.json({
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
        data: rows
      });
    } catch (error) {
      console.error('Error al obtener auditorías:', error);
      res.status(500).json({ error: 'Error al obtener auditorías' });
    }
  },
  
  // Obtener resumen de actividades por usuario
  async getResumenActividades(req, res) {
    try {
      const { fecha_inicio, fecha_fin } = req.query;
      
      const where = {};
      if (fecha_inicio || fecha_fin) {
        where.fecha_hora = {};
        if (fecha_inicio) where.fecha_hora[Op.gte] = new Date(fecha_inicio);
        if (fecha_fin) where.fecha_hora[Op.lte] = new Date(fecha_fin);
      }
      
      const resumen = await AuditoriaPaciente.findAll({
        where,
        attributes: [
          'usuario_id',
          'usuario_nombre',
          'accion',
          [AuditoriaPaciente.sequelize.fn('COUNT', AuditoriaPaciente.sequelize.col('id')), 'total']
        ],
        group: ['usuario_id', 'usuario_nombre', 'accion'],
        order: [
          ['usuario_nombre', 'ASC'],
          ['accion', 'ASC']
        ]
      });
      
      res.json(resumen);
    } catch (error) {
      console.error('Error al obtener resumen:', error);
      res.status(500).json({ error: 'Error al obtener resumen' });
    }
  },
  
  // Obtener última modificación de un paciente
  async getUltimaModificacion(req, res) {
    try {
      const { id } = req.params;
      
      const ultima = await AuditoriaPaciente.findOne({
        where: { paciente_id: id },
        order: [['fecha_hora', 'DESC']],
        include: [
          {
            model: Usuario,
            attributes: ['id', 'nombre', 'rol']
          }
        ]
      });
      
      if (!ultima) {
        return res.json({ message: 'No hay registros de modificaciones' });
      }
      
      res.json(ultima);
    } catch (error) {
      console.error('Error al obtener última modificación:', error);
      res.status(500).json({ error: 'Error al obtener última modificación' });
    }
  }
};

module.exports = auditoriaController;