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
