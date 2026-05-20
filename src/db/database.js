const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

const dbDir = path.resolve(__dirname, '../../database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'dulceria.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error abriendo la base de datos', err.message);
  } else {
    console.log('Conectado a la base de datos SQLite en: ' + dbPath);
    
    // Tabla usuarios
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      puntos INTEGER DEFAULT 0,
      rol TEXT DEFAULT 'cliente'
    )`, (err) => {
      if (err) {
        console.error("Error al crear tabla usuarios", err);
      } else {
        // Crear usuario admin por defecto si no existe
        db.get('SELECT * FROM usuarios WHERE email = ?', ['admin@dulceria.com'], (err, row) => {
          if (!row) {
            bcrypt.hash('admin123', 10, (err, hash) => {
              if (err) {
                console.error("Error al hashear contraseña de admin", err);
                return;
              }
              db.run(`INSERT INTO usuarios (nombre, email, password_hash, rol, puntos) VALUES (?, ?, ?, ?, ?)`,
                ['Administrador', 'admin@dulceria.com', hash, 'admin', 0]);
            });
          }
        });
      }
    });

    // Tabla productos
    db.run(`CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      precio REAL NOT NULL,
      categoria TEXT NOT NULL,
      imagen_path TEXT,
      es_oferta_del_dia INTEGER DEFAULT 0,
      descripcion TEXT,
      precio_oferta REAL DEFAULT NULL
    )`, (err) => {
      if (err) {
        console.error('Error creando tabla productos', err.message);
      } else {
        db.run('ALTER TABLE productos ADD COLUMN precio_oferta REAL DEFAULT NULL', (alterErr) => {
          // Si ya existe la columna, alterErr atrapará el error de "duplicate column" silenciosamente
        });
        console.log('Tabla productos lista');
      }
    });

    // Tabla pedidos
    db.run(`CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      estado TEXT DEFAULT 'Pendiente',
      total REAL NOT NULL,
      fecha_recogida TEXT NOT NULL,
      detalles TEXT NOT NULL,
      FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    )`);
  }
});

module.exports = db;
