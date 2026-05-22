CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  about VARCHAR(500),
  price FLOAT
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(200) UNIQUE NOT NULL,
  password VARCHAR(300) NOT NULL
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  product_id INT REFERENCES products(id),
  total NUMERIC(10,2) NOT NULL,
  payment BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT NOW(),
  UpdatedAt TIMESTAMP DEFAULT NOW()
);


INSERT INTO products (name, about, price) VALUES
  ('My first game', 'This is an awesome game', '60')
