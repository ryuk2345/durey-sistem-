// Estado de datos del sistema (memoria limpia para producción)
let nextId = 1;
const genId = () => nextId++;

const usuarios = [
  { id: 1, username: 'admin', password: 'admin123', nombre_completo: 'Administrador General', rol: 'admin' },
  { id: 2, username: 'supervisor', password: 'super123', nombre_completo: 'Supervisor de Planta', rol: 'supervisor' },
  { id: 3, username: 'vendedor', password: 'pos123', nombre_completo: 'Vendedor Principal', rol: 'vendedor' },
  { id: 4, username: 'almacenero', password: 'alma123', nombre_completo: 'Encargado de Almacén', rol: 'almacenero' }
];

const operarios = [];
const maestro_modelos = [
  { id: 1, sku: 'VAR-MED-ALG-01', categoria: 'Varón', diseno: 'Medio Algodón Clásico', calidad: 'Primera', talla: 'Standard', peso_por_docena_g: 300, costo_hilo_por_gramo: 0.035, costo_mano_obra_acabado: 0.40, precio_venta: 25.00, activo: true },
  { id: 2, sku: 'VAR-COR-DEP-02', categoria: 'Varón', diseno: 'Corto Deportivo', calidad: 'Primera', talla: 'M/L', peso_por_docena_g: 280, costo_hilo_por_gramo: 0.035, costo_mano_obra_acabado: 0.40, precio_venta: 22.00, activo: true },
  { id: 3, sku: 'DAM-UNI-BAS-01', categoria: 'Dama', diseno: 'Tobillera Básica', calidad: 'Primera', talla: 'Standard', peso_por_docena_g: 250, costo_hilo_por_gramo: 0.035, costo_mano_obra_acabado: 0.35, precio_venta: 20.00, activo: true },
  { id: 4, sku: 'NIN-ENT-DEL-04', categoria: 'Niño', diseno: 'Escolar Delgado', calidad: 'Primera', talla: '4-8', peso_por_docena_g: 200, costo_hilo_por_gramo: 0.030, costo_mano_obra_acabado: 0.30, precio_venta: 18.00, activo: true },
  { id: 5, sku: 'CAB-EXT-RAY-02', categoria: 'Caballero', diseno: 'Extra Rayado', calidad: 'Primera', talla: 'L/XL', peso_por_docena_g: 320, costo_hilo_por_gramo: 0.040, costo_mano_obra_acabado: 0.45, precio_venta: 28.00, activo: true }
];

const maquinas = [];
for (let i = 1; i <= 64; i++) {
  maquinas.push({ id: `M-${String(i).padStart(2, '0')}`, tipo: 'tejido', estado: 'Inactiva', encargado_id: null });
}
maquinas.push({ id: 'REM-01', tipo: 'remalladora', estado: 'Inactiva', encargado_id: null });
maquinas.push({ id: 'REM-02', tipo: 'remalladora', estado: 'Inactiva', encargado_id: null });

const inventario_hilo = [];
const distribucion_hilo = [];
const bultos_master = [];

const salones = [
  { id: 'Salon A', capacidad_maxima_bultos: 50, bultos_actuales: 0 },
  { id: 'Salon B', capacidad_maxima_bultos: 50, bultos_actuales: 0 },
  { id: 'Salon C', capacidad_maxima_bultos: 40, bultos_actuales: 0 },
  { id: 'Almacen General', capacidad_maxima_bultos: 1000, bultos_actuales: 0 }
];

const lotes_produccion = [];
const clientes = [];
const ordenes_venta = [];
const ordenes_compra = [];
const bitacora_fallas = [];
const recepcion_materia_prima = [];
const historico_traslados = [];
const cronograma_cuotas = [];
const planilla_inventario = maestro_modelos.map(m => ({
  id: m.id,
  codigo: m.sku,
  descripcion: `${m.categoria} - ${m.diseno}`,
  nombre_original: `${m.categoria} ${m.diseno}`,
  precio_por_paquete: m.precio_venta,
  salon: 'Almacen General',
  inicial: 0,
  stock: 0,
  ingresos: {},
  ventas: {}
}));
const resetHilo = () => [];
const proveedores_hilo = [];

module.exports = {
  genId, usuarios, operarios, maestro_modelos, maquinas, inventario_hilo, distribucion_hilo, proveedores_hilo,
  bultos_master, salones, lotes_produccion, clientes, ordenes_venta,
  ordenes_compra, bitacora_fallas, recepcion_materia_prima,
  historico_traslados, cronograma_cuotas, planilla_inventario, resetHilo
};

