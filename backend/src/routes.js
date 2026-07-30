const express = require('express');
const router = express.Router();
const d = require('./data');
const { getDiaClave, findPlanillaBySku } = require('./helpers');
const db = require('./db');


module.exports = function(io) {

// AUTH
router.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = d.usuarios.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Credenciales invalidas' });
  res.json({ token: user.username, usuario: { id: user.id, nombre: user.nombre_completo, rol: user.rol } });
});

// RESET COMPLETO A CERO
router.post('/reset', async (req, res) => {
  d.operarios.length = 0;
  d.maestro_modelos.length = 0;
  d.planilla_inventario.forEach(p => { p.ingresos = {}; p.ventas = {}; p.stock = p.inicial; });
  d.inventario_hilo.length = 0;
  d.bultos_master.length = 0;
  d.lotes_produccion.length = 0;
  d.clientes.length = 0;
  d.ordenes_venta.length = 0;
  d.ordenes_compra.length = 0;
  d.bitacora_fallas.length = 0;
  d.recepcion_materia_prima.length = 0;
  d.historico_traslados.length = 0;
  d.cronograma_cuotas.length = 0;
  if (d.distribucion_hilo) d.distribucion_hilo.length = 0;
  if (d.proveedores_hilo) d.proveedores_hilo.length = 0;
  d.maquinas.forEach(m => { m.estado = 'Inactiva'; m.encargado_id = null; });
  d.salones.forEach(s => { s.bultos_actuales = 0; });
  
  await db.resetAll();
  
  io.emit('stateUpdate', { message: 'Reset general a cero ejecutado.' });
  res.json({ message: 'Todos los datos del sistema han sido limpiados a cero correctamente.' });
});

// MAQUINAS & OPERARIOS
router.get('/maquinas', async (req, res) => {
  const cls = await db.getClientes(d.clientes);
  res.json({ maquinas: d.maquinas, operarios: d.operarios, lotes: d.lotes_produccion, inventario_hilo: d.inventario_hilo, clientes: cls, distribucion_hilo: d.distribucion_hilo || [], proveedores_hilo: d.proveedores_hilo || [] });
});

// CLIENTES (Persistidos en Base de Datos PostgreSQL / Memoria)
router.get('/clientes', async (req, res) => {
  const cls = await db.getClientes(d.clientes);
  res.json({ clientes: cls });
});

router.post('/clientes', async (req, res) => {
  const { numero_documento, nombre_cliente, telefono, direccion, cuotas_vencidas } = req.body;
  if (!numero_documento || !nombre_cliente) {
    return res.status(400).json({ error: 'Nro de documento y Nombre de cliente son requeridos.' });
  }

  const clientData = {
    tipo_documento: numero_documento.length === 8 ? 'DNI' : 'RUC',
    numero_documento,
    nombre_cliente,
    telefono: telefono || '',
    direccion: direccion || '',
    cuotas_vencidas: parseInt(cuotas_vencidas) || 0
  };

  const saved = await db.saveCliente(clientData, d.clientes);
  res.json({ message: 'Cliente guardado correctamente en la base de datos', cliente: saved });
});

router.post('/operarios', async (req, res) => {
  const { nombre, tipo_contrato, tarifa } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre es requerido' });
  const esJornal = tipo_contrato === 'jornal' || tipo_contrato === 'sueldo_fijo';
  const nuevoOp = {
    nombre,
    tipo_contrato: esJornal ? 'jornal' : 'destajo',
    es_sueldo_fijo: esJornal,
    modalidad: esJornal ? 'Sueldo Fijo (Jornal)' : 'A Destajo (Produccion)',
    tarifa: parseFloat(tarifa) || 0,
    docenas_remalladas: 0, total_liquidado: 0
  };
  const savedOp = await db.saveOperario(nuevoOp);
  savedOp.es_sueldo_fijo = esJornal;
  savedOp.modalidad = nuevoOp.modalidad;
  d.operarios.push(savedOp);
  res.json({ message: `Operario ${nombre} registrado (${savedOp.modalidad})`, operario: savedOp });
});

