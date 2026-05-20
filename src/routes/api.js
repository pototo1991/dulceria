const express = require('express');
const router = express.Router();
const db = require('../db/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { verifyToken, verifyAdmin, verifyCSRF, SECRET_KEY, parseCookies } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const imgDir = path.join(__dirname, '../../public/img/');
if (!fs.existsSync(imgDir)) {
  fs.mkdirSync(imgDir, { recursive: true });
}

// Multer config para subidas de imagen (formato WebP pre-procesado en el cliente)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, imgDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'prod-' + uniqueSuffix + '.webp');
  }
});
const upload = multer({ storage: storage });

// --- CSRF TOKEN ENDPOINT ---
router.get('/csrf-token', (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  let csrfToken = cookies.csrf_token;
  
  if (!csrfToken) {
    csrfToken = crypto.randomBytes(32).toString('hex');
    res.setHeader('Set-Cookie', `csrf_token=${csrfToken}; Path=/; SameSite=Lax`);
  }
  
  res.json({ csrfToken });
});

// --- AUTENTICACIÓN ---

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  db.get('SELECT * FROM usuarios WHERE email = ?', [email], (err, user) => {
    if (err) return res.status(500).json({ error: 'Error interno del servidor.' });
    if (!user) return res.status(401).json({ error: 'Credenciales incorrectas.' });

    bcrypt.compare(password, user.password_hash, (err, isMatch) => {
      if (err) return res.status(500).json({ error: 'Error interno del servidor.' });
      if (!isMatch) return res.status(401).json({ error: 'Credenciales incorrectas.' });

      // Firmar token JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, rol: user.rol }, 
        SECRET_KEY, 
        { expiresIn: '24h' }
      );
      
      // Configurar Cookie HTTP-only para el token
      const isProd = process.env.NODE_ENV === 'production';
      res.setHeader('Set-Cookie', [
        `token=${token}; Path=/; HttpOnly; SameSite=Lax${isProd ? '; Secure' : ''}`,
        `logged_in=true; Path=/; SameSite=Lax`
      ]);
      
      res.json({ rol: user.rol, message: 'Ingreso exitoso.' });
    });
  });
});

router.post('/register', (req, res) => {
  const { nombre, email, password } = req.body;
  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }

  // Validación básica de contraseña (mínimo 8 caracteres)
  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
  }

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.status(500).json({ error: 'Error interno de cifrado.' });

    db.run(
      'INSERT INTO usuarios (nombre, email, password_hash, rol, puntos) VALUES (?, ?, ?, ?, ?)',
      [nombre, email, hash, 'cliente', 0],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'El correo ya está registrado.' });
          }
          return res.status(500).json({ error: 'Error al registrar el usuario.' });
        }
        
        const userId = this.lastID;
        // Login automático al registrarse
        const token = jwt.sign(
          { id: userId, email: email, rol: 'cliente' }, 
          SECRET_KEY, 
          { expiresIn: '24h' }
        );
        
        const isProd = process.env.NODE_ENV === 'production';
        res.setHeader('Set-Cookie', [
          `token=${token}; Path=/; HttpOnly; SameSite=Lax${isProd ? '; Secure' : ''}`,
          `logged_in=true; Path=/; SameSite=Lax`
        ]);

        res.json({ message: 'Usuario registrado exitosamente', id: userId });
      }
    );
  });
});

router.post('/logout', (req, res) => {
  // Limpiar cookies de sesión
  res.setHeader('Set-Cookie', [
    'token=; Path=/; HttpOnly; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'logged_in=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  ]);
  res.json({ message: 'Sesión cerrada exitosamente.' });
});

router.get('/usuario', verifyToken, (req, res) => {
  db.get(
    'SELECT id, nombre, email, rol, puntos FROM usuarios WHERE id = ?',
    [req.user.id],
    (err, user) => {
      if (err) return res.status(500).json({ error: 'Error al obtener usuario.' });
      if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
      res.json(user);
    }
  );
});

// --- PRODUCTOS ---

// Obtener todos los productos
router.get('/productos', (req, res) => {
  db.all('SELECT * FROM productos', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error al obtener productos.' });
    res.json(rows);
  });
});

