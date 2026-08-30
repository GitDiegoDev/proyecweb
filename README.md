# Mi Ritmo - Control y Bienestar Intestinal 🌿

**Mi Ritmo** es una aplicación web simple, liviana, privada y agradable diseñada para el registro y seguimiento de la frecuencia y consistencia de las evacuaciones intestinales, ayudando a las personas a comprender la evolución de su ritmo digestivo.

## ✨ Características Principales

- **Registro Rápido ("Fui al baño"):** Captura fecha, hora, nivel de dificultad, presencia de molestias/dolor, consistencia de las heces y notas opcionales en cuestión de segundos.
- **Resumen Inteligente en Inicio:**
  - Contador de días transcurridos desde el último registro.
  - Resumen visual interactivo de los últimos 7 días.
  - Orientaciones y sugerencias automáticas de bienestar basadas en tus hábitos recientes (hidratación, fibra, movimiento).
- **Calendario Mensual Interactivo:** Consulta los días en los que registraste evacuaciones y edita o agrega entradas directamente sobre cualquier fecha elegida.
- **Estadísticas de Evolución:** Visualiza métricas clave como total de evacuaciones, promedio semanal, mayor brecha sin registrar, días con molestias y gráfico de consistencia/evolución de los últimos 30 días.
- **Sección de Consejos Integrada:** Guías prácticas sobre nutrición rica en fibra, consumo de agua, actividad física, hábitos en el baño y señales de alerta para consultar con un profesional de la salud.

## 🔒 Privacidad Garantizada

- **100% Local:** Todos los datos se almacenan exclusivamente en el navegador mediante `localStorage` (`miritmo_evacuaciones`).
- **Sin backend ni registros:** No requiere creación de cuenta, servidores externos ni rastreadores. Tus datos permanecen únicamente en tu dispositivo.

## 🎨 Diseño y UX

- Estética cálida y suave basada en tonalidades crema, verde sabio y violeta pastel.
- Tipografía moderna (*Plus Jakarta Sans*).
- Diseño totalmente responsivo adaptado para teléfonos celulares y computadoras de escritorio.

## 🛠️ Estructura del Código

El proyecto fue desarrollado utilizando estándares web modernos de manera modular y mantenible:

- `index.html`: Estructura semántica SPA (Single Page Application).
- `style.css`: Estilos responsivos, animaciones y paleta de colores de bienestar.
- `script.js`: Lógica organizada en módulos desacoplados:
  - `StorageModule`: Gestión CRUD de `localStorage`.
  - `RecommendationEngine`: Algoritmo de orientación prudente sin diagnósticos médicos.
  - `UIController`: Control de navegación por pestañas, modales, calendario y gráficos.

## 🚀 Cómo Ejecutar el Proyecto

Simplemente abre el archivo `index.html` en cualquier navegador web moderno. No requiere instalación de paquetes ni servidores web.
