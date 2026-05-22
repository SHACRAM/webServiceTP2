const express = require("express");
const postgres = require("postgres");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const z = require("zod");
const app = express();
const port = 8000;
require('dotenv').config();

const saltRounds = parseInt(process.env.SALT_ROUNDS, 10) || 10;


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

const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  password: z.string(),
});

const CreateProductSchema = ProductSchema.omit({id: true});
const CreateUserSchema = UserSchema.omit({id: true});
const UpdateUserSchema = UserSchema.omit({})
const UpdateUserPartialSchema = CreateUserSchema.partial()

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
    const result = await CreateProductSchema.safeParse(req.body);
    if (result.success) {
        const {name, about, price} = result.data;
        const product = await sql `
        INSERT INTO products (name, about, price)
        VALUES (${name}, ${about}, ${price})
        RETURNING *
        `
        res.send(product[0]);
    } else {
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


app.get("/api/users", async (req,res)=>{
    const result = await sql `
    SELECT * FROM users
    `
    if(result.length > 0){
        res.send(result)
    } else {
        res.status(404).send({message: "No users found"})
    }
})


app.post("/api/users", async (req, res)=>{
    try {
        const result = await CreateUserSchema.safeParse(req.body);
        if(result.success){
            const {username, email, password } = result.data;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            const user = await sql `
            INSERT INTO users (username, email, password)
            VALUES (${username}, ${email}, ${hashedPassword})
            RETURNING username, email
            `
            res.send(user[0]);
        } else {
            res.status(400).send(result)
        }
    } catch (error){
        console.error("Erreur:", error)
        res.status(500).send({message: "Erreur serveur"})
    }
    
})

app.put("/api/users/:id", async (req,res)=>{
        const userId = req.params.id;
    try{
        const result = await CreateUserSchema.safeParse(req.body)
        if(result.success){
            const {username, email, password } = result.data;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            const user = await sql `
            UPDATE users 
            SET username = ${username}, email = ${email}, password = ${hashedPassword}
            WHERE id = ${userId}
            RETURNING username, email
            `
            res.send(user[0]);
        } else {
            res.status(400).send(result)
        }
    } catch (error){
        console.error("Server error:", error)
        res.status(500).send({message: "Erreur serveur"})
    }
})

app.patch("/api/users/:id", async (req,res)=>{
        const userId = req.params.id;
    try{
        const result = await UpdateUserPartialSchema.safeParse(req.body)
        if(result.success){
            const updateData = result.data;
            
            if (Object.keys(updateData).length === 0) {
                return res.status(400).send({ message: "Aucun champ valide n'a été fourni pour la modification." });
            }

            if(updateData.password){
                const hashedPassword = await bcrypt.hash(password, saltRounds);
            }

            const user = await sql`
            UPDATE users
            SET ${sql(updateData)}
            WHERE id = ${userId}
            RETURNING id, username, email
            `;

            if(user.length === 0){
                res.status(404).send({message: "Utilisateur non trouvé"})
            }
            
            res.send(user[0]);
        } else {
            res.status(400).send(result)
        }
    } catch (error){
        console.error("Server error:", error)
        res.status(500).send({message: "Erreur serveur"})
    }
})

app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