// Obtener el producto de oferta del día
router.get('/productos/oferta', (req, res) => {
  db.get('SELECT * FROM productos WHERE es_oferta_del_dia = 1', [], (err, row) => {
    if (err) return res.status(500).json({ error: 'Error al obtener producto del día.' });
    res.json(row || null);
  });
});

// Crear un nuevo producto (solo Admin, protegido por CSRF)
router.post('/productos', verifyToken, verifyAdmin, verifyCSRF, upload.single('imagen'), (req, res) => {
  const { nombre, precio, descripcion, categoria } = req.body;
  const imagen_path = req.file ? '/img/' + req.file.filename : null;

  if (!nombre || !precio || !categoria) {
    return res.status(400).json({ error: 'Nombre, precio y categoría son obligatorios.' });
  }

  db.run(
    'INSERT INTO productos (nombre, precio, descripcion, categoria, imagen_path, es_oferta_del_dia) VALUES (?, ?, ?, ?, ?, 0)',
    [nombre, parseFloat(precio), descripcion, categoria, imagen_path],
    function (err) {
      if (err) return res.status(500).json({ error: 'Error al crear el producto.' });
      res.json({ id: this.lastID, message: 'Producto creado exitosamente.' });
    }
  );
});

// Actualizar un producto (solo Admin, protegido por CSRF)
router.put('/productos/:id', verifyToken, verifyAdmin, verifyCSRF, upload.single('imagen'), (req, res) => {
  const { nombre, precio, descripcion, categoria } = req.body;
  const id = req.params.id;

  if (!nombre || !precio || !categoria) {
    return res.status(400).json({ error: 'Nombre, precio y categoría son obligatorios.' });
  }
  
  if (req.file) {
    const imagen_path = '/img/' + req.file.filename;
    db.run(
      'UPDATE productos SET nombre = ?, precio = ?, descripcion = ?, categoria = ?, imagen_path = ? WHERE id = ?',
      [nombre, parseFloat(precio), descripcion, categoria, imagen_path, id],
      function (err) {
        if (err) return res.status(500).json({ error: 'Error al actualizar el producto.' });
        res.json({ message: 'Producto actualizado con imagen.' });
      }
    );
  } else {
    db.run(
      'UPDATE productos SET nombre = ?, precio = ?, descripcion = ?, categoria = ? WHERE id = ?',
      [nombre, parseFloat(precio), descripcion, categoria, id],
      function (err) {
        if (err) return res.status(500).json({ error: 'Error al actualizar el producto.' });
        res.json({ message: 'Producto actualizado.' });
      }
    );
  }
});

// Eliminar un producto (solo Admin, protegido por CSRF)
router.delete('/productos/:id', verifyToken, verifyAdmin, verifyCSRF, (req, res) => {
  db.run('DELETE FROM productos WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'Error al eliminar el producto.' });
    res.json({ message: 'Producto eliminado exitosamente.' });
  });
});

// Marcar como producto del día (solo Admin, protegido por CSRF)
router.patch('/productos/:id/oferta', verifyToken, verifyAdmin, verifyCSRF, (req, res) => {
  const id = req.params.id;
  const { estado, precio_oferta } = req.body; // estado: 1 para activar, 0 para desactivar

  db.serialize(() => {
    if (estado === 1) {
      // Desactivar todos los demás productos primero y limpiar sus precios de oferta
      db.run('UPDATE productos SET es_oferta_del_dia = 0, precio_oferta = NULL');
    }
    // Actualizar el seleccionado
    db.run(
      'UPDATE productos SET es_oferta_del_dia = ?, precio_oferta = ? WHERE id = ?',
      [estado, estado === 1 ? (precio_oferta || null) : null, id],
      function(err) {
        if (err) return res.status(500).json({ error: 'Error al actualizar la oferta del día.' });
        res.json({ message: 'Oferta del día actualizada.' });
      }
    );
  });
});

// --- PEDIDOS ---

