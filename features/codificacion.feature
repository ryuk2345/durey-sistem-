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
      | Damas     | Con diseño    | Delgada   | Talla Única  | DAM-DIS-DEL-UNI  |
      | Adultos   | Color entero  | Afelpada  | Talla Única  | ADU-ENT-AFE-UNI  |
      | Fútbol    | Con diseño    | Delgada   | 5            | FUT-DIS-DEL-05  |

  Escenario: Filtrado de inventario por características específicas en el Almacén General
    Dado que en el "Almacén General" existen los siguientes bultos registrados:
      | codigo_producto | tipo_categoria | tipo_diseno   | tipo_calidad | tipo_talla   | cantidad_pares |
      | NIN-ENT-DEL-04  | Niños          | Color entero  | Delgada      | 4            | 120            |
      | DAM-DIS-DEL-UNI  | Damas          | Con diseño    | Delgada      | Talla Única  | 180            |
      | FUT-DIS-DEL-05  | Fútbol         | Con diseño    | Delgada      | 5            | 144            |
      | ADU-ENT-AFE-UNI  | Adultos        | Color entero  | Afelpada     | Talla Única  | 120            |
    Cuando el encargado de inventario filtra el almacén por tipo de calidad "Delgada"
    Entonces el sistema debe mostrar únicamente los productos con código:
      | codigo_producto |
      | NIN-ENT-DEL-04  |
      | DAM-DIS-DEL-UNI  |
      | FUT-DIS-DEL-05  |
    Y la suma total de pares mostrada en el filtro debe ser "444"
