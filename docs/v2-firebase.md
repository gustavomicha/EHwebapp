# v2.0.0 · Partida compartida con Firebase

Objetivo: que varias personas, cada una en su dispositivo, jueguen la misma partida. Uno roba una carta y los demás lo ven; el registro dice quién hizo qué.

La página sigue en GitHub Pages; Firebase (Realtime Database) guarda la partida y la reparte en tiempo real.

## Cómo se va a usar

1. **Crear sesión**: alguien prepara la partida como en v1 y toca «Compartir partida». La app da un código corto (p. ej. `KRAKEN-42`) y un link.
2. **Unirse**: cada jugador abre el link (o pone el código), escribe su nombre y **elige su investigador** (sólo los de la colección de la partida; uno por jugador).
3. **Jugar**: todo se sincroniza (mazos, Mitos, Misterio, fichas, Retribución, ciudades devastadas, deshacer). Cuando alguien roba, a los demás les aparece un aviso con su nombre e investigador y pueden abrir la carta.
4. **Cambiar de investigador**: si el investigador muere, el jugador elige otro (el anterior queda como «derrotado» en el registro).
5. **Retomar**: la sesión queda guardada; con el mismo código se vuelve a entrar otro día.
6. **Sin conexión**: la partida local de v1 sigue funcionando igual si no se comparte.

## Decisiones por defecto (a confirmar)

- Al robar, los demás ven un **aviso** con botón «Ver carta» (no se les abre sola encima de lo que estén mirando).
- **Cualquier jugador puede hacer todo** (robar Mitos, resolver Misterio, Retribución), como en la mesa. El registro marca quién lo hizo.
- **Deshacer** deshace la última acción de la partida, sea de quien sea, y avisa a todos.

## Diseño técnico

- **Estado**: el mismo objeto de partida de v1 (`S`), guardado en `sessions/<código>/state`. Cada acción (`act`) escribe con una transacción usando un número de versión, así dos jugadores tocando a la vez no se pisan: si llega otro cambio primero, la acción se reaplica sobre el estado nuevo.
- **Jugadores**: `sessions/<código>/players/<id>` = nombre, investigador, conectado (presencia de Firebase).
- **Registro**: cada entrada guarda también `who` (jugador + investigador).
- **Cartas en mano**: siguen en el estado compartido (`pending`), con quién la robó.
- **Deshacer**: historial en `sessions/<código>/hist` (últimas 40 acciones).
- **Seguridad**: inicio de sesión anónimo de Firebase; las reglas sólo dejan leer y escribir a usuarios autenticados y sólo dentro de `sessions/`. Las sesiones viejas (más de 30 días sin uso) se pueden borrar.
- **Código**: una capa nueva `sync.js` entre la app y el guardado: en local escribe en el navegador (como v1); en sesión compartida escribe en Firebase y escucha los cambios de los demás. La lógica del juego (`app.js`) casi no cambia.
- **Datos nuevos**: lista de investigadores (nombre, expansión, retrato) sacada del mod de TTS; la expansión se detecta por el ícono de la hoja, como con las cartas.
- **Costo**: el plan gratuito de Firebase (Spark) alcanza de sobra: una partida mueve unos pocos kB por acción.

## Lo que necesito del lado de Firebase

1. Entrar a <https://console.firebase.google.com> con tu cuenta de Google → **Agregar proyecto** (p. ej. `eldritch-mazos`). Google Analytics: no hace falta.
2. En el proyecto: **Compilación → Realtime Database → Crear base de datos**. Ubicación: la que ofrezca (us-central1 está bien). Empezar en **modo bloqueado**.
3. **Compilación → Authentication → Comenzar → Método de acceso → Anónimo → Habilitar**.
4. **Configuración del proyecto** (engranaje) → **Tus apps** → ícono web `</>` → registrar app (nombre `eldritch-mazos`, sin Hosting). Copiar el bloque `firebaseConfig` (apiKey, authDomain, databaseURL, projectId, …) y pasármelo.
   Esos datos no son secretos: identifican el proyecto y van en la página; la protección la dan las reglas.
5. En **Authentication → Configuración → Dominios autorizados** agregar `gustavomicha.github.io` (y dejar `localhost` para probar).
6. Las reglas de la base las dejo escritas en `firebase/database.rules.json`; se pegan en **Realtime Database → Reglas → Publicar**.

## Pasos de desarrollo

1. Rama `v2` (esta). `main` y la página publicada quedan en v1.0.0 hasta terminar.
2. Capa `sync.js` y registro con autor, probando primero en local.
3. Lista de investigadores desde el mod.
4. Pantalla de sesión: crear / unirse / elegir investigador / jugadores conectados.
5. Firebase: conexión, transacciones, presencia, avisos de robos.
6. Pruebas con dos navegadores (PC + celular) contra la base real.
7. Merge a `main`, tag `v2.0.0` y release.
