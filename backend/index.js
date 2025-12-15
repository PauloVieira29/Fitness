// backend/index.js
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const config = require("./config"); // Mantemos para fallback local
const User = require("./models/User");
const bcrypt = require("bcryptjs");

// --- SWAGGER ---
const swaggerUi = require('swagger-ui-express');
let swaggerDocument;
try {
  swaggerDocument = require('./doc/api.json');
} catch (err) {
  console.log('⚠️ Aviso: Swagger não encontrado.');
}

const app = express();
const server = http.createServer(app);

// 1. AJUSTE: Porto dinâmico para o Render
const port = process.env.PORT || 5000;

// 2. AJUSTE: CORS dinâmico
// Permite o localhost (testes) e o frontend no Vercel (que vamos configurar depois)
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5000",
  process.env.FRONTEND_URL // Variável que irás definir no Render com o link do Vercel
];

app.use(cors({
  origin: function (origin, callback) {
    // Permite pedidos sem origem (ex: Postman ou mobile apps) ou se estiver na lista
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
      callback(null, true);
    } else {
      console.log("CORS Blocked:", origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// --- SWAGGER ---
if (swaggerDocument) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

// Rotas
const router = require("./router");
app.use("/api", router.init());

// 3. AJUSTE: Conexão MongoDB Atlas
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) return;
    
    // Usa a variável de ambiente MONGO_URI se existir, senão usa o config local
    const dbUri = process.env.MONGO_URI || config.db;
    
    await mongoose.connect(dbUri);
    console.log("MongoDB conectado!");

    // Criar Admin (Lógica mantida)
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
        // ... (tua lógica de criar admin mantém-se igual) ...
    }
  } catch (err) {
    console.error("Erro MongoDB:", err);
    process.exit(1); // Encerra se não conseguir conectar
  }
};

if (require.main === module) {
  connectDB().then(() => {
    // Render recomenda escutar em 0.0.0.0 implicitamente ao usar a porta do ambiente
    server.listen(port, () => {
      console.log(`Servidor a correr na porta ${port}`);
    });
  });
}

module.exports = { app, connectDB, mongoose };