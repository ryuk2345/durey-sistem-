-- ============================================================
-- ESQUEMA COMPLETO - SISTEMA ERP DUREY
-- PostgreSQL - Alineado con data.js y routes.js
-- ============================================================

-- 1. Usuarios del sistema
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(100) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'supervisor', 'vendedor', 'almacenero')),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Operarios de produccion
CREATE TABLE IF NOT EXISTS operarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tipo_contrato VARCHAR(20) NOT NULL CHECK (tipo_contrato IN ('jornal', 'destajo')),
    tarifa DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    es_sueldo_fijo BOOLEAN NOT NULL DEFAULT FALSE,
    modalidad VARCHAR(60) NOT NULL DEFAULT 'A Destajo (Produccion)',
    docenas_remalladas INT NOT NULL DEFAULT 0,
    total_liquidado DECIMAL(10,2) NOT NULL DEFAULT 0.00
);

-- 3. Maquinas (tejedoras y remalladoras)
CREATE TABLE IF NOT EXISTS maquinas (
    id VARCHAR(15) PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('tejido', 'remalladora')),
    estado VARCHAR(20) NOT NULL DEFAULT 'Inactiva' CHECK (estado IN ('Inactiva', 'Tejiendo', 'Averiada', 'Activa')),
    encargado_id INT REFERENCES operarios(id) ON DELETE SET NULL,
    marca VARCHAR(50) DEFAULT 'angui',
    color VARCHAR(50),
    caracteristicas TEXT
);

-- 3.1 Producción por máquina y turno (Tejido unitario)
CREATE TABLE IF NOT EXISTS produccion_maquina_turno (
    id SERIAL PRIMARY KEY,
    maquina_id VARCHAR(15) REFERENCES maquinas(id) ON DELETE CASCADE,
    operario_id INT REFERENCES operarios(id) ON DELETE SET NULL,
    turno VARCHAR(20) CHECK (turno IN ('Dia', 'Noche')),
    docenas INT NOT NULL DEFAULT 0,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_registro TIMESTAMP DEFAULT NOW()
);


-- 4. Inventario de hilo (por cajas)
CREATE TABLE IF NOT EXISTS inventario_hilo (
    id SERIAL PRIMARY KEY,
    color VARCHAR(50) NOT NULL,
    material VARCHAR(80) NOT NULL,
    stock_cajas INT NOT NULL DEFAULT 0,
    stock_kg DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    umbral_minimo INT NOT NULL DEFAULT 2,
    UNIQUE (color, material)
);

-- 5. Proveedores de hilo
CREATE TABLE IF NOT EXISTS proveedores_hilo (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    ruc VARCHAR(20),
    telefono VARCHAR(20),
    contacto VARCHAR(100),
    direccion VARCHAR(200),
    tipos_hilo TEXT
);

-- 6. Distribucion de hilo a operarios (por caja)
CREATE TABLE IF NOT EXISTS distribucion_hilo (
    id SERIAL PRIMARY KEY,
    operario_id INT REFERENCES operarios(id) ON DELETE SET NULL,
    operario_nombre VARCHAR(100),
    hilo_id INT REFERENCES inventario_hilo(id) ON DELETE SET NULL,
    color VARCHAR(50),
    material VARCHAR(80),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    turno VARCHAR(20) DEFAULT 'Mañana',
    cajas_entregadas INT NOT NULL DEFAULT 1,
    estado VARCHAR(20) DEFAULT 'En Uso' CHECK (estado IN ('En Uso', 'Completado')),
    pares_producidos INT,
    rendimiento_comentario TEXT
);

-- 7. Lotes de produccion
CREATE TABLE IF NOT EXISTS lotes_produccion (
    id SERIAL PRIMARY KEY,
    maquina_id VARCHAR(15) REFERENCES maquinas(id) ON DELETE SET NULL,
    material VARCHAR(80),
    color VARCHAR(50),
    cantidad_pares_estimada INT NOT NULL DEFAULT 0,
    cantidad_pares_primera INT NOT NULL DEFAULT 0,
    cantidad_pares_segunda INT NOT NULL DEFAULT 0,
    cajas_usadas INT NOT NULL DEFAULT 0,
    hilos_asignados JSONB,
    encargado_id INT REFERENCES operarios(id) ON DELETE SET NULL,
    operario_id INT REFERENCES operarios(id) ON DELETE SET NULL,
    sku VARCHAR(60),
    estado VARCHAR(40) NOT NULL DEFAULT 'Tejiendo' CHECK (estado IN (
        'Tejiendo', 'Listo para Volteado', 'Volteado', 'Listo para Planchado',
        'Listo para Remallado', 'Remallado', 'Planchado', 'Aprobado para Preparado',
        'Empacado', 'Reprocesar', 'Descartado'
    )),
    fecha_inicio TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_fin TIMESTAMP
);

