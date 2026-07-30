const { Pool } = require('pg');

let pool = null;
let useDb = false;

if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    console.log('PostgreSQL Pool initialized with DATABASE_URL.');
  } catch (err) {
    console.error('Failed to initialize PostgreSQL pool:', err);
  }
} else {
  // Local postgres default config
  try {
    pool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'durey',
      password: process.env.DB_PASSWORD || 'postgres',
      port: parseInt(process.env.DB_PORT) || 5432,
    });
    console.log('PostgreSQL Local Pool initialized.');
  } catch (err) {
    console.error('Failed to initialize Local PostgreSQL pool:', err);
  }
}

// Check database connection
if (pool) {
  pool.connect((err, client, release) => {
    if (err) {
      console.log('PostgreSQL database not available. Falling back to IN-MEMORY data storage.');
      useDb = false;
    } else {
      console.log('Successfully connected to PostgreSQL Database.');
      useDb = true;
      release();
    }
  });
}

const db = {
  isAvailable: () => useDb,
  query: async (text, params) => {
    if (!useDb || !pool) return null;
    return pool.query(text, params);
  },
  
  // Clientes operations
  getClientes: async (fallbackArray) => {
    if (!useDb) return fallbackArray;
    try {
      const res = await pool.query('SELECT * FROM clientes ORDER BY nombre_cliente');
      return res.rows;
    } catch (err) {
      console.error('Error fetching clients from DB, using fallback:', err);
      return fallbackArray;
    }
  },
  
  saveCliente: async (cliente, fallbackArray) => {
    if (!useDb) {
      const existingIdx = fallbackArray.findIndex(c => c.numero_documento === cliente.numero_documento);
      if (existingIdx >= 0) {
        fallbackArray[existingIdx] = { ...fallbackArray[existingIdx], ...cliente };
        return fallbackArray[existingIdx];
      } else {
        const newCl = { id: fallbackArray.length + 1, cuotas_vencidas: 0, ...cliente };
        fallbackArray.push(newCl);
        return newCl;
      }
    }
    
    try {
      // Check if client exists
      const checkRes = await pool.query('SELECT * FROM clientes WHERE numero_documento = $1', [cliente.numero_documento]);
      if (checkRes.rows.length > 0) {
        // Update
        const updRes = await pool.query(
          `UPDATE clientes 
           SET nombre_cliente = $1, telefono = $2, direccion = $3 
           WHERE numero_documento = $4 
           RETURNING *`,
          [cliente.nombre_cliente, cliente.telefono, cliente.direccion, cliente.numero_documento]
        );
        return updRes.rows[0];
      } else {
        // Insert
        const insRes = await pool.query(
          `INSERT INTO clientes (tipo_documento, numero_documento, nombre_cliente, telefono, direccion, cuotas_vencidas) 
           VALUES ($1, $2, $3, $4, $5, $6) 
           RETURNING *`,
          [
            cliente.tipo_documento || (cliente.numero_documento.length === 8 ? 'DNI' : 'RUC'),
            cliente.numero_documento,
            cliente.nombre_cliente,
            cliente.telefono || '',
            cliente.direccion || '',
            cliente.cuotas_vencidas || 0
          ]
        );
        return insRes.rows[0];
      }
    } catch (err) {
      console.error('Error saving client to DB:', err);
      // Fallback manual update
      const existingIdx = fallbackArray.findIndex(c => c.numero_documento === cliente.numero_documento);
      if (existingIdx >= 0) {
        fallbackArray[existingIdx] = { ...fallbackArray[existingIdx], ...cliente };
        return fallbackArray[existingIdx];
      } else {
        const newCl = { id: fallbackArray.length + 1, cuotas_vencidas: 0, ...cliente };
        fallbackArray.push(newCl);
        return newCl;
      }
    }
  }
};

module.exports = db;
