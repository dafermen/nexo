# Código de personal y recepción

Referencia complementaria al [manual del módulo](../59-personal-recepcion.md).

## server/staff.js

Recibe cargo, ruta y método. Devuelve autorización; los cargos no incluidos se rechazan. No modifica datos.

## server/attention.js

Recibe frase e idioma. Devuelve protocolo local breve o null para continuar al catálogo/intérprete. Nunca crea una ficha.

## server/reception.js

Recibe SQLite, sesión y acciones autenticadas. Devuelve ficha privada o tablero público. requestId impide duplicar; revision evita sobrescribir; callSequence controla el tono. Modifica cola y eventos en transacciones.

## public/staff.html

Define la interfaz o validación del módulo. Las entradas, salidas y límites están descritos en su cabecera. No se utilizan proveedores reales en los archivos de prueba.

## public/staff-ui.js

Recibe respuestas autorizadas y acciones del empleado. Renderiza cuentas y turnos con textContent. epoch evita mostrar datos después del cierre; lastActivity impide que polling mantenga una sesión desatendida.

## public/lobby.html

Define la interfaz o validación del módulo. Las entradas, salidas y límites están descritos en su cabecera. No se utilizan proveedores reales en los archivos de prueba.

## public/lobby.js

Recibe tablero sin datos personales. Muestra números/escritorios. seen evita repetir tono al actualizar; un error oculta información desactualizada.

## public/reception-visitor.js

Recibe API y callbacks de sesión/micrófono. Entrega formulario y número confirmado. openVersion descarta respuestas tardías. El texto permanece separado de chat e IA.

## public/reception.css

Define la interfaz o validación del módulo. Las entradas, salidas y límites están descritos en su cabecera. No se utilizan proveedores reales en los archivos de prueba.

## tests/reception-staff.test.js

Define la interfaz o validación del módulo. Las entradas, salidas y límites están descritos en su cabecera. No se utilizan proveedores reales en los archivos de prueba.

## tests/reception.e2e.js

Define la interfaz o validación del módulo. Las entradas, salidas y límites están descritos en su cabecera. No se utilizan proveedores reales en los archivos de prueba.
