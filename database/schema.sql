-- Esquema de Base de Datos para el Sistema de Fábrica de Medias Durey
-- Base de datos: PostgreSQL

-- 1. Tabla de Usuarios/Supervisores (Autenticación)
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(100) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('supervisor', 'admin', 'vendedor', 'operador')),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Tabla de Operarios
CREATE TABLE IF NOT EXISTS operarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tipo_contrato VARCHAR(20) NOT NULL CHECK (tipo_contrato IN ('jornal', 'destajo')),
    tarifa DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    es_sueldo_fijo BOOLEAN NOT NULL DEFAULT FALSE,
    modalidad VARCHAR(50) NOT NULL DEFAULT 'A Destajo (Producción)',
    docenas_remalladas INT NOT NULL DEFAULT 0,
    total_liquidado DECIMAL(10, 2) NOT NULL DEFAULT 0.00
);

-- 3. Tabla de Máquinas (Tejido y Remalladoras)
CREATE TABLE IF NOT EXISTS maquinas (
    id VARCHAR(10) PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('tejido', 'remalladora')),
    estado VARCHAR(20) NOT NULL DEFAULT 'Inactiva' CHECK (estado IN ('Inactiva', 'Tejiendo', 'Averiada', 'Activa')),
    encargado_id INT REFERENCES operarios(id) ON DELETE SET NULL
);

-- 4. Tabla de Inventario de Materia Prima (Hilo)
CREATE TABLE IF NOT EXISTS inventario_hilo (
    id SERIAL PRIMARY KEY,
    color VARCHAR(50) NOT NULL,
    material VARCHAR(50) NOT NULL,
    stock_kg DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    umbral_minimo DECIMAL(10, 2) NOT NULL DEFAULT 5.00,
    UNIQUE (color, material)
);

-- 5. Tabla de Órdenes de Compra de Materia Prima
CREATE TABLE IF NOT EXISTS ordenes_compra (
    id SERIAL PRIMARY KEY,
    proveedor VARCHAR(100) NOT NULL,
    color VARCHAR(50) NOT NULL,
    material VARCHAR(50) NOT NULL,
    cantidad_kg DECIMAL(10, 2) NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Recibida', 'Rechazada', 'Cancelada')),
    fecha_pedido TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_recepcion TIMESTAMP,
    motivo_rechazo TEXT
);

-- 6. Tabla de Lotes de Producción
CREATE TABLE IF NOT EXISTS lotes_produccion (
    id SERIAL PRIMARY KEY,
    maquina_id VARCHAR(10) REFERENCES maquinas(id),
    fecha_inicio TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_fin TIMESTAMP,
    hilo_id INT REFERENCES inventario_hilo(id),
    color VARCHAR(50),
    material VARCHAR(50),
    cantidad_pares_estimada INT NOT NULL DEFAULT 0,
    cantidad_pares_primera INT NOT NULL DEFAULT 0,
    cantidad_pares_segunda INT NOT NULL DEFAULT 0,
    estado VARCHAR(30) NOT NULL DEFAULT 'Tejiendo' CHECK (estado IN (
        'Tejiendo', 'Listo para Volteado', 'Volteado', 'Listo para Remallado',
        'Remallado', 'Planchado', 'Aprobado para Preparado', 'Empacado', 'Reprocesar', 'Descartado'
    ))
);

-- 7. Tabla de Salones de Almacenamiento
CREATE TABLE IF NOT EXISTS salones (
    id VARCHAR(50) PRIMARY KEY,
    capacidad_maxima_bultos INT NOT NULL DEFAULT 50,
    bultos_actuales INT NOT NULL DEFAULT 0
);

-- 8. Tabla de Historial de Traslados de Inventario
CREATE TABLE IF NOT EXISTS historico_traslados (
    id SERIAL PRIMARY KEY,
    origen_id VARCHAR(50) REFERENCES salones(id),
    destino_id VARCHAR(50) REFERENCES salones(id),
    cantidad_bultos INT NOT NULL,
    fecha_traslado TIMESTAMP NOT NULL DEFAULT NOW(),
    usuario VARCHAR(100)
);

