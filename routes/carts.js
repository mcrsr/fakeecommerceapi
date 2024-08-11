const express = require('express');
const db = require('../db/database');
const { authenticateToken, authorizeAdmin } = require('../middlewares/auth');

const router = express.Router();

// Get cart for a user (requires authentication)
router.get('/', authenticateToken, (req, res) => {
    const userId = req.user.id;
    if (userId == null) return res.sendStatus(401);
    db.get(`SELECT * FROM carts WHERE user_id = ?`, [userId], (err, cart) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!cart) return res.status(404).json({ error: 'Cart not found' });
        db.all(`SELECT * FROM cart_items WHERE cart_id = ?`, [cart.id], (err, items) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ cart, items });
        });
    });
});

// get by product id
router.get('/:productId', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { productId } = req.params;
    db.get(`SELECT * FROM carts WHERE user_id = ?`, [userId], (err, cart) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!cart) {
            return res.status(404).json({ "message": "Cart not found!" });
        } else {
            db.get(`SELECT * FROM cart_items WHERE cart_id=? AND product_id=?`, [cart.id, productId], (err, cart_items) => {
                if (err) return res.status(500).json({ error: err.message });
                if (!cart_items) return res.status(404).json({ "message": "Product not found!" });
                return res.status(200).json({"product_id":productId,"quantity":cart_items.quantity});
            });
        }
    });
});

// Add item to cart (requires authentication)
router.post('/', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { product_id, quantity } = req.body;
    if (!product_id || !quantity) return res.status(400).json({ "message": "product_id and quantity required" });
    db.get(`SELECT * FROM carts WHERE user_id = ?`, [userId], (err, cart) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!cart) {
            db.run(`INSERT INTO carts (user_id) VALUES (?)`, [userId], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                const newCartId = this.lastID;
                db.run(`INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)`, [newCartId, product_id, quantity], (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    return res.status(201).json({ cart_id: newCartId, product_id, quantity });
                });
            });
        } else {
            db.run(`INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)`, [cart.id, product_id, quantity], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                return res.status(201).json({ cart_id: cart.id, product_id, quantity });
            });
        }
    });
});

// Update the product quantity
router.put('/:productId', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { quantity } = req.body;
    const { productId } = req.params;
    if (!quantity) return res.status(400).json({ "message": "quantity required" });
    db.get(`SELECT * FROM carts WHERE user_id = ?`, [userId], (err, cart) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!cart) {
            return res.status(404).json({ "message": "Cart not found!" });
        } else {
            db.get(`SELECT * FROM cart_items WHERE cart_id=? AND product_id=?`, [cart.id, productId], (err, cart_items) => {
                if (err) return res.status(500).json({ error: err.message });
                if (!cart_items) return res.status(404).json({ "message": "Product not found!" });
                db.run(`UPDATE cart_items SET quantity=? WHERE cart_id=? AND product_id=?`, [quantity, cart.id, productId], (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    return res.status(200).json({ cart_id: cart.id, productId, quantity });
                });
            });
        }
    });
});


// Delete the product from the cart
router.delete('/:productId', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { productId } = req.params;
    db.get(`SELECT * FROM carts WHERE user_id = ?`, [userId], (err, cart) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!cart) {
            return res.status(404).json({ "message": "Cart not found!" });
        } else {
            db.get(`SELECT * FROM cart_items WHERE cart_id=? AND product_id=?`, [cart.id, productId], (err, cart_items) => {
                if (err) return res.status(500).json({ error: err.message });
                if (!cart_items) return res.status(404).json({ "message": "Product not found!" });
                db.run(`DELETE FROM cart_items WHERE cart_id=? AND product_id=?`, [cart.id, productId], (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    return res.sendStatus(204);
                });
            });
        }
    });
});

module.exports = router;
