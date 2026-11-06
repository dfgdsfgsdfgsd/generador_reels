import subprocess
import os
import json
import time
import asyncio
import io
import base64
from typing import Dict, Any, Optional
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

try:
    import imageio_ffmpeg
    FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FFMPEG_EXE = "ffmpeg" 
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

@app.middleware("http")
async def add_utf8_charset(request: Request, call_next):
    response = await call_next(request)
    ct = response.headers.get("content-type", "")
    if ("text/html" in ct or "javascript" in ct) and "charset" not in ct:
        response.headers["content-type"] = f"{ct}; charset=utf-8"
    return response


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
        if ext == ".mp4":
            temp_raw = filepath + ".raw"
            with open(temp_raw, "wb") as f:
                f.write(body)
            try:
                ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
                proc = await asyncio.create_subprocess_exec(
                    ffmpeg_exe, "-y", "-i", temp_raw,
                    "-c:v", "libx264", "-preset", "ultrafast",
                    "-pix_fmt", "yuv420p", "-c:a", "aac",
                    "-movflags", "+faststart", filepath,
                    stdout=asyncio.subprocess.DEVNULL,
                    stderr=asyncio.subprocess.DEVNULL
                )
                await proc.wait()
                if os.path.exists(temp_raw):
                    os.remove(temp_raw)
            except Exception as conv_err:
                print("[Generador Reels] Error convirtiendo a H.264, usando original:", conv_err)
                if os.path.exists(temp_raw):
                    os.replace(temp_raw, filepath)
        else:
            with open(filepath, "wb") as f:
                f.write(body)
        print(f"[Generador Reels] Media guardada persistentemente (H.264 compatible): {filename}")
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
    if not style or not isinstance(style, dict):
        return
    left = parse_val(style.get("left"), 0) * scale
    top = parse_val(style.get("top"), 0) * scale
    width = parse_val(style.get("width"), 0) * scale
    height = parse_val(style.get("height"), 0) * scale

    # Parse horizontal and vertical padding properly (e.g. "12px 18px")
    padding_str = style.get("padding", "14")
    padding_px_y = 14.0
    padding_px_x = 14.0
    if padding_str:
        parts = [p.replace("px", "").strip() for p in str(padding_str).split()]
        if len(parts) >= 2:
            try:
                padding_px_y = float(parts[0])
                padding_px_x = float(parts[1])
            except ValueError:
                pass
        elif len(parts) == 1:
            try:
                padding_px_y = float(parts[0])
                padding_px_x = float(parts[0])
            except ValueError:
                pass
    padding = padding_px_x * scale
    padding_y = max(padding_px_y * scale, 18 * scale)
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
            (0x1F000 <= cp <= 0x1FAFF) or
            (0x2600 <= cp <= 0x27BF) or
            (0x2300 <= cp <= 0x23FF) or
            (0x2B00 <= cp <= 0x2BFF)
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

    # Separar lÃ­neas por <br>
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
        
        # Ajustar/envolver lÃ­nea si supera el ancho Ãºtil
        wrapped = wrap_text_line(line_clean, font, emoji_font, max_text_width)
        for w_line in wrapped:
            clean_lines.append(w_line)
            line_colors.append(line_color)

    line_count = len(clean_lines)
    line_height = size * 1.35
    total_text_height = (line_count - 1) * line_height + (size * 0.9)

    # Autoajustar la altura de la caja para que NUNCA se escapen las letras
    min_needed_height = total_text_height + (2 * padding_y)
    actual_height = max(height, min_needed_height)

    # Expandir simetricamente desde el centro vertical original
    diff_h = actual_height - height
    actual_top = max(16.0 * scale, top - (diff_h / 2.0))

    # Dibujar Rectangulo con bordes redondeados usando las medidas adaptadas
    draw.rounded_rectangle([left, actual_top, left + width, actual_top + actual_height], radius=r, fill=bg_rgba)

    # El inicio Y se centra verticalmente dentro del alto calculado
    text_start_y = actual_top + (actual_height / 2.0) - (total_text_height / 2.0) - (size * 0.08)

    for i, line in enumerate(clean_lines):
        y = text_start_y + i * line_height
        line_color = line_colors[i]
        
        line_w = get_line_width_with_emojis(line, font, emoji_font)

        align = style.get("textAlign", "center")
        if align == "center":
            x_curr = left + (width / 2) - (line_w / 2)
        else:
            x_curr = left + padding

        # Dibujar caracter por caracter soportando emojis en color nativo
        for char in line:
            use_emoji = is_emoji(char) and emoji_font is not None
            if use_emoji:
                try:
                    draw.text((x_curr, y), char, font=emoji_font, embedded_color=True)
                except Exception:
                    draw.text((x_curr, y), char, font=emoji_font, fill=line_color)
            else:
                draw.text((x_curr, y), char, font=font, fill=line_color)
            
            try:
                active_font = emoji_font if use_emoji else font
                if hasattr(draw, 'textlength'):
                    w = draw.textlength(char, font=active_font)
                else:
                    w, _ = draw.textsize(char, font=active_font)
            except:
                w = size * 0.6
            x_curr += w