router.post('/maquinas/asignar', async (req, res) => {
  const { maquinas_ids, encargado_id } = req.body;
  const operario = d.operarios.find(o => o.id === encargado_id);
  if (!operario) return res.status(404).json({ error: 'Operario no encontrado' });
  for (const id of maquinas_ids) {
    const maq = d.maquinas.find(m => m.id === id);
    if (maq) {
      maq.encargado_id = encargado_id;
      await db.saveMaquina(maq);
    }
  }
  const resp = { message: 'Asignacion exitosa' };
  if (maquinas_ids.length < 5) resp.warning = 'Minimo recomendado: 5 maquinas por encargado.';
  res.json(resp);
});

router.post('/maquinas/crear', async (req, res) => {
  const { id, tipo, encargado_id } = req.body;
  if (!id || !tipo) return res.status(400).json({ error: 'Faltan campos obligatorios: id, tipo' });

  const limpiaId = id.trim().toUpperCase();
  const existe = d.maquinas.find(m => m.id === limpiaId);
  if (existe) return res.status(400).json({ error: `La máquina ${limpiaId} ya se encuentra registrada.` });

  const nuevaMaq = {
    id: limpiaId,
    tipo: tipo.toLowerCase(),
    estado: 'Inactiva',
    encargado_id: encargado_id ? parseInt(encargado_id) : null
  };

  await db.saveMaquina(nuevaMaq);
  d.maquinas.push(nuevaMaq);
  io.emit('maquinas_actualizadas', { maquinas: d.maquinas });
  res.json({ message: `Máquina ${limpiaId} registrada exitosamente (${tipo})`, maquina: nuevaMaq });
});

router.post('/maquinas/iniciar', async (req, res) => {
  const { maquina_id, maquina_ids, hilo_id, color, material, cantidad_estimada } = req.body;
  const ids = maquina_ids || (maquina_id ? [maquina_id] : []);
  if (!ids || ids.length === 0) return res.status(400).json({ error: 'No se especifico ninguna maquina' });

  const noInactivas = ids.filter(id => { const m = d.maquinas.find(mq => mq.id === id); return m && m.estado !== 'Inactiva'; });
  if (noInactivas.length > 0) return res.status(400).json({ error: `Maquinas ${noInactivas.join(', ')} no estan inactivas` });

  let hilosInput = req.body.hilos;
  if (!hilosInput || !Array.isArray(hilosInput) || hilosInput.length === 0) {
    hilosInput = [{
      hilo_id: req.body.hilo_id,
      cajas_por_maquina: req.body.cajas_por_maquina || 1
    }];
  }

  const hilosValidados = [];
  for (const item of hilosInput) {
    const id = parseInt(item.hilo_id);
    const cajasPM = parseInt(item.cajas_por_maquina) || 1;
    const totalCajasReq = cajasPM * ids.length;

    const hilo = d.inventario_hilo.find(h => h.id === id);
    if (!hilo || (hilo.stock_cajas || 0) < totalCajasReq) {
      const nombreHilo = hilo ? `${hilo.material} ${hilo.color}` : `ID ${id}`;
      const stockCajas = hilo ? (hilo.stock_cajas || 0) : 0;
      io.emit('alerta_critica', { tipo: 'Falta de materia prima', mensaje: `Sin stock de cajas de hilo ${nombreHilo} para ${ids.join(', ')}. Disp: ${stockCajas} cajas, Req: ${totalCajasReq} cajas.` });
      return res.status(400).json({ error: `Stock de cajas de hilo ${nombreHilo} insuficiente. Disponible: ${stockCajas} cajas, Requerido: ${totalCajasReq} cajas.` });
    }
    hilosValidados.push({ hilo, cajasPM, totalCajasReq });
  }

  for (const { hilo, totalCajasReq } of hilosValidados) {
    hilo.stock_cajas = (hilo.stock_cajas || 0) - totalCajasReq;
    hilo.stock_kg = Math.max(0, parseFloat((hilo.stock_kg - (totalCajasReq * 24.0)).toFixed(2)));
    await db.saveHilo(hilo);
  }

  const primerHilo = hilosValidados[0].hilo;
  const primerCajas = hilosValidados[0].hilo.cajas_por_maquina || hilosValidados[0].cajasPM;

  const nuevosLotes = [];
  for (const id of ids) {
    const maq = d.maquinas.find(m => m.id === id);
    if (maq) {
      maq.estado = 'Tejiendo';
      await db.saveMaquina(maq);
      const loteObj = { 
        maquina_id: id, 
        hilo_id: primerHilo.id, 
        color: primerHilo.color, 
        material: primerHilo.material, 
        cajas_asignadas: primerCajas, 
        cantidad_pares_estimada: cantidad_estimada || 240, 
        cantidad_pares_primera: 0, 
        cantidad_pares_segunda: 0, 
        estado: 'Tejiendo' 
      };
      const savedLote = await db.saveLote(loteObj);
      d.lotes_produccion.push(savedLote);
      nuevosLotes.push(savedLote);
    }
  }
  io.emit('maquinas_actualizadas', { maquinas: d.maquinas });
  res.json({ message: `Tejido iniciado en ${nuevosLotes.length} maquina(s)`, lotes: nuevosLotes });
});

