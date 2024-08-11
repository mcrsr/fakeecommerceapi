const express = require('express');
const db = require('../db/database');
const { authenticateToken, authorizeAdmin } = require('../middlewares/auth');

const router = express.Router();



// Get all categories
router.get('/', (req, res) => {
    db.all(`SELECT * FROM categories`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        return res.json(rows);
    });
});

// get category by id
router.get('/:categoryId', (req, res) => {
    const { categoryId } = req.params;
    db.all(`SELECT * FROM categories WHERE id=?`, [categoryId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (rows.length != 0) {
            return res.json(rows);
        } else {
            return res.sendStatus(404);
        }
    });
});

// Create a category (requires admin)
router.post('/', authenticateToken, authorizeAdmin, (req, res) => {
    const { name } = req.body;
    db.run(`INSERT INTO categories (name) VALUES (?)`, [name], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        return res.status(201).json({ id: this.lastID });
    });
});

// update category by id
router.put('/:categoryId', authenticateToken, authorizeAdmin,(req, res) => {
    const { categoryId } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ "error": "Required field name is missing" });
    db.all(`SELECT * FROM categories WHERE id=?`, [categoryId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if(rows.length === 0) return res.sendStatus(404);
        db.run(`UPDATE categories SET name=? WHERE id=?`, [name, categoryId], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            return res.status(200).json({ id: this.lastID });
        });
    });
});


// delete category by id
router.delete('/:categoryId', authenticateToken, authorizeAdmin,(req, res) => {
    const { categoryId } = req.params;
    db.all(`SELECT * FROM categories WHERE id=?`, [categoryId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if(rows.length === 0) return res.sendStatus(404);
        db.run(`DELETE FROM categories WHERE id=?`, [categoryId], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            return res.sendStatus(204);
        });
    });
});

module.exports = router;
