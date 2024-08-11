const express = require('express');
const db = require('../db/database');
const { authenticateToken } = require('../middlewares/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Middleware for validating purchase request payload
const validatePurchase = [
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    body('productId').isInt().withMessage('Product ID must be an integer'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

// Purchase product by productId
router.post('/:productId', authenticateToken,validatePurchase, async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.params;
        const { quantity } = req.body;

        // Check if the cart exists for the user
        const carts = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM carts WHERE user_id=?`, [userId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        if (!carts || carts.length === 0) {
            return res.status(404).json({ "error": "Cart not found!" });
        }

        // Check if the product exists
        const products = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM products WHERE id=?`, [productId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        if (!products || products.length === 0) {
            return res.status(404).json({ "error": "Product not found!" });
        }

        // Check if the product is available in the inventory
        const inventory = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM inventory WHERE product_id=?`, [productId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        if (!inventory || inventory.length === 0) {
            return res.status(404).json({ "error": "Product not found!" });
        }

        const availableStock = inventory[0].stock;
        if (availableStock < quantity) {
            return res.status(409).json({
                "error": "Requested quantity not available",
                "availableQuantity": availableStock
            });
        }

        // Update the inventory to reduce the stock
        await new Promise((resolve, reject) => {
            db.run(`UPDATE inventory SET stock=? WHERE product_id=?`, [availableStock - quantity, productId], function (err) {
                if (err) reject(err);
                else resolve();
            });
        });

        // Calculate total price
        const priceOfTheEachProduct = products[0].price;
        const totalPriceOfTheProducts = priceOfTheEachProduct * quantity;

        // Prepare the data for the response
        const data = {
            "product title": products[0].title,
            "quantity": quantity,
            "total price": totalPriceOfTheProducts
        };

        // Send the response
        return res.status(200).json({
            "message": "Thank you for purchasing. Please check the products before proceeding.",
            "data": data
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});


// Purchase all the products from the cart
router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const carts = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM carts WHERE user_id=?`, [userId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        if (!carts || carts.length === 0) {
            return res.status(404).json({ "error": "Cart not found!" });
        }

        const cartItems = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM cart_items WHERE cart_id=?`, [carts[0].id], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        if (!cartItems || cartItems.length === 0) {
            return res.status(404).json({ "error": "No products available in the cart!" });
        }

        const data = [];
        for (const cartItem of cartItems) {
            const { product_id: productId, quantity } = cartItem;

            const inventoryRows = await new Promise((resolve, reject) => {
                db.all(`SELECT * FROM inventory WHERE product_id=?`, [productId], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            if (!inventoryRows || inventoryRows.length === 0) {
                return res.status(404).json({ "error": "Product not found!" });
            }

            const availableStock = inventoryRows[0].stock;
            if (availableStock < quantity) {
                return res.status(409).json({
                    "error": "Requested quantity not available",
                    "availableQuantity": availableStock
                });
            }

            await new Promise((resolve, reject) => {
                db.run(`UPDATE inventory SET stock=? WHERE product_id=?`, [availableStock - quantity, productId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            const productRows = await new Promise((resolve, reject) => {
                db.all(`SELECT * FROM products WHERE id=?`, [productId], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            const { title, price } = productRows[0];
            const totalPrice = price * quantity;
            data.push({ "product title": title, "quantity": quantity, "total price": totalPrice });
        }

        return res.status(200).json({
            "message": "Thank you for purchasing. Please check the products before proceeding.",
            "data": data
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});


module.exports = router;