router.post('/maquinas/clasificar', async (req, res) => {
  const { lote_id, primera, segunda } = req.body;
  const lote = d.lotes_produccion.find(l => l.id === lote_id);
  if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });
  lote.cantidad_pares_primera = parseInt(primera) || 0;
  lote.cantidad_pares_segunda = parseInt(segunda) || 0;
  lote.estado = 'Listo para Volteado';
  await db.saveLote(lote);
  const maq = d.maquinas.find(m => m.id === lote.maquina_id);
  if (maq) {
    maq.estado = 'Inactiva';
    await db.saveMaquina(maq);
  }
  io.emit('maquinas_actualizadas', { maquinas: d.maquinas });
  res.json({ message: 'Lote clasificado', lote });
});

// REMALLADO Y VOLTEADO
router.post('/remallado/voltear', async (req, res) => {
  const { lote_id } = req.body;
  const lote = d.lotes_produccion.find(l => l.id === lote_id);
  if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });
  lote.estado = 'Listo para Remallado';
  await db.saveLote(lote);
  res.json({ message: 'Lote volteado y enviado a Costura (Remallado)', lote });
});

router.post('/remallado/procesar', async (req, res) => {
  const { lote_id, operario_id, maquina_id, cantidad } = req.body;
  const operario = d.operarios.find(o => o.id === operario_id);
  if (!operario) return res.status(404).json({ error: 'Operario no encontrado' });
  const lote = d.lotes_produccion.find(l => l.id === lote_id);
  if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });
  
  lote.estado = 'Listo para Planchado';
  await db.saveLote(lote);

  const cant = parseInt(cantidad) || 0;
  const pago = (cant * operario.tarifa).toFixed(2);
  operario.docenas_remalladas = (operario.docenas_remalladas || 0) + cant;
  operario.total_liquidado = (operario.total_liquidado || 0) + parseFloat(pago);
  await db.saveOperario(operario);

  if (maquina_id) {
    const maq = d.maquinas.find(m => m.id === maquina_id);
    if (maq) {
      maq.estado = 'Activa';
      await db.saveMaquina(maq);
      setTimeout(async () => {
        maq.estado = 'Inactiva';
        await db.saveMaquina(maq);
        io.emit('maquinas_actualizadas', { maquinas: d.maquinas });
      }, 8000);
    }
  }

  io.emit('maquinas_actualizadas', { maquinas: d.maquinas });
  res.json({ message: 'Costura completada en remalladora. Lote enviado a Planchado', operario: operario.nombre, tarifa: operario.tarifa, cantidad_remallada: cant, pago_neto: parseFloat(pago), lote });
});

// ACABADO
router.post('/acabado/planchar', async (req, res) => {
  const { lote_id } = req.body;
  const lote = d.lotes_produccion.find(l => l.id === lote_id);
  if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });
  lote.estado = 'Remallado';
  await db.saveLote(lote);
  io.emit('maquinas_actualizadas');
  res.json({ message: 'Lote planchado y enviado a Control de Calidad', lote });
});

router.post('/acabado/inspeccionar', async (req, res) => {
  const { lote_id } = req.body;
  const lote = d.lotes_produccion.find(l => l.id === lote_id);
  if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });
  lote.estado = 'Aprobado para Preparado';
  await db.saveLote(lote);
  io.emit('maquinas_actualizadas');
  res.json({ message: 'Lote aprobado en Control de Calidad y enviado a Preparado', lote });
});

router.post('/acabado/reprocesar', async (req, res) => {
  const { lote_id } = req.body;
  const lote = d.lotes_produccion.find(l => l.id === lote_id);
  if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });
  lote.estado = 'Aprobado para Preparado';
  await db.saveLote(lote);
  io.emit('maquinas_actualizadas');
  res.json({ message: 'Lote reprocesado. Se mantiene como Segunda.', lote });
});

