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

INSERT INTO products (name, about, price) VALUES
  ('My first game', 'This is an awesome game', '60')
