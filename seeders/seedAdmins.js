require('dotenv').config();
const { sequelize, Usuario } = require('../models');
const bcrypt = require('bcryptjs');

const seedAdmins = async () => {
  try {
    console.log('=== ACTUALIZANDO USUARIOS DEL SISTEMA ===');

    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos');

    
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

    // ============================================
    // SUPERADMIN
    // ============================================
    console.log('\n🔐 Actualizando SuperAdmin...');

    const superAdminsData = [
      {
        nombre: 'Jhonnatan Antulio',
        pass: 'Jhonnatan2026!',
        rol: 'superadmin'
      }
    ];

    for (const admin of superAdminsData) {
      const hashedPassword = await bcrypt.hash(admin.pass, 10);

      const [user, created] = await Usuario.upsert({
        nombre: admin.nombre,
        password: hashedPassword,
        rol: admin.rol,
        activo: true
      });

      console.log(
        `   ${created ? '✅ Creado' : '🔄 Actualizado'}: ${admin.nombre}`
      );
    }

    // ============================================
    // ADMINISTRADORES
    // ============================================
    console.log('\n👥 Actualizando Administradores...');

    const adminsData = [
      {
        nombre: 'Jenniffer de Leon',
        pass: 'Jenniffer2026!',
        rol: 'admin'
      },
      {
        nombre: 'Yoselin Maldonado',
        pass: 'Yoselin2026!',
        rol: 'admin'
      },
      {
        nombre: 'Crysol Mendoza',
        pass: 'Crysol2026!',
        rol: 'admin'
      }
    ];

    for (const admin of adminsData) {
      const hashedPassword = await bcrypt.hash(admin.pass, 10);

      const [user, created] = await Usuario.upsert({
        nombre: admin.nombre,
        password: hashedPassword,
        rol: admin.rol,
        activo: true
      });

      console.log(
        `   ${created ? '✅ Creado' : '🔄 Actualizado'}: ${admin.nombre}`
      );
    }

    // ============================================
    // RESUMEN
    // ============================================
    console.log('\n=== RESUMEN DE USUARIOS ===');

    const superAdmins = await Usuario.findAll({
      where: { rol: 'superadmin' },
      attributes: ['nombre', 'rol']
    });

    const admins = await Usuario.findAll({
      where: { rol: 'admin' },
      attributes: ['nombre', 'rol']
    });

    console.log(`\n🔹 SuperAdmins (${superAdmins.length}/1):`);
    superAdmins.forEach((u) => console.log(`   - ${u.nombre}`));

    console.log(`\n🔸 Administradores (${admins.length}/3):`);
    admins.forEach((u) => console.log(`   - ${u.nombre}`));

    console.log('\n✅ Seed completado - Todas las contraseñas actualizadas');

    console.log('\n📌 CREDENCIALES DE ACCESO');
    console.log('-----------------------------------');
    console.log('SUPERADMIN');
    console.log('Usuario: Jhonnatan Antulio');
    console.log('Contraseña: Jhonnatan2026!');
    console.log('-----------------------------------');
    console.log('ADMINISTRADORES');
    console.log('Usuario: Jenniffer de Leon');
    console.log('Contraseña: Jenniffer2026!');
    console.log('');
    console.log('Usuario: Yoselin Maldonado');
    console.log('Contraseña: Yoselin2026!');
    console.log('');
    console.log('Usuario: Crysol Mendoza');
    console.log('Contraseña: Crysol2026!');
    console.log('-----------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
};

seedAdmins();