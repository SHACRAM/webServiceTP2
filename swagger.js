const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Api f2p market",
      version: "1.0.0",
      description: "Documentation de l'API produits, users, orders",
    },
    servers: [
      {
        url: "http://localhost:8000",
      },
    ],
  },
  apis: ["./server.js"], 
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;