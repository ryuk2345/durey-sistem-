# language: es
Característica: Integración de Planillas y Diccionario de Codificación Durey
  Como administrador del sistema
  Quiero mantener actualizada la planilla diaria de inventario y el diccionario de modelos
  Para controlar el flujo de stock por día y calcular costos de producción

  Escenario: Asentar ingreso de empaquetado en la planilla diaria
    Dado que existe una entrada en la planilla con código "A101" y descripción "Damas - Color Entero - Delgada"
    Y la entrada está asignada al salón "Salon A"
    Cuando se completa el empaquetado de un lote con SKU "DAM-ENT-DEL-UNI" de 10 paquetes
    Entonces el sistema debe incrementar la columna "Ingresos" del día actual en la planilla
    Y el stock actual de la entrada debe incrementarse en 10

  Escenario: Asentar venta diaria en la planilla
    Dado que existe una entrada en la planilla con código "B117"
    Cuando se registra una venta de 5 paquetes del SKU asociado a "B117"
    Entonces el sistema debe incrementar la columna "Ventas" del día actual en la planilla
    Y el stock actual de la entrada debe decrementarse en 5

  Escenario: Registro de nuevo modelo en el maestro
    Dado que el usuario está en el módulo de Catálogo y SKU
    Cuando genera un SKU con categoría "Niños", diseño "Color entero", calidad "Delgada" y talla "4"
    Entonces el código generado debe ser "NIN-ENT-DEL-04"
    Y el sistema debe permitir registrar el modelo con su peso por docena y costos asociados

  Escenario: Cálculo de costo por peso de un modelo
    Dado que existe un modelo con SKU "NIN-ENT-DEL-04" con peso "280" gramos por docena
    Y el costo del hilo es "S/ 0.035" por gramo
    Y el costo de mano de obra es "S/ 4.80" por docena
    Cuando el usuario solicita calcular el costo de "10" docenas
    Entonces el peso total de hilo requerido debe ser "2.80 Kg"
    Y el costo total de producción debe ser "S/ 14.60"

  Escenario: Mapeo de SKU a código de planilla
    Dado que el sistema tiene las siguientes entradas de planilla:
      | codigo | descripcion                              | salon         |
      | A101   | Damas - Color Entero - Delgada            | Salon A       |
      | A103   | Niños - Con Diseno - Delgada              | Salon A       |
      | A105   | Niños - Color Entero - Delgada (Blanco)   | Salon A       |
      | B117   | Adultos - Color Entero - Delgada (Negro)  | Salon B       |
      | B120   | Futbol - Con Diseno - Delgada             | Salon B       |
    Cuando se empaqueta un producto con SKU "NIN-ENT-DEL-04"
    Entonces el sistema debe mapear el SKU a la entrada "A105" de la planilla
