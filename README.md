# Jenny Guzman · Scrum Master & Agile Coach

Portafolio personal de Jenny Guzman, publicado con GitHub Pages:
https://camilaquimbaya.github.io/jenny-guzman-portfolio/

## Estructura

- `index.html`: contenido y estructura de la página (plantilla `x-dc` que renderiza `assets/js/dc-runtime.js`).
- `assets/css/motion.css`: grafismos del hero, intro, reveals, marquee y números de sección.
- `assets/js/motion.js`: parallax entre secciones, parallax con el mouse en el hero, reveals escalonados, marquee ligado al scroll y botones magnéticos.
- `assets/img`, `assets/fonts`, `assets/js`: imágenes, fuentes Poppins y React servidos localmente.

Respeta `prefers-reduced-motion`: si el sistema pide menos movimiento, se desactivan las animaciones.

Para verlo localmente hace falta un servidor (por ejemplo `python3 -m http.server`) y abrir `http://localhost:8000`.
