const jwt = require('jsonwebtoken');

// Obtener la clave secreta desde el entorno o generar una segura aleatoria si es necesario
const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_jwt_key_dulceria_123';

// Helper de parsing manual de cookies para evitar dependencias externas
const parseCookies = (cookieHeader) => {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = parts[0].trim();
    const value = parts.slice(1).join('=').trim();
    cookies[name] = decodeURIComponent(value);
  });
  return cookies;
};

const verifyToken = (req, res, next) => {
  const cookies = parseCookies(req.headers.cookie);
  let token = cookies.token;
  
  // Soporte de fallback para Authorization Header (útil para pruebas)
  if (!token && req.headers['authorization']) {
    const authHeader = req.headers['authorization'];
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }
  
  if (!token) {
    return res.status(403).json({ error: 'Acceso denegado. Token no proporcionado.' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};

const verifyAdmin = (req, res, next) => {
  if (req.user && req.user.rol === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
  }
};

// Middleware para verificar la cabecera CSRF en peticiones de cambio de estado
const verifyCSRF = (req, res, next) => {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  const cookies = parseCookies(req.headers.cookie);
  const cookieCsrfToken = cookies.csrf_token;
  const headerCsrfToken = req.headers['x-csrf-token'];

  if (!cookieCsrfToken || !headerCsrfToken || cookieCsrfToken !== headerCsrfToken) {
    return res.status(403).json({ error: 'Petición rechazada. Token CSRF inválido o ausente.' });
  }

  next();
};

module.exports = { verifyToken, verifyAdmin, verifyCSRF, SECRET_KEY, parseCookies };
