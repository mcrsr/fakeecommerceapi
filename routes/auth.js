const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const rateLimit = require('express-rate-limit'); // For rate limiting
const { authenticateToken, authorizeAdmin } = require('../middlewares/auth');

const router = express.Router();

// Environment variable for JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

// Rate limiting middleware for login route
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many login attempts, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Register a new user (admin can assign roles)
router.post('/register', (req, res) => {
    const { username, password, role = 'user' } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) return res.status(500).json({ error: 'Internal server error' });

        db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
            if (err) return res.status(500).json({ error: 'Internal server error' });
            if (user) return res.status(409).json({ error: 'Username already exists' });

            db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, [username, hashedPassword, role], function (err) {
                if (err) return res.status(500).json({ error: 'Internal server error' });
                return res.status(201).json({ id: this.lastID });
            });
        });
    });
});

// Login with rate limiting
router.post('/login', loginLimiter, (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (err) return res.status(500).json({ error: 'Internal server error' });
        if (!user) return res.status(404).json({ error: 'User not found' });

        bcrypt.compare(password, user.password, (err, match) => {
            if (err) return res.status(500).json({ error: 'Internal server error' });
            if (!match) return res.status(401).json({ error: 'Invalid password' });

            const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30m' });
            res.json({ token, expiresIn: '30m' });
        });
    });
});

router.put('/update-password',authenticateToken , (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: 'oldPassword and newPassword are required' });
    }

    if(oldPassword === newPassword){
        return res.status(400).json({ error: 'oldPassword and newPassword cannot be the same' });
    }

    db.get(`SELECT * FROM users WHERE id = ?`, [userId], (err, user) => {
        if (err) return res.status(500).json({ error: 'Internal server error' });
        if (!user) return res.status(404).json({ error: 'User not found' });

        bcrypt.compare(oldPassword, user.password, (err, match) => {
            if (err) return res.status(500).json({ error: 'Internal server error' });
            if (!match) return res.status(401).json({ error: 'Invalid password' });
            
            bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
                if (err) return res.status(500).json({ error: 'Internal server error' });
        
                db.get(`UPDATE users SET password = ? WHERE id = ?`, [hashedPassword,userId], (err, user) => {
                    if (err) return res.status(500).json({ error: 'Internal server error' });
                    return res.status(200).json({"message":"Password updated successfully."});
                });
            });
        });
    });
});

module.exports = router;
