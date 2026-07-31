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

  resetAll: async () => {
    if (!useDb || !pool) return;
    try {
      // pg library no soporta múltiples statements en una sola llamada — se ejecutan por separado
      await pool.query(
        `TRUNCATE TABLE lotes_produccion, distribucion_hilo, bultos_master, detalle_orden_venta,
         cronograma_cuotas, ordenes_venta, clientes, ordenes_compra,
         recepcion_materia_prima, bitacora_fallas, historico_traslados,
         proveedores_hilo, inventario_hilo, operarios RESTART IDENTITY CASCADE`
      );
      await pool.query(`UPDATE maquinas SET estado = 'Inactiva', encargado_id = NULL`);
      await pool.query(`UPDATE salones SET bultos_actuales = 0`);
      await pool.query(`UPDATE planilla_inventario SET inicial = 0, stock = 0, ingresos = '{}', ventas = '{}'`);
      console.log('PostgreSQL Database reset completamente a cero.');
    } catch (err) {
      console.error('Error resetting PostgreSQL DB:', err);
    }
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
  },
  // Sync Operario
  saveOperario: async (op) => {
    if (!useDb || !pool) return op;
    try {
      if (op.id) {
        const check = await pool.query('SELECT * FROM operarios WHERE id = $1', [op.id]);
        if (check.rows.length > 0) {
          const res = await pool.query(
            `UPDATE operarios SET nombre = $1, tipo_contrato = $2, tarifa = $3, docenas_remalladas = $4, total_liquidado = $5 WHERE id = $6 RETURNING *`,
            [op.nombre, op.tipo_contrato, op.tarifa, op.docenas_remalladas || 0, op.total_liquidado || 0, op.id]
          );
          return res.rows[0];
        }
      }
      const res = await pool.query(
        `INSERT INTO operarios (nombre, tipo_contrato, tarifa, docenas_remalladas, total_liquidado) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [op.nombre, op.tipo_contrato, op.tarifa, op.docenas_remalladas || 0, op.total_liquidado || 0]
      );
      return res.rows[0];
    } catch (err) {
      console.error('Error saving operario to DB:', err);
      return op;
    }
  },

  // Sync Maquina
  saveMaquina: async (maq) => {
    if (!useDb || !pool) return maq;
    try {
      await pool.query(
        `INSERT INTO maquinas (id, tipo, estado, encargado_id, marca, color, caracteristicas) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET 
           estado = EXCLUDED.estado, 
           encargado_id = EXCLUDED.encargado_id,
           marca = EXCLUDED.marca,
           color = EXCLUDED.color,
           caracteristicas = EXCLUDED.caracteristicas`,
        [
          maq.id, 
          maq.tipo || 'tejido', 
          maq.estado || 'Inactiva', 
          maq.encargado_id || null,
          maq.marca || 'angui',
          maq.color || '',
          maq.caracteristicas || ''
        ]
      );
      return maq;
    } catch (err) {
      console.error('Error saving maquina to DB:', err);
      return maq;
    }
  },

  // Guardar producción por máquina y turno
  saveProduccionTurno: async (reg) => {
    if (!useDb || !pool) return reg;
    try {
      const res = await pool.query(
        `INSERT INTO produccion_maquina_turno (maquina_id, operario_id, turno, docenas, fecha)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [reg.maquina_id, reg.operario_id || null, reg.turno, reg.docenas || 0, reg.fecha || new Date().toISOString().split('T')[0]]
      );
      return res.rows[0];
    } catch (err) {
      console.error('Error saving produccion_maquina_turno to DB:', err);
      return reg;
    }
  },


  // Sync Lote
  saveLote: async (lote) => {
    if (!useDb || !pool) return lote;
    try {
      if (lote.id) {
        const check = await pool.query('SELECT id FROM lotes_produccion WHERE id = $1', [lote.id]);
        if (check.rows.length > 0) {
          const res = await pool.query(
            `UPDATE lotes_produccion 
             SET maquina_id = $1, operario_id = $2, material = $3, color = $4,
                 cantidad_pares_estimada = $5, cantidad_pares_primera = $6,
                 cantidad_pares_segunda = $7, estado = $8, sku = $9, cajas_usadas = $10
             WHERE id = $11 RETURNING *`,
            [lote.maquina_id, lote.operario_id || null, lote.material, lote.color,
             lote.cantidad_pares_estimada, lote.cantidad_pares_primera || 0,
             lote.cantidad_pares_segunda || 0, lote.estado, lote.sku || null,
             lote.cajas_asignadas || 0, lote.id]
          );
          return res.rows[0];
        }
      }
      // BUG-06 FIX: Incluir hilo_id (via hilos_asignados JSONB), sku, cajas_usadas
      const res = await pool.query(
        `INSERT INTO lotes_produccion
           (maquina_id, operario_id, material, color, cantidad_pares_estimada,
            cantidad_pares_primera, cantidad_pares_segunda, estado, sku, cajas_usadas, hilos_asignados)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [lote.maquina_id, lote.operario_id || null, lote.material, lote.color,
         lote.cantidad_pares_estimada, lote.cantidad_pares_primera || 0,
         lote.cantidad_pares_segunda || 0, lote.estado || 'Tejiendo',
         lote.sku || null, lote.cajas_asignadas || 0,
         lote.hilo_id ? JSON.stringify([{ hilo_id: lote.hilo_id, cajas: lote.cajas_asignadas }]) : null]
      );
      return res.rows[0];
    } catch (err) {
      console.error('Error saving lote to DB:', err);
      return lote;
    }
  },

  // Sync Hilo
  saveHilo: async (hilo) => {
    if (!useDb || !pool) return hilo;
    try {
      if (hilo.id) {
        const check = await pool.query('SELECT id FROM inventario_hilo WHERE id = $1', [hilo.id]);
        if (check.rows.length > 0) {
          const res = await pool.query(
            `UPDATE inventario_hilo SET material = $1, color = $2, stock_cajas = $3, stock_kg = $4 WHERE id = $5 RETURNING *`,
            [hilo.material, hilo.color, hilo.stock_cajas || 0, hilo.stock_kg || 0, hilo.id]
          );
          return res.rows[0];
        }
      }
      // Insertar nuevo hilo — UNIQUE (color, material) maneja duplicados
      const res = await pool.query(
        `INSERT INTO inventario_hilo (material, color, stock_cajas, stock_kg, umbral_minimo)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (color, material) DO UPDATE SET stock_cajas = EXCLUDED.stock_cajas, stock_kg = EXCLUDED.stock_kg
         RETURNING *`,
        [hilo.material, hilo.color, hilo.stock_cajas || 0, hilo.stock_kg || 0, hilo.umbral_minimo || 2]
      );
      return res.rows[0];
    } catch (err) {
      console.error('Error saving hilo to DB:', err);
      return hilo;
    }
  },

  // Sync Bulto Master
  saveBulto: async (bulto) => {
    if (!useDb || !pool) return bulto;
    try {
      if (bulto.id) {
        const check = await pool.query('SELECT * FROM bultos_master WHERE id = $1', [bulto.id]);
        if (check.rows.length > 0) {
          const res = await pool.query(
            `UPDATE bultos_master SET tipo_bolsa = $1, cantidad_paquetes = $2, total_pares = $3, sku = $4, salon_id = $5, estado = $6 WHERE id = $7 RETURNING *`,
            [bulto.tipo_bolsa, bulto.cantidad_paquetes, bulto.total_pares, bulto.sku, bulto.salon_id || null, bulto.estado, bulto.id]
          );
          return res.rows[0];
        }
      }
      const res = await pool.query(
        `INSERT INTO bultos_master (tipo_bolsa, cantidad_paquetes, total_pares, sku, salon_id, estado) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [bulto.tipo_bolsa, bulto.cantidad_paquetes, bulto.total_pares, bulto.sku, bulto.salon_id || null, bulto.estado || 'Listo para Despacho']
      );
      return res.rows[0];
    } catch (err) {
      console.error('Error saving bulto to DB:', err);
      return bulto;
    }
  },

  // Sync Bitacora Falla
  saveFalla: async (falla) => {
    if (!useDb || !pool) return falla;
    try {
      const res = await pool.query(
        `INSERT INTO bitacora_fallas (maquina_id, codigo_falla, descripcion, tipo, gravedad, estado, costo_reparacion)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [falla.maquina_id, falla.codigo_falla, falla.descripcion, falla.tipo || 'mecanica', falla.gravedad || 'Media', falla.estado || 'Reportada', falla.costo_reparacion || 0]
      );
      return res.rows[0];
    } catch (err) {
      console.error('Error saving falla to DB:', err);
      return falla;
    }
  },

  // BUG-02 FIX: Persistir Orden de Venta en PostgreSQL
  saveOrden: async (orden) => {
    if (!useDb || !pool) return orden;
    try {
      const res = await pool.query(
        `INSERT INTO ordenes_venta (cliente_id, monto_total, condicion_pago, medio_pago, pago_inicial_realizado, monto_cuota_inicial, estado_despacho, estado_pago)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          orden.cliente_id,
          orden.monto_total,
          orden.condicion_pago || 'Contado',
          orden.medio_pago || 'Efectivo',
          orden.pago_inicial_realizado || false,
          orden.monto_cuota_inicial || 0,
          orden.estado_despacho || 'Listo para Enviar',
          orden.estado_pago || 'Pendiente'
        ]
      );
      const savedOrden = res.rows[0];
      // Guardar detalle de la orden (sku + cantidad + precio)
      if (orden.sku) {
        await pool.query(
          `INSERT INTO detalle_orden_venta (orden_id, sku, cantidad_paquetes, precio_unitario) VALUES ($1, $2, $3, $4)`,
          [savedOrden.id, orden.sku, orden.cantidad_paquetes || 0, orden.precio_unitario || 0]
        );
      }
      return savedOrden;
    } catch (err) {
      console.error('Error saving orden to DB:', err);
      return orden;
    }
  },

  // BUG-04 FIX: Persistir Cuotas de Pago en PostgreSQL
  saveCuota: async (cuota) => {
    if (!useDb || !pool) return cuota;
    try {
      const res = await pool.query(
        `INSERT INTO cronograma_cuotas (orden_id, numero_cuota, monto, fecha_vencimiento, estado) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [cuota.orden_id, cuota.numero_cuota, cuota.monto, cuota.fecha_vencimiento, 'Pendiente']
      );
      return res.rows[0];
    } catch (err) {
      console.error('Error saving cuota to DB:', err);
      return cuota;
    }
  },

  // BUG-09 FIX: Persistir SKU nuevo del catalogo en PostgreSQL
  saveMaestroModelo: async (modelo) => {
    if (!useDb || !pool) return modelo;
    try {
      const res = await pool.query(
        `INSERT INTO maestro_modelos (sku, categoria, diseno, calidad, talla, peso, costo_hilo, mo_cost, precio_venta, activo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
         ON CONFLICT (sku) DO UPDATE SET
           categoria = EXCLUDED.categoria, diseno = EXCLUDED.diseno, calidad = EXCLUDED.calidad,
           talla = EXCLUDED.talla, peso = EXCLUDED.peso, costo_hilo = EXCLUDED.costo_hilo,
           mo_cost = EXCLUDED.mo_cost, precio_venta = EXCLUDED.precio_venta
         RETURNING *`,
        [
          modelo.sku, modelo.categoria || '', modelo.diseno || '', modelo.calidad || '',
          modelo.talla || '', modelo.peso || 300, modelo.costo_hilo || 0.035,
          modelo.mo_cost || 0.40, modelo.precio_venta || 0
        ]
      );
      return res.rows[0];
    } catch (err) {
      console.error('Error saving maestro_modelo to DB:', err);
      return modelo;
    }
  },

  // BUG-01 FIX: Persistir Distribucion de Hilo en PostgreSQL
  saveDistribucion: async (dist) => {
    if (!useDb || !pool) return dist;
    try {
      const res = await pool.query(
        `INSERT INTO distribucion_hilo (operario_id, operario_nombre, hilo_id, color, material, fecha, turno, cajas_entregadas, estado, pares_producidos, rendimiento_comentario)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [
          dist.operario_id, dist.operario_nombre, dist.hilo_id, dist.color, dist.material,
          dist.fecha || new Date().toISOString().split('T')[0],
          dist.turno || 'Mañana', dist.cajas_entregadas || 1,
          dist.estado || 'En Uso', dist.pares_producidos || null, dist.rendimiento_comentario || ''
        ]
      );
      return res.rows[0];
    } catch (err) {
      console.error('Error saving distribucion to DB:', err);
      return dist;
    }
  },

  // Init Data loader on startup
  initDataFromDb: async (d) => {
    if (!useDb || !pool) return;
    try {
      const ops = await pool.query('SELECT * FROM operarios ORDER BY id ASC');
      if (ops.rows.length) {
        d.operarios.length = 0;
        ops.rows.forEach(r => d.operarios.push({
          id: r.id,
          nombre: r.nombre,
          tipo_contrato: r.tipo_contrato,
          tarifa: parseFloat(r.tarifa) || 0,
          docenas_remalladas: parseInt(r.docenas_remalladas) || 0,
          total_liquidado: parseFloat(r.total_liquidado) || 0
        }));
      }

      const maqs = await pool.query('SELECT * FROM maquinas ORDER BY id ASC');
      if (maqs.rows.length) {
        maqs.rows.forEach(r => {
          const m = d.maquinas.find(x => x.id === r.id);
          if (m) {
            m.estado = r.estado;
            m.encargado_id = r.encargado_id;
            m.marca = r.marca || 'angui';
            m.color = r.color || '';
            m.caracteristicas = r.caracteristicas || '';
          } else {
            d.maquinas.push({
              id: r.id,
              tipo: r.tipo || 'tejido',
              estado: r.estado || 'Inactiva',
              encargado_id: r.encargado_id || null,
              marca: r.marca || 'angui',
              color: r.color || '',
              caracteristicas: r.caracteristicas || ''
            });
          }
        });
      }


      const lotes = await pool.query('SELECT * FROM lotes_produccion ORDER BY id ASC');
      if (lotes.rows.length) {
        d.lotes_produccion.length = 0;
        lotes.rows.forEach(r => d.lotes_produccion.push({
          id: r.id,
          maquina_id: r.maquina_id,
          operario_id: r.operario_id,
          material: r.material,
          color: r.color,
          cantidad_pares_estimada: r.cantidad_pares_estimada,
          cantidad_pares_primera: r.cantidad_pares_primera,
          cantidad_pares_segunda: r.cantidad_pares_segunda,
          estado: r.estado,
          fecha_creacion: r.fecha_creacion
        }));
      }

      const cls = await pool.query('SELECT * FROM clientes ORDER BY id ASC');
      if (cls.rows.length) {
        d.clientes.length = 0;
        cls.rows.forEach(r => d.clientes.push(r));
      }

      const hilos = await pool.query('SELECT * FROM inventario_hilo ORDER BY id ASC');
      if (hilos.rows.length) {
        d.inventario_hilo.length = 0;
        hilos.rows.forEach(r => d.inventario_hilo.push({
          id: r.id,
          proveedor_id: r.proveedor_id,
          material: r.material,
          color: r.color,
          stock_cajas: r.stock_cajas,
          stock_kg: parseFloat(r.stock_kg),
          costo_por_kg: parseFloat(r.costo_por_kg),
          fecha_ingreso: r.fecha_ingreso
        }));
      }

      const provs = await pool.query('SELECT * FROM proveedores_hilo ORDER BY id ASC');
      if (provs.rows.length) {
        d.proveedores_hilo.length = 0;
        provs.rows.forEach(r => d.proveedores_hilo.push(r));
      }

      const bultos = await pool.query('SELECT * FROM bultos_master ORDER BY id ASC');
      if (bultos.rows.length) {
        d.bultos_master.length = 0;
        bultos.rows.forEach(r => d.bultos_master.push(r));
      }

      const modelos = await pool.query('SELECT * FROM maestro_modelos ORDER BY id ASC');
      if (modelos.rows.length) {
        d.maestro_modelos.length = 0;
        modelos.rows.forEach(r => d.maestro_modelos.push({
          id: r.id,
          sku: r.sku,
          categoria: r.categoria,
          diseno: r.diseno,
          calidad: r.calidad,
          talla: r.talla,
          peso: r.peso,
          peso_por_docena_g: r.peso,
          costo_hilo_por_gramo: parseFloat(r.costo_hilo || 0.035),
          costo_mano_obra_acabado: parseFloat(r.mo_cost || 0.40),
          material_cost: parseFloat(r.material_cost || 10.0),
          mo_cost: parseFloat(r.mo_cost || 0.40),
          precio_venta: parseFloat(r.precio_venta || 25.0),
          activo: r.activo
        }));
      }

      const fallas = await pool.query('SELECT * FROM bitacora_fallas ORDER BY id ASC');
      if (fallas.rows.length) {
        d.bitacora_fallas.length = 0;
        fallas.rows.forEach(r => d.bitacora_fallas.push({
          ...r,
          costo_reparacion: parseFloat(r.costo_reparacion) || 0
        }));
      }

      // BUG-02 FIX: Cargar ordenes de venta desde DB al iniciar
      const ordenes = await pool.query(`
        SELECT ov.*, dov.sku, dov.cantidad_paquetes, dov.precio_unitario
        FROM ordenes_venta ov
        LEFT JOIN detalle_orden_venta dov ON dov.orden_id = ov.id
        ORDER BY ov.id ASC
      `);
      if (ordenes.rows.length) {
        d.ordenes_venta.length = 0;
        ordenes.rows.forEach(r => d.ordenes_venta.push({
          id: r.id,
          cliente_id: r.cliente_id,
          sku: r.sku || '',
          cantidad_paquetes: r.cantidad_paquetes || 0,
          precio_unitario: parseFloat(r.precio_unitario) || 0,
          monto_total: parseFloat(r.monto_total) || 0,
          condicion_pago: r.condicion_pago,
          medio_pago: r.medio_pago,
          fecha: r.fecha_venta ? r.fecha_venta.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          pago_inicial_realizado: r.pago_inicial_realizado,
          monto_cuota_inicial: parseFloat(r.monto_cuota_inicial) || 0,
          estado_despacho: r.estado_despacho,
          estado_pago: r.estado_pago
        }));
      }

      // BUG-04 FIX: Cargar cuotas desde DB al iniciar
      const cuotas = await pool.query('SELECT * FROM cronograma_cuotas ORDER BY id ASC');
      if (cuotas.rows.length) {
        d.cronograma_cuotas.length = 0;
        cuotas.rows.forEach(r => d.cronograma_cuotas.push({
          id: r.id,
          orden_id: r.orden_id,
          numero_cuota: r.numero_cuota,
          monto_cuota: parseFloat(r.monto) || 0,
          fecha_vencimiento: r.fecha_vencimiento ? r.fecha_vencimiento.toISOString().split('T')[0] : '',
          estado: r.estado,
          fecha_pago: r.fecha_pago
        }));
      }

      // BUG-01 FIX: Cargar distribuciones de hilo desde DB al iniciar
      const dists = await pool.query('SELECT * FROM distribucion_hilo ORDER BY id ASC');
      if (dists.rows.length) {
        d.distribucion_hilo.length = 0;
        dists.rows.forEach(r => d.distribucion_hilo.push({
          id: r.id,
          operario_id: r.operario_id,
          operario_nombre: r.operario_nombre,
          hilo_id: r.hilo_id,
          color: r.color,
          material: r.material,
          fecha: r.fecha ? r.fecha.toISOString().split('T')[0] : '',
          turno: r.turno,
          cajas_entregadas: r.cajas_entregadas,
          estado: r.estado,
          pares_producidos: r.pares_producidos,
          rendimiento_comentario: r.rendimiento_comentario || ''
        }));
      }

      console.log('✅ PostgreSQL -> Toda la información fue sincronizada y persistida desde PostgreSQL.');
    } catch (err) {
      console.error('Error inicializando data desde DB:', err);
    }
  }
};

module.exports = db;
