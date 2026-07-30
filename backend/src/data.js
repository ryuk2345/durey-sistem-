// Estado de datos del sistema (memoria)
let nextId = 200;
const genId = () => nextId++;

const usuarios = [
  { id: 1, username: 'admin', password: 'admin123', nombre_completo: 'Administrador General', rol: 'admin' },
  { id: 2, username: 'supervisor', password: 'admin123', nombre_completo: 'Supervisor de Planta', rol: 'supervisor' },
  { id: 3, username: 'vendedor', password: 'admin123', nombre_completo: 'Vendedor Principal', rol: 'vendedor' }
];

const operarios = [
  { id: 1, nombre: 'María Quispe', tipo_contrato: 'destajo', tarifa: 2.50, docenas_remalladas: 144, total_liquidado: 360.00 },
  { id: 2, nombre: 'Juan Huamán', tipo_contrato: 'destajo', tarifa: 2.80, docenas_remalladas: 80, total_liquidado: 224.00 },
  { id: 3, nombre: 'Ana Ramos', tipo_contrato: 'destajo', tarifa: 2.50, docenas_remalladas: 120, total_liquidado: 300.00 },
  { id: 4, nombre: 'Carlos Torres', tipo_contrato: 'jornal', tarifa: 50.00, docenas_remalladas: 0, total_liquidado: 250.00 },
  { id: 5, nombre: 'Sofía Milla', tipo_contrato: 'jornal', tarifa: 55.00, docenas_remalladas: 0, total_liquidado: 275.00 }
];

const maestro_modelos = [
  { sku: 'NIN-ENT-DEL-04', peso: 280, costo_hilo: 0.035, material_cost: 9.80, mo_cost: 4.80 },
  { sku: 'DAM-UNI-BAS-01', peso: 240, costo_hilo: 0.035, material_cost: 8.40, mo_cost: 4.50 },
  { sku: 'CAB-EXT-RAY-02', peso: 310, costo_hilo: 0.035, material_cost: 10.85, mo_cost: 5.00 },
  { sku: 'ADU-ENT-AFE-UNI', peso: 420, costo_hilo: 0.040, material_cost: 16.80, mo_cost: 6.00 }
];

const maquinas = [];
for (let i = 1; i <= 64; i++) {
  let estado = 'Inactiva';
  let encargado_id = null;
  if (i === 1) { estado = 'Tejiendo'; encargado_id = 4; }
  if (i === 2) { estado = 'Tejiendo'; encargado_id = 5; }
  if (i === 3) { estado = 'Averiada'; encargado_id = null; }
  maquinas.push({ id: `M-${String(i).padStart(2, '0')}`, tipo: 'tejido', estado, encargado_id });
}
maquinas.push({ id: 'REM-01', tipo: 'remalladora', estado: 'Activa', encargado_id: 1 });
maquinas.push({ id: 'REM-02', tipo: 'remalladora', estado: 'Activa', encargado_id: 2 });

const inventario_hilo = [
  { id: 1, color: 'Blanco', material: 'Algodón Peinado', stock_cajas: 15, stock_kg: 360.0, umbral_minimo: 3 },
  { id: 2, color: 'Negro', material: 'Algodón Peinado', stock_cajas: 12, stock_kg: 288.0, umbral_minimo: 3 },
  { id: 3, color: 'Gris', material: 'Poliéster', stock_cajas: 8, stock_kg: 192.0, umbral_minimo: 2 },
  { id: 4, color: 'Azul', material: 'Nylon', stock_cajas: 5, stock_kg: 120.0, umbral_minimo: 1 }
];

const distribucion_hilo = [
  { id: 1, operario_id: 1, operario_nombre: 'María Quispe', hilo_id: 2, color: 'Negro', material: 'Algodón Peinado', fecha: '2026-07-29', turno: 'Mañana', cajas_entregadas: 1, estado: 'Completado', pares_producidos: 245, rendimiento_comentario: 'Rendimiento óptimo. Conos agotados por completo.' },
  { id: 2, operario_id: 2, operario_nombre: 'Juan Huamán', hilo_id: 1, color: 'Blanco', material: 'Algodón Peinado', fecha: '2026-07-29', turno: 'Tarde', cajas_entregadas: 1, estado: 'En Uso', pares_producidos: null, rendimiento_comentario: '' }
];


