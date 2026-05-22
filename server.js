const express = require("express");
const postgres = require("postgres");
const dotenv = require("dotenv");
const z = require("zod");
const app = express();
const port = 8000;
require('dotenv').config();

const sql = postgres({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    database: process.env.POSTGRES_DB,
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
});

app.use(express.json());

	
const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  about: z.string(),
  price: z.number().positive(),
});

const CreateProductSchema = ProductSchema.omit({id: true});

app.get("/api/products", async (req,res) =>{
    const products = await sql `
    SELECT * FROM products
    `;
    res.send(products);
});

app.get("/api/products/:id", async (req,res) =>{
    id = req.params.id;

    const product = await sql `
    SELECT * FROM products WHERE id=${id}
    `;
    if (product.length > 0){
        res.send(product[0]);
    } else {
        res.status(404).send({message : "Not found"})
    }
});

app.post("/api/products", async (req,res) =>{
    console.log('test');
    const result = await CreateProductSchema.safeParse(req.body);
    if (result.success) {
        const {name, about, price} = result.data;
        const product = await sql `
        INSERT INTO products (name, about, price)
        VALUES (${name}, ${about}, ${price})
        RETURNING *
        `
        res.send(product[0]);
        console.log(result)
    } else {
        console.log(result)

        res.status(400).send(result);
    }
});

app.delete("/api/products/:id", async (req,res) =>{
    const product = await sql`
    DELETE FROM products
    WHERE id=${req.params.id}
    RETURNING *
    `;
    if(product.length > 0){
        res.send(product[0])
    } else {
        res.status(404).send({message : "Not found"})
    }
});

app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
