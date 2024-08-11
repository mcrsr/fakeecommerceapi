const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');

const router = express.Router();

// Register a new user (admin can assign roles)
router.post('/register', (req, res) => {
    const { username, password, role = 'user' } = req.body; // Default role is 'user'
    
    // Check if username or password is missing
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
            if (err) return res.status(500).json({ error: err.message });
            if (user) return res.status(409).json({ error: 'Username already exists' });
            db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, [username, hashedPassword, role], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                return res.status(201).json({ id: this.lastID });
            });
        });    
    });
});

// Login
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Check if username or password is missing
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'User not found' });

        bcrypt.compare(password, user.password, (err, match) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!match) return res.status(401).json({ error: 'Invalid password' });

            const token = jwt.sign({ id: user.id, role: user.role }, 'secret',{ expiresIn: '30m' });
            res.json({ "token":token,"expiresIn":"30m" });
        });
    });
});


module.exports = router;
