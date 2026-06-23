const { Paciente, ReporteEstadisticas, sequelize } = require('../models');
const { Op } = require('sequelize');

const reporteController = {
  async getEstadisticas(req, res) {
    try {
      const fechaActual = new Date();
      const primerDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
      const ultimoDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0);

      const todosLosPacientes = await Paciente.findAll({
        raw: true
      });

      console.log(`📊 Total de pacientes en BD: ${todosLosPacientes.length}`);

      let activos = 0;
      let egresados = 0;
      let fallecidos = 0;
      let ingresosTotales = 0;
      let ingresosMesActual = 0;
      let sumaCostosEgresados = 0;
      let contadorEgresados = 0;
      let contadorFallecidos = 0;

      let distribucionCostosEgresados = {
        total_sanatorio: 0,
        total_honorarios: 0,
        total_anestesia: 0,
        total_otros: 0,
        total_usg: 0,
        total_lab: 0,
        total_ekg: 0,
        total_rx: 0
      };

      todosLosPacientes.forEach(paciente => {
        const costo = parseFloat(paciente.costo) || 0;
        
        const esFallecido = paciente.fallecimiento === true || 
                           paciente.fallecimiento === 1 || 
                           paciente.fallecimiento === '1';
        
        const esActivo = paciente.activo === true || 
                        paciente.activo === 1 || 
                        paciente.activo === '1';
        
        const tieneFechaEgreso = paciente.fecha_egreso !== null && paciente.fecha_egreso !== undefined;
        
        if (esFallecido) {
          fallecidos++;
          contadorFallecidos++;
          ingresosTotales += costo;
          
          distribucionCostosEgresados.total_sanatorio += parseFloat(paciente.sanatorio) || 0;
          distribucionCostosEgresados.total_honorarios += parseFloat(paciente.honorarios) || 0;
          distribucionCostosEgresados.total_anestesia += parseFloat(paciente.anestesia) || 0;
          distribucionCostosEgresados.total_otros += parseFloat(paciente.otros) || 0;
          distribucionCostosEgresados.total_usg += parseFloat(paciente.usg) || 0;
          distribucionCostosEgresados.total_lab += parseFloat(paciente.lab) || 0;
          distribucionCostosEgresados.total_ekg += parseFloat(paciente.ekg) || 0;
          distribucionCostosEgresados.total_rx += parseFloat(paciente.rx) || 0;
        } 
        else if (!esActivo || tieneFechaEgreso) {
          egresados++;
          contadorEgresados++;
          ingresosTotales += costo;
          
          if (paciente.fecha_egreso) {
            const fechaEgreso = new Date(paciente.fecha_egreso);
            if (fechaEgreso >= primerDiaMes && fechaEgreso <= ultimoDiaMes) {
              ingresosMesActual += costo;
            }
          }
          
          distribucionCostosEgresados.total_sanatorio += parseFloat(paciente.sanatorio) || 0;
          distribucionCostosEgresados.total_honorarios += parseFloat(paciente.honorarios) || 0;
          distribucionCostosEgresados.total_anestesia += parseFloat(paciente.anestesia) || 0;
          distribucionCostosEgresados.total_otros += parseFloat(paciente.otros) || 0;
          distribucionCostosEgresados.total_usg += parseFloat(paciente.usg) || 0;
          distribucionCostosEgresados.total_lab += parseFloat(paciente.lab) || 0;
          distribucionCostosEgresados.total_ekg += parseFloat(paciente.ekg) || 0;
          distribucionCostosEgresados.total_rx += parseFloat(paciente.rx) || 0;
        } 
        else {
          activos++;
        }
      });

      const totalNoActivos = contadorEgresados + contadorFallecidos;
      const costoPromedio = totalNoActivos > 0 ? ingresosTotales / totalNoActivos : 0;

      const seisMesesAtras = new Date(fechaActual.getFullYear(), fechaActual.getMonth() - 5, 1);
      
      const pacientesPorMes = await Paciente.findAll({
        attributes: [
          [sequelize.fn('DATE_FORMAT', sequelize.col('fecha_ingreso'), '%Y-%m'), 'mes'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'total']
        ],
        where: {
          fecha_ingreso: {
            [Op.gte]: seisMesesAtras
          }
        },
        group: [sequelize.fn('DATE_FORMAT', sequelize.col('fecha_ingreso'), '%Y-%m')],
        order: [[sequelize.fn('DATE_FORMAT', sequelize.col('fecha_ingreso'), '%Y-%m'), 'ASC']],
        raw: true
      });

      const ultimosPacientes = await Paciente.findAll({
        attributes: [
          'id', 'nombre', 'expediente', 'fecha_ingreso', 'costo', 
          'activo', 'fallecimiento', 'fecha_egreso'
        ],
        order: [['fecha_ingreso', 'DESC']],
        limit: 5,
        raw: true
      });

      const ultimosPacientesFormateados = ultimosPacientes.map(p => {
        const esFallecido = p.fallecimiento === true || p.fallecimiento === 1;
        const esActivo = p.activo === true || p.activo === 1;
        const tieneEgreso = p.fecha_egreso !== null;
        
        let estado = 'ACTIVO';
        if (esFallecido) estado = 'FALLECIDO';
        else if (!esActivo || tieneEgreso) estado = 'EGRESADO';
        
        return {
          id: p.id,
          nombre: p.nombre,
          expediente: p.expediente,
          fecha_ingreso: p.fecha_ingreso,
          costo: parseFloat(p.costo) || 0,
          fecha_ingreso_formateada: p.fecha_ingreso ? 
            new Date(p.fecha_ingreso).toLocaleDateString('es-GT') : '-',
          estado: estado
        };
      });

      const estadisticas = {
        general: {
          total_pacientes: todosLosPacientes.length,
          pacientes_activos: activos,
          pacientes_egresados: egresados,
          pacientes_fallecidos: fallecidos,
          ingresos_totales: ingresosTotales,
          ingresos_mes_actual: ingresosMesActual,
          costo_promedio: costoPromedio
        },
        pacientes_por_mes: pacientesPorMes || [],
        distribucion_costos: distribucionCostosEgresados,
        ultimos_pacientes: ultimosPacientesFormateados
      };

      // ✅ LÍNEA CORREGIDA - usa ingresosTotales en lugar de ingresos_totales
      console.log('📊 ESTADÍSTICAS CALCULADAS:', {
        total_pacientes: estadisticas.general.total_pacientes,
        egresados,
        fallecidos,
        ingresos_totales: ingresosTotales,  // ✅ CORREGIDO
        costo_promedio: costoPromedio       // ✅ CORREGIDO
      });

      res.json(estadisticas);
    } catch (error) {
      console.error('Error al generar estadísticas:', error);
      res.status(500).json({ 
        error: 'Error al generar estadísticas',
        details: error.message 
      });
    }
  },

  async getReportePorFechas(req, res) {
    try {
      const { fecha_inicio, fecha_fin } = req.query;

      console.log('📝 GENERANDO REPORTE POR FECHAS:', { 
        fecha_inicio, 
        fecha_fin,
        timestamp: new Date().toISOString()
      });

      if (!fecha_inicio || !fecha_fin) {
        return res.status(400).json({ 
          error: 'Se requieren fecha_inicio y fecha_fin' 
        });
      }

      const pacientes = await Paciente.findAll({
        where: {
          fecha_ingreso: {
            [Op.between]: [fecha_inicio, fecha_fin]
          }
        },
        order: [['fecha_ingreso', 'DESC']],
        raw: true
      });

      let activos = 0;
      let egresados = 0;
      let fallecidos = 0;
      let totalIngresos = 0;

      pacientes.forEach(p => {
        const costo = parseFloat(p.costo) || 0;
        const esFallecido = p.fallecimiento === true || p.fallecimiento === 1;
        const esActivo = p.activo === true || p.activo === 1;
        const tieneEgreso = p.fecha_egreso !== null;
        
        if (esFallecido) {
          fallecidos++;
          totalIngresos += costo;
        } else if (!esActivo || tieneEgreso) {
          egresados++;
          totalIngresos += costo;
        } else {
          activos++;
        }
      });

      const reporte = {
        periodo: {
          fecha_inicio,
          fecha_fin
        },
        resumen: {
          total_pacientes: pacientes.length,
          pacientes_activos: activos,
          pacientes_egresados: egresados,
          pacientes_fallecidos: fallecidos,
          ingresos_totales: totalIngresos
        },
        pacientes: pacientes.map(p => ({
          ...p,
          costo: parseFloat(p.costo) || 0
        }))
      };

      if (req.usuario && req.usuario.id) {
        try {
          const [reporteGuardado, created] = await ReporteEstadisticas.findOrCreate({
            where: {
              fecha_inicio: fecha_inicio,
              fecha_fin: fecha_fin,
              tipo_reporte: 'personalizado'
            },
            defaults: {
              tipo_reporte: 'personalizado',
              fecha_inicio: fecha_inicio,
              fecha_fin: fecha_fin,
              total_pacientes: pacientes.length,
              pacientes_activos: activos,
              pacientes_egresados: egresados,
              pacientes_fallecidos: fallecidos,
              ingresos_totales: totalIngresos,
              ingresos_mes_actual: 0,
              costo_promedio: (egresados + fallecidos) > 0 ? totalIngresos / (egresados + fallecidos) : 0,
              datos_detallados: reporte,
              generado_por: req.usuario.id
            }
          });
          
          if (created) {
            console.log('✅ Nuevo reporte guardado para periodo:', fecha_inicio, '-', fecha_fin);
          } else {
            console.log('⚠️ Reporte ya existía para este periodo, no se duplicó');
          }
        } catch (saveError) {
          console.error('Error al guardar reporte:', saveError);
        }
      }

      res.json(reporte);
    } catch (error) {
      console.error('Error al generar reporte por fechas:', error);
      res.status(500).json({ error: 'Error al generar reporte' });
    }
  },

  async getReportesGuardados(req, res) {
    try {
      console.log('🔍 GET /reportes/guardados - SOLO LECTURA, no se inserta nada');
      
      const reportes = await ReporteEstadisticas.findAll({
        order: [['fecha_generacion', 'DESC']],
        limit: 20,
        raw: true
      });

      res.json(reportes || []);
    } catch (error) {
      console.error('Error al obtener reportes guardados:', error);
      res.status(500).json({ error: 'Error al obtener reportes' });
    }
  }
};

module.exports = reporteController;