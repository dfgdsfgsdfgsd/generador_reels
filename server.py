import os
import json
import time
import asyncio
from typing import Dict, Any, Optional
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
from PIL import Image, ImageDraw, ImageFont

app = FastAPI()

# Permitir CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../Libro de recetas"))
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))


import uuid

# Crear carpeta uploads al iniciar
uploads_dir = os.path.join(CURRENT_DIR, "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@app.post("/api/upload-video")
async def upload_video(request: Request):
    temp_video_path = os.path.join(CURRENT_DIR, "temp_input.mp4")
    try:
        body = await request.body()
        with open(temp_video_path, "wb") as f:
            f.write(body)
        print("[Generador Reels] Video bruto recibido y guardado.")
        return {"success": True}
    except Exception as e:
        print("[Generador Reels] Error guardando video:", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/upload-media")
async def upload_media(request: Request):
    content_type = request.headers.get("content-type", "")
    ext = ".mp4"
    if "image" in content_type:
        ext = ".png"
    elif "video" in content_type:
        ext = ".mp4"
        
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(uploads_dir, filename)
    try:
        body = await request.body()
        with open(filepath, "wb") as f:
            f.write(body)
        print(f"[Generador Reels] Media guardada persistentemente: {filename}")
        return {"success": True, "url": f"/uploads/{filename}"}
    except Exception as e:
        print("[Generador Reels] Error guardando media:", e)
        raise HTTPException(status_code=500, detail=str(e))


def parse_val(val, default):
    if not val:
        return default
    try:
        return float(str(val).replace("px", "").strip())
    except ValueError:
        return default

# Parser de color global
def parse_color(color_str, default_rgba):
    if not color_str:
        return default_rgba
    color_str = color_str.strip()
    if color_str.startswith("rgba"):
        parts = color_str.replace("rgba(", "").replace(")", "").split(",")
        return int(float(parts[0])), int(float(parts[1])), int(float(parts[2])), int(float(parts[3]) * 255)
    elif color_str.startswith("rgb"):
        parts = color_str.replace("rgb(", "").replace(")", "").split(",")
        return int(float(parts[0])), int(float(parts[1])), int(float(parts[2])), 255
    elif color_str.startswith("#"):
        hex_str = color_str.lstrip('#')
        if len(hex_str) == 3:
            hex_str = "".join([c*2 for c in hex_str])
        if len(hex_str) == 6:
            r, g, b = int(hex_str[0:2], 16), int(hex_str[2:4], 16), int(hex_str[4:6], 16)
            return r, g, b, 255
        elif len(hex_str) == 8:
            r, g, b, a = int(hex_str[0:2], 16), int(hex_str[2:4], 16), int(hex_str[4:6], 16), int(hex_str[6:8], 16)
            return r, g, b, a
    return default_rgba

def get_text_card_drawing(draw, style: Dict[str, Any], html_text: str, scale: float, width_canvas: int, height_canvas: int):
    left = parse_val(style.get("left"), 0) * scale
    top = parse_val(style.get("top"), 0) * scale
    width = parse_val(style.get("width"), 0) * scale
    height = parse_val(style.get("height"), 0) * scale

    # Parse horizontal padding properly (e.g. "12px 18px")
    padding_str = style.get("padding", "14")
    padding_px = 14
    if padding_str:
        parts = [p.replace("px", "").strip() for p in str(padding_str).split()]
        if len(parts) >= 2:
            try:
                padding_px = float(parts[1]) # Horizontal padding
            except ValueError:
                pass
        elif len(parts) == 1:
            try:
                padding_px = float(parts[0])
            except ValueError:
                pass
    padding = padding_px * scale
    r = parse_val(style.get("borderRadius"), 12) * scale

    bg_color_str = style.get("backgroundColor", "rgba(0,0,0,0.85)")
    text_color_str = style.get("color", "#ffffff")
    family = style.get("fontFamily", "Montserrat").replace('"', '').replace("'", "").split(",")[0].strip()
    size = int(parse_val(style.get("fontSize", "20"), 20) * scale)

    bg_rgba = parse_color(bg_color_str, (0, 0, 0, 216))
    text_rgba = parse_color(text_color_str, (255, 255, 255, 255))

    # Intentar cargar fuente del sistema, sino usar default
    font = None
    possible_fonts = [
        f"C:\\Windows\\Fonts\\{family}.ttf",
        f"C:\\Windows\\Fonts\\{family}-Bold.ttf",
        "C:\\Windows\\Fonts\\arial.ttf",
        "C:\\Windows\\Fonts\\segoeui.ttf",
        "C:\\Windows\\Fonts\\cour.ttf"
    ]
    for pf in possible_fonts:
        if os.path.exists(pf):
            try:
                font = ImageFont.truetype(pf, size)
                break
            except:
                pass
    if font is None:
        font = ImageFont.load_default()

    # Cargar fuente de emojis
    emoji_font = None
    emoji_font_path = "C:\\Windows\\Fonts\\seguiemj.ttf"
    if os.path.exists(emoji_font_path):
        try:
            emoji_font = ImageFont.truetype(emoji_font_path, size)
        except:
            pass

    def is_emoji(char):
        cp = ord(char)
        return (
            (0x2600 <= cp <= 0x27BF) or
            (0x1F300 <= cp <= 0x1F9FF) or
            (0x1FA70 <= cp <= 0x1FAFF)
        )

    def get_line_width_with_emojis(text, regular_font, em_font):
        w_total = 0.0
        for char in text:
            active_font = em_font if (is_emoji(char) and em_font) else regular_font
            try:
                if hasattr(draw, 'textlength'):
                    w = draw.textlength(char, font=active_font)
                else:
                    w, _ = draw.textsize(char, font=active_font)
            except:
                w = size * 0.6
            w_total += w
        return w_total

    def wrap_text_line(text, regular_font, em_font, max_w):
        words = text.split(" ")
        wrapped_lines = []
        current_line = []
        for word in words:
            test_line = " ".join(current_line + [word]) if current_line else word
            test_w = get_line_width_with_emojis(test_line, regular_font, em_font)
            if test_w <= max_w or not current_line:
                current_line.append(word)
            else:
                wrapped_lines.append(" ".join(current_line))
                current_line = [word]
        if current_line:
            wrapped_lines.append(" ".join(current_line))
        return wrapped_lines

    # Separar líneas por <br>
    import re
    import html
    raw_lines = re.split(r'<br\s*/?>', html_text, flags=re.IGNORECASE)
    clean_lines = []
    line_colors = []

    # Padding horizontal de seguridad (al menos 32 * scale para evitar que se pegue al borde)
    padding_x = max(padding, 32 * scale)
    max_text_width = max(20.0, width - (2 * padding_x))

    for line in raw_lines:
        # Extraer color de span style si existe
        color_match = re.search(r'style="[^"]*color:\s*([^;"]+)', line, re.IGNORECASE)
        if color_match:
            line_color_str = color_match.group(1).strip()
            line_color = parse_color(line_color_str, text_rgba)
        else:
            line_color = text_rgba
        
        # Limpiar tags HTML, decodificar entidades HTML y reemplazar non-breaking spaces
        line_clean = re.sub(r'<[^>]*>', '', line)
        line_clean = html.unescape(line_clean).replace('\xa0', ' ').strip()
        
        # Ajustar/envolver línea si supera el ancho útil
        wrapped = wrap_text_line(line_clean, font, emoji_font, max_text_width)
        for w_line in wrapped:
            clean_lines.append(w_line)
            line_colors.append(line_color)

    line_count = len(clean_lines)
    line_height = size * 1.35
    total_text_height = (line_count - 1) * line_height + (size * 0.8)

    # Dibujar Rectángulo con bordes redondeados usando las medidas exactas del cliente
    draw.rounded_rectangle([left, top, left + width, top + height], radius=r, fill=bg_rgba)

    # El inicio Y se centra verticalmente dentro del alto exacto de la caja
    text_start_y = top + (height / 2) - (total_text_height / 2) - (size * 0.08)

    for i, line in enumerate(clean_lines):
        y = text_start_y + i * line_height
        line_color = line_colors[i]
        
        line_w = get_line_width_with_emojis(line, font, emoji_font)

        align = style.get("textAlign", "center")
        if align == "center":
            x_curr = left + (width / 2) - (line_w / 2)
        else:
            x_curr = left + padding

        # Dibujar carácter por carácter para soportar emojis correctamente
        for char in line:
            use_emoji = is_emoji(char) and emoji_font is not None
            active_font = emoji_font if use_emoji else font
            
            draw.text((x_curr, y), char, font=active_font, fill=line_color)
            
            try:
                if hasattr(draw, 'textlength'):
                    w = draw.textlength(char, font=active_font)
                else:
                    w, _ = draw.textsize(char, font=active_font)
            except:
                w = size * 0.6
            x_curr += w

def generate_background_pil(theme: str, custom_color: str, width: int, height: int, output_path: str):
    img = Image.new("RGBA", (width, height), (0, 0, 0, 255))
    draw = ImageDraw.Draw(img)

    # Simple fill
    if theme == 'custom':
        # Parse custom color
        hex_str = custom_color.lstrip('#')
        r, g, b = int(hex_str[0:2], 16), int(hex_str[2:4], 16), int(hex_str[4:6], 16)
        draw.rectangle([0, 0, width, height], fill=(r, g, b, 255))
    elif theme == 'light':
        draw.rectangle([0, 0, width, height], fill=(250, 250, 250, 255))
    elif theme == 'dark':
        draw.rectangle([0, 0, width, height], fill=(20, 22, 25, 255))
    elif theme == 'neon':
        # Degradado lineal simple
        for y in range(height):
            ratio = y / height
            r = int(11 * (1 - ratio) + 26 * ratio)
            g = int(0 * (1 - ratio) + 0 * ratio)
            b = int(26 * (1 - ratio) + 51 * ratio)
            draw.line([(0, y), (width, y)], fill=(r, g, b, 255))
    elif theme == 'gradient-sunset':
        for y in range(height):
            ratio = y / height
            r = int(255 * (1 - ratio) + 255 * ratio)
            g = int(94 * (1 - ratio) + 153 * ratio)
            b = int(98 * (1 - ratio) + 102 * ratio)
            draw.line([(0, y), (width, y)], fill=(r, g, b, 255))
    elif theme == 'gradient-forest':
        for y in range(height):
            ratio = y / height
            r = int(17 * (1 - ratio) + 56 * ratio)
            g = int(153 * (1 - ratio) + 239 * ratio)
            b = int(142 * (1 - ratio) + 125 * ratio)
            draw.line([(0, y), (width, y)], fill=(r, g, b, 255))
    else:
        # Fallback dark
        draw.rectangle([0, 0, width, height], fill=(20, 22, 25, 255))

    img.save(output_path, "PNG")

def generate_overlay_pil(data: Dict[str, Any], scale: float, width: int, height: int, output_path: str):
    # Genera la capa transparente de textos (y sombras emuladas)
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Nota: PIL no tiene un filtro directo de feDropShadow fácil, 
    # pero podemos emular la sombra del video dibujando un rectángulo semi-transparente negro difuminado detrás o simplemente un borde suave
    v_left = data.get("videoLeft", 0) * scale
    v_top = data.get("videoTop", 0) * scale
    v_width = data.get("videoWidth", 0) * scale
    v_height = data.get("videoHeight", 0) * scale
    r = parse_val(data.get("headerStyle", {}).get("borderRadius"), 12) * scale

    # Emular sombra del video básica: Rectángulo de fondo un poco más grande con opacidad muy baja
    shadow_offset = 6 * scale
    draw.rounded_rectangle(
        [v_left - shadow_offset, v_top - shadow_offset, v_left + v_width + shadow_offset, v_top + v_height + shadow_offset],
        radius=r + shadow_offset,
        fill=(0, 0, 0, 30)
    )

    if data.get("headerStyle"):
        get_text_card_drawing(draw, data.get("headerStyle"), data.get("headerHtml", ""), scale, width, height)
    if data.get("footerStyle"):
        get_text_card_drawing(draw, data.get("footerStyle"), data.get("footerHtml", ""), scale, width, height)

    # Procesar Logo Flotante
    logo_src = data.get("logoSrc")
    logo_style = data.get("logoStyle")
    if logo_src and logo_style:
        try:
            import base64
            from io import BytesIO
            
            # Extraer base64 si viene como DataURL
            if "," in logo_src:
                base64_data = logo_src.split(",")[1]
            else:
                base64_data = logo_src
                
            img_data = base64.b64decode(base64_data)
            logo_img = Image.open(BytesIO(img_data)).convert("RGBA")
            
            l_width = int(round(parse_val(logo_style.get("width"), 80) * scale))
            l_height = int(round(parse_val(logo_style.get("height"), 80) * scale))
            l_left = int(round(parse_val(logo_style.get("left"), 0) * scale))
            l_top = int(round(parse_val(logo_style.get("top"), 0) * scale))
            
            try:
                resample_method = Image.Resampling.LANCZOS
            except AttributeError:
                resample_method = Image.LANCZOS
                
            logo_img_resized = logo_img.resize((l_width, l_height), resample=resample_method)
            img.alpha_composite(logo_img_resized, dest=(l_left, l_top))
            print("[Python Exportador] Logo flotante procesado con éxito.")
        except Exception as e:
            print("[Python Exportador] Error al procesar logo flotante:", e)

    img.save(output_path, "PNG")

def generate_mask_pil(dest_x: int, dest_y: int, dest_w: int, dest_h: int, r: int, width: int, height: int, output_path: str):
    # Fondo negro y el área de recorte del video en blanco
    img = Image.new("RGBA", (width, height), (0, 0, 0, 255))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([dest_x, dest_y, dest_x + dest_w, dest_y + dest_h], radius=r, fill=(255, 255, 255, 255))
    img.save(output_path, "PNG")

@app.post("/api/export-video")
async def export_video(request: Request):
    try:
        data = await request.json()
        scale = 720 / parse_val(data.get("canvasWidth"), 360)

        dest_w = int(round(parse_val(data.get("videoWidth"), 0) * scale))
        dest_h = int(round(parse_val(data.get("videoHeight"), 0) * scale))
        dest_x = int(round(parse_val(data.get("videoLeft"), 0) * scale))
        dest_y = int(round(parse_val(data.get("videoTop"), 0) * scale))
        r = int(round(parse_val(data.get("borderRadius"), 12) * scale))

        temp_bg_path = os.path.join(CURRENT_DIR, "temp_bg.png")
        temp_overlay_path = os.path.join(CURRENT_DIR, "temp_overlay.png")
        temp_mask_path = os.path.join(CURRENT_DIR, "temp_mask.png")
        
        # Determinar el video de entrada (si viene de persistencia /uploads/ o fallback temporal)
        media_src = data.get("mediaSrc")
        if media_src and media_src.startswith("/uploads/"):
            temp_input_video = os.path.join(CURRENT_DIR, media_src.lstrip("/"))
            is_persistent = True
        else:
            temp_input_video = os.path.join(CURRENT_DIR, "temp_input.mp4")
            is_persistent = False
            
        temp_output_video = os.path.join(CURRENT_DIR, "temp_output.mp4")

        # Generar fondos y capas usando PIL de forma ultra rápida
        generate_background_pil(data.get("theme"), data.get("customColor"), 720, 1280, temp_bg_path)
        generate_overlay_pil(data, scale, 720, 1280, temp_overlay_path)
        generate_mask_pil(dest_x, dest_y, dest_w, dest_h, r, 720, 1280, temp_mask_path)

        if not os.path.exists(temp_input_video):
            raise HTTPException(status_code=400, detail="No se ha subido ningún video.")

        # Comando FFmpeg ultra rápido usando hardware acceleration si está disponible, sino libx264 preset ultrafast
        # -preset ultrafast es crucial para la velocidad máxima en CPU
        ffmpeg_cmd = (
            f'ffmpeg -y -loop 1 -i "{temp_bg_path}" -i "{temp_input_video}" '
            f'-loop 1 -i "{temp_overlay_path}" -loop 1 -i "{temp_mask_path}" '
            f'-filter_complex "[1:v]scale=w=\'if(gte(iw/ih,{dest_w}/{dest_h}),-1,{dest_w})\':h=\'if(gte(iw/ih,{dest_w}/{dest_h}),{dest_h},-1)\',crop={dest_w}:{dest_h}[scaled_vid];'
            f'[scaled_vid]pad=720:1280:{dest_x}:{dest_y}:color=black[padded_vid];'
            f'[padded_vid][3:v]alphamerge[masked_vid];'
            f'[0:v][masked_vid]overlay=0:0:shortest=1[bg_vid];'
            f'[bg_vid][2:v]overlay=0:0[outv]" '
            f'-map "[outv]" -map 1:a? -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -shortest "{temp_output_video}"'
        )

        print("[Python Exportador] Ejecutando FFmpeg de forma ultra-rápida...")
        process = await asyncio.create_subprocess_shell(
            ffmpeg_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()

        # Limpieza de imágenes temporales
        files_to_clean = [temp_bg_path, temp_overlay_path, temp_mask_path]
        if not is_persistent:
            files_to_clean.append(temp_input_video)
            
        for temp_file in files_to_clean:
            if os.path.exists(temp_file):
                try:
                    os.unlink(temp_file)
                except:
                    pass

        if process.returncode != 0:
            print("[Python Exportador] Error en FFmpeg:", stderr.decode())
            raise HTTPException(status_code=500, detail=f"Error en FFmpeg: {stderr.decode()}")

        print("[Python Exportador] Exportación finalizada con éxito.")
        if os.path.exists(temp_output_video):
            return FileResponse(
                temp_output_video,
                media_type="video/mp4",
                filename=f"reel_{int(time.time())}.mp4"
            )
        else:
            raise HTTPException(status_code=500, detail="Archivo de salida no generado.")

    except Exception as e:
        print("[Python Exportador] Error general:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/log")
async def log_client(request: Request):
    body = await request.body()
    print(f"[Client Reels Log] {body.decode()}")
    return {"success": True}

# Servir archivos estáticos del editor de reels al final
reels_dir = os.path.join(CURRENT_DIR, "plantilla-reels")
if os.path.exists(reels_dir):
    app.mount("/", StaticFiles(directory=reels_dir, html=True), name="reels")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3002)
