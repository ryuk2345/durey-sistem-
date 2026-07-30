const { planilla_inventario } = require('./data');

const getDiaClave = () => {
  const dias = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
  return dias[new Date().getDay()];
};

const findPlanillaBySku = (sku) => {
  if (sku.startsWith('DAM')) return sku.includes('GRI') ? 'A109' : 'A101';
  if (sku.startsWith('CAB') || sku.startsWith('ADU')) return 'B117';
  if (sku.startsWith('NIN')) return sku.includes('BLA') ? 'A105' : 'A103';
  if (sku.startsWith('FUT')) return 'B120';
  return 'A101';
};

const authMiddleware = (req, res, next) => {
  const token = req.headers['x-auth-token'];
  if (!token) return next();
  const { usuarios } = require('./data');
  const user = usuarios.find(u => u.username === token);
  if (user) req.usuario = user;
  next();
};

module.exports = { getDiaClave, findPlanillaBySku, authMiddleware };
