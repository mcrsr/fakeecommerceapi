const express = require('express');
const db = require('../db/database');
const { authenticateToken, authorizeAdmin } = require('../middlewares/auth');

const router = express.Router();

// Get cart for a user (requires authentication)
router.get('/', authenticateToken, authorizeAdmin, (req, res) => {
    const userId = req.user.id;

    if (!userId) {
        return res.sendStatus(401); // Unauthorized
    }

    db.all(`SELECT * FROM users`, [], (err, users) => {
        if (err) {
            console.error('Database error:', err.message); // Logging the error
            return res.status(500).json({ error: 'Internal server error' }); // Provide a generic error message
        }

        return res.json({ data: { users } }); // Consistent response structure
    });
});

module.exports = router;
