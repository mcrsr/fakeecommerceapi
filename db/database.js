const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:');

db.serialize(() => {
    // Create tables
    db.run(`CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
    )`);

    db.run(`CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        price REAL NOT NULL,
        description TEXT,
        category_id INTEGER NOT NULL,
        image TEXT,
        FOREIGN KEY(category_id) REFERENCES categories(id)
    )`);

    db.run(`CREATE TABLE inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        stock INTEGER NOT NULL,
        FOREIGN KEY(product_id) REFERENCES products(id)
    )`);

    db.run(`CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user'
    )`);

    db.run(`CREATE TABLE carts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE cart_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cart_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        FOREIGN KEY(cart_id) REFERENCES carts(id),
        FOREIGN KEY(product_id) REFERENCES products(id)
    )`);

    db.run(`CREATE TABLE purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        total_amount REAL NOT NULL,
        purchase_date TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE purchase_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        purchase_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        FOREIGN KEY(purchase_id) REFERENCES purchases(id),
        FOREIGN KEY(product_id) REFERENCES products(id)
    )`);

    // Insert sample data
    db.run(`INSERT INTO categories (name) VALUES ('Electronics')`);
    db.run(`INSERT INTO categories (name) VALUES ('Books')`);
    db.run(`INSERT INTO categories (name) VALUES ('Clothing')`);

    db.run(`INSERT INTO products (title, price, description, category_id, image) VALUES ('Smartphone', 299.99, 'Latest model with high resolution camera', 1, 'smartphone.jpg')`);
    db.run(`INSERT INTO products (title, price, description, category_id, image) VALUES ('Laptop', 799.99, 'High-performance laptop for gaming and work', 1, 'laptop.jpg')`);
    db.run(`INSERT INTO products (title, price, description, category_id, image) VALUES ('JavaScript Book', 29.99, 'Learn JavaScript from scratch', 2, 'js_book.jpg')`);
    db.run(`INSERT INTO products (title, price, description, category_id, image) VALUES ('T-Shirt', 19.99, 'Comfortable cotton t-shirt', 3, 'tshirt.jpg')`);

    db.run(`INSERT INTO inventory (product_id, stock) VALUES (1, 50)`);
    db.run(`INSERT INTO inventory (product_id, stock) VALUES (2, 30)`);
    db.run(`INSERT INTO inventory (product_id, stock) VALUES (3, 100)`);
    db.run(`INSERT INTO inventory (product_id, stock) VALUES (4, 75)`);

    db.run(`INSERT INTO users (username, password, role) VALUES ('user','$2a$10$5nXfMZNb6FyFEHDaG7VwDOrI3NYDSJkgOrhXaThO5MR9GW3uhqQWK','user')`);
    db.run(`INSERT INTO users (username, password, role) VALUES ('admin','$2a$10$lfd9TEA2HEOdoAWhig7Cg.wsdqqeEH0uPHaFetFVlH4nNTzDEkmfO','admin')`);

    db.run(`INSERT INTO carts (user_id) VALUES (1)`);
    db.run(`INSERT INTO carts (user_id) VALUES (2)`);

    db.run(`INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (1, 1, 1)`);
    db.run(`INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (1, 3, 2)`);
    db.run(`INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (2, 2, 1)`);
    db.run(`INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (2, 4, 3)`);

    db.run(`INSERT INTO purchases (user_id, total_amount, purchase_date) VALUES (1, 349.97, '2024-08-03')`);
    db.run(`INSERT INTO purchases (user_id, total_amount, purchase_date) VALUES (2, 819.97, '2024-08-03')`);

    db.run(`INSERT INTO purchase_items (purchase_id, product_id, quantity, price) VALUES (1, 1, 1, 299.99)`);
    db.run(`INSERT INTO purchase_items (purchase_id, product_id, quantity, price) VALUES (1, 3, 2, 29.99)`);
    db.run(`INSERT INTO purchase_items (purchase_id, product_id, quantity, price) VALUES (2, 2, 1, 799.99)`);
    db.run(`INSERT INTO purchase_items (purchase_id, product_id, quantity, price) VALUES (2, 4, 3, 19.99)`);
});

module.exports = db;
