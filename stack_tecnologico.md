# Recomendación de Stack Tecnológico - Fábrica de Medias Durey

Este documento propone y fundamenta el stack de programación idóneo para implementar el sistema basándose en:
1. Las especificaciones de negocio detalladas en `especificaciones.md` (cálculos de nómina, deudas, control de stock y bitácoras).
2. Los diseños técnicos creados por Stitch en la carpeta `diseño.md/` (los cuales utilizan HTML5, Tailwind CSS y Google Material Symbols).

---

## 1. Resumen del Stack Propuesto (MERN/T-Stack + PostgreSQL)

Para garantizar un desarrollo ágil, alineado con los prototipos de Stitch y robusto a nivel transaccional:

*   **Frontend (Capa de Presentación):** React (con Vite) + Tailwind CSS + Lucide React / Material Symbols Outlined.
*   **Backend (Capa de Lógica de Negocio):** Node.js con Express o NestJS (TypeScript).
*   **Base de Datos (Capa de Datos):** PostgreSQL (Base de datos relacional).
*   **Comunicación en Tiempo Real:** WebSockets (mediante Socket.io) para notificaciones y alertas de producción.
*   **Pruebas Automatizadas:** Cucumber.js + Playwright o Jest para ejecutar las especificaciones Gherkin directamente sobre el código.

---

## 2. Justificación Técnica del Stack

### A. Frontend: React + Tailwind CSS
*   **Compatibilidad directa con Stitch:** Los archivos HTML generados por Stitch en `diseño.md/` usan **Tailwind CSS** vía CDN y una configuración extendida de colores y tamaños de fuente. Usar React con Tailwind permite mover esta configuración directamente a `tailwind.config.js` sin alterar los estilos visuales originales:
    ```javascript
    // Configuración alineada con Stitch en tailwind.config.js
    module.exports = {
      theme: {
        extend: {
          colors: {
            "primary": "#0037b0",
            "surface-container": "#ededf9",
            "background": "#faf8ff",
            "error": "#ba1a1a",
            // etc.
          }
        }
      }
    }
    ```
*   **Arquitectura basada en componentes:** Pantallas complejas como la cuadrícula de 64 máquinas (`Área de Tejido`) se modelan fácilmente en React dividiendo la UI en componentes reutilizables (`<MachineCard id="M-01" status="Tejiendo" />`).

### B. Backend: Node.js (TypeScript) + Express / NestJS
*   **Rendimiento y Concurrencia:** La fábrica maneja eventos concurrentes (alertas de máquinas que se detienen, ingresos de stock, ventas en el POS). Node.js gestiona la concurrencia a través de su bucle de eventos no bloqueante.
*   **Tiempo Real (WebSockets):** Esencial para el requisito de alertar inmediatamente al supervisor si una máquina se detiene o si falta stock de hilo en tiempo real. Socket.io se integra de manera nativa con Node.js.

### C. Base de Datos: PostgreSQL
*   **Integridad Transaccional (ACID):** El control de cobros por partes, deudas de clientes, control de inventario entre salones y el almacén general requiere transacciones estrictas. Si una venta de bultos se procesa, la reducción del inventario en el salón y la creación del cronograma de cuotas de pago del cliente deben ocurrir juntas; si una falla, toda la transacción debe revertirse.
*   **Estructura Relacional:** Los datos de la fábrica son altamente relacionales (un lote pertenece a una máquina, una máquina pertenece a un encargado, un bulto está en un salón, etc.).
*   **Modelo de Datos Recomendado:**
    - `maquinas`: id, estado (activa, averiada, inactiva), encargado_id.
    - `operarios`: id, nombre, tipo_contrato (jornal, destajo), tarifa.
    - `lotes_produccion`: id, maquina_id, cantidad, clasificacion (primera, segunda), estado (remallado, planchado, empaque).
    - `salones`: id, nombre, capacidad_maxima, bultos_actuales.
    - `clientes`: id, ruc_dni, nombre, cuotas_vencidas.
    - `bitacora_fallas`: id, maquina_id, fecha, problema, tecnico_id, costo.

### D. Automatización de Pruebas: Cucumber.js
*   Dado que definimos todo el comportamiento del sistema en archivos `.feature` de Gherkin, Cucumber.js permite mapear directamente los escenarios descritos en `especificaciones.md` a funciones de prueba automatizadas en JavaScript, garantizando que el sistema siempre funcione según las especificaciones acordadas.

---

## 3. Arquitectura del Proyecto Recomendada

Para organizar el código en tu carpeta del sistema:

```text
/Users/user/Documents/sistema durey final /
├── especificaciones.md               # Documento de requerimientos
├── prompt_para_stitch.md             # Instrucciones de UI
├── features/                        # Archivos de Gherkin (.feature)
│   ├── tejido.feature
│   ├── remallado.feature
│   └── ...
├── tests/                           # Código de pruebas automatizadas (BDD)
│   ├── step_definitions/            # Mapeo de Gherkin a JS
│   └── support/
├── frontend/                        # Aplicación de interfaz (React + Vite)
│   ├── package.json
│   ├── tailwind.config.js           # Configuración con colores de Stitch
│   ├── src/
│   │   ├── components/              # Tarjetas de máquinas, wizard de ventas
│   │   └── pages/                   # Dashboard, Almacén, Ventas
└── backend/                         # API de lógica de negocio (Node.js)
    ├── package.json
    ├── src/
    │   ├── controllers/             # Ventas, Inventario, Nómina
    │   ├── models/                  # Esquemas de base de datos
    │   └── gateway/                 # Conexión WebSocket para alertas
```

---

## 4. Próximos Pasos para Iniciar
1.  **Instalar Node.js** en el entorno de desarrollo.
2.  **Inicializar el Backend y Frontend** en las carpetas respectivas utilizando comandos no interactivos de inicialización.
3.  **Configurar la base de datos PostgreSQL** localmente o en la nube para comenzar a estructurar las tablas de la fábrica.
