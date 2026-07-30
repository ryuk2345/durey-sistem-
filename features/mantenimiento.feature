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