router.post('/acabado/empaquetar', async (req, res) => {
  const { sku, tipo_bolsa, cantidad_paquetes, lote_id, salon_id } = req.body;
  if (!sku) return res.status(400).json({ error: 'SKU es requerido' });

  const destSalon = salon_id || 'Salon A';

  if (lote_id) {
    const lote = d.lotes_produccion.find(l => l.id === lote_id);
    if (lote) {
      lote.estado = 'Empacado';
      await db.saveLote(lote);
    }
  }

  const numPaq = parseInt(cantidad_paquetes) || 10;
  const bultoObj = { tipo_bolsa: tipo_bolsa || 'Mediana', cantidad_paquetes: numPaq, total_pares: numPaq * 12, sku, salon_id: destSalon, estado: 'Listo para Despacho' };
  const savedBulto = await db.saveBulto(bultoObj);
  d.bultos_master.push(savedBulto);

  const targetSalon = d.salones.find(s => s.id === destSalon);
  if (targetSalon) {
    targetSalon.bultos_actuales = (targetSalon.bultos_actuales || 0) + 1;
  }
  
  const cod = findPlanillaBySku(sku);
  const pi = d.planilla_inventario.find(p => p.codigo === cod);
  if (pi) { 
    const dia = getDiaClave(); 
    pi.ingresos[dia] = (pi.ingresos[dia] || 0) + numPaq; 
    pi.stock += numPaq; 
  }
  
  io.emit('maquinas_actualizadas');
  res.json({ message: `Bulto empaquetado exitosamente y almacenado en "${destSalon}"`, bulto: savedBulto });
});

// SALONES
router.get('/inventario', (req, res) => { res.json({ salones: d.salones, bultos: d.bultos_master }); });

router.post('/salones', (req, res) => {
  const { nombre, capacidad } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
  if (d.salones.find(s => s.id === nombre)) return res.status(400).json({ error: `"${nombre}" ya existe` });
  const nuevo = { id: nombre, capacidad_maxima_bultos: parseInt(capacidad) || 50, bultos_actuales: 0 };
  d.salones.push(nuevo);
  res.json({ message: `Salon "${nombre}" creado`, salon: nuevo });
});

router.post('/inventario/almacenar', (req, res) => {
  const { bulto_id, salon_id } = req.body;
  const bulto = d.bultos_master.find(b => b.id === bulto_id);
  if (!bulto) return res.status(404).json({ error: 'Bulto no encontrado' });
  const salon = d.salones.find(s => s.id === salon_id);
  if (!salon) return res.status(404).json({ error: 'Salon no encontrado' });
  if (salon.bultos_actuales >= salon.capacidad_maxima_bultos) {
    const ag = d.salones.find(s => s.id === 'Almacen General');
    if (ag) ag.bultos_actuales += 1;
    bulto.salon_id = 'Almacen General'; bulto.estado = 'Almacenado';
    io.emit('alerta_almacen', { mensaje: `Salon ${salon_id} lleno. Bulto redirigido a Almacen General.` });
    return res.json({ warning: `Salon lleno. Redirigido a Almacen General.`, bulto });
  }
  salon.bultos_actuales += 1; bulto.salon_id = salon_id; bulto.estado = 'Almacenado';
  res.json({ message: 'Bulto almacenado', bulto });
});

router.post('/inventario/trasladar', (req, res) => {
  const { origen_id, destino_id, cantidad_bultos } = req.body;
  const origen = d.salones.find(s => s.id === origen_id);
  const destino = d.salones.find(s => s.id === destino_id);
  if (!origen || !destino) return res.status(404).json({ error: 'Origen o destino no encontrado' });
  const cant = parseInt(cantidad_bultos) || 0;
  if (cant <= 0) return res.status(400).json({ error: 'Cantidad debe ser > 0' });
  if (origen.bultos_actuales < cant) return res.status(400).json({ error: 'Stock insuficiente en origen' });
  origen.bultos_actuales -= cant; destino.bultos_actuales += cant;
  d.historico_traslados.push({ id: d.genId(), origen_id, destino_id, cantidad_bultos: cant, fecha_traslado: new Date().toISOString(), usuario: req.usuario ? req.usuario.nombre_completo : 'Sistema' });
  io.emit('inventario_actualizado', { salones: d.salones });
  res.json({ message: `Traslado de ${cant} bultos completado`, origen, destino });
});