-- 8. Salones de almacen
CREATE TABLE IF NOT EXISTS salones (
    id VARCHAR(60) PRIMARY KEY,
    capacidad_maxima_bultos INT NOT NULL DEFAULT 50,
    bultos_actuales INT NOT NULL DEFAULT 0
);

-- 9. Bultos master (empaque final)
CREATE TABLE IF NOT EXISTS bultos_master (
    id SERIAL PRIMARY KEY,
    tipo_bolsa VARCHAR(20) NOT NULL CHECK (tipo_bolsa IN ('Mediana', 'Estándar', 'Grande')),
    cantidad_paquetes INT NOT NULL DEFAULT 0,
    total_pares INT NOT NULL DEFAULT 0,
    sku VARCHAR(60) NOT NULL,
    salon_id VARCHAR(60) REFERENCES salones(id) ON DELETE SET NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'Listo para Despacho' CHECK (estado IN ('Listo para Despacho', 'Almacenado', 'Despachado')),
    fecha_empaque TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 10. Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    tipo_documento VARCHAR(10) NOT NULL DEFAULT 'RUC' CHECK (tipo_documento IN ('DNI', 'RUC')),
    numero_documento VARCHAR(20) UNIQUE NOT NULL,
    nombre_cliente VARCHAR(120) NOT NULL,
    cuotas_vencidas INT NOT NULL DEFAULT 0,
    telefono VARCHAR(20),
    direccion VARCHAR(200)
);

-- 11. Ordenes de venta
CREATE TABLE IF NOT EXISTS ordenes_venta (
    id SERIAL PRIMARY KEY,
    cliente_id INT REFERENCES clientes(id) ON DELETE SET NULL,
    fecha_venta TIMESTAMP NOT NULL DEFAULT NOW(),
    monto_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    condicion_pago VARCHAR(20) NOT NULL DEFAULT 'Contado' CHECK (condicion_pago IN ('Contado', 'Por partes')),
    medio_pago VARCHAR(30) NOT NULL DEFAULT 'Efectivo',
    pago_inicial_realizado BOOLEAN NOT NULL DEFAULT FALSE,
    monto_cuota_inicial DECIMAL(10,2) DEFAULT 0.00,
    estado_despacho VARCHAR(30) NOT NULL DEFAULT 'Pendiente' CHECK (estado_despacho IN ('Pendiente', 'Bloqueado', 'Listo para Enviar', 'Despachada')),
    estado_pago VARCHAR(20) NOT NULL DEFAULT 'Pendiente' CHECK (estado_pago IN ('Pendiente', 'Pago Parcial', 'Pagado'))
);

-- 12. Detalle de orden de venta
CREATE TABLE IF NOT EXISTS detalle_orden_venta (
    id SERIAL PRIMARY KEY,
    orden_id INT REFERENCES ordenes_venta(id) ON DELETE CASCADE,
    sku VARCHAR(60) NOT NULL,
    cantidad_paquetes INT NOT NULL DEFAULT 0,
    precio_unitario DECIMAL(10,2) NOT NULL DEFAULT 0.00
);

-- 13. Cronograma de cuotas
CREATE TABLE IF NOT EXISTS cronograma_cuotas (
    id SERIAL PRIMARY KEY,
    orden_id INT REFERENCES ordenes_venta(id) ON DELETE CASCADE,
    cliente_id INT REFERENCES clientes(id) ON DELETE SET NULL,
    numero_cuota INT NOT NULL DEFAULT 1,
    monto DECIMAL(10,2) NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Pagada', 'Vencida')),
    fecha_pago TIMESTAMP
);

-- 14. Ordenes de compra de materia prima
CREATE TABLE IF NOT EXISTS ordenes_compra (
    id SERIAL PRIMARY KEY,
    proveedor VARCHAR(120) NOT NULL,
    color VARCHAR(50),
    material VARCHAR(80) NOT NULL,
    cantidad_kg DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    estado VARCHAR(30) NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Recibida', 'Rechazada', 'Cancelada')),
    fecha_pedido TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_recepcion TIMESTAMP,
    motivo_rechazo TEXT
);

