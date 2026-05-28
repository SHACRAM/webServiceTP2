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

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

	
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

const OrderSchema = z.object({
  id: z.string(),
  user_id: z.int(),
  product_id: z.int(),
  payment : z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date()
});

const ReviewSchema = z.object({
    id: z.string(),
    user_id: z.number().positive(),
    product_id: z.number().positive(),
    content: z.string(),
    createdAt: z.date(),
    updatedAt: z.date()
});

const CreateProductSchema = ProductSchema.omit({id: true});
const CreateUserSchema = UserSchema.omit({id: true});
const UpdateUserSchema = UserSchema.omit({});
const UpdateUserPartialSchema = CreateUserSchema.partial();
const CreateOrderSchema = OrderSchema.omit({});
const UpdateOrdersPartialSchema = CreateOrderSchema.partial();

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Récupérer tous les produits
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filtrer par nom
 *       - in: query
 *         name: price
 *         schema:
 *           type: number
 *         description: Prix maximum
 *     responses:
 *       200:
 *         description: Liste des produits
 */

app.get("/api/products", async (req,res) =>{
    const {name, about, price} = req.query;
    if(name){
        const searchName = `%${name}%`
        const products = await sql `
        SELECT * FROM products 
        WHERE name LIKE ${searchName}
        `;
        return res.send(products);
    }
    if(about){
        const searchAbout = `%${about}%`
        const products = await sql `
        SELECT * FROM products 
        WHERE about LIKE ${searchAbout}
        `;
        return res.send(products);
    }
    if(price){
        const searchPrice = `${price}`
        const products = await sql `
        SELECT * FROM products 
        WHERE price <= ${searchPrice}
        `;
        return res.send(products);
    }
    const allProducts = await sql`SELECT * FROM products`;
    return res.send(allProducts);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Récupérer un produit par son id
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: retourne un produit et ses infos
 *       404:
 *         description: Produit non trouvé
 */

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

//////////////////////////////////////////////
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

/**
 * @swagger
 * /api/users/{id}:
 *   patch:
 *     summary: mettre à jour les infos d'un utilisateur par son id
 *     tags: [users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Retourne les informations mises à jour du user
 *       404:
 *         description: user non trouvé
 */

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
//////////////////////////////////////////
/**
 * @swagger
 * /api/f2P-games:
 *   get:
 *     summary: Récupérer la liste des jeux free to play
 *     tags: [users]
 *     parameters: No params
 *     responses:
 *       200:
 *         description: Retourne tous les jeux
 *       500:
 *         description: Erreur serveur
 */
app.get("/api/f2p-games", async (req, res)=>{
    try{
        const result = await fetch('https://www.freetogame.com/api/games')
        if(!result.ok){
            return res.status(response.status).send({message:"Erreur de l'api externe"})
        }
        const games  = await result.json()
        res.send(games)
    } catch (error){
        console.error("Erreur:" , error)
        return res.status(500).send({message: "Erreur serveur"})
    }
    
})

/**
 * @swagger
 * /api/f2p-games/{id}:
 *   get:
 *     summary: récupérer un jeu par son id
 *     tags: [games]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Retourne les informations du jeu
 *       404:
 *         description: Le jeu est non trouvé
 */

app.get("/api/f2p-games/:id", async (req,res)=>{
    const gameId = req.params.id;
    try{
        const result = await fetch(`https://www.freetogame.com/api/game?id=${gameId}`)
        if(!result.ok){
            return res.status(response.status).send({message:"Erreur de l'api externe"})
        }
        const games  = await result.json()
        res.send(games)
    } catch (error){
        console.error("Erreur:" , error)
        return res.status(500).send({message: "Erreur serveur"})
    }
})

///////////////////////////////////////////////
app.post("/api/orders", async (req, res) => {
    try {
        const { userId, productId } = req.body;
        if (!userId || !productId) {
            return res.status(400).send({ message: "Informations manquantes." });
        }
        const products = await sql`
            SELECT price FROM products WHERE id = ${userId}
        `;
        
        if (products.length === 0) {
            return res.status(404).send({ message: "Produit non trouvé." });
        }
        
        const product = products[0];
        const totalProductPrice = product.price * 1.2;

        const newOrder = await sql`
            INSERT INTO orders (user_id, product_id, total)
            VALUES (${userId}, ${productId}, ${totalProductPrice})
            RETURNING *
        `;
        return res.status(201).send(newOrder[0]);

    } catch (error) {
        console.error("Erreur lors de la création de la commande :", error);
        
        if (!res.headersSent) {
            return res.status(500).send({ message: "Erreur serveur interne." });
        }
    }
});

app.get("/api/orders/:id", async (req,res)=>{
    try{
        const userId= req.params.id

        const userOrders = await sql`
            SELECT 
                o.id AS order_id,
                o.total,
                o.payment,
                o.createdAt,
                json_build_object(
                    'id', u.id,
                    'username', u.username,
                    'email', u.email
                ) AS user,
                json_build_object(
                    'id', p.id,
                    'name', p.name,
                    'about', p.about
                ) AS product
            FROM orders o
            JOIN users u ON o.user_id = u.id
            JOIN products p ON o.product_id = p.id 
            WHERE o.user_id = ${userId}::int
        `;
        if(userOrders .length > 0){
            return res.status(200).send(userOrders);
        } else {
            return res.status(400).send({message: "Pas de commandes"})
        }

    } catch (error){
        console.error("Erreur:" , error)
        return res.status(500).send({message: "Erreur serveur"})
    }
})

/**
 * @swagger
 * /api/orders/{id}:
 *   delete:
 *     summary: Supprimer une commande par son identifiant
 *     tags: [orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Retourne les infos de la commande supprimée
 *       404:
 *         description: Commande non trouvée
 */

app.delete("/api/orders/:id", async (req,res)=>{
    try{
        const orderId = req.params.id;

        const deletedOrder = await sql`
        DELETE FROM orders
        WHERE id= ${orderId}
        RETURNING *
        `;

        if(deletedOrder.length > 0){
            return res.status(200).send(deletedOrder);
        } else {
            return res.status(400).send({message: "Pas de commandes avec cet id"})
        }

    } catch (error){
        console.error("Erreur:" , error)
        return res.status(500).send({message: "Erreur serveur"})
    }
})


app.put("/api/orders/:id", async (req,res)=>{
    try{
        const { user_id, product_id } = req.body;
        const orderId = req.params.id

        const updateOrder = await sql`
            UPDATE orders
            SET user_id = ${user_id}, product_id = ${product_id}, updatedAt = NOW()
            WHERE id = ${orderId}
            RETURNING *
        `;
        if(updateOrder.length > 0){
            return res.status(200).send(updateOrder[0]);
        } else {
            return res.status(400).send({message: "Impossible de mettre à jour la commande"})
        }

    }catch (error){
        console.error("Erreur:" , error)
        return res.status(500).send({message: "Erreur serveur"})
    }
})


app.patch("/api/orders/:id", async (req,res)=>{
    try{
        const orderId = req.params.id
        const result = await UpdateOrdersPartialSchema.safeParse(req.body);

        if(result.success){
            const updateData = result.data;
            if (Object.keys(updateData).length === 0) {
                return res.status(400).send({ message: "Aucun champ valide n'a été fourni pour la modification." });
            }

            const order = await sql`
            UPDATE orders
            SET ${sql(updateData)}
            WHERE id = ${orderId}
            RETURNING *
            `;

            if(order.length === 0){
                res.status(404).send({message: "Commande non trouvée"})
            }

            res.send(order[0]);
        } else {
            res.status(400).send(result)
        }

    }catch (error){
        console.error("Erreur:" , error)
        return res.status(500).send({message: "Erreur serveur"})
    }
})

/////////////////////////////////////////////// TODO EXERCICE 6


app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
