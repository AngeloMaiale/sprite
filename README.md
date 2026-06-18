# Sprite Interactivo

Proyecto en HTML, CSS y JavaScript para mover un personaje tipo Mario sobre un canvas de pantalla completa.

## Cómo funciona el código

El proyecto se divide en tres partes:

- `index.html`: contiene la estructura base y enlaza los demás archivos.
- `styles.css`: hace que el canvas ocupe toda la ventana y quita el scroll.
- `script.js`: contiene toda la lógica de carga, control y animación del personaje.
- `frames/`: guarda las imágenes de cada animación.

En `script.js`, primero se ajusta el canvas al tamaño de la ventana con `resizeCanvas()`. Después se cargan las imágenes con `Image()` y se guardan en un objeto llamado `animations`.

El personaje se controla con un objeto `character`, donde se guardan su posición, velocidad, gravedad, salto y dirección actual. También existe `controls`, que recuerda si cada tecla está presionada.

La función `updateCharacter()` decide qué hacer en cada frame:

- si se pulsa izquierda o derecha, mueve al personaje y cambia `facing`;
- si se pulsa espacio, activa el salto;
- si se pulsa abajo, activa la agachada;
- si no hay movimiento, deja al personaje en idle mirando hacia el último lado.

La función `drawCharacter()` toma la animación activa y dibuja la imagen correcta sobre el canvas.

Por último, `animate()` usa `requestAnimationFrame()` para repetir el ciclo de actualizar y dibujar todo el tiempo.

## Qué hace

- Mueve el personaje con flechas o con WASD.
- Usa animación distinta para caminar a la derecha, caminar a la izquierda, saltar, agacharse e idle.
- Mantiene la última dirección mirando cuando se suelta la tecla.

## Controles

- `ArrowLeft` o `A`: mover a la izquierda.
- `ArrowRight` o `D`: mover a la derecha.
- `ArrowDown` o `S`: agacharse.
- `Space`: saltar.

## Estructura esperada de archivos

```text
Sprite/
  index.html
  script.js
  styles.css
  README.md
  frames/
    idle/
      left/
        Mario_idle.png
      right/
        Mario_idle.png
    walk/
      left/
        Mario_walk4.png
        Mario_walk5.png
        Mario_walk6.png
      right/
        Mario_walk1.png
        Mario_walk2.png
        Mario_walk3.png
    jump/
      left/
        Mario_jump2.png
      right/
        Mario_jump.png
    crouch/
      Mario_crouch.png
```

## Notas

- El canvas ocupa toda la ventana.
- Si un archivo no coincide con el nombre esperado, esa animación no se mostrará.
- El personaje no se voltea horizontalmente; usa sprites separados para izquierda y derecha.
