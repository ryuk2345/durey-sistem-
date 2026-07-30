-- ============================================================
-- LIMPIEZA DE DATOS DE PRUEBA (RESET A CERO PARA PRODUCCIÓN)
-- ============================================================

-- 1. Vaciar tablas de prueba y transaccionales
TRUNCATE TABLE 
    lotes_produccion,
    distribucion_hilo,
    bultos_master,
    detalle_orden_venta,
    cronograma_cuotas,
    ordenes_venta,
    clientes,
    ordenes_compra,
    recepcion_materia_prima,
    bitacora_fallas,
    historico_traslados,
    proveedores_hilo,
    inventario_hilo,
    operarios
RESTART IDENTITY CASCADE;

-- 2. Resetear el estado de todas las máquinas a Inactiva y sin operario asignado
UPDATE maquinas SET estado = 'Inactiva', encargado_id = NULL;

-- 3. Resetear contador de bultos en los salones a cero
UPDATE salones SET bultos_actuales = 0;

-- 4. Resetear inventario de la planilla a cero
UPDATE planilla_inventario SET inicial = 0, stock = 0, ingresos = '{}', ventas = '{}';

-- 5. Mantener/Asegurar los usuarios del sistema para el inicio de sesión
INSERT INTO usuarios (username, password, nombre_completo, rol) VALUES
    ('admin',      'admin123', 'Administrador General',    'admin'),
    ('supervisor', 'super123', 'Supervisor de Planta',     'supervisor'),
    ('vendedor',   'pos123',   'Vendedor Principal',       'vendedor'),
    ('almacenero', 'alma123',  'Encargado de Almacen',     'almacenero')
ON CONFLICT (username) DO NOTHING;