// CATALOGO
router.post('/catalogo/registrar', (req, res) => {
  const { sku, categoria, diseno, calidad, talla, peso_por_docena_g, costo_hilo_por_gramo, costo_mano_obra_acabado, precio_venta } = req.body;
  if (!sku) return res.status(400).json({ error: 'SKU requerido' });
  if (d.maestro_modelos.find(m => m.sku === sku)) return res.status(400).json({ error: `SKU "${sku}" ya existe` });
  const m = { id: d.genId(), sku, categoria, diseno, calidad, talla, peso_por_docena_g: peso_por_docena_g || 300, costo_hilo_por_gramo: costo_hilo_por_gramo || 0.03, costo_mano_obra_acabado: costo_mano_obra_acabado || 0.40, precio_venta: precio_venta || 0, activo: true };
  d.maestro_modelos.push(m);
  res.json({ message: `SKU "${sku}" registrado`, modelo: m });
});

router.get('/catalogo', (req, res) => { res.json({ modelos: d.maestro_modelos }); });

// VENTAS
router.get('/ventas', async (req, res) => {
  const cls = await db.getClientes(d.clientes);
  const ventas = d.ordenes_venta.map(o => ({ ...o, cliente: cls.find(c => c.id === o.cliente_id) }));
  res.json({ ventas, clientes: cls, cronograma: d.cronograma_cuotas });
});

router.post('/ventas/crear', async (req, res) => {
  const { cliente_documento, nombre_cliente, telefono, direccion, sku, cantidad_paquetes, condicion, medio_pago, bypass_supervisor, precio_unitario } = req.body;
  if (!cliente_documento || !sku || !cantidad_paquetes) return res.status(400).json({ error: 'Faltan campos: documento, SKU, cantidad' });
  const cantPaq = parseInt(cantidad_paquetes);
  if (cantPaq <= 0) return res.status(400).json({ error: 'Cantidad debe ser > 0' });

  const cls = await db.getClientes(d.clientes);
  let cliente = cls.find(c => c.numero_documento === cliente_documento);

  const clientData = {
    tipo_documento: cliente_documento.length === 8 ? 'DNI' : 'RUC',
    numero_documento: cliente_documento,
    nombre_cliente: nombre_cliente || (cliente ? cliente.nombre_cliente : 'Cliente Nuevo'),
    telefono: telefono || (cliente ? cliente.telefono : ''),
    direccion: direccion || (cliente ? cliente.direccion : ''),
    cuotas_vencidas: cliente ? cliente.cuotas_vencidas : 0
  };

  cliente = await db.saveCliente(clientData, d.clientes);


  if (cliente.cuotas_vencidas > 0 && !bypass_supervisor) {
    return res.status(403).json({ error: 'Venta bloqueada: cliente con cuotas vencidas.', requiere_aprobacion: true });
  }

  const bultos = d.bultos_master.filter(b => b.sku === sku && b.estado !== 'Despachado');
  const stock = bultos.reduce((a, b) => a + b.cantidad_paquetes, 0);
  if (stock < cantPaq) return res.status(400).json({ error: 'Stock insuficiente', disponible: stock, solicitado: cantPaq });

  let rest = cantPaq;
  for (const b of bultos) {
    if (rest <= 0) break;
    if (b.cantidad_paquetes <= rest) { rest -= b.cantidad_paquetes; b.estado = 'Despachado'; const s = d.salones.find(s => s.id === b.salon_id); if (s) s.bultos_actuales = Math.max(0, s.bultos_actuales - 1); }
    else { b.cantidad_paquetes -= rest; b.total_pares = b.cantidad_paquetes * 12; rest = 0; }
  }

  const precio = parseFloat(precio_unitario) || 0;
  const montoTotal = cantPaq * precio;
  const esPorPartes = condicion === 'Por partes';
  const orden = {
    id: d.genId(), cliente_id: cliente.id, sku, cantidad_paquetes: cantPaq, monto_total: montoTotal,
    condicion_pago: condicion || 'Contado', medio_pago: medio_pago || 'Efectivo',
    pago_inicial_realizado: !esPorPartes, monto_cuota_inicial: esPorPartes ? parseFloat((montoTotal * 0.2).toFixed(2)) : montoTotal,
    estado_despacho: esPorPartes ? 'Bloqueado' : 'Listo para Enviar', estado_pago: esPorPartes ? 'Pendiente' : 'Pagado'
  };
  d.ordenes_venta.push(orden);

  if (esPorPartes) {
    const numCuotas = 3;
    const montoCuota = parseFloat((montoTotal / numCuotas).toFixed(2));
    for (let i = 1; i <= numCuotas; i++) {
      const fv = new Date(); fv.setMonth(fv.getMonth() + i);
      d.cronograma_cuotas.push({ id: d.genId(), orden_id: orden.id, numero_cuota: i, monto_cuota: montoCuota, fecha_vencimiento: fv.toISOString().split('T')[0], estado: 'Pendiente', fecha_pago: null });
    }
  }

  const cod = findPlanillaBySku(sku);
  const pi = d.planilla_inventario.find(p => p.codigo === cod);
  if (pi) { const dia = getDiaClave(); pi.ventas[dia] = (pi.ventas[dia] || 0) + cantPaq; pi.stock = Math.max(0, pi.stock - cantPaq); }

  io.emit('venta_registrada', { orden });
  res.json({ message: 'Venta registrada', orden, autorizado_por_supervisor: !!bypass_supervisor });
});

