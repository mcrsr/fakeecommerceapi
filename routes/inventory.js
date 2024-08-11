const express = require('express');
const db = require('../db/database');
const { authenticateToken, authorizeAdmin } = require('../middlewares/auth');

const router = express.Router();

// Get inventory for a product
router.get('/:productId', (req, res) => {
    const { productId } = req.params;
    db.get(`SELECT * FROM inventory WHERE product_id = ?`, [productId], (err, inventory) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!inventory) return res.status(404).json({ error: 'Inventory not found' });
        res.json(inventory);
    });
});

// Get All the inventory
router.get('/', (req, res) => {
    db.all(`SELECT * FROM inventory`, [], (err, inventory) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!inventory) return res.status(404).json({ error: 'Inventory not found' });
        res.json(inventory);
        return;
    });
});

// Update inventory for a product (requires admin)
router.post('/:productId', authenticateToken, authorizeAdmin, (req, res) => {
    const { productId } = req.params;
    const { stock } = req.body;
    db.run(`UPDATE inventory SET stock = ? WHERE product_id = ?`, [stock, productId], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Product not found' });
        res.status(200).json({ message: 'Inventory updated' });
    });
});

module.exports = router;
