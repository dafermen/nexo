# Referencia: Expedientes y servicios

Guía de contratos y estado para continuar el desarrollo. Consulte el [manual de operación](../60-expedientes-servicios.md).

## server/student-store.js

- Entrada: conexión SQLite, reloj y actor autenticado. Nunca acepta un cargo indicado por el visitante.
- Salida: métodos de ficha, verificación, servicios, clases, diagnósticos y grupos.
- `scope`: controla profesor asignado antes de leer/escribir. Un instructor ajeno recibe 404.
- `mutate`: transacción `BEGIN IMMEDIATE`; reserva `requestId`, compara huella de datos/actor, cambia y confirma. Cualquier error hace rollback.
- `revision`: versión leída por el formulario; evita perder cambios de otro empleado.
- `remaining`: calcula unidades sin llevar un saldo mutable que pueda quedar desincronizado.
- `fulfillmentServiceId`: tipo de clase cuyo código de reserva puede consumir un paquete; distinto del producto comprado o asignado.
- `studentSave/List/Detail`: validan y devuelven ficha/listado paginado; la vista de instructor omite contacto de oficina.
- `studentVerify`: registra comprobación humana, no implementa un proveedor de identidad.
- `studentAssign/ServiceState/Lesson/Reverse`: movimientos académicos; no registran pagos.
- `studentDiagnostic`: valida doce competencias, permisos, consentimiento y estado final inmutable.
- `schoolGroupSave/Request/Roster`: administra grupos internos y listas de solicitudes con capacidad dentro de transacción.
- Tablas: `student_records`, `student_services`, `student_lessons`, `student_diagnostics`, `student_verifications`, `student_operations`, `student_audit`, `school_groups`, `school_group_requests`. Se incluyen automáticamente en respaldos SQLite.

## public/students.html

Estructura del panel privado, acceso reutilizado, búsqueda, detalle, grupos y zona de impresión. No contiene datos de estudiantes estáticos ni credenciales. Se sirve desde `/students`.

## public/students.css

Distribuye lista/detalle en escritorio y una columna en móvil. Campos de al menos 46 px, texto adaptable y reglas de impresión que muestran únicamente el informe solicitado. No modifica el estilo de la pantalla de sala.

## public/students-ui.js

- Entrada: acciones de personal y API privada; salida: DOM mediante `textContent`, evitando ejecutar notas como HTML.
- `credential`: valor temporal en memoria. El acceso por correo usa la cookie HttpOnly existente.
- `epoch`: invalida respuestas en curso al cerrar sesión; `selectionVersion` evita que una ficha anterior reemplace la selección actual.
- `pendingOperations`: guarda IDs de reintentos en memoria por formulario/cuerpo; se vacía al salir.
- `selected`, `detail`, `options`, `groups`: estado de la selección y catálogos; no se persiste en el navegador.
- `field`: crea campos accesibles y mantiene una opción seleccionada válida.
- `renderStudent/Services/Lessons/Diagnostics/Requests`: reúnen acciones de la ficha según permisos visuales. La seguridad real está en el servidor.
- `printReport`: compone un informe explícito con datos de la evaluación y llama a impresión del navegador.
- Fechas: entrada en zona del equipo identificada en el formulario; API en UTC; lectura en zona del negocio.

## tests/students.test.js

Pruebas de SQLite y HTTP con actores/datos sintéticos. Verifican consentimiento, archivo, reasignación, acceso por profesor, idempotencia, cantidades, reservas, revisiones, cupos, informes y errores de validación. No utiliza `.env` ni servicios externos.

## tests/students.e2e.js

Navegador con servidor efímero: crea ficha, registra identidad, asigna unidades, consume y revierte una clase, solicita grupo, finaliza evaluación e imprime. Revisa móvil, ausencia de errores y limpieza al salir. Las capturas se guardan en `.local/students-qa`, excluido del repositorio.
