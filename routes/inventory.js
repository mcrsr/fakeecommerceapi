const express = require('express');
const db = require('../db/database');
const { authenticateToken, authorizeAdmin } = require('../middlewares/auth');
const Joi = require('joi');

const router = express.Router();

// Schema for validation
const cartItemSchema = Joi.object({
    product_id: Joi.number().integer().required(),
    stock: Joi.number().integer().positive().required()
});

// Helper function for database queries
const queryDb = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

// Helper function for database queries to handle multiple rows
const queryAllDb = (query, params = []) => {
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

// Get inventory for a product
router.get('/:productId', async (req, res) => {
    const { productId } = req.params;
    try {
        const inventory = await queryDb('SELECT * FROM inventory WHERE product_id = ?', [productId]);
        if (!inventory) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(inventory);
    } catch (err) {
        console.log("DB Error: "+err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get all inventory
router.get('/', async (req, res) => {
    try {
        const inventory = await queryAllDb('SELECT * FROM inventory');
        if (inventory.length === 0) {
            return res.status(404).json({ error: 'No inventory found' });
        }
        res.json(inventory);
    } catch (err) {
        console.log("DB Error: "+err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/',authenticateToken,authorizeAdmin, async (req, res) => {

    const { error, value } = cartItemSchema.validate(req.body);

    if (error) return res.status(400).json({ error: error.details[0].message });

    const {product_id,stock} = value;

    try {
        const inventory = await queryAllDb('SELECT * FROM inventory');
        if (inventory.length === 0) {
            return res.status(404).json({ error: 'No inventory found' });
        }
        const requiredProduct = await queryAllDb('SELECT * FROM inventory WHERE product_id=?',[product_id]);
        if(requiredProduct.length !== 0) return res.status(409).json({"error":"Product is already exists."})
        const result = await runDb('INSERT INTO inventory (product_id, stock) VALUES (?,?)', [product_id, stock]);
        return res.status(201).json({result})
    } catch (err) {
        console.log("DB Error: "+err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Update inventory for a product (requires admin)
router.put('/:productId', authenticateToken, authorizeAdmin, async (req, res) => {
    const { productId } = req.params;
    const { stock } = req.body;

    if (typeof stock !== 'number' || stock < 0) {
        return res.status(400).json({ error: 'Invalid stock value' });
    }

    try {
        const result = await runDb('UPDATE inventory SET stock = ? WHERE product_id = ?', [stock, productId]);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.status(200).json({ message: 'Inventory updated' });
    } catch (err) {
        console.log("DB Error: "+err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
