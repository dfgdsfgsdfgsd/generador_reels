const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const sharp = require('sharp');

const PORT = 3001; // Puerto diferente para evitar conflictos
const BASE_DIR = path.resolve(__dirname, '..');

// Helper para generar el SVG de las tarjetas de texto y sombras
function getTextCardSvg(style, htmlText, scale) {
    const left = style.left * scale;
    const top = style.top * scale;
    const width = style.width * scale;
    const height = style.height * scale;

    const parseVal = (valStr, def) => {
        if (!valStr) return def;
        const num = parseFloat(valStr);
        return isNaN(num) ? def : num;
    };
    const padding = parseVal(style.padding, 14) * scale;
    const r = parseVal(style.borderRadius, 12) * scale;

    const bgColor = style.backgroundColor || 'rgba(0,0,0,0.85)';
    const textColor = style.color || '#ffffff';
    const family = style.fontFamily ? style.fontFamily.replace(/['"]/g, '') : 'Montserrat';
    const weight = style.fontWeight || 'normal';
    const size = parseFloat(style.fontSize || '20') * scale;
    const align = style.textAlign === 'center' ? 'middle' : 'start';

    // Separar líneas por <br> y limpiar tags HTML
    const lines = htmlText
        .split(/<br\s*\/?>/i)
        .map(line => line.replace(/<[^>]*>/g, '').trim());

    const lineCount = lines.length;
    const lineHeight = size * 1.35;
    const totalTextHeight = lineCount * lineHeight;
    const textStartY = top + (height / 2) - (totalTextHeight / 2) + (size / 2); // Ajuste baseline

    let textElements = '';
    lines.forEach((line, index) => {
        const x = align === 'middle' ? left + width / 2 : left + padding;
        const y = textStartY + index * lineHeight;
        
        // Escapar entidades XML/SVG
        const escapedLine = line
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');

        textElements += `<text x="${x}" y="${y}" font-family="${family}, sans-serif" font-size="${size}px" font-weight="${weight}" fill="${textColor}" text-anchor="${align}" dominant-baseline="middle">${escapedLine}</text>\n`;
    });

    return `
        <!-- Tarjeta de Fondo -->
        <rect x="${left}" y="${top}" width="${width}" height="${height}" rx="${r}" ry="${r}" fill="${bgColor}" filter="url(#shadow)" />
        <!-- Lineas de Texto -->
        ${textElements}
    `;
}

// Genera la máscara PNG del video mediante SVG + Sharp
async function generateMaskPng(destX, destY, destW, destH, r, outputPath) {
    const svg = `
    <svg width="720" height="1280" style="background-color: black;">
        <rect x="${destX}" y="${destY}" width="${destW}" height="${destH}" rx="${r}" ry="${r}" fill="white" />
    </svg>`;
    await sharp(Buffer.from(svg)).png().toFile(outputPath);
}

// Genera la imagen de fondo de la plantilla mediante SVG + Sharp
async function generateBackgroundPng(theme, customColor, outputPath) {
    let bgStyle = '';
    let defs = '';
    if (theme === 'custom') {
        bgStyle = `fill: ${customColor || '#141414'};`;
    } else if (theme === 'dark') {
        bgStyle = 'fill: #141619;';
    } else if (theme === 'light') {
        bgStyle = 'fill: #fafafa;';
    } else if (theme === 'neon') {
        defs = `
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#0b001a;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1a0033;stop-opacity:1" />
        </linearGradient>`;
        bgStyle = 'fill: url(#grad);';
    } else if (theme === 'gradient-sunset') {
        defs = `
        <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#ff5e62;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#ff9966;stop-opacity:1" />
        </linearGradient>`;
        bgStyle = 'fill: url(#grad);';
    } else if (theme === 'gradient-forest') {
        defs = `
        <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#11998e;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#38ef7d;stop-opacity:1" />
        </linearGradient>`;
        bgStyle = 'fill: url(#grad);';
    }

    const svg = `
    <svg width="720" height="1280">
        <defs>${defs}</defs>
        <rect width="720" height="1280" style="${bgStyle}" />
    </svg>`;
    await sharp(Buffer.from(svg)).png().toFile(outputPath);
}

// Genera la capa transparente de textos y sombra del video mediante SVG + Sharp
async function generateOverlayPng(data, scale, outputPath) {
    const vLeft = data.videoLeft * scale;
    const vTop = data.videoTop * scale;
    const vWidth = data.videoWidth * scale;
    const vHeight = data.videoHeight * scale;
    const r = parseFloat(data.headerStyle.borderRadius || "12") * scale;

    const headerCardSvg = getTextCardSvg(data.headerStyle, data.headerHtml, scale);
    const footerCardSvg = getTextCardSvg(data.footerStyle, data.footerHtml, scale);

    const svg = `
    <svg width="720" height="1280">
        <defs>
            <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="${4 * scale}" stdDeviation="${5 * scale}" flood-color="black" flood-opacity="0.15" />
            </filter>
            <filter id="video-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="${10 * scale}" stdDeviation="${12.5 * scale}" flood-color="black" flood-opacity="0.4" />
            </filter>
        </defs>
        <!-- Sombra del video -->
        <rect x="${vLeft}" y="${vTop}" width="${vWidth}" height="${vHeight}" rx="${r}" ry="${r}" fill="rgba(0,0,0,0.01)" filter="url(#video-shadow)" />
        
        <!-- Tarjetas de textos -->
        ${headerCardSvg}
        ${footerCardSvg}
    </svg>`;

    await sharp(Buffer.from(svg)).png().toFile(outputPath);
}

const server = http.createServer(async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'GET') {
        let filePath = req.url.split('?')[0];
        if (filePath === '/' || filePath === '/plantilla-reels') {
            res.writeHead(302, { 'Location': '/plantilla-reels/' });
            res.end();
            return;
        }

        if (filePath === '/plantilla-reels/') {
            filePath = '/plantilla-reels/index.html';
        }
        const resolvedPath = path.resolve(BASE_DIR, '.' + filePath);

        // Evitar salir de la carpeta base
        if (!resolvedPath.startsWith(BASE_DIR)) {
            res.writeHead(403);
            res.end('Acceso denegado');
            return;
        }

        fs.access(resolvedPath, fs.constants.F_OK, (err) => {
            if (err) {
                res.writeHead(404);
                res.end('Archivo no encontrado');
                return;
            }

            const extname = String(path.extname(resolvedPath)).toLowerCase();
            const mimeTypes = {
                '.html': 'text/html',
                '.js': 'text/javascript',
                '.css': 'text/css',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpg',
                '.svg': 'image/svg+xml',
                '.pdf': 'application/pdf',
                '.mp4': 'video/mp4'
            };
            const contentType = mimeTypes[extname] || 'application/octet-stream';

            fs.readFile(resolvedPath, (error, content) => {
                if (error) {
                    res.writeHead(500);
                    res.end('Error del servidor');
                } else {
                    res.writeHead(200, { 'Content-Type': contentType });
                    res.end(content, 'utf-8');
                }
            });
        });
        return;
    }

    if (req.method === 'POST' && req.url === '/api/upload-video') {
        const tempVideoPath = path.join(__dirname, 'temp_input.mp4');
        const fileStream = fs.createWriteStream(tempVideoPath);
        req.pipe(fileStream);
        req.on('end', () => {
            console.log("[Exportador Rapido] Video bruto recibido y guardado.");
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
        req.on('error', (err) => {
            console.error("[Exportador Rapido] Error guardando video:", err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
        });
        return;
    }

    if (req.method === 'POST' && req.url === '/api/export-video') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const scale = 720 / data.canvasWidth;

                const destW = Math.round(data.videoWidth * scale);
                const destH = Math.round(data.videoHeight * scale);
                const destX = Math.round(data.videoLeft * scale);
                const destY = Math.round(data.videoTop * scale);
                const r = Math.round(12 * scale); // 12px redondeado escalado

                const tempBgPngPath = path.join(__dirname, 'temp_bg.png');
                const tempOverlayPngPath = path.join(__dirname, 'temp_overlay.png');
                const tempMaskPngPath = path.join(__dirname, 'temp_mask.png');
                const tempInputVideoPath = path.join(__dirname, 'temp_input.mp4');
                const tempOutputVideoPath = path.join(__dirname, 'temp_output.mp4');

                // 1. Renderizar Fondo, Overlays y Mascara a velocidad nativa (C++) usando Sharp/libvips
                console.log("[Exportador Rapido] Generando imagenes de diseño mediante Sharp...");
                await generateBackgroundPng(data.theme, data.customColor, tempBgPngPath);
                await generateOverlayPng(data, scale, tempOverlayPngPath);
                await generateMaskPng(destX, destY, destW, destH, r, tempMaskPngPath);

                if (!fs.existsSync(tempInputVideoPath)) {
                    throw new Error("No se ha subido ningun video.");
                }

                console.log("[Exportador Rapido] Iniciando FFmpeg...");

                // Comando optimizado con preset superfast y alphamerge
                const ffmpegCmd = `ffmpeg -y -loop 1 -i "${tempBgPngPath}" -i "${tempInputVideoPath}" -loop 1 -i "${tempOverlayPngPath}" -loop 1 -i "${tempMaskPngPath}" -filter_complex "[1:v]scale=w='if(gte(iw/ih,${destW}/${destH}),-1,${destW})':h='if(gte(iw/ih,${destW}/${destH}),${destH},-1)',crop=${destW}:${destH}[scaled_vid];[scaled_vid]pad=720:1280:${destX}:${destY}:color=black[padded_vid];[padded_vid][3:v]alphamerge[masked_vid];[0:v][masked_vid]overlay=0:0:shortest=1[bg_vid];[bg_vid][2:v]overlay=0:0[outv]" -map "[outv]" -map 1:a? -c:v libx264 -preset superfast -pix_fmt yuv420p -c:a aac -shortest "${tempOutputVideoPath}"`;

                exec(ffmpegCmd, (err, stdout, stderr) => {
                    // Limpieza inmediata de PNGs temporales
                    try {
                        if (fs.existsSync(tempBgPngPath)) fs.unlinkSync(tempBgPngPath);
                        if (fs.existsSync(tempOverlayPngPath)) fs.unlinkSync(tempOverlayPngPath);
                        if (fs.existsSync(tempMaskPngPath)) fs.unlinkSync(tempMaskPngPath);
                        if (fs.existsSync(tempInputVideoPath)) fs.unlinkSync(tempInputVideoPath);
                    } catch (cleanupErr) {}

                    if (err) {
                        console.error("[Exportador Rapido] Error en FFmpeg:", err);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: err.message }));
                        return;
                    }

                    console.log("[Exportador Rapido] FFmpeg finalizado con éxito.");

                    if (fs.existsSync(tempOutputVideoPath)) {
                        res.writeHead(200, {
                            'Content-Type': 'video/mp4',
                            'Content-Disposition': `attachment; filename="reel_${Date.now()}.mp4"`
                        });
                        const readStream = fs.createReadStream(tempOutputVideoPath);
                        readStream.pipe(res);
                        readStream.on('end', () => {
                            try { fs.unlinkSync(tempOutputVideoPath); } catch (e) {}
                        });
                    } else {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: "Archivo de salida no encontrado." }));
                    }
                });
            } catch (err) {
                console.error("[Exportador Rapido] Error general:", err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    if (req.method === 'POST' && req.url === '/api/log') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            console.log(`[Reels Log] ${body}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
        return;
    }

    res.writeHead(404);
    res.end('Ruta no encontrada');
});

server.listen(PORT, () => {
    console.log(`Servidor optimizado corriendo en http://localhost:${PORT}`);
    console.log(`Abre tu navegador en http://localhost:${PORT} para iniciar.`);
});
