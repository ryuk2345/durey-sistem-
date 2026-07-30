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

  Escenario: Cargar hilo e iniciar proceso múltiple por encargado
    Dado que el encargado "Juan Pérez" tiene asignadas las máquinas "M-01", "M-02" y "M-03" en estado "Inactiva"
    Y se cuenta con stock de hilo suficiente
    Cuando el supervisor selecciona al encargado "Juan Pérez" en el formulario de encendido
    Entonces el sistema debe auto-seleccionar todas sus máquinas inactivas asignadas
    Y al presionar iniciar debe arrancar el tejido en "M-01", "M-02" y "M-03" simultáneamente
    Y descontar el stock de hilo total necesario

