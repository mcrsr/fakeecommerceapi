const express = require('express');
const db = require('../db/database');
const { authenticateToken } = require('../middlewares/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Utility function to query the database
const queryDB = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// Utility function to run a database command (e.g., UPDATE, DELETE)
const runDB = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

// Middleware for validating purchase request payload
const validatePurchase = [
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

// Purchase product by productId
router.post('/:productId', authenticateToken, validatePurchase, async (req, res) => {
    const db = require('../db/database');
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { productId } = req.params;
    const { quantity } = req.body;

    const transaction = new Promise((resolve, reject) => {
        db.serialize(async () => {
            try {
                await db.run('BEGIN TRANSACTION');

                // const carts = await queryDB('SELECT * FROM carts WHERE user_id=?', [userId]);
                // if (!carts.length) {
                //     await db.run('ROLLBACK');
                //     return res.status(404).json({ error: "Cart not found!" });
                // }

                const products = await queryDB('SELECT * FROM products WHERE id=?', [productId]);
                if (!products.length) {
                    await db.run('ROLLBACK');
                    return res.status(404).json({ error: "Product not found!" });
                }

                const inventory = await queryDB('SELECT * FROM inventory WHERE product_id=?', [productId]);
                if (!inventory.length) {
                    await db.run('ROLLBACK');
                    return res.status(404).json({ error: "Product not found in inventory!" });
                }

                const availableStock = inventory[0].stock;
                if (availableStock < quantity) {
                    await db.run('ROLLBACK');
                    return res.status(409).json({
                        error: "Requested quantity not available",
                        availableQuantity: availableStock
                    });
                }

                await runDB('UPDATE inventory SET stock=? WHERE product_id=?', [availableStock - quantity, productId]);

                const totalPrice = products[0].price * quantity;
                const data = {
                    "product title": products[0].title,
                    "quantity": quantity,
                    "total price": totalPrice
                };

                // await runDB('DELETE FROM cart_items WHERE cart_id=? AND product_id=?', [carts[0].id, productId]);

                await db.run('COMMIT');

                return res.status(200).json({
                    message: "Thank you for purchasing. Please check the products before proceeding.",
                    data: data
                });

            } catch (error) {
                await db.run('ROLLBACK');
                return res.status(500).json({ error: error.message });
            }
        });
    });

    transaction.catch(error => {
        return res.status(500).json({ error: error.message });
    });
});

// Purchase all the products from the cart
router.post('/', authenticateToken, async (req, res) => {
    const db = require('../db/database');
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const transaction = new Promise((resolve, reject) => {
        db.serialize(async () => {
            try {
                await db.run('BEGIN TRANSACTION');

                const carts = await queryDB('SELECT * FROM carts WHERE user_id=?', [userId]);
                if (!carts.length) {
                    await db.run('ROLLBACK');
                    return res.status(404).json({ error: "Cart not found!" });
                }

                const cartItems = await queryDB('SELECT * FROM cart_items WHERE cart_id=?', [carts[0].id]);
                if (!cartItems.length) {
                    await db.run('ROLLBACK');
                    return res.status(404).json({ error: "No products available in the cart!" });
                }

                const data = [];
                for (const cartItem of cartItems) {
                    const { product_id: productId, quantity } = cartItem;

                    const inventoryRows = await queryDB('SELECT * FROM inventory WHERE product_id=?', [productId]);
                    if (!inventoryRows.length) {
                        await db.run('ROLLBACK');
                        return res.status(404).json({ error: "Product not found in inventory!" });
                    }

                    const availableStock = inventoryRows[0].stock;
                    if (availableStock < quantity) {
                        await db.run('ROLLBACK');
                        return res.status(409).json({
                            error: "Requested quantity for product "+productId+" is not available",
                            availableQuantity: availableStock
                        });
                    }

                    await runDB('UPDATE inventory SET stock=? WHERE product_id=?', [availableStock - quantity, productId]);

                    const productRows = await queryDB('SELECT * FROM products WHERE id=?', [productId]);
                    const { title, price } = productRows[0];
                    const totalPrice = price * quantity;
                    data.push({ "product title": title, "quantity": quantity, "total price": totalPrice });

                    await runDB('DELETE FROM cart_items WHERE cart_id=? AND product_id=?', [carts[0].id, productId]);
                }

                await db.run('COMMIT');

                return res.status(200).json({
                    message: "Thank you for purchasing. Please check the products before proceeding.",
                    data: data
                });

            } catch (error) {
                await db.run('ROLLBACK');
                return res.status(500).json({ error: error.message });
            }
        });
    });

    transaction.catch(error => {
        return res.status(500).json({ error: error.message });
    });
});


module.exports = router;
