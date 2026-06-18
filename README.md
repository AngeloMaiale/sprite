# Sprite Interactivo (Versión Sprite Sheet Matriz)

Proyecto en HTML, CSS y JavaScript para mover un personaje tipo Mario sobre un canvas de pantalla completa, aplicando la lógica matemática de recorte bidimensional explicada en clase.

## Cómo funciona el código

El proyecto se divide en tres partes principales:

- `index.html`: Contiene la estructura base, enlaza los archivos de estilos y de lógica, y además incluye una herramienta integrada para generar la hoja de sprites unificada.
- `styles.css`: Define un fondo estético con degradado (cielo y suelo verde), hace que el canvas ocupe toda la ventana de forma responsiva y elimina las barras de scroll molestas.
- `script.js`: Contiene toda la lógica de físicas, la máquina de estados de animación y el renderizado por coordenadas.

### Lógica de Animación y Recorte (La Pizarra)

A diferencia de las versiones con imágenes sueltas, este código cumple estrictamente con la fórmula matemática de la pizarra para animaciones basadas en el tiempo (`animationFrame`):

1. **Carga Única**: Se instancia una sola imagen global (`mario_spritesheet.png`) que actúa como matriz, optimizando el consumo de memoria y peticiones de red.
2. **Dimensiones Fijas**: Cada cuadro individual del personaje tiene un ancho fijo ($w = 60px$) y un alto fijo ($h = 100px$).
3. **Cálculo de Coordenadas ($sx, sy$)**: En cada fotograma, la función `drawCharacter()` calcula dinámicamente qué cuadrícula recortar usando las fórmulas exactas:
   - **Eje X (Desplazamiento de frames)**: `let sx = 0 + (animationState.frameIndex * w);` (Fórmula: $sx = sx_0 + i \times w$).
   - **Eje Y (Estado de animación)**: `let sy = currentAnim.row * h;` (Desplazamiento por filas verticales).

El método `ctx.drawImage()` utiliza estos valores calculados para mover la "cámara" interna de JavaScript sobre la gran imagen estirada y extraer el fotograma correcto en tiempo real.

### Físicas y Control

La función `updateCharacter()` se encarga del bucle lógico en cada actualización:
- **Movimiento Horizontal**: Al pulsar izquierda o derecha, el personaje avanza en píxeles y actualiza su orientación (`facing`). Mario no se moverá horizontalmente si se encuentra agachado.
- **Gravedad y Suelo**: La gravedad ($0.8$) actúa de forma constante sobre el personaje en el eje Y. Al tocar el límite inferior (`getFloorY()`), la velocidad vertical se detiene y el estado de salto se desactiva.
- **Agachado**: Al presionar la flecha hacia abajo, la altura del personaje se reduce temporalmente a `70px` sin alterar la línea base del suelo visual.

## Qué hace

- Controla al personaje en tiempo real usando el teclado (Flechas o WASD).
- Aplica físicas realistas de salto con gravedad y límites de pantalla para que el personaje no se salga de los bordes.
- Intercambia las animaciones de forma fluida según las acciones: Quieto (Derecha/Izquierda), Caminar (Derecha/Izquierda), Saltar (Derecha/Izquierda) y Agachado.
- Mantiene la última dirección de la mirada fija cuando el jugador suelta los controles.

## Controles

- `ArrowLeft` o `A`: Mover a la izquierda.
- `ArrowRight` o `D`: Mover a la derecha.
- `ArrowDown` o `S`: Agacharse (detiene el avance horizontal).
- `Space` (Barra espaciadora): Saltar.

## Estructura de la Matriz de Sprites (`mario_spritesheet.png`)

Para que la matemática del código funcione, el archivo unificado debe estar estructurado estrictamente en **7 filas** verticales de $100px$ cada una, con un ancho máximo de **3 columnas** ($180px$ en total):

- **Fila 0 ($sy = 0px$)**: Quieto a la derecha (1 frame).
- **Fila 1 ($sy = 100px$)**: Quieto a la izquierda (1 frame).
- **Fila 2 ($sy = 200px$)**: Caminata a la derecha (3 frames horizontales).
- **Fila 3 ($sy = 300px$)**: Caminata a la izquierda (3 frames horizontales).
- **Fila 4 ($sy = 400px$)**: Salto a la derecha (1 frame).
- **Fila 5 ($sy = 500px$)**: Salto a la izquierda (1 frame).
- **Fila 6 ($sy = 600px$)**: Agachado (1 frame).

## Notas de Desarrollo

- El canvas es completamente responsivo; si la ventana se rediseña, el personaje ajustará su posición de caída de forma automática.
- Toda la visualización del fondo se delega a la GPU del navegador mediante las reglas de CSS en `styles.css`, dejando el Canvas de JavaScript libre de sobrecarga para procesar únicamente los mapas de bits.