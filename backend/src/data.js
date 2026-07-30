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
const maestro_modelos = [];

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
const planilla_inventario = [];
const resetHilo = () => [];
const proveedores_hilo = [];

module.exports = {
  genId, usuarios, operarios, maestro_modelos, maquinas, inventario_hilo, distribucion_hilo, proveedores_hilo,
  bultos_master, salones, lotes_produccion, clientes, ordenes_venta,
  ordenes_compra, bitacora_fallas, recepcion_materia_prima,
  historico_traslados, cronograma_cuotas, planilla_inventario, resetHilo
};

