const jwt = require('jsonwebtoken');

// Environment variable for JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        // if (err) return res.sendStatus(403);
        if (err) return res.status(401).json({"error":err});
        req.user = user;
        next();
    });
};

// Middleware to check if the user is an admin
const authorizeAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    next();
};

module.exports = { authenticateToken, authorizeAdmin };
