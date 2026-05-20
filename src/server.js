const express = require('express');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos
// Rutas para las Vistas
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/index.html'));
});

app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/admin.html'));
});

// Archivos estáticos (CSS, JS, imágenes del public)
app.use(express.static(path.join(__dirname, '../public')));

// Rutas de API
app.use('/api', apiRoutes);

// Ruta por defecto para SPA/Fallbacks
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor de La Dulcería corriendo en http://localhost:${PORT}`);
});
