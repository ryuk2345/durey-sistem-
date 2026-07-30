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

