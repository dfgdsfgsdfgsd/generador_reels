"""
Servidor MCP (Model Context Protocol) para Generador de Reels.
Permite a cualquier modelo de IA (Antigravity, etc.) inspeccionar videos disponibles
y renderizar reels automáticamente a partir de instrucciones en lenguaje natural.
"""

import os
import sys
import json
import urllib.request
from typing import List, Dict, Any, Optional

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from mcp.server.mcpserver import MCPServer

# Inicializar servidor MCP
server_mcp = MCPServer("Generador-Reels-IA")

UPLOADS_DIR = os.path.join(CURRENT_DIR, "uploads")
SERVER_API_URL = "http://127.0.0.1:3002/api/export-video"

@server_mcp.tool()
def listar_videos_disponibles() -> str:
    """
    Lista todos los videos disponibles en la carpeta de subidas (uploads) del proyecto,
    mostrando su nombre de archivo, tamaño aproximado y ruta relativa.
    Úsalo para saber qué videos puedes utilizar al generar un reel.
    """
    if not os.path.exists(UPLOADS_DIR):
        return "La carpeta de subidas (uploads) no existe todavía."

    video_exts = (".mp4", ".mov", ".webm", ".mkv")
    archivos = [f for f in os.listdir(UPLOADS_DIR) if any(f.lower().endswith(ext) for ext in video_exts)]
    
    if not archivos:
        return "No hay videos disponibles en la carpeta uploads. Sube al menos un video primero."

    resultado = [f"=== {len(archivos)} Videos Disponibles en el Proyecto ==="]
    for idx, nombre in enumerate(archivos, start=1):
        path_completo = os.path.join(UPLOADS_DIR, nombre)
        size_mb = os.path.getsize(path_completo) / (1024 * 1024)
        resultado.append(f"{idx}. {nombre} ({size_mb:.2f} MB) -> /uploads/{nombre}")

    return "\n".join(resultado)


@server_mcp.tool()
def crear_reel(
    titulo: str,
    video_superior: str,
    video_inferior: Optional[str] = None,
    layout: str = "split_dual",
    color_fondo: str = "#141414",
    tamano_fuente: int = 24
) -> str:
    """
    Genera y exporta un Reel de Instagram MP4 de 720x1280 combinando videos y texto central.
    
    Parámetros:
    - titulo: Texto central o título gancho del Reel (ej. '🔥 COMPARATIVA BRUTAL').
    - video_superior: Nombre del archivo de video o ruta (ej. '1c8c69cf-d698-4e6c-8db6-8ab1d6f66050.mp4' o '/uploads/...').
    - video_inferior: (Opcional) Nombre del segundo video para el diseño doble.
    - layout: 'split_dual' (diseño de dos videos con texto al centro) o 'single' (un solo video).
    - color_fondo: Color hexadecimal del fondo (por defecto '#141414').
    - tamano_fuente: Tamaño de fuente del cartel de texto central (por defecto 24).
    """
    # Normalizar rutas de videos
    def normalizar_ruta(v_str: Optional[str]) -> Optional[str]:
        if not v_str:
            return None
        v_str = v_str.strip()
        if v_str.startswith("/uploads/"):
            return v_str
        if os.path.basename(v_str) in os.listdir(UPLOADS_DIR):
            return f"/uploads/{os.path.basename(v_str)}"
        return v_str

    v_sup = normalizar_ruta(video_superior)
    v_inf = normalizar_ruta(video_inferior)

    # Coordenadas y dimensiones según diseño
    if layout == "split_dual":
        v1_top, v1_left = 20, 20
        v1_w, v1_h = 320, 240
        v2_top, v2_left = 360, 20
        v2_w, v2_h = 320, 240
        h_top, h_left = 285, 20
        h_h = 60
    else:
        v1_top, v1_left = 160, 20
        v1_w, v1_h = 320, 320
        v2_top, v2_left = 360, 20
        v2_w, v2_h = 320, 320
        h_top, h_left = 40, 20
        h_h = 80

    payload = {
        "theme": "custom" if color_fondo != "#141414" else "dark",
        "customColor": color_fondo,
        "bgImageSrc": None,
        "canvasWidth": 360,
        "canvasHeight": 640,
        "layout": layout,
        "mediaType": "video",
        "mediaSrc": v_sup,
        "videoLeft": v1_left,
        "videoTop": v1_top,
        "videoWidth": v1_w,
        "videoHeight": v1_h,
        "mediaBottomType": "video" if v_inf else None,
        "mediaBottomSrc": v_inf,
        "videoBottomLeft": v2_left,
        "videoBottomTop": v2_top,
        "videoBottomWidth": v2_w,
        "videoBottomHeight": v2_h,
        "borderRadius": 12,
        "headerHtml": f"<strong>{titulo}</strong>" if titulo else "",
        "headerStyle": {
            "fontFamily": "Montserrat",
            "fontSize": f"{tamano_fuente}px",
            "fontWeight": "bold",
            "color": "#ffffff",
            "backgroundColor": "rgba(0, 0, 0, 0.85)",
            "borderRadius": "12px",
            "padding": "12px 18px",
            "textAlign": "center",
            "lineHeight": "1.3",
            "width": 320,
            "height": h_h,
            "left": h_left,
            "top": h_top
        } if titulo else None,
        "footerHtml": "",
        "footerStyle": None,
        "logoSrc": None,
        "logoStyle": None
    }

    try:
        req = urllib.request.Request(
            SERVER_API_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = resp.read()
            out_filename = f"reel_mcp_{int(os.times().system * 1000)}.mp4"
            out_path = os.path.join(CURRENT_DIR, out_filename)
            with open(out_path, "wb") as f:
                f.write(data)
            
            size_mb = len(data) / (1024 * 1024)
            return (
                f"✅ Reel generado con éxito por el Servidor MCP!\n"
                f"- Título: '{titulo}'\n"
                f"- Layout: {layout}\n"
                f"- Tamaño: {size_mb:.2f} MB\n"
                f"- Archivo guardado en: {out_path}"
            )
    except Exception as e:
        return f"❌ Error al procesar el reel a través del servidor: {e}"


if __name__ == "__main__":
    # Ejecutar servidor MCP en transporte stdio estándar
    server_mcp.run()
