const express = require('express');
const db = require('../db/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, param, validationResult } = require('express-validator');

const { authenticateToken, authorizeAdmin } = require('../middlewares/auth');

const router = express.Router();

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// File filter to restrict file types
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const mimeType = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimeType && extname) {
        return cb(null, true);
    } else {
        return cb(new Error('Wrong file format'), false);
    }
};

const upload = multer({
    storage,
    limits: { fileSize: 1024 * 1024 * 5 }, // 5MB file size limit
    fileFilter
}).single('image');


// Middleware for validating product creation
const validateProduct = [
    body('title').isString().notEmpty().withMessage('Title must be a non-empty string'),
    body('price').isNumeric().withMessage('Price must be a number'),
    body('description').isString().notEmpty().withMessage('Description must be a non-empty string'),
    body('category_id').isInt().withMessage('Category ID must be an integer'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

// Get all products
router.get('/', (req, res) => {
    db.all(`SELECT * FROM products`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        return res.json(rows);
    });
});

router.get('/:productId', (req, res) => {
    const { productId } = req.params;

    db.all(`SELECT * FROM products WHERE id=?`, [productId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (rows.length === 0) {
            return res.status(404).json({ error: "Product not found!" });
        }
        return res.status(200).json(rows);
    });
});

// Create a product (requires admin)
router.post('/', authenticateToken, authorizeAdmin,validateProduct, (req, res) => {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            // Handle Multer errors
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ error: 'File size exceeds limit of 5MB.' });
            }
            return res.status(500).json({ error: err.message });
        } else if (err) {
            // Handle other errors
            if (err.message === 'Wrong file format') {
                return res.status(400).json({ error: 'Invalid file format. Only JPEG, JPG, PNG, and GIF are allowed.' });
            }
            return res.status(500).json({ error: err.message });
        }

        // Destructure the fields from req.body
        const { title, price, description, category_id } = req.body;

        if (typeof title !== 'string' || title.trim() === '') {
            return res.status(400).json({ error: 'Title must be a non-empty string' });
        }
        if (typeof price !== 'number' || isNaN(price)) {
            return res.status(400).json({ error: 'Price must be a number' });
        }
        if (typeof description !== 'string' || description.trim() === '') {
            return res.status(400).json({ error: 'Description must be a non-empty string' });
        }
        if (!Number.isInteger(category_id)) {
            return res.status(400).json({ error: 'Category ID must be an integer' });
        }

        const image = req.file ? req.file.path : null;

        // Basic validation
        if (!title || !price || !description || !category_id) {
            return res.status(400).json({ error: 'All fields (title, price, description, category_id) are required.' });
        }

        // Insert product into the database
        db.run(
            `INSERT INTO products (title, price, description, category_id, image) VALUES (?, ?, ?, ?, ?)`,
            [title, price, description, category_id, image],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                return res.status(201).json({
                    message: 'Product successfully created.',
                    product: {
                        id: this.lastID,
                        title,
                        price,
                        description,
                        category_id,
                        image
                    }
                });
            }
        );
    });
});



// Update a product
router.put('/:productId', (req, res) => {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading.
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ error: 'File size exceeds limit of 5MB.' });
            } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                return res.status(415).json({ error: 'Invalid file format. Only JPEG, JPG, PNG, and GIF are allowed.' });
            }
        } else if (err) {
            // An unknown error occurred when uploading.
            return res.status(500).json({ error: err.message });
        }

        const { productId } = req.params;
        const { title, description, price, category_id } = req.body;
        const image = req.file ? req.file.path : null;

        // Build the SQL query and parameters based on whether an image is provided
        const query = image ?
            `UPDATE products SET title = ?, description = ?, price = ?, category_id = ?, image = ? WHERE id = ?` :
            `UPDATE products SET title = ?, description = ?, price = ?, category_id = ? WHERE id = ?`;

        const params = image ? [title, description, price, category_id, image, productId] : [title, description, price, category_id, productId];

        db.run(query, params, function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Product not found or no changes made.' });
            }

            res.json({ message: 'Product updated successfully.', changes: this.changes });
        });
    });
});


// Delete a product
router.delete('/:productId', authenticateToken, authorizeAdmin, (req, res) => {
    const { productId } = req.params;

    db.all(`SELECT * FROM products WHERE id=?`, [productId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const product = rows[0];
        const imagePath = product.image ? path.join(product.image) : null;

        db.run(`DELETE FROM products WHERE id = ?`, [productId], function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // If there is an image, try to delete it from the server
            if (imagePath) {
                fs.unlink(imagePath, (unlinkErr) => {
                    if (unlinkErr) {
                        console.error('Failed to delete image file:', unlinkErr);
                    }
                });
            }

            return res.status(204).json({ message: 'Product deleted successfully' });
        });
    });
});


module.exports = router;
