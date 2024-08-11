const express = require('express');
const db = require('../db/database');
const { authenticateToken, authorizeAdmin } = require('../middlewares/auth');

const router = express.Router();

// Helper function for database queries
const queryDb = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const runDb = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

// Get all categories
router.get('/', async (req, res) => {
    try {
        const rows = await queryDb('SELECT * FROM categories');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get category by ID
router.get('/:categoryId', async (req, res) => {
    const { categoryId } = req.params;
    try {
        const rows = await queryDb('SELECT * FROM categories WHERE id=?', [categoryId]);
        if (rows.length) {
            res.json(rows[0]);
        } else {
            res.sendStatus(404);
        }
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Create a category (requires admin)
router.post('/', authenticateToken, authorizeAdmin, async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Required field name is missing' });

    try {
        const result = await runDb('INSERT INTO categories (name) VALUES (?)', [name]);
        res.status(201).json({ id: result.lastID });
    } catch (err) {
        console.log("DB Error: "+err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Update category by ID
router.put('/:categoryId', authenticateToken, authorizeAdmin, async (req, res) => {
    const { categoryId } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Required field name is missing' });

    try {
        const rows = await queryDb('SELECT * FROM categories WHERE id=?', [categoryId]);
        if (rows.length === 0) return res.sendStatus(404);

        await runDb('UPDATE categories SET name=? WHERE id=?', [name, categoryId]);
        res.status(200).json({ id: categoryId });
    } catch (err) {
        console.log("DB Error: "+err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Delete category by ID
router.delete('/:categoryId', authenticateToken, authorizeAdmin, async (req, res) => {
    const { categoryId } = req.params;

    try {
        const rows = await queryDb('SELECT * FROM categories WHERE id=?', [categoryId]);
        if (rows.length === 0) return res.sendStatus(404);

        await runDb('DELETE FROM categories WHERE id=?', [categoryId]);
        res.sendStatus(204);
    } catch (err) {
        console.log("DB Error: "+err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