-- 9. Tabla de Bultos Máster
CREATE TABLE IF NOT EXISTS bultos_master (
    id SERIAL PRIMARY KEY,
    tipo_bolsa VARCHAR(20) NOT NULL CHECK (tipo_bolsa IN ('Mediana', 'Estándar', 'Grande')),
    cantidad_paquetes INT NOT NULL,
    total_pares INT NOT NULL,
    sku VARCHAR(50) NOT NULL,
    salon_id VARCHAR(50) REFERENCES salones(id) ON DELETE SET NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'Listo para Despacho' CHECK (estado IN ('Listo para Despacho', 'Almacenado', 'Despachado'))
);

-- 10. Tabla de Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    tipo_documento VARCHAR(10) NOT NULL CHECK (tipo_documento IN ('DNI', 'RUC')),
    numero_documento VARCHAR(20) UNIQUE NOT NULL,
    nombre_cliente VARCHAR(100) NOT NULL,
    cuotas_vencidas INT NOT NULL DEFAULT 0,
    telefono VARCHAR(20),
    direccion VARCHAR(200)
);

-- 11. Tabla de Órdenes de Venta
CREATE TABLE IF NOT EXISTS ordenes_venta (
    id SERIAL PRIMARY KEY,
    cliente_id INT REFERENCES clientes(id),
    fecha_venta TIMESTAMP NOT NULL DEFAULT NOW(),
    monto_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    condicion_pago VARCHAR(20) NOT NULL CHECK (condicion_pago IN ('Contado', 'Por partes')),
    medio_pago VARCHAR(30) NOT NULL DEFAULT 'Efectivo',
    pago_inicial_realizado BOOLEAN NOT NULL DEFAULT FALSE,
    monto_cuota_inicial DECIMAL(10, 2) DEFAULT 0.00,
    estado_despacho VARCHAR(20) NOT NULL DEFAULT 'Pendiente' CHECK (estado_despacho IN ('Pendiente', 'Bloqueado', 'Listo para Enviar', 'Despachada')),
    estado_pago VARCHAR(20) NOT NULL DEFAULT 'Pendiente' CHECK (estado_pago IN ('Pendiente', 'Pago Parcial', 'Pagado'))
);

-- 12. Tabla de Detalle de Venta
CREATE TABLE IF NOT EXISTS detalle_orden_venta (
    id SERIAL PRIMARY KEY,
    orden_id INT REFERENCES ordenes_venta(id) ON DELETE CASCADE,
    sku VARCHAR(50) NOT NULL,
    cantidad_paquetes INT NOT NULL,
    precio_unitario DECIMAL(10, 2) NOT NULL DEFAULT 0.00
);

-- 13. Tabla de Cronograma de Cuotas
CREATE TABLE IF NOT EXISTS cronograma_cuotas (
    id SERIAL PRIMARY KEY,
    orden_id INT REFERENCES ordenes_venta(id) ON DELETE CASCADE,
    numero_cuota INT NOT NULL,
    monto_cuota DECIMAL(10, 2) NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Pagada', 'Vencida')),
    fecha_pago TIMESTAMP
);

-- 14. Tabla de Bitácora de Fallas
CREATE TABLE IF NOT EXISTS bitacora_fallas (
    id SERIAL PRIMARY KEY,
    maquina_id VARCHAR(10) REFERENCES maquinas(id),
    fecha TIMESTAMP NOT NULL DEFAULT NOW(),
    diagnostico TEXT,
    tecnico VARCHAR(100),
    repuestos_usados TEXT,
    costo_reparacion DECIMAL(10, 2),
    estado_ticket VARCHAR(20) NOT NULL DEFAULT 'Averiada' CHECK (estado_ticket IN ('Averiada', 'Cerrado'))
);