def generate_background_pil(theme: str, custom_color: str, width: int, height: int, output_path: str, bg_image_src: Optional[str] = None):
    img = Image.new("RGBA", (width, height), (0, 0, 0, 255))
    draw = ImageDraw.Draw(img)

    # Imagen de fondo personalizada si bg_image_src existe o el tema es 'image'
    if bg_image_src or theme == 'image':
        try:
            bg_pil = None
            if bg_image_src:
                if "/uploads/" in bg_image_src or "uploads/" in bg_image_src:
                    local_bg = os.path.join(uploads_dir, os.path.basename(bg_image_src.split('?')[0]))
                    if os.path.exists(local_bg):
                        bg_pil = Image.open(local_bg).convert("RGBA")
                elif bg_image_src.startswith('data:image'):
                    header, encoded = bg_image_src.split(',', 1)
                    img_data = base64.b64decode(encoded)
                    bg_pil = Image.open(io.BytesIO(img_data)).convert("RGBA")
                elif os.path.exists(bg_image_src):
                    bg_pil = Image.open(bg_image_src).convert("RGBA")

            if bg_pil:
                bw, bh = bg_pil.size
                scale_w = width / bw
                scale_h = height / bh
                scale_factor = max(scale_w, scale_h)
                new_w = int(bw * scale_factor)
                new_h = int(bh * scale_factor)
                bg_resized = bg_pil.resize((new_w, new_h), Image.Resampling.LANCZOS)

                left = (new_w - width) // 2
                top = (new_h - height) // 2
                img = bg_resized.crop((left, top, left + width, top + height))
                img.save(output_path, "PNG")
                print(f"[Python Exportador] Fondo de imagen generado con éxito: {output_path}")
                return
        except Exception as e:
            print("[Python Exportador] Error procesando imagen de fondo:", e)

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

