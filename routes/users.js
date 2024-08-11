const express = require('express');
const db = require('../db/database');
const { authenticateToken, authorizeAdmin } = require('../middlewares/auth');

const router = express.Router();

// Get cart for a user (requires authentication)
router.get('/', authenticateToken,authorizeAdmin, (req, res) => {
    const userId = req.user.id;
    if(userId == null) return res.sendStatus(401);
    db.all(`SELECT * FROM users`, [], (err, users) => {
        if (err) return res.status(500).json({ error: err.message });
        return res.json({users});
    });
});

module.exports = router;
