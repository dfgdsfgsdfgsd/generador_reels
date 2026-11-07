# 🚀 Motor-Node (Exportador Rápido de Reels)

Este módulo es el **motor alternativo de renderizado acelerado** para la interfaz web de `../plantilla-reels`.

## 📌 ¿Qué hace y por qué existe?
Mientras que el servidor principal de `generador-reels` funciona sobre **Python (FastAPI + Pillow)**, este motor fue desarrollado en **Node.js** para aprovechar la velocidad de **Sharp (C++ / libvips)** combinada con **FFmpeg**.

- **Generación gráfica instantánea:** Renderiza tarjetas de texto con sombras suaves (`feDropShadow`), fondos SVG dinámicos (temas oscuro, claro, neón, sunset, forest) y máscaras de bordes redondeados en milisegundos.
- **Ensamblado con FFmpeg:** Escala el video subido al encuadre 9:16 vertical (720x1280), le aplica la máscara de esquinas redondeadas y lo une con el fondo y los títulos usando codificación H.264 `preset superfast`.
- **Entrega directa:** Descarga inmediata del archivo `.mp4` en el navegador del usuario.

## ⚙️ Cómo iniciar
- Haz doble clic en `iniciar_servidor.bat` (o `iniciar_servidor_node_rapido.bat` desde la carpeta principal de `generador-reels`).
- Abrirá tu navegador automáticamente en: `http://localhost:3001`