const bultos_master = [
  { id: 10, tipo_bolsa: 'Grande', cantidad_paquetes: 50, total_pares: 600, sku: 'NIN-ENT-DEL-04', salon_id: 'Salon A', estado: 'Almacenado' },
  { id: 11, tipo_bolsa: 'Mediana', cantidad_paquetes: 20, total_pares: 240, sku: 'DAM-UNI-BAS-01', salon_id: 'Salon B', estado: 'Almacenado' },
  { id: 12, tipo_bolsa: 'Grande', cantidad_paquetes: 100, total_pares: 1200, sku: 'CAB-EXT-RAY-02', salon_id: null, estado: 'Listo para Despacho' }
];

const salones = [
  { id: 'Salon A', capacidad_maxima_bultos: 50, bultos_actuales: 1 },
  { id: 'Salon B', capacidad_maxima_bultos: 50, bultos_actuales: 1 },
  { id: 'Salon C', capacidad_maxima_bultos: 40, bultos_actuales: 0 },
  { id: 'Almacen General', capacidad_maxima_bultos: 1000, bultos_actuales: 0 }
];

const lotes_produccion = [
  { id: 101, maquina_id: 'M-01', material: 'Algodón Peinado', color: 'Negro', cantidad_pares_estimada: 600, encargado_id: 4, estado: 'Tejiendo' },
  { id: 102, maquina_id: 'M-02', material: 'Algodón Peinado', color: 'Blanco', cantidad_pares_estimada: 480, encargado_id: 5, estado: 'Tejiendo' },
  { id: 103, maquina_id: 'M-05', material: 'Algodón Peinado', color: 'Gris', cantidad_pares_estimada: 360, cantidad_pares_primera: 340, cantidad_pares_segunda: 20, estado: 'Listo para Volteado' },
  { id: 104, maquina_id: 'M-06', material: 'Poliéster', color: 'Azul', cantidad_pares_estimada: 240, cantidad_pares_primera: 230, cantidad_pares_segunda: 10, estado: 'Listo para Planchado' },
  { id: 105, maquina_id: 'M-08', material: 'Nylon', color: 'Rojo', cantidad_pares_estimada: 300, cantidad_pares_primera: 295, cantidad_pares_segunda: 5, estado: 'Listo para Remallado' },
  { id: 106, maquina_id: 'M-09', material: 'Algodón Peinado', color: 'Negro', cantidad_pares_estimada: 120, cantidad_pares_primera: 120, cantidad_pares_segunda: 0, estado: 'Remallado' },
  { id: 107, maquina_id: 'M-11', material: 'Poliéster', color: 'Verde', cantidad_pares_estimada: 480, cantidad_pares_primera: 460, cantidad_pares_segunda: 20, estado: 'Aprobado para Preparado' }
];

const clientes = [
  { id: 1, tipo_documento: 'RUC', numero_documento: '20601234567', nombre_cliente: 'Distribuidora Gamarra S.A.', cuotas_vencidas: 0, telefono: '987654321', direccion: 'Jr. Gamarra 820, La Victoria' },
  { id: 2, tipo_documento: 'RUC', numero_documento: '20100123456', nombre_cliente: 'Tiendas Ripley Perú S.A.', cuotas_vencidas: 2, telefono: '01 6104000', direccion: 'Av. Paseo de la República 3220, San Isidro' },
  { id: 3, tipo_documento: 'RUC', numero_documento: '10405060708', nombre_cliente: 'Durey Trujillo Distribuciones', cuotas_vencidas: 0, telefono: '944888333', direccion: 'Av. España 450, Trujillo' }
];

const ordenes_venta = [];
const ordenes_compra = [
  { id: 50, proveedor: 'Hilados Perú SAC', material: 'Algodón Peinado', cantidad_kg: 200, fecha: '2026-07-23', estado: 'Pendiente' }
];

