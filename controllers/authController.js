const jwt = require('jsonwebtoken');
const { Usuario, sequelize } = require('../models'); 
const { Op } = require('sequelize');
const authController = {

  async login(req, res) {
    try {
      console.log('=== DEBUG LOGIN ===');
      console.log('Headers:', req.headers['content-type']);
      console.log('Body recibido:', req.body);
      console.log('Body keys:', Object.keys(req.body));
      
      const { nombre, password } = req.body;
      console.log('Nombre extraído:', nombre);
      console.log('Password extraído:', password ? '[PROTEGIDO]' : 'undefined');

      // Validar que se proporcionen ambos campos
      if (!nombre || !password) {
        console.log('❌ Faltan campos:', { nombre: !!nombre, password: !!password });
        return res.status(400).json({ 
          error: 'Debe proporcionar nombre de usuario y contraseña' 
        });
      }

      // Limpiar el nombre: trim y normalizar espacios
      const nombreLimpio = nombre.trim();
      console.log('🔍 Buscando usuario (original):', nombre);
      console.log('🔍 Buscando usuario (limpio):', nombreLimpio);
      
      // ✅ BÚSQUEDA FLEXIBLE - Acepta espacios y diferentes formatos
      const usuario = await Usuario.findOne({ 
        where: { 
          activo: true,
          [Op.or]: [
            // 1. Búsqueda exacta
            { nombre: nombre },
            { nombre: nombreLimpio },
            // 2. Búsqueda ignorando espacios (eliminando espacios)
            { nombre: { [Op.like]: `%${nombreLimpio.replace(/\s+/g, '%')}%` } },
            // 3. Búsqueda case insensitive (si tu DB lo soporta)
            sequelize.where(sequelize.fn('LOWER', sequelize.col('nombre')), 'LIKE', `%${nombreLimpio.toLowerCase()}%`)
          ]
        } 
      });
      
      if (!usuario) {
        console.log('❌ Usuario no encontrado en BD');
        
        // 🔍 Buscar usuarios similares para sugerencia
        const usuariosSimilares = await Usuario.findAll({
          where: {
            activo: true,
            [Op.or]: [
              { nombre: { [Op.like]: `%${nombreLimpio}%` } }
            ]
          },
          limit: 3
        });
        
        if (usuariosSimilares.length > 0) {
          const sugerencias = usuariosSimilares.map(u => u.nombre).join(', ');
          console.log(`💡 Usuarios similares encontrados: ${sugerencias}`);
          return res.status(401).json({ 
            error: `Credenciales inválidas. ¿Quizás quisiste decir: ${sugerencias}?` 
          });
        }
        
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }
      
      console.log('✅ Usuario encontrado en BD:', usuario.nombre);
      console.log('   Rol del usuario:', usuario.rol);

      const passwordValido = await usuario.validarPassword(password);
      if (!passwordValido) {
        console.log('❌ Contraseña incorrecta para usuario:', usuario.nombre);
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }
      
      console.log('✅ Contraseña válida');

      await usuario.update({ ultimo_acceso: new Date() });

      const token = jwt.sign(
        { 
          id: usuario.id, 
          nombre: usuario.nombre,
          rol: usuario.rol 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '24h' }
      );

      console.log('✅ Login exitoso para:', usuario.nombre);
      
      res.json({
        message: 'Login exitoso',
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          rol: usuario.rol,
          ultimo_acceso: usuario.ultimo_acceso
        },
        token
      });
      
    } catch (error) {
      console.error('❌ Error en login:', error);
      res.status(500).json({ error: 'Error al iniciar sesión' });
    }
  },

  async getPerfil(req, res) {
    try {
      const usuario = await Usuario.findByPk(req.usuario.id, {
        attributes: { exclude: ['password'] }
      });
      
      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      res.json(usuario);
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      res.status(500).json({ error: 'Error al obtener perfil' });
    }
  },

  async updatePassword(req, res) {
    try {
      const { password_actual, password_nuevo } = req.body;
      const usuario = await Usuario.findByPk(req.usuario.id);

      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const passwordValido = await usuario.validarPassword(password_actual);
      if (!passwordValido) {
        return res.status(401).json({ error: 'Contraseña actual incorrecta' });
      }

      if (!password_nuevo || password_nuevo.length < 6) {
        return res.status(400).json({ 
          error: 'La nueva contraseña debe tener al menos 6 caracteres' 
        });
      }

      await usuario.update({ password: password_nuevo });

      res.json({
        message: 'Contraseña actualizada exitosamente'
      });
    } catch (error) {
      console.error('Error al actualizar contraseña:', error);
      res.status(500).json({ error: 'Error al actualizar contraseña' });
    }
  },

  async crearUsuario(req, res) {
    try {
      const { nombre, password, rol } = req.body;

      if (!nombre || !password) {
        return res.status(400).json({ 
          error: 'Nombre y contraseña son requeridos' 
        });
      }

      if (password.length < 6) {
        return res.status(400).json({ 
          error: 'La contraseña debe tener al menos 6 caracteres' 
        });
      }

      const existeUsuario = await Usuario.findOne({ where: { nombre } });
      if (existeUsuario) {
        return res.status(400).json({ 
          error: 'El nombre de usuario ya está en uso' 
        });
      }

      const usuario = await Usuario.create({
        nombre,
        password,
        rol: rol || 'admin',
        activo: true
      });

      res.status(201).json({
        message: 'Usuario creado exitosamente',
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          rol: usuario.rol
        }
      });
    } catch (error) {
      console.error('Error al crear usuario:', error);
      
      if (error.message.includes('Solo se permiten 4 administradores')) {
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Error al crear usuario' });
    }
  }
};

module.exports = authController;