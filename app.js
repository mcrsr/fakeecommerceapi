const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const categoriesRoutes = require('./routes/categories');
const productsRoutes = require('./routes/products');
const cartsRoutes = require('./routes/carts');
const inventoryRoutes = require('./routes/inventory');
const purchasesRoutes = require('./routes/purchases');
const useresRoutes = require('./routes/users');

const app = express();
app.use(bodyParser.json());

app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
app.use(morgan('combined'));

// Middleware to check Accept header
app.use((req, res, next) => {
    if (!req.accepts('json')) {
      return res.status(406).json({
        "code": "UnsupportedType",
        "message": "Only 'application/json' content type(s) supported.",
      });
    }
    next();
});


// Middleware to simulate a 408 Request Timeout
app.use('/timeout', (req, res, next) => {
    // Simulate a long delay
    setTimeout(() => {
      res.status(408).json({ error: 'Failed to process request in time. Please try again.' });
    }, 10000); // 10 seconds delay
});

app.use('/auth', authRoutes);
app.use('/categories', categoriesRoutes);
app.use('/products', productsRoutes);
app.use('/carts', cartsRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/purchases', purchasesRoutes);
app.use('/users',useresRoutes);

app.use('/auth/login', (req, res, next) => {
    res.setHeader('Allow', 'POST');
    res.sendStatus(405);
  });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
