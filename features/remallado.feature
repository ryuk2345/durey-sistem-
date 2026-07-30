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

