# Documento de Especificaciones - Sistema de Fábrica de Medias

Este documento consolida las especificaciones y flujos de negocio detallados para el sistema de gestión de la fábrica de fabricación de medias. Cada sección representa un módulo operativo del sistema y su traducción a escenarios de prueba Gherkin.

---

## Índice
1. [Módulo 1: Proceso de Tejido](#módulo-1-proceso-de-tejido)
2. [Módulo 2: Volteado, Remallado y Liquidación de Personal](#módulo-2-volteado-remallado-y-liquidación-de-personal)
3. [Módulo 3: Planchado, Acabado e Inspección y Empaque](#módulo-3-planchado-acabado-e-inspección-y-empaque)
4. [Módulo 4: Almacenamiento y Gestión de Salones](#módulo-4-almacenamiento-y-gestión-de-salones)
5. [Módulo 5: Codificación y Categorización de Medias](#módulo-5-codificación-y-categorización-de-medias)
6. [Módulo 6: Asistente y Gestión de Ventas](#módulo-6-asistente-y-gestión-de-ventas)
7. [Módulo 7: Gestión de Averías y Bitácora de Mantenimiento](#módulo-7-gestión-de-averías-y-bitácora-de-mantenimiento)
8. [Módulo 8: Despacho y Logística de Distribución](#módulo-8-despacho-y-logística-de-distribución)
9. [Módulo 9: Abastecimiento y Gestión de Materia Prima](#módulo-9-abastecimiento-y-gestión-de-materia-prima)
10. [Módulo 10: Integración de Planillas y Diccionario Durey](#módulo-10-integración-de-planillas-y-diccionario-durey)

---

## Módulo 1: Proceso de Tejido
* **Fichero de Especificación:** `features/tejido.feature`
* **Descripción:** Controla el encendido de máquinas de tejido, la asignación de operarios responsables (rango recomendado de 5 a más de 10 máquinas por encargado), la clasificación de salida inicial del lote de tejido (Primeras y Segundas), y la validación crítica de inventario de hilo para evitar inicios sin suficiente materia prima.

```gherkin
# language: es
Característica: Proceso de tejido de medias
  Como operador de la fábrica de medias
  Quiero cargar el hilo en las máquinas de tejido e iniciar el proceso
  Para comenzar la fabricación de las medias

  Escenario: Cargar hilo e iniciar el proceso de tejido
    Dado que la máquina de tejido "M-01" está apagada o en estado "Inactiva"
    Y se cuenta con bobinas de hilo de color "Blanco" y material "Algodón"
    Cuando el operador coloca el hilo en los alimentadores de la máquina "M-01"
    Y enciende e inicia el proceso de tejido en la máquina
    Entonces el estado de la máquina "M-01" debe cambiar a "Tejiendo"
    Y el inventario de hilo de color "Blanco" debe disminuir
    Y se debe registrar el inicio de un lote de producción de medias

  Escenario: Cargar hilo e iniciar proceso múltiple por encargado ("arrastrar máquinas")
    Dado que el encargado "Juan Pérez" tiene asignadas las máquinas "M-01", "M-02" y "M-03" en estado "Inactiva"
    Y se cuenta con stock de hilo suficiente
    Cuando el supervisor selecciona al encargado "Juan Pérez" en el formulario de encendido
    Entonces el sistema debe auto-seleccionar todas sus máquinas inactivas asignadas
    Y al presionar iniciar debe arrancar el tejido en "M-01", "M-02" y "M-03" simultáneamente
    Y descontar el stock de hilo total necesario

  Escenario de ejemplo: Asignación de rango de máquinas a un encargado
    Dado que existen 64 máquinas de tejido en el sistema
    Y el encargado "Juan Pérez" tiene actualmente 0 máquinas asignadas
    Cuando el supervisor asigna 8 máquinas al encargado "Juan Pérez"
    Entonces el sistema debe permitir la asignación
    Y el encargado "Juan Pérez" debe figurar como el responsable de la producción de esas 8 máquinas

  Escenario: Validación de límite mínimo de máquinas por encargado
    Dado que existen 64 máquinas de tejido en el sistema
    Y el encargado "Pedro Gómez" tiene actualmente 0 máquinas asignadas
    Cuando el supervisor intenta asignar 3 máquinas al encargado "Pedro Gómez"
    Entonces el sistema debe emitir una advertencia indicando que el mínimo recomendado es de 5 máquinas por encargado

  Esquema del escenario: Clasificación de la producción de medias de una máquina
    Dado que la máquina "M-15" está asignada al encargado "Juan Pérez"
    Y la máquina ha finalizado la producción de un lote de medias
    Cuando el encargado clasifica un lote de medias producidas
    Entonces la cantidad de medias en estado "<clasificacion>" debe registrarse como "<cantidad>"
    Y el destino del lote clasificado debe ser "<destino>"

    Ejemplos:
      | clasificacion | cantidad | destino               |
      | Primeras      | 120      | Almacén de Listas     |
      | Segundas      | 15       | Reprocesar (Tejido)   |
      | Segundas      | 3        | Descarte (Desecho)    |

  Escenario: Bloqueo de máquina y alerta al supervisor por falta de hilo
    Dado que la máquina de tejido "M-01" está apagada o en estado "Inactiva"
    Y el inventario actual de hilo "Algodón Rojo" es de "2 kg"
    Y la producción estimada del lote requiere "5 kg" de hilo "Algodón Rojo"
    Cuando el operador intenta iniciar el proceso de tejido en la máquina "M-01"
    Entonces el sistema debe bloquear el encendido de la máquina
    Y debe enviar una alerta crítica al supervisor de la fábrica por "Falta de materia prima"
```

---

## Módulo 2: Volteado, Remallado y Liquidación de Personal
* **Fichero de Especificación:** `features/remallado.feature`
* **Descripción:** Controla el traslado del lote del tejido al área de volteado y posterior remallado en las máquinas remalladoras (costura de la puntera). Modela el cálculo de pagos de nómina: "Jornal" (salario fijo diario para operadores de tejido) y "Destajo" (pago por unidad terminada para operarios de remallado sin penalizaciones de descuento por fallas de calidad).

```gherkin
# language: es
Característica: Procesos de Volteado, Remallado y Liquidación de Personal
  Como administrador del sistema de la fábrica de medias
  Quiero gestionar el flujo de medias tejidas hacia el volteado y remallado
  Y registrar la producción para calcular los pagos según la modalidad (destajo o jornal)
  Para asegurar el correcto acabado de las medias y el pago justo a los operarios

  Escenario: Transición de lote desde Tejido pasando por Volteado hasta Remallado
    Dado que un lote de medias clasificadas como "Primeras" ha salido del proceso de "Tejido"
    Cuando el lote pasa por el proceso de "Volteado" donde se voltean las medias
    Entonces el lote debe cambiar de estado a "Listo para Remallado"
    Y estar disponible para ser procesado en las máquinas remalladoras

  Esquema del escenario: Registro de costura final en Remalladora y cálculo de pago al destajo
    Dado que el operario de remallado "<operario>" está asignado a la remalladora "<remalladora>"
    Y la modalidad de contrato de "<operario>" es "Destajo" con una tarifa de "<tarifa>" por media remallada
    Y el lote en estado "Listo para Remallado" tiene una cantidad de "<cantidad>" medias
    Cuando el operario "<operario>" remalla las "<cantidad>" medias del lote en la máquina "<remalladora>"
    Entonces la parte final de las medias se registra como cosida y finalizada
    Y el sistema debe calcular un pago devengado de "<pago_calculado>" para el operario "<operario>"

    Ejemplos:
      | operario     | remalladora | tarifa | cantidad | pago_calculado |
      | María Gómez  | REM-01      | 0.15   | 500      | 75.00          |
      | Ana Torres   | REM-02      | 0.15   | 800      | 120.00         |

  Escenario: Registro de asistencia y pago a jornal para encargados de tejido
    Dado que el encargado de tejido "Juan Pérez" está asignado a un grupo de máquinas de tejido
    Y su modalidad de contrato es "Jornal" con un salario diario de 150.00
    Cuando se registra la jornada laboral completa del día
    Entonces el sistema debe calcular un pago fijo de 150.00 para "Juan Pérez"
    Y el pago no debe variar en función de las medias producidas por sus máquinas

  Escenario: Cálculo de pago a destajo sin penalización por medias defectuosas
    Dado que el operario de remallado "María Gómez" tiene una tarifa de "0.15" por media remallada
    Y procesa un lote de "1000" medias
    Y el control de calidad posterior clasifica "950" medias como "Primeras" y "50" como "Segundas"
    Cuando el sistema realiza la liquidación de la producción del lote
    Entonces el sistema debe calcular el pago sobre el total de "1000" medias remalladas
    Y el pago neto devengado para "María Gómez" debe ser "150.00" sin aplicar descuentos por las "50" medias con error
```

---

## Módulo 3: Planchado, Acabado e Inspección y Empaque
* **Fichero de Especificación:** `features/acabado_y_empaque.feature`
* **Descripción:** Modela el planchado en hormas gigantes, la limpieza de hilos y detección de fallas en el área de acabado, el empaque individual por par (con su etiqueta), el agrupamiento en paquetes de 12 pares (docenas) y la consolidación de bultos máster de 10, 12 o 15 docenas. Asegura además que los lotes de segundas que son reparados mantengan su calidad de "Segundas" en catálogo.

```gherkin
# language: es
Característica: Procesos de Planchado, Acabado e Inspección, y Preparado para la Venta
  Como administrador del sistema de la fábrica de medias
  Quiero gestionar las etapas de planchado, control de calidad final y la consolidación en empaques
  Para garantizar la calidad del producto final y organizar el inventario para la venta

  Escenario: Planchado de las medias remalladas
    Dado que se cuenta con un lote de medias en estado "Remalladas y Unidas"
    Cuando las medias se colocan y procesan en las planchas gigantes de planchado
    Entonces el lote debe cambiar de estado a "Planchadas"
    Y el lote se envía al área de Acabado

  Escenario: Inspección de acabado y corrección de detalles
    Dado que un lote de medias en estado "Planchadas" ingresa al área de Acabado
    Cuando el operario realiza el control de calidad, retira hilos sobrantes y detecta posibles fallas
    Y aprueba el lote al no encontrar defectos insalvables
    Entonces el lote cambia de estado a "Aprobado para Preparado"

  Escenario: Clasificación inalterada tras reprocesar un lote de Segundas
    Dado que se tiene un lote de "100" medias clasificadas originalmente como "Segundas" por un error de remallado
    Cuando el lote se envía a reprocesar y los operarios corrigen las costuras de las medias
    Y el operario de acabado vuelve a inspeccionar y aprueba el lote reprocesado
    Entonces el lote debe cambiar de estado a "Aprobado para Preparado"
    Y la clasificación definitiva del lote debe mantenerse como "Segundas" (no pasa a ser "Primeras")
    Y se debe registrar en el catálogo como producto de calidad "Segunda" con su precio reducido correspondiente

  Escenario: Empaque inicial (Etiquetado y embolsado por par)
    Dado que se cuenta con medias en estado "Aprobado para Preparado"
    Cuando el operario de empaque coloca la etiqueta de la marca a cada par de medias
    Y guarda cada par en su bolsa individual de venta
    Entonces se registra que los pares están listos y etiquetados individualmente

  Escenario: Agrupación en paquete de docena (12 pares)
    Dado que se tienen "12" pares de medias etiquetados e individualmente embolsados
    Cuando el operario agrupa estos pares y los coloca dentro de un paquete de docena
    Entonces el sistema registra "1" paquete de 12 pares (docena) en stock de empaque

  Esquema del escenario: Consolidación en bolsa grande para distribución (Bulto máster)
    Dado que se cuenta con paquetes de 12 pares en stock de empaque
    Cuando el operario coloca "<cantidad_paquetes>" paquetes en una bolsa grande de tipo "<tipo_bolsa>"
    Entonces el sistema debe registrar un "Bulto Máster" de tipo "<tipo_bolsa>" con "<total_pares>" pares de medias
    Y el Bulto Máster debe quedar registrado con estado "Listo para Despacho y Venta"

    Ejemplos:
      | tipo_bolsa | cantidad_paquetes | total_pares |
      | Mediana    | 10                | 120         |
      | Estándar   | 12                | 144         |
      | Grande     | 15                | 180         |
```

---

## Módulo 4: Almacenamiento y Gestión de Salones
* **Fichero de Especificación:** `features/almacenamiento.feature`
* **Descripción:** Define las ubicaciones del stock terminado en salones (Salones A, B, C inicialmente) con capacidad de crear nuevos de manera dinámica. Controla las capacidades máximas de los salones redirigiendo el stock entrante hacia el Almacén General cuando se llenan, o permitiendo traslados de inventario manuales del supervisor.

```gherkin
# language: es
Característica: Almacenamiento de Bultos y Gestión de Salones
  Como encargado de almacén de la fábrica de medias
  Quiero registrar la entrada de los bultos máster a los diferentes salones de almacenamiento
  Y poder crear nuevos salones en el sistema
  Para mantener un inventario ordenado y rastreable del producto terminado

  Escenario: Creación de un nuevo salón de almacenamiento
    Dado que actualmente existen los salones "Salón A", "Salón B" y "Salón C"
    Cuando el administrador crea un nuevo salón llamado "Salón D"
    Entonces el sistema debe confirmar la creación del "Salón D"
    Y la lista de salones disponibles debe contener "Salón A", "Salón B", "Salón C" y "Salón D"

  Escenario: Almacenamiento de un Bulto Máster en un salón específico
    Dado que se cuenta con un "Bulto Máster" con "120" pares de medias listo para almacenamiento
    Y el "Salón B" está registrado y habilitado en el sistema
    Cuando el operario traslada el "Bulto Máster" y lo registra en el "Salón B"
    Entonces el estado del Bulto Máster debe cambiar a "Almacenado"
    Y la ubicación física registrada del bulto debe ser el "Salón B"
    Y el inventario total de medias en el "Salón B" debe incrementarse en "120" pares

  Escenario: Redirección al Almacén General cuando un salón está lleno
    Dado que el "Salón A" tiene una capacidad máxima de "50" bultos
    Y el "Salón A" ya contiene "50" bultos almacenados (está lleno)
    Cuando el operario intenta ingresar un nuevo "Bulto Máster" en el "Salón A"
    Entonces el sistema debe denegar el ingreso en el "Salón A" por capacidad excedida
    Y debe sugerir desviar y registrar el "Bulto Máster" en el "Almacén General"

  Escenario: Traslado de bultos desde un salón lleno al Almacén General
    Dado que el "Salón C" se encuentra lleno con "40" bultos
    Y el "Almacén General" tiene espacio de almacenamiento disponible
    Cuando el encargado de inventario realiza un traslado masivo de "20" bultos desde el "Salón C" hacia el "Almacén General"
    Entonces el stock de bultos del "Salón C" debe disminuir a "20" bultos
    Y el stock de bultos del "Almacén General" debe incrementarse en "20" bultos
    Y se debe generar un registro de movimiento histórico de traslado de inventario
```

---

## Módulo 5: Codificación y Categorización de Medias
* **Fichero de Especificación:** `features/codificacion.feature`
* **Descripción:** Estructura la clasificación y generación de códigos únicos (SKU) del catálogo en base a la Categoría Principal (Niños, Bebes, Damas, Adultos, Fútbol), la subcategoría de Diseño/Color (Color entero, con diseño, etc.), la subcategoría de Calidad/Grosor (Delgada, Afelpada), y las tallas (específicas como 4 o 5, o talla única "UNI"). Modela también los filtros de búsqueda en el inventario por estas características.

```gherkin
# language: es
Característica: Codificación y Categorización de Medias
  Como administrador del catálogo de productos
  Quiero codificar y clasificar las medias por categoría principal, diseño y calidad
  Para mantener un inventario estructurado, facilitar las ventas y realizar búsquedas precisas

  Esquema del escenario: Generación del código único de producto
    Dado que las reglas de codificación para categorías, diseños, calidades y tallas están activas
    Cuando el catálogo de productos registra una media con:
      | categoria | <categoria> |
      | diseno    | <diseno>    |
      | calidad   | <calidad>   |
      | talla     | <talla>     |
    Entonces el sistema debe generar el SKU o código único "<codigo_esperado>"
    Y guardar el producto en el catálogo activo

    Ejemplos:
      | categoria | diseno        | calidad   | talla        | codigo_esperado |
      | Niños     | Color entero  | Delgada   | 4            | NIN-ENT-DEL-04  |
      | Bebes     | Con diseño    | Afelpada  | 2            | BEB-DIS-AFE-02  |
      | Damas     | Con diseño    | Delgada   | Talla Única  | DAM-DIS-DEL-UNI |
      | Adultos   | Color entero  | Afelpada  | Talla Única  | ADU-ENT-AFE-UNI |
      | Fútbol    | Con diseño    | Delgada   | 5            | FUT-DIS-DEL-05  |

  Escenario: Filtrado de inventario por características específicas en el Almacén General
    Dado que en el "Almacén General" existen los siguientes bultos registrados:
      | codigo_producto | tipo_categoria | tipo_diseno   | tipo_calidad | tipo_talla   | cantidad_pares |
      | NIN-ENT-DEL-04  | Niños          | Color entero  | Delgada      | 4            | 120            |
      | DAM-DIS-DEL-UNI | Damas          | Con diseño    | Delgada      | Talla Única  | 180            |
      | FUT-DIS-DEL-05  | Fútbol         | Con diseño    | Delgada      | 5            | 144            |
      | ADU-ENT-AFE-UNI | Adultos        | Color entero  | Afelpada     | Talla Única  | 120            |
    Cuando el encargado de inventario filtra el almacén por tipo de calidad "Delgada"
    Entonces el sistema debe mostrar únicamente los productos con código:
      | codigo_producto |
      | NIN-ENT-DEL-04  |
      | DAM-DIS-DEL-UNI |
      | FUT-DIS-DEL-05  |
    Y la suma total de pares mostrada en el filtro debe ser "444"
```

---

## Módulo 6: Asistente y Gestión de Ventas
* **Fichero de Especificación:** `features/ventas.feature`
* **Descripción:** Especifica la experiencia de usuario del vendedor con un asistente visual (Paso 1: Categoría, Paso 2: Talla o Talla única automática, Paso 3: Diseño/Color, Paso 4: Calidad). También contempla el registro final (DNI/RUC del cliente, pago al contado o por partes), la validación de alertas de stock insuficiente y el bloqueo automático de ventas a clientes deudores con posibilidad de ser desbloqueada mediante credenciales del supervisor.

```gherkin
# language: es
Característica: Asistente de Selección de Productos en el Área de Ventas
  Como vendedor de la fábrica de medias
  Quiero usar un flujo guiado de selección (categoría -> talla -> color/diseño -> calidad)
  Para identificar rápidamente el producto en el catálogo y conocer su stock y precio antes de venderlo

  Escenario: Selección paso a paso de un producto con tallas específicas
    Dado que el vendedor inicia el proceso de selección de producto
    Cuando selecciona el botón de la categoría principal "Niños"
    Entonces la interfaz debe habilitar la sección de tallas mostrando las opciones "4" y "5"
    Cuando el vendedor selecciona la talla "4"
    Entonces la interfaz debe habilitar la sección de diseño/color mostrando "Color entero" y "Con diseño"
    Cuando el vendedor selecciona la subcategoría de diseño "Color entero"
    Entonces la interfaz debe habilitar la sección de calidad mostrando "Delgada" y "Afelpada"
    Cuando el vendedor selecciona la calidad "Delgada"
    Entonces el sistema debe mostrar el producto "NIN-ENT-DEL-04", su stock actual y su precio unitario

  Escenario: Selección paso a paso de un producto con talla única
    Dado que el vendedor inicia el proceso de selección de producto
    Cuando selecciona el botón de la categoría principal "Damas"
    Entonces la interfaz debe mostrar que solo está disponible la opción "Talla Única" por defecto
    Cuando el vendedor selecciona "Talla Única"
    Entonces la interfaz debe habilitar la sección de diseño/color mostrando "Color entero" y "Con diseño"
    Cuando el vendedor selecciona la subcategoría de diseño "Con diseño"
    Entonces la interfaz debe habilitar la sección de calidad mostrando "Delgada" y "Afelpada"
    Cuando el vendedor selecciona la calidad "Delgada"
    Entonces el sistema debe mostrar el producto "DAM-DIS-DEL-UNI", su stock actual y su precio unitario

  Escenario: Registro de venta exitosa con datos de cliente y pago por partes
    Dado que el vendedor ha seleccionado el producto "NIN-ENT-DEL-04"
    Y el sistema registra que hay un stock de "50" paquetes en el almacén
    Cuando el vendedor indica que venderá "10" paquetes del producto
    Y el vendedor ingresa los datos del cliente:
      | tipo_documento | numero_documento | nombre_cliente        |
      | RUC            | 20123456789      | Comercializadora Durey|
    Y el vendedor selecciona el medio de pago "Transferencia" y la condición "Por partes" (crédito)
    Entonces el sistema debe registrar la orden de venta exitosamente
    Y descontar "10" paquetes del inventario total (almacenes/salones)
    Y generar el cronograma de cuotas para el pago por partes

  Escenario: Alerta por falta de stock en los almacenes o salones
    Dado que el vendedor ha seleccionado el producto "DAM-DIS-DEL-UNI"
    Y el sistema registra que solo hay un stock de "3" paquetes disponibles entre almacenes y salones
    Cuando el vendedor intenta agregar "10" paquetes a la venta
    Entonces el sistema debe mostrar una alerta de error "Stock Insuficiente" indicando la disponibilidad actual
    Y debe impedir que el vendedor continúe con el registro de la venta para esa cantidad

  Escenario: Intento de venta bloqueado por deuda vencida del cliente
    Dado que el cliente "Comercializadora Durey" tiene "2" cuotas de pago vencidas en el sistema
    Cuando el vendedor intenta registrar una nueva venta para este cliente
    Entonces el sistema debe bloquear el registro de la venta automáticamente
    Y mostrar un mensaje de error "Cliente con deuda vencida - Requiere aprobación de supervisor"

  Escenario: Venta autorizada por supervisor a cliente con deuda vencida
    Dado que el cliente "Comercializadora Durey" tiene "2" cuotas de pago vencidas en el sistema
    Y el vendedor ha intentado registrar una venta que fue bloqueada por el sistema
    Cuando el supervisor general ingresa sus credenciales de autorización y aprueba la operación
    Entonces el sistema debe desbloquear la venta
    Y permitir al vendedor registrar la orden de venta exitosamente
```

---

## Módulo 7: Gestión de Averías y Bitácora de Mantenimiento
* **Fichero de Especificación:** `features/mantenimiento.feature`
* **Descripción:** Controla el proceso de reporte de averías, suspensión de máquinas inactivas, asignación de técnicos externos contratados para reparaciones puntuales y la bitácora histórica. Se emplea para alertar sobre fallas mecánicas recurrentes y liquidar los costos del técnico dependiendo de la dificultad de la reparación.

```gherkin
# language: es
Característica: Gestión de Averías y Bitácora de Mantenimiento de Máquinas
  Como supervisor general de la fábrica de medias
  Quiero registrar las fallas reportadas y los diagnósticos de los técnicos externos en una bitácora digital
  Para dar seguimiento a las reparaciones y analizar las fallas recurrentes en la maquinaria

  Escenario: Reporte y registro inicial de una máquina averiada
    Dado que la máquina de tejido "M-08" se encuentra operando y asignada al encargado "Juan Pérez"
    Cuando la máquina "M-08" se estropea durante la producción
    Y el encargado "Juan Pérez" reporta el problema al supervisor general de la fábrica
    Entonces el estado de la máquina "M-08" debe actualizarse a "Averiada" en el sistema
    Y se debe registrar un ticket de falla pendiente en la bitácora con la fecha, hora y descripción inicial

  Escenario: Registro de revisión y diagnóstico del técnico externo
    Dado que la máquina "M-08" tiene un ticket de falla pendiente con estado "Averiada"
    Y el supervisor de la fábrica ha llamado al técnico externo contratado
    Cuando el técnico externo inspecciona la máquina y determina el diagnóstico
    Y el encargado general registra los datos del diagnóstico técnico en el sistema:
      | tecnico           | problema_detectado          | repuestos_requeridos | estado_reparacion |
      | Roberto Cárdenas  | Falla en sensor de aguja    | Sensor de aguja M8   | Reparada          |
    Entonces la máquina "M-08" debe cambiar su estado a "Activa" en el sistema
    Y el ticket de falla en la bitácora debe quedar en estado "Cerrado" con el reporte del técnico asociado

  Escenario: Detección de fallas recurrentes a través del historial de la bitácora
    Dado que la bitácora de fallas registra los siguientes incidentes para la máquina "M-08" en el último mes:
      | fecha      | maquina | problema_detectado       | tecnico           |
      | 2026-06-15 | M-08    | Falla en sensor de aguja | Roberto Cárdenas  |
      | 2026-06-25 | M-08    | Falla en sensor de aguja | Roberto Cárdenas  |
      | 2026-07-10 | M-08    | Falla en sensor de aguja | Roberto Cárdenas  |
    Cuando el supervisor general consulta el análisis de fallas recurrentes de la bitácora
    Entonces el sistema debe emitir una alerta indicando que la máquina "M-08" presenta una falla recurrente de tipo "Falla en sensor de aguja"
    Y la frecuencia de la falla en el período analizado debe ser de "3" veces

  Esquema del escenario: Cálculo de pago para técnicos externos por tipo de reparación
    Dado que las tarifas de reparación externa están configuradas:
      | tipo_reparacion      | tarifa_pago |
      | Cambio de Motor      | 500.00      |
      | Cambio de Sensor     | 150.00      |
      | Ajuste Mecánico Base | 80.00       |
    Cuando el encargado general liquida la orden de trabajo de mantenimiento "<tipo_reparacion>" realizada por el técnico "<tecnico>"
    Entonces el sistema debe generar un comprobante de pago por el monto de "<monto_pagar>" para el técnico "<tecnico>"

    Ejemplos:
      | tecnico            | tipo_reparacion      | monto_pagar |
      | Roberto Cárdenas   | Cambio de Sensor     | 150.00      |
      | Jorge Electricista | Cambio de Motor      | 500.00      |
      | Carlos Mecánico    | Ajuste Mecánico Base | 80.00       |
```

---

## Módulo 8: Despacho y Logística de Distribución
* **Fichero de Especificación:** `features/despacho_y_logistica.feature`
* **Descripción:** Controla el proceso logístico de salida del producto del Almacén General tras las ventas confirmadas y restringe los despachos para ventas por partes si el abono inicial exigido del cliente no se encuentra liquidado en contabilidad.

```gherkin
# language: es
Característica: Despacho de Pedidos y Logística de Distribución
  Como encargado de despacho de la fábrica de medias
  Quiero procesar las órdenes de venta confirmadas y generar las guías de salida de mercancía
  Para garantizar la entrega del producto terminado y mantener el stock del almacén sincronizado

  Escenario: Despacho exitoso de bultos del Almacén General
    Dado que existe una orden de venta confirmada para el cliente "Comercializadora Durey"
    Y la orden requiere un total de "5" bultos de "NIN-ENT-DEL-04"
    Y el "Almacén General" tiene "12" bultos de "NIN-ENT-DEL-04" en stock disponible
    Cuando el operario de despacho prepara y registra la salida física de los "5" bultos
    Entonces el sistema debe generar la Guía de Remisión/Despacho del pedido
    Y cambiar el estado de la orden de venta a "Despachada"
    Y el stock de "NIN-ENT-DEL-04" en el "Almacén General" debe reducirse a "7" bultos

  Escenario: Bloqueo de despacho por falta de pago de cuota inicial
    Dado que el cliente "Comercializadora Durey" tiene una orden de venta en condición "Por partes"
    Y la política de la fábrica exige un pago inicial del "20%" para poder despachar la mercancía
    Y el cliente no ha realizado el abono de la cuota inicial de la orden
    Cuando el operario de despacho intenta registrar la salida de los bultos para el despacho
    Entonces el sistema debe bloquear la operación
    Y mostrar una alerta en pantalla: "Despacho Bloqueado - Pendiente de pago de cuota inicial"
```

---

## Módulo 9: Abastecimiento y Gestión de Materia Prima
* **Fichero de Especificación:** `features/materia_prima.feature`
* **Descripción:** Administra el ingreso de hilo desde proveedores externos al almacén y la inspección de control de calidad de insumos, gestionando devoluciones a proveedores si el hilo presenta imperfecciones físicas (tensión irregular, etc.) para impedir que afecte el funcionamiento de las tejedoras.

```gherkin
# language: es
Característica: Abastecimiento y Gestión de Materia Prima (Hilo)
  Como encargado de compras y almacén de insumos
  Quiero registrar la adquisición e ingreso de hilo desde los proveedores
  Y realizar un control de calidad inicial del material recibido
  Para asegurar el stock de hilo para las máquinas de tejido y evitar fallas en la producción

  Escenario: Ingreso y registro exitoso de hilo al almacén de materia prima
    Dado que se emitió una orden de compra de "150 kg" de hilo "Algodón Negro" al proveedor "Hilados del Sur"
    Cuando llega el camión de despacho del proveedor y el encargado registra el ingreso físico de los "150 kg"
    Entonces el stock de hilo "Algodón Negro" en el almacén de insumos debe incrementarse en "150 kg"
    Y la orden de compra asociada debe cambiar a estado "Recibida"

  Escenario: Devolución de hilo por defectos de calidad del proveedor
    Dado que se reciben "80 kg" de hilo "Lana Roja" del proveedor "Hilados del Sur"
    Cuando el inspector de calidad realiza las pruebas y detecta que el hilo tiene una tensión irregular
    Y rechaza el ingreso del lote de hilo en el sistema con el motivo "Tensión Defectuosa"
    Entonces el sistema debe registrar el lote de hilo como "Devuelto a Proveedor"
    Y no debe incrementar el stock de "Lana Roja" en el almacén de insumos
    Y debe generar una alerta de inconformidad asociada al proveedor "Hilados del Sur"
```

---

## Módulo 10: Integración de Planillas y Diccionario Durey
* **Fichero de Especificación:** `features/planilla_diccionario.feature`
* **Descripción:** Documenta la sincronización del sistema ERP con el diccionario de codificación SKU oficial de Durey y el reporte de control diario del almacén (Salón A / Salón B) modelado de forma interactiva tipo hoja de cálculo (Excel).

```gherkin
# language: es
Característica: Integración con Diccionario y Planilla Excel ALMACEN PASN
  Como supervisor de planta de la fábrica de medias
  Quiero consultar el maestro de modelos y ver la planilla diaria de movimientos de stock
  Para verificar la consistencia financiera del costo por peso y los niveles diarios del almacén

  Escenario: Calcular costo por peso del lote de tejido
    Dado que el maestro de modelos tiene el SKU "NIN-TOB-AFE-T03-NEG" con un peso por docena de "360 g"
    Y el costo del hilo es de "S/ 0.03 por gramo"
    Cuando el supervisor simula una orden de producción de "100 docenas" en la calculadora
    Entonces el peso total estimado de hilo debe calcularse como "36 Kg"
    Y el costo estimado de material del lote debe ser de "S/ 1,080"
    Y el costo de mano de obra para acabado debe ser de "S/ 40" (tarifa de S/ 0.40 por docena)

  Escenario: Asentamiento de entrada automática por empaque en la planilla diaria
    Dado que se finaliza un lote de producción del modelo "Tobillera Niña Delgada Blanco" (SKU "NIN-TOB-DEL-T03-BLA")
    Y se empacan "50 docenas" en un Bulto Máster
    Y hoy es el día de la semana laboral "MARTES"
    Cuando el operario asienta el empaque en el sistema
    Entonces en la Planilla Diaria del "Salón A", fila "A105", columna "INGRESO MARTES" debe sumarse "50 docenas"
    Y el "Stock Actual" de la fila "A105" debe incrementarse automáticamente

  Escenario: Asentamiento de salida automática por venta en la planilla diaria
    Dado que se realiza una venta en el POS de "10 docenas" del modelo "Taloneras de Hombre Negro" (SKU "CAB-MCA-DEL-TUN-NEG")
    Y hoy es el día de la semana laboral "LUNES"
    When el cajero registra la transacción de venta
    Entonces en la Planilla Diaria del "Salón B", fila "B117", columna "VENTA LUNES" debe sumarse "10 docenas"
    Y el "Stock Actual" de la fila "B117" debe descontarse automáticamente
```

