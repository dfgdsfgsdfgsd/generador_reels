// =========================================================
// MÓDULO: UTILS (Limpieza de texto, Mojibake y Compresión)
// =========================================================

(function(window) {
    "use strict";

    function cleanAllMojibakeAndComments(str) {
        if (!str || typeof str !== 'string') return str;
        let s = str;
        s = s.replace(/\/\/\s*Pegatinas[^\n<]*/gi, '');
        s = s.replace(/ðŸ”¥/g, '🔥')
             .replace(/ðŸ’¡/g, '💡')
             .replace(/ðŸ‘‡/g, '👇')
             .replace(/ðŸš€/g, '🚀')
             .replace(/ðŸ“±/g, '📱')
             .replace(/ðŸŽµ/g, '🎵')
             .replace(/ðŸ‘¤/g, '👤')
             .replace(/DISE[ÃÂ‘'O\s]*O DE REEL/gi, 'DISEÑO DE REEL')
             .replace(/DISE[ÃÂ‘'O\s]*O/g, 'DISEÑO')
             .replace(/T[ÃÂ\w\W]*?TULO DE GANCHO/gi, 'TÍTULO DE GANCHO')
             .replace(/S[^\w\s\d]*guenos/gi, 'Síguenos')
             .replace(/m[ÃÂ\s]*s consejos/gi, 'más consejos')
             .replace(/volar[ÃÂ\s]*\s*la cabeza/gi, 'volará la cabeza')
             .replace(/DISEÃ‘O/g, 'DISEÑO')
             .replace(/DISEÃ'O/g, 'DISEÑO')
             .replace(/SÃguenos/g, 'Síguenos')
             .replace(/mÃ¡s/g, 'más')
             .replace(/Â¡/g, '¡')
             .trim();
        return s;
    }

    function sanitizeMojibake(str) {
        if (!str || typeof str !== 'string') return str;
        return str
            .replace(/ðŸ”¥|Y"|\?\?/g, '🔥')
            .replace(/ðŸ‘‡|Y'|\?T/g, '👇')
            .replace(/ðŸš€|\?~\?/g, '🚀')
            .replace(/T[Ãǟ\s]*TULO DE GANCHO/g, 'TÍTULO DE GANCHO')
            .replace(/[Â']*Este tip te volar[Ãǟ\s]* la cabeza!/g, '¡Este tip te volará la cabeza!')
            .replace(/S[Ãǟ\s]*guenos para m[Ãǟ\s]*s consejos diarios/g, 'Síguenos para más consejos diarios')
            .replace(/DISE[Ãǟ\s\?\~]*O/g, 'DISEÑO');
    }

    function compressImage(src, maxWidth = 1000, quality = 0.8) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                
                resolve(canvas.toDataURL("image/webp", quality));
            };
            img.onerror = () => resolve(src);
            img.src = src;
        });
    }

    function htmlToPlainText(html) {
        if (!html) return "";
        let str = html.replace(/<br\s*[\/]?>/gi, "\n");
        str = str.replace(/<\/div>/gi, "\n");
        str = str.replace(/<\/p>/gi, "\n");
        const doc = new DOMParser().parseFromString(str, "text/html");
        return cleanAllMojibakeAndComments((doc.body.textContent || "").trim());
    }

    function plainTextToHtml(text) {
        if (!text) return "";
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML.replace(/\n/g, "<br>");
    }

    function autoResizeTextarea(el) {
        if (!el) return;
        el.style.height = "auto";
        if (el.scrollHeight > 0) {
            const border = el.offsetHeight - el.clientHeight;
            el.style.height = Math.max(42, el.scrollHeight + border) + "px";
        }
    }

    // Exponer API global unificada
    window.ReelsUtils = {
        cleanAllMojibakeAndComments,
        sanitizeMojibake,
        compressImage,
        htmlToPlainText,
        plainTextToHtml,
        autoResizeTextarea
    };

    // Aliases globales para compatibilidad 100% directa
    window.cleanAllMojibakeAndComments = cleanAllMojibakeAndComments;
    window.sanitizeMojibake = sanitizeMojibake;
    window.compressImage = compressImage;
    window.htmlToPlainText = htmlToPlainText;
    window.plainTextToHtml = plainTextToHtml;
    window.autoResizeTextarea = autoResizeTextarea;

})(typeof window !== "undefined" ? window : globalThis);
