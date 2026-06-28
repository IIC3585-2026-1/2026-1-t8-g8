# Pizarra Colaborativa en Tiempo Real

Pizarra grupal con WebSockets (Express + Socket.io). Vanilla JS en el front, sin frameworks.

## Cómo correrla

```bash
npm install     # solo si la carpeta node_modules no viene incluida
npm start       # o: node server.js
```

Por defecto queda en `http://localhost:3000`.

Para la demo en vivo, exponla con ngrok:

```bash
ngrok http 3000
```

Comparte la URL de ngrok con los participantes. Todos entran a esa misma URL (el lobby).

## Configurar los grupos

Edita el arreglo al principio de **`server.js`**:

```js
const grupos = ["1", "2", "3", "4", "5", "6"];
```

Puedes usar cualquier string como nombre de grupo (`"Rojo"`, `"Equipo A"`, etc.), no solo números.
El lobby, las salas de dibujo y la vista admin se ajustan solos a esta lista — no hay que tocar nada más.

También puedes cambiar la duración por defecto del temporizador (en segundos):

```js
const DURACION_RONDA_DEFAULT = 180; // 3 minutos
```

## Cómo se usa

- **Participantes**: entran a la URL principal, ven la lista de grupos, tocan el suyo y dibujan
  (lápiz, paleta de colores + color personalizado, goma, control de grosor).
- **Admin (tú)**: hay un punto gris casi invisible en la esquina inferior derecha del lobby —
  haz click ahí para ir a `/admin.html`. También puedes ir directo a esa URL.
  Desde ahí ves los tableros de todos los grupos en tiempo real y controlas:
  - **Iniciar ronda**: define minutos y arranca la cuenta atrás (se ve en todas las pantallas).
  - **Detener ahora**: corta el dibujo de inmediato, sin esperar a que termine el tiempo.
  - **Reiniciar ronda**: borra todos los tableros y vuelve a habilitar el dibujo (útil para
    hacer un ensayo antes de la presentación real).

Cuando el tiempo se acaba (por temporizador o por "Detener ahora"), todos los canvas se bloquean
automáticamente y aparece un aviso de "Tiempo terminado" — nadie puede seguir dibujando hasta que
reinicies la ronda.

## Notas técnicas

- Las salas de Socket.io (`socket.join`) aíslan el tráfico por grupo: cada trazo solo se reenvía
  a los miembros de su propio grupo (y a la vista admin, que está suscrita a todas las salas).
- El servidor guarda en memoria el historial de trazos de cada grupo, así que si alguien recarga
  la página o el admin entra a mitad de la ronda, el canvas se repinta con lo ya dibujado.
- Si reinicias el servidor (`node server.js`), el historial se pierde (es solo en memoria, no hay
  base de datos) — pensado para una sesión en vivo, no para persistencia a largo plazo.