-- 15. Recepcion de materia prima
CREATE TABLE IF NOT EXISTS recepcion_materia_prima (
    id SERIAL PRIMARY KEY,
    proveedor VARCHAR(120) NOT NULL,
    hilo_id INT REFERENCES inventario_hilo(id) ON DELETE SET NULL,
    orden_compra_id INT REFERENCES ordenes_compra(id) ON DELETE SET NULL,
    material VARCHAR(80),
    cantidad_kg DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    estado VARCHAR(30) NOT NULL DEFAULT 'Recibida' CHECK (estado IN ('Recibida', 'Devuelto a Proveedor')),
    motivo_rechazo TEXT,
    fecha_registro TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 16. Bitacora de fallas y mantenimiento
CREATE TABLE IF NOT EXISTS bitacora_fallas (
    id SERIAL PRIMARY KEY,
    maquina_id VARCHAR(15) REFERENCES maquinas(id) ON DELETE SET NULL,
    fecha TIMESTAMP NOT NULL DEFAULT NOW(),
    tipo VARCHAR(100),
    diagnostico TEXT,
    gravedad VARCHAR(20) DEFAULT 'Media' CHECK (gravedad IN ('Baja', 'Media', 'Alta')),
    tecnico VARCHAR(100),
    repuestos_usados TEXT,
    costo_reparacion DECIMAL(10,2),
    estado VARCHAR(20) NOT NULL DEFAULT 'Abierta' CHECK (estado IN ('Abierta', 'Resuelta', 'Averiada', 'Cerrado'))
);

-- 17. Historial de traslados entre salones
CREATE TABLE IF NOT EXISTS historico_traslados (
    id SERIAL PRIMARY KEY,
    origen_id VARCHAR(60) REFERENCES salones(id) ON DELETE SET NULL,
    destino_id VARCHAR(60) REFERENCES salones(id) ON DELETE SET NULL,
    cantidad_bultos INT NOT NULL DEFAULT 0,
    fecha_traslado TIMESTAMP NOT NULL DEFAULT NOW(),
    usuario VARCHAR(100)
);

-- 18. Maestro de modelos / catalogo SKU
CREATE TABLE IF NOT EXISTS maestro_modelos (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(60) UNIQUE NOT NULL,
    categoria VARCHAR(60),
    diseno VARCHAR(60),
    calidad VARCHAR(60),
    talla VARCHAR(20),
    peso INT DEFAULT 300,
    costo_hilo DECIMAL(10,4) DEFAULT 0.035,
    material_cost DECIMAL(10,2) DEFAULT 0.00,
    mo_cost DECIMAL(10,2) DEFAULT 0.00,
    precio_venta DECIMAL(10,2) DEFAULT 0.00,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- 19. Planilla diaria de inventario por salon
CREATE TABLE IF NOT EXISTS planilla_inventario (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL,
    descripcion VARCHAR(200) NOT NULL,
    salon VARCHAR(60) NOT NULL,
    inicial INT NOT NULL DEFAULT 0,
    stock INT NOT NULL DEFAULT 0,
    ingresos JSONB NOT NULL DEFAULT '{}',
    ventas JSONB NOT NULL DEFAULT '{}',
    UNIQUE (salon, codigo)
);

-- ============================================================
-- DATOS INICIALES (Estructura base sin datos de prueba)
-- ============================================================

-- Usuarios del sistema
INSERT INTO usuarios (username, password, nombre_completo, rol) VALUES
    ('admin',      'admin123', 'Administrador General',    'admin'),
    ('supervisor', 'super123', 'Supervisor de Planta',     'supervisor'),
    ('vendedor',   'pos123',   'Vendedor Principal',       'vendedor'),
    ('almacenero', 'alma123',  'Encargado de Almacen',     'almacenero')
ON CONFLICT (username) DO NOTHING;

-- Maquinas tejedoras M-01 a M-64 (Inactivas sin operario)
DO $$
BEGIN
    FOR i IN 1..64 LOOP
        INSERT INTO maquinas (id, tipo, estado)
        VALUES ('M-' || LPAD(i::TEXT, 2, '0'), 'tejido', 'Inactiva')
        ON CONFLICT (id) DO NOTHING;
    END LOOP;
END $$;

-- Remalladoras (Inactivas sin operario)
INSERT INTO maquinas (id, tipo, estado) VALUES 
    ('REM-01', 'remalladora', 'Inactiva'),
    ('REM-02', 'remalladora', 'Inactiva')
ON CONFLICT (id) DO NOTHING;

-- Salones de almacen (Capacidad vacia a cero)
INSERT INTO salones (id, capacidad_maxima_bultos, bultos_actuales) VALUES
    ('Salon A',        50,   0),
    ('Salon B',        50,   0),
    ('Salon C',        40,   0),
    ('Almacen General',1000, 0)
ON CONFLICT (id) DO NOTHING;

