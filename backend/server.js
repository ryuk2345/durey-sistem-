require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const { authMiddleware } = require('./src/helpers');

const app = express();

// CORS: acepta cualquier origen en producción (Railway asigna URL dinámica)
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || '*', methods: ['GET', 'POST'] }
});

app.use('/api', authMiddleware);

const routes = require('./src/routes')(io);
app.use('/api', routes);

// Servir el frontend (build de Vite) como archivos estáticos
const frontendPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendPath));

// Cualquier ruta que no sea /api → devuelve el index.html (SPA routing)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  }
});

app.use((err, req, res, next) => {
  console.error('Error no capturado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

async function runMigrations() {
  if (!process.env.DATABASE_URL) return;
  const migrationPool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await migrationPool.query(sql);
      console.log('Migraciones ejecutadas: esquema de base de datos creado/actualizado.');
    }
  } catch (err) {
    console.log('Migración automática no disponible (las tablas podrían ya existir).', err.message);
  } finally {
    await migrationPool.end();
  }
}

const PORT = process.env.PORT || 4000;
runMigrations().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de la Fabrica Durey escuchando en http://0.0.0.0:${PORT}`);
  });
});
