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
