// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const secret = process.env.JWT_SECRET || 'secret';

const auth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token ausente' });
  }

  const token = header.split(' ')[1];

  try {
    const payload = jwt.verify(token, secret);
    const user = await User.findById(payload.id).select('-passwordHash');
    if (!user) return res.status(401).json({ message: 'Utilizador não encontrado' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido' });
  }
};

const permit = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Não autenticado' });
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Acesso proibido' });
    }
    next();
  };
};

module.exports = { auth, permit };