def draw_rounded_media_image(base_img_path: str, img_src: str, x: int, y: int, w: int, h: int, r: int):
    try:
        if not img_src or not os.path.exists(base_img_path):
            return
        if img_src.startswith("/uploads/"):
            src_path = os.path.join(CURRENT_DIR, img_src.lstrip("/"))
        elif os.path.exists(img_src):
            src_path = img_src
        else:
            return
        if not os.path.exists(src_path):
            return

        base = Image.open(base_img_path).convert("RGBA")
        m_img = Image.open(src_path).convert("RGBA")
        bw, bh = m_img.size
        if bw <= 0 or bh <= 0 or w <= 0 or h <= 0:
            return
        scale_factor = max(w / bw, h / bh)
        rw, rh = max(1, int(bw * scale_factor)), max(1, int(bh * scale_factor))
        m_resized = m_img.resize((rw, rh), Image.Resampling.LANCZOS)
        cx, cy = max(0, (rw - w) // 2), max(0, (rh - h) // 2)
        m_cropped = m_resized.crop((cx, cy, cx + w, cy + h))

        mask = Image.new("L", (w, h), 0)
        mdraw = ImageDraw.Draw(mask)
        mdraw.rounded_rectangle([0, 0, w, h], radius=r, fill=255)
        m_cropped.putalpha(mask)

        base.alpha_composite(m_cropped, dest=(x, y))
        base.save(base_img_path, "PNG")
        print(f"[Python Exportador] Imagen estática añadida al fondo: {img_src}")
    except Exception as err:
        print("[Python Exportador] Error agregando imagen estática:", err)

def generate_overlay_pil(data: Dict[str, Any], scale: float, width: int, height: int, output_path: str):
    # Genera la capa transparente de textos (y sombras emuladas)
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    v_left = parse_val(data.get("videoLeft"), 0) * scale
    v_top = parse_val(data.get("videoTop"), 0) * scale
    v_width = parse_val(data.get("videoWidth"), 0) * scale
    v_height = parse_val(data.get("videoHeight"), 0) * scale
    r = parse_val(data.get("borderRadius"), 12) * scale

    # Emular sombra del video básica
    shadow_offset = 6 * scale
    if v_width > 0 and v_height > 0:
        draw.rounded_rectangle(
            [v_left - shadow_offset, v_top - shadow_offset, v_left + v_width + shadow_offset, v_top + v_height + shadow_offset],
            radius=r + shadow_offset,
            fill=(0, 0, 0, 30)
        )

    # Sombra para video inferior si existe (Diseño split_dual)
    if data.get("mediaBottomSrc") or data.get("layout") == "split_dual":
        v2_left = parse_val(data.get("videoBottomLeft"), 20) * scale
        v2_top = parse_val(data.get("videoBottomTop"), 360) * scale
        v2_width = parse_val(data.get("videoBottomWidth"), 320) * scale
        v2_height = parse_val(data.get("videoBottomHeight"), 320) * scale
        if v2_width > 0 and v2_height > 0:
            draw.rounded_rectangle(
                [v2_left - shadow_offset, v2_top - shadow_offset, v2_left + v2_width + shadow_offset, v2_top + v2_height + shadow_offset],
                radius=r + shadow_offset,
                fill=(0, 0, 0, 30)
            )

    header_style = data.get("headerStyle")
    if header_style and isinstance(header_style, dict):
        get_text_card_drawing(draw, header_style, data.get("headerHtml", ""), scale, width, height)

    footer_style = data.get("footerStyle")
    if footer_style and isinstance(footer_style, dict):
        get_text_card_drawing(draw, footer_style, data.get("footerHtml", ""), scale, width, height)

    # Procesar Logo Flotante
    logo_src = data.get("logoSrc")
    logo_style = data.get("logoStyle")
    if logo_src and logo_style and isinstance(logo_style, dict):
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

def get_video_duration(video_path: str) -> float:
    try:
        cmd = [FFMPEG_EXE, "-i", video_path]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        for line in proc.stderr.splitlines():
            if "Duration:" in line:
                parts = line.split("Duration:")[1].split(",")[0].strip().split(":")
                return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
    except Exception as e:
        print("[Python Exportador] Error obteniendo duración:", e)
    return 15.0

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

        dest_w = int(round(parse_val(data.get("videoWidth"), 320) * scale))
        dest_h = int(round(parse_val(data.get("videoHeight"), 320) * scale))
        dest_x = int(round(parse_val(data.get("videoLeft"), 20) * scale))
        dest_y = int(round(parse_val(data.get("videoTop"), 20) * scale))
        r = int(round(parse_val(data.get("borderRadius"), 12) * scale))

        temp_bg_path = os.path.join(CURRENT_DIR, "temp_bg.png")
        temp_overlay_path = os.path.join(CURRENT_DIR, "temp_overlay.png")
        temp_mask_path = os.path.join(CURRENT_DIR, "temp_mask.png")
        temp_mask2_path = os.path.join(CURRENT_DIR, "temp_mask2.png")
        temp_output_video = os.path.join(CURRENT_DIR, "temp_output.mp4")

        # Determinar videos de entrada (Video 1 superior y Video 2 inferior)
        media_src = data.get("mediaSrc")
        media_bottom_src = data.get("mediaBottomSrc")

        def is_video_type(src, mtype):
            if not src:
                return False
            if mtype == "video":
                return True
            lower = src.lower()
            return any(lower.endswith(ext) for ext in [".mp4", ".mov", ".webm", ".mkv"])

        is_video_1 = is_video_type(media_src, data.get("mediaType"))
        is_video_2 = is_video_type(media_bottom_src, data.get("mediaBottomType"))

        temp_input_video1 = None
        is_persistent1 = False
        if is_video_1:
            if media_src.startswith("/uploads/"):
                temp_input_video1 = os.path.join(CURRENT_DIR, media_src.lstrip("/"))
                is_persistent1 = True
            elif os.path.exists(media_src):
                temp_input_video1 = media_src
                is_persistent1 = True
            else:
                temp_input_video1 = os.path.join(CURRENT_DIR, "temp_input.mp4")
                is_persistent1 = False

        temp_input_video2 = None
        is_persistent2 = False
        if is_video_2:
            if media_bottom_src.startswith("/uploads/"):
                temp_input_video2 = os.path.join(CURRENT_DIR, media_bottom_src.lstrip("/"))
                is_persistent2 = True
            elif os.path.exists(media_bottom_src):
                temp_input_video2 = media_bottom_src
                is_persistent2 = True
            else:
                temp_input_video2 = os.path.join(CURRENT_DIR, "temp_input2.mp4")
                is_persistent2 = False

        # Si el video 1 no existe pero el 2 sí, usar el slot 2 como video 1
        if (not is_video_1 or not temp_input_video1 or not os.path.exists(temp_input_video1)) and is_video_2 and temp_input_video2 and os.path.exists(temp_input_video2):
            temp_input_video1 = temp_input_video2
            is_persistent1 = is_persistent2
            is_video_1 = True
            is_video_2 = False
            dest_w = int(round(parse_val(data.get("videoBottomWidth"), 320) * scale))
            dest_h = int(round(parse_val(data.get("videoBottomHeight"), 320) * scale))
            dest_x = int(round(parse_val(data.get("videoBottomLeft"), 20) * scale))
            dest_y = int(round(parse_val(data.get("videoBottomTop"), 360) * scale))

        if not temp_input_video1 or not os.path.exists(temp_input_video1):
            raise HTTPException(status_code=400, detail="No se ha encontrado el archivo de video para exportar.")

        # Calcular duración exacta de los videos
        durations = []
        if temp_input_video1 and os.path.exists(temp_input_video1):
            durations.append(get_video_duration(temp_input_video1))
        if is_video_2 and temp_input_video2 and os.path.exists(temp_input_video2):
            durations.append(get_video_duration(temp_input_video2))
        target_duration = min(durations) if durations else 15.0
        print(f"[Python Exportador] Duración seleccionada para exportar: {target_duration:.2f}s")

        # Generar fondos y capas usando PIL
        generate_background_pil(data.get("theme"), data.get("customColor"), 720, 1280, temp_bg_path, data.get("bgImageSrc"))

        # Si el slot 1 es imagen, incrustarlo en el fondo
        if media_src and not is_video_1:
            draw_rounded_media_image(temp_bg_path, media_src, dest_x, dest_y, dest_w, dest_h, r)

        # Si el slot 2 es imagen, incrustarlo en el fondo
        dest2_w = int(round(parse_val(data.get("videoBottomWidth"), 320) * scale))
        dest2_h = int(round(parse_val(data.get("videoBottomHeight"), 320) * scale))
        dest2_x = int(round(parse_val(data.get("videoBottomLeft"), 20) * scale))
        dest2_y = int(round(parse_val(data.get("videoBottomTop"), 360) * scale))
        if media_bottom_src and not is_video_2:
            draw_rounded_media_image(temp_bg_path, media_bottom_src, dest2_x, dest2_y, dest2_w, dest2_h, r)

        generate_overlay_pil(data, scale, 720, 1280, temp_overlay_path)
        generate_mask_pil(dest_x, dest_y, dest_w, dest_h, r, 720, 1280, temp_mask_path)

        files_to_clean = [temp_bg_path, temp_overlay_path, temp_mask_path]

        bg_effect = data.get("bgEffect", "none")
        bg_filter_chain = ""
        bg_target = "0:v"
        print(f"[Python Exportador] Procesando bgEffect='{bg_effect}', bgImageSrc={'SI' if data.get('bgImageSrc') else 'NO'}")
        if bg_effect and bg_effect != "none":
            if bg_effect == "kenburns":
                bg_filter_chain = "[0:v]scale=900:1600,crop=720:1280:x='(in_w-720)/2 + 60*sin(2*PI*t/14)':y='(in_h-1280)/2 + 90*cos(2*PI*t/14)'[bg_anim];"
                bg_target = "bg_anim"
            elif bg_effect == "pulse":
                bg_filter_chain = "[0:v]scale=880:1564,crop=720:1280:x='(in_w-720)/2 + 20*sin(2*PI*t/4.5)':y='(in_h-1280)/2 + 30*sin(2*PI*t/4.5)',eq=brightness='0.03*sin(2*PI*t/4.5)':saturation='1.0+0.15*sin(2*PI*t/4.5)':eval=frame[bg_anim];"
                bg_target = "bg_anim"
            elif bg_effect == "water_3d":
                bg_filter_chain = (
                    "perlin=size=360x640:rate=25:octaves=1:xscale=12:yscale=18:tscale=1.10,format=gray,scale=720:1280:flags=bicubic,lut=c0='clip(128+(val-128)*0.16,0,255)',split=2[xmap1][xmap2];"
                    "perlin=size=360x640:rate=25:octaves=1:xscale=14:yscale=20:tscale=1.25:random_seed=77,format=gray,scale=720:1280:flags=bicubic,lut=c0='clip(128+(val-128)*0.16,0,255)'[ymap];"
                    "[0:v]scale=720:1280,format=yuv420p[bg_scaled];"
                    "[bg_scaled][xmap1][ymap]displace=edge=smear[bg_disp];"
                    "[xmap2]format=yuv420p[xlight];"
                    "[bg_disp][xlight]blend=all_mode=softlight:all_opacity=0.45[bg_anim];"
                )
                bg_target = "bg_anim"
            elif bg_effect == "water":
                bg_filter_chain = (
                    "perlin=size=360x640:rate=25:octaves=1:xscale=12:yscale=18:tscale=1.10,format=gray,scale=720:1280:flags=bicubic,lut=c0='clip(128+(val-128)*0.13,0,255)'[xmap];"
                    "perlin=size=360x640:rate=25:octaves=1:xscale=14:yscale=20:tscale=1.25:random_seed=77,format=gray,scale=720:1280:flags=bicubic,lut=c0='clip(128+(val-128)*0.13,0,255)'[ymap];"
                    "[0:v]scale=720:1280[bg_scaled];"
                    "[bg_scaled][xmap][ymap]displace=edge=smear[bg_anim];"
                )
                bg_target = "bg_anim"

        if not is_persistent1 and temp_input_video1:
            files_to_clean.append(temp_input_video1)

        # Comando FFmpeg (Dual Video simultáneo o Simple)
        if is_video_2 and temp_input_video2 and os.path.exists(temp_input_video2):
            generate_mask_pil(dest2_x, dest2_y, dest2_w, dest2_h, r, 720, 1280, temp_mask2_path)
            files_to_clean.append(temp_mask2_path)
            if not is_persistent2:
                files_to_clean.append(temp_input_video2)

            filter_complex = (
                f"{bg_filter_chain}"
                f"[1:v]scale=w='if(gte(iw/ih,{dest_w}/{dest_h}),-1,{dest_w})':h='if(gte(iw/ih,{dest_w}/{dest_h}),{dest_h},-1)',crop={dest_w}:{dest_h}[scaled_vid1];"
                f"[scaled_vid1]pad=720:1280:{dest_x}:{dest_y}:color=black[padded_vid1];"
                f"[padded_vid1][3:v]alphamerge[masked_vid1];"
                f"[4:v]scale=w='if(gte(iw/ih,{dest2_w}/{dest2_h}),-1,{dest2_w})':h='if(gte(iw/ih,{dest2_w}/{dest2_h}),{dest2_h},-1)',crop={dest2_w}:{dest2_h}[scaled_vid2];"
                f"[scaled_vid2]pad=720:1280:{dest2_x}:{dest2_y}:color=black[padded_vid2];"
                f"[padded_vid2][5:v]alphamerge[masked_vid2];"
                f"[{bg_target}][masked_vid1]overlay=0:0:shortest=1[bg1];"
                f"[bg1][masked_vid2]overlay=0:0:shortest=1[bg2];"
                f"[bg2][2:v]overlay=0:0:shortest=1[outv]"
            )

            ffmpeg_cmd = (
                f'"{FFMPEG_EXE}" -y -loop 1 -i "{temp_bg_path}" -i "{temp_input_video1}" '
                f'-loop 1 -i "{temp_overlay_path}" -loop 1 -i "{temp_mask_path}" '
                f'-i "{temp_input_video2}" -loop 1 -i "{temp_mask2_path}" '
                f'-filter_complex "{filter_complex}" '
                f'-map "[outv]" -map 1:a? -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -t {target_duration:.2f} "{temp_output_video}"'
            )
        else:
            filter_complex = (
                f"{bg_filter_chain}"
                f"[1:v]scale=w='if(gte(iw/ih,{dest_w}/{dest_h}),-1,{dest_w})':h='if(gte(iw/ih,{dest_w}/{dest_h}),{dest_h},-1)',crop={dest_w}:{dest_h}[scaled_vid];"
                f"[scaled_vid]pad=720:1280:{dest_x}:{dest_y}:color=black[padded_vid];"
                f"[padded_vid][3:v]alphamerge[masked_vid];"
                f"[{bg_target}][masked_vid]overlay=0:0:shortest=1[bg_vid];"
                f"[bg_vid][2:v]overlay=0:0[outv]"
            )
            ffmpeg_cmd = (
                f'"{FFMPEG_EXE}" -y -loop 1 -i "{temp_bg_path}" -i "{temp_input_video1}" '
                f'-loop 1 -i "{temp_overlay_path}" -loop 1 -i "{temp_mask_path}" '
                f'-filter_complex "{filter_complex}" '
                f'-map "[outv]" -map 1:a? -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -t {target_duration:.2f} "{temp_output_video}"'
            )

        print("[Python Exportador] Ejecutando FFmpeg de forma ultra-rápida...")
        process = await asyncio.create_subprocess_shell(
            ffmpeg_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()

        # Limpieza de temporales
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

# Servir archivos estÃ¡ticos del editor de reels al final
reels_dir = os.path.join(CURRENT_DIR, "plantilla-reels")
if os.path.exists(reels_dir):
    app.mount("/", StaticFiles(directory=reels_dir, html=True), name="reels")

if __name__ == "__main__":
    port = 3002
    import socket
    for p in range(3002, 3012):
        with socket.socket() as s:
            try:
                s.bind(('0.0.0.0', p))
                port = p
                break
            except OSError: pass
    print(f"\n  === Servidor listo en: http://localhost:{port} ===\n")
    uvicorn.run(app, host='0.0.0.0', port=port)