router.post('/ventas/pagar-cuota', (req, res) => {
  const { cuota_id } = req.body;
  const cuota = d.cronograma_cuotas.find(c => c.id === cuota_id);
  if (!cuota) return res.status(404).json({ error: 'Cuota no encontrada' });
  if (cuota.estado === 'Pagada') return res.status(400).json({ error: 'Ya pagada' });
  cuota.estado = 'Pagada'; cuota.fecha_pago = new Date().toISOString();
  const orden = d.ordenes_venta.find(o => o.id === cuota.orden_id);
  if (orden) {
    const pend = d.cronograma_cuotas.filter(c => c.orden_id === orden.id && c.estado !== 'Pagada');
    if (pend.length === 0) { orden.estado_pago = 'Pagado'; const cl = d.clientes.find(c => c.id === orden.cliente_id); if (cl && cl.cuotas_vencidas > 0) cl.cuotas_vencidas = Math.max(0, cl.cuotas_vencidas - 1); }
    else { orden.estado_pago = 'Pago Parcial'; }
  }
  res.json({ message: 'Cuota pagada', cuota });
});

router.get('/ventas/cronograma/:orden_id', (req, res) => {
  const oid = parseInt(req.params.orden_id);
  const hoy = new Date().toISOString().split('T')[0];
  const cuotas = d.cronograma_cuotas.filter(c => c.orden_id === oid);
  cuotas.forEach(c => { if (c.estado === 'Pendiente' && c.fecha_vencimiento < hoy) c.estado = 'Vencida'; });
  res.json({ cuotas });
});

// BITACORA
router.post('/maquinas/averia', (req, res) => {
  const { maquina_id } = req.body;
  const maq = d.maquinas.find(m => m.id === maquina_id);
  if (!maq) return res.status(404).json({ error: 'Maquina no encontrada' });
  maq.estado = 'Averiada';
  const ticket = { id: d.genId(), maquina_id, fecha: new Date().toISOString(), diagnostico: null, tecnico: null, repuestos_usados: null, costo_reparacion: null, estado_ticket: 'Averiada' };
  d.bitacora_fallas.push(ticket);
  io.emit('alerta_critica', { tipo: 'Averia', mensaje: `Maquina ${maquina_id} averiada` });
  res.json({ message: 'Averia registrada', ticket });
});

router.post('/mantenimiento/reparar', (req, res) => {
  const { ticket_id, tecnico, problema_detectado, repuestos, tipo_reparacion } = req.body;
  const ticket = d.bitacora_fallas.find(t => t.id === ticket_id);
  if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });
  const tarifas = { 'Cambio de Motor': 500, 'Cambio de Sensor': 150, 'Ajuste Mecanico Base': 80 };
  const costo = tarifas[tipo_reparacion] || 50;
  ticket.diagnostico = problema_detectado; ticket.tecnico = tecnico; ticket.repuestos_usados = repuestos; ticket.costo_reparacion = costo; ticket.estado_ticket = 'Cerrado';
  const maq = d.maquinas.find(m => m.id === ticket.maquina_id);
  if (maq) maq.estado = 'Inactiva';
  io.emit('maquinas_actualizadas', { maquinas: d.maquinas });
  res.json({ message: 'Maquina reparada', ticket, pago_tecnico: costo });
});

