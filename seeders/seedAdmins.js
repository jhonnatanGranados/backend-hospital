require('dotenv').config();
const { sequelize, Usuario } = require('../models');
const bcrypt = require('bcryptjs');

const seedAdmins = async () => {
  try {
    console.log('=== ACTUALIZANDO USUARIOS DEL SISTEMA ===');
    
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos');
    
    // Modificar ENUM - SOLO 3 roles
    try {
      await sequelize.query(`
        ALTER TABLE usuarios 
        MODIFY COLUMN rol ENUM('admin', 'superadmin', 'usuario') 
        NOT NULL DEFAULT 'usuario'
      `);
      console.log('✅ ENUM actualizado (admin, superadmin, usuario)');
    } catch (error) {
      console.log('ℹ️ ENUM ya estaba actualizado');
    }
    
  
    console.log('\n🔐 Actualizando SuperAdmins...');
    
    const superAdminsData = [
      { nombre: 'SuperAdmin Principal', pass: 'Super2024', rol: 'superadmin' },
      { nombre: 'SuperAdmin Respaldo', pass: 'Master2024', rol: 'superadmin' }
    ];
    
    for (const admin of superAdminsData) {
      const hashedPassword = await bcrypt.hash(admin.pass, 10);
      const [user, created] = await Usuario.upsert({
        nombre: admin.nombre,
        password: hashedPassword,
        rol: admin.rol,
        activo: true
      });
      console.log(`   ${created ? '✅ Creado' : '🔄 Actualizado'}: ${admin.nombre} / ${admin.pass}`);
    }
    
    // ============================================
    // ADMINS (actualizar o crear)
    // ============================================
    console.log('\n👥 Actualizando Administradores...');
    
    const adminsData = [
      { nombre: 'Admin Sistemas', pass: 'Sistemas2024', rol: 'admin' },
      { nombre: 'Admin Finanzas', pass: 'Finanzas2024', rol: 'admin' },
      { nombre: 'Admin Operaciones', pass: 'Operaciones2024', rol: 'admin' },
      { nombre: 'Admin Soporte', pass: 'Soporte2024', rol: 'admin' }
    ];
    
    for (const admin of adminsData) {
      const hashedPassword = await bcrypt.hash(admin.pass, 10);
      const [user, created] = await Usuario.upsert({
        nombre: admin.nombre,
        password: hashedPassword,
        rol: admin.rol,
        activo: true
      });
      console.log(`   ${created ? '✅ Creado' : '🔄 Actualizado'}: ${admin.nombre} / ${admin.pass}`);
    }
    
    // ============================================
    // USUARIOS NORMALES (actualizar o crear)
    // ============================================
    console.log('\n👤 Actualizando Usuarios normales...');
    
    const usuariosData = [
      { nombre: 'JuanPerez', pass: 'Juan123', rol: 'usuario' },
      { nombre: 'Maria Lopez', pass: 'Maria123', rol: 'usuario' },
      { nombre: 'Carlos Gomez', pass: 'Carlos123', rol: 'usuario' },
      { nombre: 'Ana Martinez', pass: 'Ana123', rol: 'usuario' },
      { nombre: 'Luis Fernandez', pass: 'Luis123', rol: 'usuario' }
    ];
    
    for (const user of usuariosData) {
      const hashedPassword = await bcrypt.hash(user.pass, 10);
      const [usuario, created] = await Usuario.upsert({
        nombre: user.nombre,
        password: hashedPassword,
        rol: user.rol,
        activo: true
      });
      console.log(`   ${created ? '✅ Creado' : '🔄 Actualizado'}: ${user.nombre} / ${user.pass}`);
    }
    
    // ============================================
    // MOSTRAR RESUMEN
    // ============================================
    console.log('\n=== RESUMEN DE USUARIOS ===');
    
    const superAdmins = await Usuario.findAll({ where: { rol: 'superadmin' }, attributes: ['nombre', 'rol'] });
    const admins = await Usuario.findAll({ where: { rol: 'admin' }, attributes: ['nombre', 'rol'] });
    const usuarios = await Usuario.findAll({ where: { rol: 'usuario' }, attributes: ['nombre', 'rol'] });
    
    console.log(`\n🔹 SuperAdmins (${superAdmins.length}/2):`);
    superAdmins.forEach(u => console.log(`   - ${u.nombre}`));
    
    console.log(`\n🔸 Administradores (${admins.length}/4):`);
    admins.forEach(u => console.log(`   - ${u.nombre}`));
    
    console.log(`\n🔹 Usuarios normales (${usuarios.length}):`);
    usuarios.forEach(u => console.log(`   - ${u.nombre}`));
    
    console.log('\n✅ Seed completado - Todas las contraseñas actualizadas');
    console.log('\n📌 CREDENCIALES DE PRUEBA:');
    console.log('   SuperAdmin: SuperAdmin Principal / Super2024');
    console.log('   Admin: Admin Sistemas / Sistemas2024');
    console.log('   Usuario: JuanPerez / Juan123');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
};

seedAdmins();