const bitacora_fallas = [
  { id: 1, maquina_id: 'M-03', fecha: '2026-07-20T10:00:00Z', tipo: 'Aguja Rota', gravedad: 'Media', estado: 'Resuelta', tecnico: 'Carlos M.', costo_reparacion: 80 },
  { id: 2, maquina_id: 'M-03', fecha: '2026-07-23T14:30:00Z', tipo: 'Falla Eléctrica', gravedad: 'Alta', estado: 'Abierta', tecnico: 'Alejandro G.', costo_reparacion: 150 }
];

const recepcion_materia_prima = [
  { id: 1, proveedor: 'Hilados del Sur', material: 'Algodón Peinado', cantidad_kg: 500, fecha: '2026-07-22', estado: 'Recibida' }
];

const historico_traslados = [];

const cronograma_cuotas = [
  { id: 1, cliente_id: 2, monto: 1500.00, fecha_vencimiento: '2026-07-10', estado: 'Vencida' },
  { id: 2, cliente_id: 2, monto: 1500.00, fecha_vencimiento: '2026-08-10', estado: 'Pendiente' }
];

const planilla_inventario = [
  { codigo: 'A101', descripcion: 'Damas - Color Entero - Delgada', salon: 'Salon A', inicial: 20, ingresos: { '2026-07-23': 10 }, ventas: {}, stock: 30 },
  { codigo: 'A103', descripcion: 'Ninos - Con Diseno - Delgada', salon: 'Salon A', inicial: 10, ingresos: {}, ventas: {}, stock: 10 },
  { codigo: 'A105', descripcion: 'Ninos - Color Entero - Delgada (Blanco)', salon: 'Salon A', inicial: 50, ingresos: { '2026-07-24': 50 }, ventas: {}, stock: 100 },
  { codigo: 'A109', descripcion: 'Damas - Con Diseno - Delgada (Gris)', salon: 'Salon A', inicial: 15, ingresos: {}, ventas: {}, stock: 15 },
  { codigo: 'B117', descripcion: 'Adultos - Color Entero - Delgada (Negro)', salon: 'Salon B', inicial: 80, ingresos: {}, ventas: {}, stock: 80 },
  { codigo: 'B120', descripcion: 'Futbol - Con Diseno - Delgada', salon: 'Salon B', inicial: 45, ingresos: {}, ventas: {}, stock: 45 }
];

const resetHilo = () => [
  { id: 1, color: 'Blanco', material: 'Algodón Peinado', stock_cajas: 15, stock_kg: 360.0, umbral_minimo: 3 },
  { id: 2, color: 'Negro', material: 'Algodón Peinado', stock_cajas: 12, stock_kg: 288.0, umbral_minimo: 3 },
  { id: 3, color: 'Gris', material: 'Poliéster', stock_cajas: 8, stock_kg: 192.0, umbral_minimo: 2 },
  { id: 4, color: 'Azul', material: 'Nylon', stock_cajas: 5, stock_kg: 120.0, umbral_minimo: 1 }
];

const proveedores_hilo = [
  { id: 1, nombre: 'Hilados del Sur S.A.C.', RUC: '20551234567', telefono: '987654321', contacto: 'Eduardo Gómez', direccion: 'Av. Industrial 450, Lima', tipos_hilo: 'Algodón Peinado, Poliéster' },
  { id: 2, nombre: 'Textiles Gamarra Yarn', RUC: '20498765432', telefono: '912345678', contacto: 'Rosa Milla', direccion: 'Jr. Gamarra 1020, La Victoria', tipos_hilo: 'Nylon, Elastano' }
];

module.exports = {
  genId, usuarios, operarios, maestro_modelos, maquinas, inventario_hilo, distribucion_hilo, proveedores_hilo,
  bultos_master, salones, lotes_produccion, clientes, ordenes_venta,
  ordenes_compra, bitacora_fallas, recepcion_materia_prima,
  historico_traslados, cronograma_cuotas, planilla_inventario, resetHilo
};