// Crear un pedido anticipado (cliente fidelizado, protegido por CSRF)
router.post('/pedidos', verifyToken, verifyCSRF, (req, res) => {
  const { detalles, fecha_recogida } = req.body;
  const usuario_id = req.user.id;

  if (!detalles || !fecha_recogida) {
    return res.status(400).json({ error: 'Los detalles y la fecha de recogida son obligatorios.' });
  }

  // Parsear detalles del pedido
  let items = [];
  try {
    items = typeof detalles === 'string' ? JSON.parse(detalles) : detalles;
  } catch (e) {
    return res.status(400).json({ error: 'Formato de detalles del pedido inválido.' });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'El carrito no puede estar vacío.' });
  }

  // Obtener precios de los productos directamente de la base de datos para calcular el total de forma segura
  db.all('SELECT id, precio, nombre, es_oferta_del_dia, precio_oferta FROM productos', [], (err, productos) => {
    if (err) return res.status(500).json({ error: 'Error interno del servidor.' });

    const prodMap = {};
    productos.forEach(p => {
      prodMap[p.id] = p;
    });

    let total = 0;
    const itemsVerificados = [];

    for (const item of items) {
      const dbProd = prodMap[item.producto_id];
      if (!dbProd) {
        return res.status(400).json({ error: `El producto con ID ${item.producto_id} no existe.` });
      }
      const cantidad = parseInt(item.cantidad) || 1;
      
      // Determinar el precio final a cobrar
      const precioFinal = (dbProd.es_oferta_del_dia === 1 && dbProd.precio_oferta) ? dbProd.precio_oferta : dbProd.precio;
      
      total += precioFinal * cantidad;
      itemsVerificados.push({
        producto_id: dbProd.id,
        nombre: dbProd.nombre,
        precio: precioFinal,
        cantidad: cantidad
      });
    }

    const detallesJson = JSON.stringify(itemsVerificados);

    // Insertar el pedido en la base de datos
    db.run(
      'INSERT INTO pedidos (usuario_id, estado, total, fecha_recogida, detalles) VALUES (?, ?, ?, ?, ?)',
      [usuario_id, 'Pendiente', total, fecha_recogida, detallesJson],
      function (err) {
        if (err) return res.status(500).json({ error: 'Error al registrar el pedido.' });

        const pedidoId = this.lastID;
        // Asignar puntos de fidelidad: 1 punto por cada $1 gastado
        const puntosGanados = Math.floor(total);

        db.run(
          'UPDATE usuarios SET puntos = puntos + ? WHERE id = ?',
          [puntosGanados, usuario_id],
          (err) => {
            if (err) console.error('Error al actualizar los puntos del usuario', err);
            
            res.json({
              message: 'Pedido realizado con éxito.',
              pedidoId,
              puntosGanados,
              total
            });
          }
        );
      }
    );
  });
});

// Obtener pedidos (Cliente ve los suyos, Admin ve todos)
router.get('/pedidos', verifyToken, (req, res) => {
  if (req.user.rol === 'admin') {
    // Admin ve todos, uniendo con usuarios para mostrar nombre/email del cliente
    db.all(
      `SELECT p.id, p.usuario_id, p.estado, p.total, p.fecha_recogida, p.detalles, 
              u.nombre AS cliente_nombre, u.email AS cliente_email 
       FROM pedidos p 
       JOIN usuarios u ON p.usuario_id = u.id 
       ORDER BY p.id DESC`,
      [],
      (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error al obtener los pedidos.' });
        res.json(rows);
      }
    );
  } else {
    // Cliente ve solo los suyos
    db.all(
      'SELECT * FROM pedidos WHERE usuario_id = ? ORDER BY id DESC',
      [req.user.id],
      (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error al obtener tus pedidos.' });
        res.json(rows);
      }
    );
  }
});

// Cambiar estado del pedido (solo Admin, protegido por CSRF)
router.patch('/pedidos/:id/estado', verifyToken, verifyAdmin, verifyCSRF, (req, res) => {
  const id = req.params.id;
  const { estado } = req.body;

  if (!estado) {
    return res.status(400).json({ error: 'El estado es obligatorio.' });
  }

  db.run(
    'UPDATE pedidos SET estado = ? WHERE id = ?',
    [estado, id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Error al actualizar el estado del pedido.' });
      res.json({ message: 'Estado del pedido actualizado exitosamente.' });
    }
  );
});

// --- CLIENTES (MANTENEDOR ADMIN) ---

// Obtener clientes registrados y sus puntos (solo Admin)
router.get('/clientes', verifyToken, verifyAdmin, (req, res) => {
  db.all(
    "SELECT id, nombre, email, puntos FROM usuarios WHERE rol = 'cliente' ORDER BY nombre ASC",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Error al obtener clientes.' });
      res.json(rows);
    }
  );
});

module.exports = router;
