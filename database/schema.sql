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
    encargado_id INT REFERENCES operarios(id) ON DELETE SET NULL
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
-- DATOS INICIALES (seeds)
-- ============================================================

-- Usuarios
INSERT INTO usuarios (username, password, nombre_completo, rol) VALUES
    ('admin',      'admin123', 'Administrador General',    'admin'),
    ('supervisor', 'super123', 'Supervisor de Planta',     'supervisor'),
    ('vendedor',   'pos123',   'Vendedor Principal',       'vendedor'),
    ('almacenero', 'alma123',  'Encargado de Almacen',     'almacenero')
ON CONFLICT (username) DO NOTHING;

-- Operarios
INSERT INTO operarios (id, nombre, tipo_contrato, tarifa, es_sueldo_fijo, modalidad, docenas_remalladas, total_liquidado) VALUES
    (1, 'María Quispe',  'destajo', 2.50, FALSE, 'A Destajo (Produccion)', 144, 360.00),
    (2, 'Juan Huamán',   'destajo', 2.80, FALSE, 'A Destajo (Produccion)',  80, 224.00),
    (3, 'Ana Ramos',     'destajo', 2.50, FALSE, 'A Destajo (Produccion)', 120, 300.00),
    (4, 'Carlos Torres', 'jornal',  50.00, TRUE, 'Sueldo Fijo (Jornal)',     0, 250.00),
    (5, 'Sofía Milla',   'jornal',  55.00, TRUE, 'Sueldo Fijo (Jornal)',     0, 275.00)
ON CONFLICT DO NOTHING;

-- Maquinas tejedoras (M-01 a M-64)
INSERT INTO maquinas (id, tipo, estado, encargado_id) VALUES
    ('M-01', 'tejido', 'Tejiendo',  4),
    ('M-02', 'tejido', 'Tejiendo',  5),
    ('M-03', 'tejido', 'Averiada',  NULL)
ON CONFLICT (id) DO NOTHING;

-- Maquinas M-04 a M-64 (Inactivas)
DO $$
BEGIN
    FOR i IN 4..64 LOOP
        INSERT INTO maquinas (id, tipo, estado)
        VALUES ('M-' || LPAD(i::TEXT, 2, '0'), 'tejido', 'Inactiva')
        ON CONFLICT (id) DO NOTHING;
    END LOOP;
END $$;

-- Remalladoras
INSERT INTO maquinas (id, tipo, estado, encargado_id) VALUES
    ('REM-01', 'remalladora', 'Activa', 1),
    ('REM-02', 'remalladora', 'Activa', 2)
ON CONFLICT (id) DO NOTHING;

-- Inventario de hilo
INSERT INTO inventario_hilo (color, material, stock_cajas, stock_kg, umbral_minimo) VALUES
    ('Blanco', 'Algodón Peinado', 15, 360.0, 3),
    ('Negro',  'Algodón Peinado', 12, 288.0, 3),
    ('Gris',   'Poliéster',        8, 192.0, 2),
    ('Azul',   'Nylon',            5, 120.0, 1)
ON CONFLICT (color, material) DO NOTHING;

-- Proveedores de hilo
INSERT INTO proveedores_hilo (nombre, ruc, telefono, contacto, direccion, tipos_hilo) VALUES
    ('Hilados del Sur S.A.C.',   '20551234567', '987654321', 'Eduardo Gómez', 'Av. Industrial 450, Lima',       'Algodón Peinado, Poliéster'),
    ('Textiles Gamarra Yarn',    '20498765432', '912345678', 'Rosa Milla',    'Jr. Gamarra 1020, La Victoria',  'Nylon, Elastano')
ON CONFLICT DO NOTHING;

-- Salones de almacen
INSERT INTO salones (id, capacidad_maxima_bultos, bultos_actuales) VALUES
    ('Salon A',        50,   1),
    ('Salon B',        50,   1),
    ('Salon C',        40,   0),
    ('Almacen General',1000, 0)
ON CONFLICT (id) DO NOTHING;

-- Planilla de inventario inicial
INSERT INTO planilla_inventario (codigo, descripcion, salon, inicial, stock) VALUES
    ('A101', 'Damas - Color Entero - Delgada',          'Salon A', 20,  30),
    ('A103', 'Ninos - Con Diseno - Delgada',             'Salon A', 10,  10),
    ('A105', 'Ninos - Color Entero - Delgada (Blanco)',  'Salon A', 50, 100),
    ('A109', 'Damas - Con Diseno - Delgada (Gris)',      'Salon A', 15,  15),
    ('B117', 'Adultos - Color Entero - Delgada (Negro)', 'Salon B', 80,  80),
    ('B120', 'Futbol - Con Diseno - Delgada',            'Salon B', 45,  45)
ON CONFLICT (salon, codigo) DO NOTHING;

-- Clientes de ejemplo
INSERT INTO clientes (tipo_documento, numero_documento, nombre_cliente, cuotas_vencidas, telefono, direccion) VALUES
    ('RUC', '20601234567', 'Distribuidora Gamarra S.A.',    0, '987654321',  'Jr. Gamarra 820, La Victoria'),
    ('RUC', '20100123456', 'Tiendas Ripley Perú S.A.',      2, '016104000',  'Av. Paseo de la República 3220, San Isidro'),
    ('RUC', '10405060708', 'Durey Trujillo Distribuciones', 0, '944888333',  'Av. España 450, Trujillo')
ON CONFLICT (numero_documento) DO NOTHING;

-- Ordenes de compra de ejemplo
INSERT INTO ordenes_compra (proveedor, material, cantidad_kg, estado) VALUES
    ('Hilados Perú SAC', 'Algodón Peinado', 200.00, 'Pendiente')
ON CONFLICT DO NOTHING;