-- 15. Tabla de Recepción de Materia Prima
CREATE TABLE IF NOT EXISTS recepcion_materia_prima (
    id SERIAL PRIMARY KEY,
    hilo_id INT REFERENCES inventario_hilo(id),
    orden_compra_id INT REFERENCES ordenes_compra(id),
    proveedor VARCHAR(100) NOT NULL,
    cantidad_kg DECIMAL(10, 2) NOT NULL,
    estado VARCHAR(30) NOT NULL CHECK (estado IN ('Recibida', 'Devuelto a Proveedor')),
    motivo_rechazo TEXT,
    fecha_registro TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 16. Tabla de Maestro de Modelos (Catálogo SKU)
CREATE TABLE IF NOT EXISTS maestro_modelos (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    diseno VARCHAR(50) NOT NULL,
    calidad VARCHAR(50) NOT NULL,
    talla VARCHAR(20) NOT NULL,
    peso_por_docena_g INT DEFAULT 300,
    costo_hilo_por_gramo DECIMAL(10, 4) DEFAULT 0.03,
    costo_mano_obra_acabado DECIMAL(10, 2) DEFAULT 0.40,
    precio_venta DECIMAL(10, 2) DEFAULT 0.00,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- 17. Tabla de Planilla Diaria de Inventario (Excel ALMACEN PASN)
CREATE TABLE IF NOT EXISTS planillas_diarias (
    id SERIAL PRIMARY KEY,
    salon_id VARCHAR(50) REFERENCES salones(id),
    codigo VARCHAR(20) NOT NULL,
    descripcion VARCHAR(200) NOT NULL,
    inicial INT NOT NULL DEFAULT 0,
    ingresos_lunes INT NOT NULL DEFAULT 0,
    ventas_lunes INT NOT NULL DEFAULT 0,
    ingresos_martes INT NOT NULL DEFAULT 0,
    ventas_martes INT NOT NULL DEFAULT 0,
    ingresos_miercoles INT NOT NULL DEFAULT 0,
    ventas_miercoles INT NOT NULL DEFAULT 0,
    ingresos_jueves INT NOT NULL DEFAULT 0,
    ventas_jueves INT NOT NULL DEFAULT 0,
    ingresos_viernes INT NOT NULL DEFAULT 0,
    ventas_viernes INT NOT NULL DEFAULT 0,
    ingresos_sabado INT NOT NULL DEFAULT 0,
    ventas_sabado INT NOT NULL DEFAULT 0,
    UNIQUE (salon_id, codigo)
);

-- ==========================================
-- DATOS INICIALES
-- ==========================================

-- Usuarios por defecto (contraseña: admin123 para todos)
INSERT INTO usuarios (username, password_hash, nombre_completo, rol) VALUES
    ('admin', 'admin123', 'Administrador General', 'admin'),
    ('supervisor', 'admin123', 'Supervisor de Planta', 'supervisor'),
    ('vendedor', 'admin123', 'Vendedor Principal', 'vendedor')
ON CONFLICT (username) DO NOTHING;

-- Salones iniciales
INSERT INTO salones (id, capacidad_maxima_bultos, bultos_actuales) VALUES
    ('Salón A', 50, 0),
    ('Salón B', 50, 0),
    ('Salón C', 40, 0),
    ('Almacén General', 1000, 0)
ON CONFLICT (id) DO NOTHING;

-- Planilla Salón A
INSERT INTO planillas_diarias (salon_id, codigo, descripcion, inicial) VALUES
    ('Salón A', 'A101', 'Damas - Color Entero - Delgada', 0),
    ('Salón A', 'A103', 'Niños - Con Diseño - Delgada', 0),
    ('Salón A', 'A105', 'Niños - Color Entero - Delgada (Blanco)', 0),
    ('Salón A', 'A109', 'Damas - Con Diseño - Delgada (Gris)', 0),
    ('Salón B', 'B117', 'Adultos - Color Entero - Delgada (Negro)', 0),
    ('Salón B', 'B120', 'Fútbol - Con Diseño - Delgada', 0)
ON CONFLICT (salon_id, codigo) DO NOTHING;

-- Datos de ejemplo: inventario de hilo
INSERT INTO inventario_hilo (color, material, stock_kg, umbral_minimo) VALUES
    ('Blanco', 'Algodón', 50.00, 5.00),
    ('Negro', 'Algodón', 45.00, 5.00),
    ('Rojo', 'Algodón', 30.00, 5.00),
    ('Gris', 'Lana', 25.00, 5.00),
    ('Negro', 'Nylon', 35.00, 5.00)
ON CONFLICT (color, material) DO NOTHING;
