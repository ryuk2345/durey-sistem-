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

  Escenario: Rechazo y devolución de hilo por defectos de calidad del proveedor
    Dado que se reciben "80 kg" de hilo "Lana Roja" del proveedor "Hilados del Sur"
    Cuando el inspector de calidad realiza las pruebas y detecta que el hilo tiene una tensión irregular
    Y rechaza el ingreso del lote de hilo en el sistema con el motivo "Tensión Defectuosa"
    Entonces el sistema debe registrar el lote de hilo como "Devuelto a Proveedor"
    Y no debe incrementar el stock de "Lana Roja" en el almacén de insumos
    Y debe generar una alerta de inconformidad asociada al proveedor "Hilados del Sur"