router.get('/mantenimiento/bitacora', (req, res) => {
  const conteo = {};
  d.bitacora_fallas.forEach(f => { if (f.diagnostico) { const k = `${f.maquina_id}:${f.diagnostico}`; conteo[k] = (conteo[k] || 0) + 1; } });
  const recurrentes = Object.keys(conteo).filter(k => conteo[k] >= 3).map(k => { const [maquina, diagnostico] = k.split(':'); return { maquina, diagnostico, veces: conteo[k] }; });
  res.json({ bitacora: d.bitacora_fallas, recurrentes });
});

// DESPACHO
router.get('/despacho/ordenes', (req, res) => {
  const ordenes = d.ordenes_venta.map(o => ({ ...o, cliente: d.clientes.find(c => c.id === o.cliente_id) })).filter(o => o.estado_despacho !== 'Despachada');
  res.json({ ordenes });
});

router.post('/despacho/enviar', (req, res) => {
  const { orden_id } = req.body;
  const orden = d.ordenes_venta.find(o => o.id === orden_id);
  if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });
  if (orden.condicion_pago === 'Por partes' && !orden.pago_inicial_realizado) {
    return res.status(400).json({ error: 'Despacho Bloqueado - Pendiente de pago de cuota inicial' });
  }
  const bultosDesp = d.bultos_master.filter(b => b.sku === orden.sku && b.estado === 'Almacenado');
  let rest = orden.cantidad_paquetes;
  for (const b of bultosDesp) {
    if (rest <= 0) break;
    if (b.cantidad_paquetes <= rest) { rest -= b.cantidad_paquetes; b.estado = 'Despachado'; const s = d.salones.find(s => s.id === b.salon_id); if (s) s.bultos_actuales = Math.max(0, s.bultos_actuales - 1); }
    else { b.cantidad_paquetes -= rest; b.total_pares = b.cantidad_paquetes * 12; rest = 0; }
  }
  orden.estado_despacho = 'Despachada';
  io.emit('despacho_realizado', { orden });
  res.json({ message: 'Orden despachada, guia emitida', orden });
});

router.post('/despacho/confirmar-pago-inicial', (req, res) => {
  const { orden_id } = req.body;
  const orden = d.ordenes_venta.find(o => o.id === orden_id);
  if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });
  orden.pago_inicial_realizado = true; orden.estado_despacho = 'Listo para Enviar';
  res.json({ message: 'Pago inicial confirmado. Despacho desbloqueado.', orden });
});

// MATERIA PRIMA
router.get('/materia-prima', (req, res) => {
  res.json({
    inventario_hilo: d.inventario_hilo,
    recepcion_materia_prima: d.recepcion_materia_prima,
    ordenes_compra: d.ordenes_compra,
    distribucion_hilo: d.distribucion_hilo || []
  });
});

router.post('/materia-prima/compra', (req, res) => {
  const { proveedor, color, material, cantidad_cajas } = req.body;
  if (!proveedor || !color || !material || !cantidad_cajas) return res.status(400).json({ error: 'Faltan campos' });
  const oc = { id: d.genId(), proveedor, color, material, cantidad_cajas: parseInt(cantidad_cajas), cantidad_kg: parseInt(cantidad_cajas) * 24.0, estado: 'Pendiente', fecha_pedido: new Date().toISOString() };
  d.ordenes_compra.push(oc);
  res.json({ message: 'Orden de compra creada', orden_compra: oc });
});

