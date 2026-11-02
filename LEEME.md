# Eldritch Horror · Mazos

App local (sin internet) para reemplazar los mazos físicos de **Encuentros, Mitos y Misterios** de Eldritch Horror: juego básico y las cuatro expansiones chicas (*Saber olvidado*, *Vestigios extraños*, *Señales de Carcosa* y *Ciudades en ruinas*). Las cartas chicas (Estados, Apoyos, Hechizos, Artefactos, Apoyos únicos) siguen siendo las físicas.

## Abrir

Doble clic en `index.html` (Chrome o Edge). La partida se guarda sola en el navegador de esta PC.
Para usarla en el celular: `abrir-en-celular.bat` (misma red WiFi).

## Preparar una partida

1. **Colección**: el juego básico siempre está; toca cada expansión para sumarla. Sólo se usan las cartas de lo que esté marcado.
2. **Primigenio**: sólo se pueden elegir los de tu colección. Se arman solos sus mazos de Investigación, Encuentros Especiales y Misterios (los Misterios se barajan y se revela uno; se gana con 3).
3. **Preludio** (si tienes Vestigios, Carcosa o Ruinas): sin Preludio, al azar o elegido. Los que cambian mazos se aplican solos: *Alineamiento cósmico* (Ruinas místicas y Aventuras), *El horror de Dunwich* (primer Misterio de Yog-Sothoth) y *El Rey Amarillo* (aparta su carta de Mitos).
4. **Mazo de Mitos**: la composición por color y etapa sale de la hoja del Primigenio. La dificultad se elige en porcentajes de cartas Fáciles / Normales / Difíciles:
   - *Natural*: la misma proporción que tiene tu colección.
   - *Fácil* (40/45/15), *Difícil* (15/40/45) o *Personalizado*.
   - *Sin equilibrar*: al azar dentro de cada color, como dice el reglamento.

   El reparto se hace **por color**, redondeando lo más cerca posible; los empates se resuelven mirando el total del mazo. Si en tu colección faltan cartas de una dificultad, se completa con la vecina y te avisa. Antes de empezar se ve la tabla con cuántas de cada una van (sin ver qué cartas).
   **Orden**: al azar entre etapas, o progresivo (las fáciles en las primeras etapas).

## Durante la partida

- **Encuentros**: toca un mazo para robar. «Resuelta» la manda al descarte; cuando un mazo se agota se baraja su descarte. También: al fondo, arriba o barajarla en el mazo. Cerrar con ✕ cancela el robo.
- **Expedición activa** y **Ruinas místicas**: debajo de su mazo se ve la casilla donde va la ficha (la del dorso de la primera carta).
- **Fase de Mitos** (barra de abajo): roba la siguiente carta de Mitos. Los Eventos se descartan; los Rumores y las Activas quedan «en juego» hasta que las descartes. Se ve cuántas quedan en cada etapa.
- **Fichas**: los Rumores entran en juego con sus fichas de Arcano (y se muestra en qué casilla va la ficha de Rumor). Toca una carta en juego —o el Misterio activo— para sumar o quitar fichas de Arcano, Pistas o Salud; las que tenga se ven sobre la carta como fichas con su ícono y el número. El botón **Retribución** descuenta solo la ficha de los Rumores que la pierden siempre, lista los que dependen de algo y avisa cuando uno se queda sin fichas.
- **Misterio activo**: «Misterio resuelto» lo pasa a resueltos y revela el siguiente.
- **Ciudades en ruinas**: mazos de Desastres y de Encuentros de Devastación, y la lista de ciudades devastadas (al devastar una, sus Expediciones vuelven a la caja).
- **En inglés**: al abrir una carta, arriba se ve cómo se llaman en inglés los Estados, Apoyos, Hechizos y rasgos que nombra («Estado Deuda → Debt (Deal)», «Estado AYUDA → Boon», «Apoyo único RELIQUIA → Relic»), para buscarlos rápido entre las cartas físicas.
- **Deshacer**: botón ↶ o Ctrl+Z. **Registro**: todas las acciones con la hora. **Menú ☰**: guardar con nombre, exportar/importar la partida (.json).

## Origen de los datos

Las imágenes salen del mod de Tabletop Simulator «Eldritch Horror + Expansiones [Español] SCRIPTS». La expansión de cada carta se detectó por su ícono y la dificultad de las cartas de Mitos por la marca de los bordes (tentáculos = difícil, estrella = fácil), comprobada con el mod en inglés «Eldritch Horror Complete +», que además da los nombres en inglés (emparejando las cartas por su ilustración). El texto de las cartas se leyó por OCR, así que puede tener algún error. Ver `tools/README.md`.
