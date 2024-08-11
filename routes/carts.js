const express = require('express');
const db = require('../db/database');
const { authenticateToken } = require('../middlewares/auth');
const Joi = require('joi');  // For validation

const router = express.Router();

// Schema for validation
const cartItemSchema = Joi.object({
    product_id: Joi.number().integer().required(),
    quantity: Joi.number().integer().positive().required()
});

// Get cart for a user (requires authentication)
router.get('/', authenticateToken, (req, res) => {
    const userId = req.user.id;
    if (!userId) return res.sendStatus(401);

    db.get(`SELECT * FROM carts WHERE user_id = ?`, [userId], (err, cart) => {
        if (err) return res.status(500).json({ error: 'Internal server error' });
        if (!cart) return res.status(404).json({ error: 'Cart not found' });

        db.all(`SELECT * FROM cart_items WHERE cart_id = ?`, [cart.id], (err, items) => {
            if (err) return res.status(500).json({ error: 'Internal server error' });
            res.json({ cart, items });
        });
    });
});

// Get item by product id
router.get('/:productId', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { productId } = req.params;

    db.get(`SELECT * FROM carts WHERE user_id = ?`, [userId], (err, cart) => {
        if (err) return res.status(500).json({ error: 'Internal server error' });
        if (!cart) return res.status(404).json({ error: 'Cart not found' });

        db.get(`SELECT * FROM cart_items WHERE cart_id=? AND product_id=?`, [cart.id, productId], (err, cartItem) => {
            if (err) return res.status(500).json({ error: 'Internal server error' });
            if (!cartItem) return res.status(404).json({ error: 'Product not found' });
            res.status(200).json({ product_id: productId, quantity: cartItem.quantity });
        });
    });
});

// Add item to cart (requires authentication)
router.post('/', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { error, value } = cartItemSchema.validate(req.body);

    if (error) return res.status(400).json({ error: error.details[0].message });

    const { product_id, quantity } = value;

    db.get(`SELECT * FROM carts WHERE user_id = ?`, [userId], (err, cart) => {
        if (err) return res.status(500).json({ error: 'Internal server error' });

        const handleError = (err) => {
            if (err) return res.status(500).json({ error: 'Internal server error' });
        };

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            if (!cart) {
                db.run(`INSERT INTO carts (user_id) VALUES (?)`, [userId], function (err) {
                    handleError(err);
                    const newCartId = this.lastID;
                    db.run(`INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)`, [newCartId, product_id, quantity], (err) => {
                        db.run('COMMIT');
                        handleError(err);
                        res.status(201).json({ cart_id: newCartId, product_id, quantity });
                    });
                });
            } else {
                db.run(`INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)`, [cart.id, product_id, quantity], (err) => {
                    db.run('COMMIT');
                    handleError(err);
                    res.status(201).json({ cart_id: cart.id, product_id, quantity });
                });
            }
        });
    });
});

// Update the product quantity
router.put('/:productId', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { quantity } = req.body;
    const { productId } = req.params;

    if (!quantity) return res.status(400).json({ error: 'Quantity required' });

    const { error } = Joi.number().integer().positive().validate(quantity);
    if (error) return res.status(400).json({ error: 'Invalid quantity' });

    db.get(`SELECT * FROM carts WHERE user_id = ?`, [userId], (err, cart) => {
        if (err) return res.status(500).json({ error: 'Internal server error' });
        if (!cart) return res.status(404).json({ error: 'Cart not found' });

        db.get(`SELECT * FROM cart_items WHERE cart_id=? AND product_id=?`, [cart.id, productId], (err, cartItem) => {
            if (err) return res.status(500).json({ error: 'Internal server error' });
            if (!cartItem) return res.status(404).json({ error: 'Product not found' });

            db.run('BEGIN TRANSACTION');
            db.run(`UPDATE cart_items SET quantity=? WHERE cart_id=? AND product_id=?`, [quantity, cart.id, productId], (err) => {
                db.run('COMMIT');
                if (err) return res.status(500).json({ error: 'Internal server error' });
                res.status(200).json({ cart_id: cart.id, productId, quantity });
            });
        });
    });
});

// Delete the product from the cart
router.delete('/:productId', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { productId } = req.params;

    db.get(`SELECT * FROM carts WHERE user_id = ?`, [userId], (err, cart) => {
        if (err) return res.status(500).json({ error: 'Internal server error' });
        if (!cart) return res.status(404).json({ error: 'Cart not found' });

        db.get(`SELECT * FROM cart_items WHERE cart_id=? AND product_id=?`, [cart.id, productId], (err, cartItem) => {
            if (err) return res.status(500).json({ error: 'Internal server error' });
            if (!cartItem) return res.status(404).json({ error: 'Product not found' });

            db.run('BEGIN TRANSACTION');
            db.run(`DELETE FROM cart_items WHERE cart_id=? AND product_id=?`, [cart.id, productId], (err) => {
                db.run('COMMIT');
                if (err) return res.status(500).json({ error: 'Internal server error' });
                res.sendStatus(204);
            });
        });
    });
});

module.exports = router;
