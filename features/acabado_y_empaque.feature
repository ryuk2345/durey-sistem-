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
