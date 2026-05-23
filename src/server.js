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
// Las imágenes de productos siempre se sirven sin caché para reflejar cambios inmediatamente.
// Los assets estáticos como CSS/JS solo omiten caché en desarrollo.
const staticOptions = {
  setHeaders: (res, filePath) => {
    // Imágenes de productos y catálogo PDF: nunca cachear (el admin puede actualizarlas)
    if (filePath.includes('/img/prod-') || filePath.includes('/pdf/catalogo.pdf')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else if (process.env.NODE_ENV !== 'production') {
      // En desarrollo, tampoco cachear CSS ni JS
      if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      }
    }
  }
};
app.use(express.static(path.join(__dirname, '../public'), staticOptions));

// Middleware: las respuestas de la API nunca deben ser cacheadas por el navegador.
// Esto asegura que cambios de productos (imágenes, precios, etc.) se reflejen inmediatamente.
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Rutas de API
app.use('/api', apiRoutes);

// Ruta por defecto para SPA/Fallbacks
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor de La Dulcería corriendo en http://localhost:${PORT}`);
});