router.post('/materia-prima/recepcion', (req, res) => {
  const { color, material, proveedor, cantidad_cajas, estado, motivo_rechazo, orden_compra_id } = req.body;
  let hilo = d.inventario_hilo.find(h => 
    h.color.toLowerCase().trim() === color.toLowerCase().trim() && 
    h.material.toLowerCase().trim() === material.toLowerCase().trim()
  );
  if (!hilo) { 
    hilo = { id: d.genId(), color: color.trim(), material: material.trim(), stock_cajas: 0, stock_kg: 0.0, umbral_minimo: 3 }; 
    d.inventario_hilo.push(hilo); 
  }
  const cantCajas = parseInt(cantidad_cajas) || 0;
  if (estado === 'Recibida') {
    hilo.stock_cajas = (hilo.stock_cajas || 0) + cantCajas;
    hilo.stock_kg = parseFloat((hilo.stock_kg + (cantCajas * 24.0)).toFixed(2));
  }
  if (orden_compra_id) { const oc = d.ordenes_compra.find(o => o.id === orden_compra_id); if (oc) oc.estado = estado === 'Recibida' ? 'Recibida' : 'Rechazada'; }
  const rec = { id: d.genId(), hilo_id: hilo.id, orden_compra_id: orden_compra_id || null, proveedor, cantidad_cajas: cantCajas, cantidad_kg: cantCajas * 24.0, estado, motivo_rechazo, fecha_registro: new Date().toISOString() };
  d.recepcion_materia_prima.push(rec);
  if (estado !== 'Recibida') io.emit('alerta_critica', { tipo: 'Inconformidad proveedor', mensaje: `Hilo ${color} ${material} rechazado de ${proveedor}. Motivo: ${motivo_rechazo}` });
  res.json({ message: estado === 'Recibida' ? 'Materia prima ingresada' : 'Lote rechazado y devuelto', recepcion: rec, stock_actual_cajas: hilo.stock_cajas, stock_actual_hilo: hilo.stock_kg });
});

router.post('/materia-prima/distribuir', (req, res) => {
  const { operario_id, hilo_id, turno, fecha, cajas_entregadas } = req.body;
  if (!operario_id || !hilo_id || !turno) return res.status(400).json({ error: 'Faltan campos obligatorios' });

  const operario = d.operarios.find(o => o.id === parseInt(operario_id));
  const hilo = d.inventario_hilo.find(h => h.id === parseInt(hilo_id));
  
  if (!operario) return res.status(404).json({ error: 'Operario no encontrado' });
  if (!hilo) return res.status(404).json({ error: 'Materia prima no encontrada' });

  const cantCajas = parseInt(cajas_entregadas) || 1;
  if ((hilo.stock_cajas || 0) < cantCajas) {
    return res.status(400).json({ error: `Stock insuficiente. Solo quedan ${hilo.stock_cajas || 0} cajas en almacén.` });
  }

  hilo.stock_cajas = (hilo.stock_cajas || 0) - cantCajas;
  hilo.stock_kg = Math.max(0, parseFloat((hilo.stock_kg - (cantCajas * 24.0)).toFixed(2)));

  const dist = {
    id: d.genId(),
    operario_id: operario.id,
    operario_nombre: operario.nombre,
    hilo_id: hilo.id,
    color: hilo.color,
    material: hilo.material,
    fecha: fecha || new Date().toISOString().split('T')[0],
    turno,
    cajas_entregadas: cantCajas,
    estado: 'En Uso',
    pares_producidos: null,
    rendimiento_comentario: ''
  };

  d.distribucion_hilo.push(dist);
  res.json({ message: `Se entregó ${cantCajas} caja(s) de hilo a ${operario.nombre}`, distribucion: dist });
});

router.post('/materia-prima/completar-distribucion', (req, res) => {
  const { id, pares_producidos, rendimiento_comentario } = req.body;
  const dist = d.distribucion_hilo.find(x => x.id === parseInt(id));
  if (!dist) return res.status(404).json({ error: 'Distribución no encontrada' });

  dist.estado = 'Completado';
  dist.pares_producidos = parseInt(pares_producidos) || 0;
  dist.rendimiento_comentario = rendimiento_comentario || 'Completado';

  res.json({ message: 'Rendimiento de caja de hilo registrado con éxito', distribucion: dist });
});

router.get('/materia-prima/proveedores', (req, res) => {
  res.json({ proveedores: d.proveedores_hilo || [] });
});

router.post('/materia-prima/proveedores/crear', (req, res) => {
  const { nombre, RUC, telefono, contacto, direccion, tipos_hilo } = req.body;
  if (!nombre || !telefono) return res.status(400).json({ error: 'Faltan campos obligatorios (nombre, telefono)' });

  const prov = {
    id: d.genId(),
    nombre,
    RUC: RUC || '',
    telefono,
    contacto: contacto || '',
    direccion: direccion || '',
    tipos_hilo: tipos_hilo || ''
  };

  d.proveedores_hilo.push(prov);
  res.json({ message: 'Proveedor registrado con éxito', proveedor: prov });
});

// PLANILLA
router.get('/planilla', (req, res) => { res.json({ planilla: d.planilla_inventario, modelos: d.maestro_modelos }); });

return router;
};
