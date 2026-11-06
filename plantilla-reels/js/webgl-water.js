// =========================================================
// MÓDULO: WEBGL WATER (Efectos de agua 2D y 3D en GPU)
// =========================================================

(function(window) {
    "use strict";

    var activeWaterGl = null;
    var waterAnimationId = null;
    var currentWaterImageSrc = null;
    var accumulatedTime = 0;
    var lastTimestamp = null;
    var isWaterPaused = false;
    var renderLoopFn = null;
    var currentGlDrawFn = null;

    function setupWaterEffect(canvasEl, imageSrc, is3D = true) {
        if (!canvasEl) return;
        if (!imageSrc) {
            stopWaterEffect();
            canvasEl.style.display = "none";
            return;
        }

        if (activeWaterGl && activeWaterGl.canvas === canvasEl && currentWaterImageSrc === imageSrc && activeWaterGl._is3D === is3D) {
            canvasEl.style.display = "block";
            return;
        }

        stopWaterEffect();
        currentWaterImageSrc = imageSrc;
        canvasEl.style.display = "block";

        let gl = canvasEl.getContext("webgl2", { alpha: false, depth: false, antialias: false, powerPreference: "high-performance" });
        if (!gl) {
            gl = canvasEl.getContext("webgl", { alpha: false, depth: false, antialias: false, powerPreference: "high-performance" }) ||
                 canvasEl.getContext("experimental-webgl");
        }
        if (!gl) {
            console.warn("[WebGL Water] WebGL no soportado, activando respaldo CSS.");
            const parent = canvasEl.closest(".reel-canvas");
            if (parent) parent.classList.add("bg-effect-water");
            canvasEl.style.display = "none";
            return;
        }

        canvasEl.width = 360;
        canvasEl.height = 640;
        gl.viewport(0, 0, 360, 640);

        const vsSource = `
            attribute vec2 a_pos;
            varying vec2 v_uv;
            void main() {
                v_uv = (a_pos + 1.0) * 0.5;
                v_uv.y = 1.0 - v_uv.y;
                gl_Position = vec4(a_pos, 0.0, 1.0);
            }
        `;

        const fsSource = `
            precision mediump float;
            uniform sampler2D u_image;
            uniform float u_time;
            uniform vec2 u_scale;
            uniform float u_mode; // 1.0 = 3D (crestas + brillo), 0.0 = 2D (suave cenital)
            varying vec2 v_uv;

            void main() {
                vec2 p = (v_uv - 0.5) * u_scale + 0.5;
                
                float wave1 = sin(p.y * 18.0 + u_time * 2.2 + p.x * 6.0);
                float wave2 = cos(p.x * 22.0 - u_time * 1.8 + p.y * 8.0);
                float wave3 = sin((p.x + p.y) * 14.0 + u_time * 2.8);
                
                // Modo 3D: mayor oleaje. Modo 2D: ondulación suave y tranquila
                float amp = mix(0.55, 1.0, u_mode);
                vec2 displacement = vec2(
                    (wave1 * 0.010 + wave3 * 0.006) * amp,
                    (wave2 * 0.012 + wave3 * 0.006) * amp
                );
                
                vec2 distorted_uv = clamp(p + displacement, 0.0, 1.0);
                vec4 color = texture2D(u_image, distorted_uv);
                
                // Crestas de ola con brillo 3D (0.0 en modo 2D)
                float highlight = (wave1 + wave2 + wave3) * 0.035 * u_mode;
                gl_FragColor = vec4(color.rgb + highlight, 1.0);
            }
        `;

        function compile(type, src) {
            const s = gl.createShader(type);
            gl.shaderSource(s, src);
            gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
                console.error("[WebGL Shader Error]", gl.getShaderInfoLog(s));
            }
            return s;
        }

        const prog = gl.createProgram();
        gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSource));
        gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSource));
        gl.linkProgram(prog);
        gl.useProgram(prog);

        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

        const pos = gl.getAttribLocation(prog, "a_pos");
        gl.enableVertexAttribArray(pos);
        gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

        const timeLoc = gl.getUniformLocation(prog, "u_time");
        const scaleLoc = gl.getUniformLocation(prog, "u_scale");
        const modeLoc = gl.getUniformLocation(prog, "u_mode");
        const imgLoc = gl.getUniformLocation(prog, "u_image");
        gl.uniform1i(imgLoc, 0);
        gl.uniform1f(modeLoc, is3D ? 1.0 : 0.0);

        const tex = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        const img = new Image();
        if (!imageSrc.startsWith("data:")) {
            img.crossOrigin = "anonymous";
        }
        img.onload = () => {
            canvasEl.style.display = "block";
            gl.viewport(0, 0, 360, 640);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            
            const canvasAspect = 360 / 640;
            const imgAspect = (img.naturalWidth || img.width || 360) / (img.naturalHeight || img.height || 640);
            let sx = 1.0, sy = 1.0;
            if (imgAspect > canvasAspect) {
                sx = canvasAspect / imgAspect;
            } else {
                sy = imgAspect / canvasAspect;
            }
            gl.uniform2f(scaleLoc, sx, sy);

            activeWaterGl = gl;
            activeWaterGl._is3D = is3D;
            gl.uniform1f(modeLoc, is3D ? 1.0 : 0.0);

            accumulatedTime = 0;
            lastTimestamp = null;

            currentGlDrawFn = function drawFrame() {
                gl.uniform1f(timeLoc, accumulatedTime);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            };

            renderLoopFn = function loop(t) {
                if (!activeWaterGl || activeWaterGl !== gl) return;
                if (isWaterPaused) {
                    lastTimestamp = null;
                    return;
                }
                if (lastTimestamp === null) {
                    lastTimestamp = t;
                }
                const dt = (t - lastTimestamp) / 1000.0;
                lastTimestamp = t;
                accumulatedTime += dt;

                currentGlDrawFn();
                waterAnimationId = requestAnimationFrame(loop);
            };

            // Dibujar el fotograma estático inicial
            currentGlDrawFn();

            // Solo arrancar el bucle continuo si no está en pausa
            if (!isWaterPaused) {
                waterAnimationId = requestAnimationFrame(renderLoopFn);
            }
        };
        img.onerror = (err) => {
            console.error("[WebGL Water] Error cargando imagen para textura:", err);
            // Respaldo CSS inmediato
            const parent = canvasEl.closest(".reel-canvas");
            if (parent) parent.classList.add("bg-effect-water");
            canvasEl.style.display = "none";
        };
        img.src = imageSrc;
    }

    function pauseWaterEffect() {
        isWaterPaused = true;
        if (waterAnimationId) {
            cancelAnimationFrame(waterAnimationId);
            waterAnimationId = null;
        }
        lastTimestamp = null;
    }

    function playWaterEffect() {
        if (!isWaterPaused) return;
        isWaterPaused = false;
        lastTimestamp = null;
        if (activeWaterGl && renderLoopFn && !waterAnimationId) {
            waterAnimationId = requestAnimationFrame(renderLoopFn);
        }
    }

    function stopWaterEffect() {
        if (waterAnimationId) {
            cancelAnimationFrame(waterAnimationId);
            waterAnimationId = null;
        }
        activeWaterGl = null;
        currentWaterImageSrc = null;
        renderLoopFn = null;
        currentGlDrawFn = null;
        isWaterPaused = false;
        accumulatedTime = 0;
        lastTimestamp = null;
        document.querySelectorAll(".reel-bg-canvas").forEach(c => {
            c.style.display = "none";
        });
    }

    // Exponer API global unificada
    window.ReelsWaterShader = {
        setup: setupWaterEffect,
        stop: stopWaterEffect,
        pause: pauseWaterEffect,
        play: playWaterEffect,
        isPaused: () => isWaterPaused
    };

    // Aliases globales para compatibilidad 100% directa
    window.setupWaterEffect = setupWaterEffect;
    window.stopWaterEffect = stopWaterEffect;
    window.pauseWaterEffect = pauseWaterEffect;
    window.playWaterEffect = playWaterEffect;

})(typeof window !== "undefined" ? window : globalThis);
