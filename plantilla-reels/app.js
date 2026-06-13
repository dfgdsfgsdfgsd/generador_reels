document.addEventListener("DOMContentLoaded", () => {
    // ESTADO DE LA APLICACIÓN
    let templatesList = [{ id: "default", name: "Diseño por Defecto" }];
    let currentTemplateName = "default";
    let activeCardKey = null; // 'header' o 'footer'
    let rawVideoFile = null;
    
    // Plantilla activa en memoria
    let currentTemplate = {
        theme: "dark",
        customColor: "#141414",
        fontTitle: "'Montserrat', sans-serif",
        mediaType: null, // 'video' o 'image'
        mediaSrc: null,
        headerText: "🔥 <strong>TÍTULO DE GANCHO</strong><br>¡Este tip te volará la cabeza!",
        footerText: "💡 <strong>Aprende el secreto hoy</strong><br>Síguenos para más consejos diarios 👇<br><span style='color: #dfb15b;'>#cocina #consejos #tutorial</span>",
        fontSizes: {
            header: 115,
            footer: 95
        },
        positions: {
            header: { top: "80px", left: "28px" },
            media: { top: "210px", left: "20px" },
            footer: { top: "auto", left: "28px" }
        },
        styles: {
            header: { color: "#ffffff", boxColor: "#000000", opacity: 85, width: 85 },
            footer: { color: "#ffffff", boxColor: "#000000", opacity: 85, width: 85 }
        }
    };

    // ELEMENTOS DEL DOM
    const reelCanvas = document.getElementById("reel-canvas");
    const headerCard = document.getElementById("header-card");
    const footerCard = document.getElementById("footer-card");
    const headerTextEl = document.getElementById("header-text");
    const footerTextEl = document.getElementById("footer-text");
    
    const projectSelect = document.getElementById("project-select");
    const newProjectBtn = document.getElementById("new-project-btn");
    const saveProjectAsBtn = document.getElementById("save-project-as-btn");
    const saveStatus = document.getElementById("save-status");
    
    const mediaInput = document.getElementById("media-input");
    const mediaContainer = document.getElementById("media-container");
    const reelVideo = document.getElementById("reel-video");
    const reelImg = document.getElementById("reel-img");
    const mediaPlaceholder = document.getElementById("media-placeholder");
    const playPauseBtn = document.getElementById("play-pause-btn");
    const muteBtn = document.getElementById("mute-btn");
    
    const themeSelect = document.getElementById("theme-select");
    const customColorWrapper = document.getElementById("custom-color-wrapper");
    const bgColorPicker = document.getElementById("bg-color-picker");
    
    const fontTitleSelect = document.getElementById("font-title-select");
    const fontSizeSlider = document.getElementById("font-size-slider");
    const fontSizeLabel = document.getElementById("font-size-label");
    const fontSizeVal = document.getElementById("font-size-val");
    const fontDecBtn = document.getElementById("font-dec-btn");
    const fontIncBtn = document.getElementById("font-inc-btn");
    
    const colorTextPicker = document.getElementById("color-text-picker");
    const colorBoxPicker = document.getElementById("color-box-picker");
    const boxOpacitySlider = document.getElementById("box-opacity-slider");
    
    const boxWidthSlider = document.getElementById("box-width-slider");
    const boxWidthVal = document.getElementById("box-width-val");
    const boxWidthLabel = document.getElementById("box-width-label");
    const widthDecBtn = document.getElementById("width-dec-btn");
    const widthIncBtn = document.getElementById("width-inc-btn");
    
    const centerBlockBtn = document.getElementById("center-block-btn");
    const saveBtn = document.getElementById("save-btn");
    const exportBtn = document.getElementById("export-btn");
    const recordVideoBtn = document.getElementById("record-video-btn");

    const logoInput = document.getElementById("logo-input");
    const removeLogoBtn = document.getElementById("remove-logo-btn");
    const logoCard = document.getElementById("logo-card");
    const logoImgPreview = document.getElementById("logo-img-preview");

    const toggleIgOverlay = document.getElementById("toggle-ig-overlay");
    const instagramOverlay = document.getElementById("instagram-overlay");

    // CARGA INICIAL
    initProjects();
    loadTemplateData("default");
    
    // FUNCIONES DE ARRASTRE (DRAG & DROP)
    setupDraggable(headerCard, "header");
    setupDraggable(mediaContainer, "media");
    setupDraggable(footerCard, "footer");
    setupDraggable(logoCard, "logo");

    function setupDraggable(el, key) {
        if (!el) return;
        el.addEventListener("mousedown", (e) => {
            // No arrastrar si se hace clic en texto editable
            if (e.target.closest("[contenteditable='true']")) return;
            
            e.preventDefault();
            selectCard(key);
            
            const startY = e.clientY;
            const startTop = el.offsetTop;
            const startX = e.clientX;
            const startLeft = el.offsetLeft;
            
            function onMouseMove(moveEvent) {
                const dy = moveEvent.clientY - startY;
                const dx = moveEvent.clientX - startX;
                
                let top = startTop + dy;
                let left = startLeft + dx;
                
                // Límites de la pantalla del teléfono
                top = Math.max(10, Math.min(reelCanvas.offsetHeight - el.offsetHeight - 10, top));
                left = Math.max(10, Math.min(reelCanvas.offsetWidth - el.offsetWidth - 10, left));
                
                el.style.top = top + "px";
                el.style.left = left + "px";
                el.style.bottom = "auto"; // Limpiar posicionamiento relativo de bottom
                
                if (!currentTemplate.positions) currentTemplate.positions = {};
                currentTemplate.positions[key] = {
                    top: top + "px",
                    left: left + "px"
                };
            }
            
            function onMouseUp() {
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
                saveTemplateQuietly();
            }
            
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        });
    }

    // SELECCIÓN DE BLOQUE
    headerCard.addEventListener("click", (e) => {
        e.stopPropagation();
        selectCard("header");
    });

    mediaContainer.addEventListener("click", (e) => {
        e.stopPropagation();
        selectCard("media");
    });

    footerCard.addEventListener("click", (e) => {
        e.stopPropagation();
        selectCard("footer");
    });

    if (logoCard) {
        logoCard.addEventListener("click", (e) => {
            e.stopPropagation();
            selectCard("logo");
        });
    }

    document.addEventListener("click", (e) => {
        // Deseleccionar si hace clic fuera
        if (!e.target.closest(".text-card") && !e.target.closest(".media-container") && !e.target.closest(".logo-card") && !e.target.closest(".sidebar")) {
            selectCard(null);
        }
    });

    function selectCard(key) {
        activeCardKey = key;
        
        // Limpiar estilos de selección
        headerCard.classList.remove("card-selected-highlight");
        footerCard.classList.remove("card-selected-highlight");
        mediaContainer.classList.remove("card-selected-highlight");
        if (logoCard) logoCard.classList.remove("card-selected-highlight");
        
        if (!key) {
            fontSizeSlider.disabled = true;
            fontSizeLabel.textContent = "Tamaño: Selecciona un bloque";
            boxWidthSlider.disabled = true;
            boxWidthLabel.textContent = "Ancho de Caja: Selecciona un bloque";
            syncAdjustButtonsState();
            return;
        }
        
        if (key === "media") {
            fontSizeSlider.disabled = true;
            fontSizeLabel.textContent = "Tamaño: Video/Imagen (Fijo 1:1)";
            boxWidthSlider.disabled = true;
            boxWidthLabel.textContent = "Ancho de Caja: Fijo 1:1";
            mediaContainer.classList.add("card-selected-highlight");
            syncAdjustButtonsState();
            return;
        }

        if (key === "logo") {
            fontSizeSlider.disabled = true;
            fontSizeLabel.textContent = "Tamaño: Logo Flotante";
            boxWidthSlider.disabled = false;
            boxWidthSlider.min = 30;
            boxWidthSlider.max = 300;
            boxWidthSlider.value = currentTemplate.logoSize || 80;
            boxWidthVal.textContent = boxWidthSlider.value + "px";
            boxWidthLabel.textContent = "Tamaño Logo:";
            if (logoCard) logoCard.classList.add("card-selected-highlight");
            syncAdjustButtonsState();
            return;
        }
        
        const activeEl = key === "header" ? headerCard : footerCard;
        activeEl.classList.add("card-selected-highlight");
        
        // Habilitar controles del slider de fuentes
        fontSizeSlider.disabled = false;
        fontSizeLabel.textContent = `Tamaño: ${key === "header" ? "Título Superior" : "Descripción Inferior"}`;
        
        const currentSize = currentTemplate.fontSizes[key] || 100;
        fontSizeSlider.value = currentSize;
        fontSizeVal.textContent = currentSize + "%";
        
        // Cargar y habilitar estilos individuales de la caja en los inputs
        const style = currentTemplate.styles[key];
        colorTextPicker.value = style.color;
        colorBoxPicker.value = style.boxColor;
        boxOpacitySlider.value = style.opacity;
        
        boxWidthSlider.disabled = false;
        boxWidthSlider.min = 30;
        boxWidthSlider.max = 100;
        boxWidthSlider.value = style.width;
        boxWidthVal.textContent = style.width + "%";
        boxWidthLabel.textContent = `Ancho: ${key === "header" ? "Título Superior" : "Descripción Inferior"}`;
        
        syncAdjustButtonsState();
    }

    // ACTUALIZAR TAMAÑO DE FUENTE
    fontSizeSlider.addEventListener("input", (e) => {
        if (!activeCardKey) return;
        const val = e.target.value;
        fontSizeVal.textContent = val + "%";
        currentTemplate.fontSizes[activeCardKey] = val;
        
        const activeEl = activeCardKey === "header" ? headerCard : footerCard;
        activeEl.style.setProperty("font-size", (val / 100) + "rem", "important");
    });

    // CARGA DE MULTIMEDIA (VIDEO / IMAGEN)
    mediaInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileURL = URL.createObjectURL(file);
        currentTemplate.mediaType = file.type.startsWith("video/") ? "video" : "image";
        currentTemplate.mediaSrc = fileURL;

        if (currentTemplate.mediaType === "video") {
            rawVideoFile = file;
        } else {
            rawVideoFile = null;
        }

        applyMedia();
    });

    // CARGA DE LOGO FLOTANTE
    logoInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            currentTemplate.logoSrc = event.target.result;
            // Posición por defecto
            if (!currentTemplate.positions) currentTemplate.positions = {};
            if (!currentTemplate.positions.logo) {
                currentTemplate.positions.logo = { top: "150px", left: "140px" };
            }
            applyLogo();
            saveTemplateQuietly();
        };
        reader.readAsDataURL(file);
    });

    if (logoInput) {
        logoInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                currentTemplate.logoSrc = event.target.result;
                // Posición por defecto
                if (!currentTemplate.positions) currentTemplate.positions = {};
                if (!currentTemplate.positions.logo) {
                    currentTemplate.positions.logo = { top: "150px", left: "140px" };
                }
                applyLogo();
                saveTemplateQuietly();
            };
            reader.readAsDataURL(file);
        });
    }

    if (removeLogoBtn) {
        removeLogoBtn.addEventListener("click", () => {
            currentTemplate.logoSrc = null;
            applyLogo();
            saveTemplateQuietly();
        });
    }

    function applyLogo() {
        if (!logoCard || !logoImgPreview || !removeLogoBtn) return;
        if (currentTemplate.logoSrc) {
            logoImgPreview.src = currentTemplate.logoSrc;
            logoCard.style.display = "block";
            removeLogoBtn.disabled = false;
        } else {
            logoCard.style.display = "none";
            removeLogoBtn.disabled = true;
            logoImgPreview.removeAttribute("src");
        }
    }

    function applyMedia() {
        if (currentTemplate.mediaType === "video") {
            reelImg.style.display = "none";
            reelVideo.style.display = "block";
            mediaPlaceholder.style.display = "none";
            
            reelVideo.src = currentTemplate.mediaSrc;
            reelVideo.play().catch(e => console.log("Auto-play blocked, waiting for user interact."));
            
            playPauseBtn.disabled = false;
            muteBtn.disabled = false;
            playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pausar';
        } else if (currentTemplate.mediaType === "image") {
            reelVideo.style.display = "none";
            reelVideo.pause();
            reelImg.style.display = "block";
            mediaPlaceholder.style.display = "none";
            
            reelImg.src = currentTemplate.mediaSrc;
            
            playPauseBtn.disabled = true;
            muteBtn.disabled = true;
        } else {
            reelVideo.style.display = "none";
            reelImg.style.display = "none";
            mediaPlaceholder.style.display = "flex";
            
            playPauseBtn.disabled = true;
            muteBtn.disabled = true;
        }
    }

    // CONTROLES DE REPRODUCCIÓN DE VIDEO
    playPauseBtn.addEventListener("click", () => {
        if (reelVideo.paused) {
            reelVideo.play();
            playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pausar';
        } else {
            reelVideo.pause();
            playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i> Reproducir';
        }
    });

    muteBtn.addEventListener("click", () => {
        reelVideo.muted = !reelVideo.muted;
        muteBtn.innerHTML = reelVideo.muted 
            ? '<i class="fa-solid fa-volume-xmark"></i> Silenciar' 
            : '<i class="fa-solid fa-volume-high"></i> Sonido';
    });

    // TEMAS Y COLORES DE FONDO
    themeSelect.addEventListener("change", (e) => {
        const theme = e.target.value;
        currentTemplate.theme = theme;
        
        // Quitar temas anteriores
        reelCanvas.className = "reel-canvas";
        
        if (theme === "custom") {
            customColorWrapper.style.display = "block";
            reelCanvas.style.background = bgColorPicker.value;
        } else {
            customColorWrapper.style.display = "none";
            reelCanvas.classList.add(`theme-${theme}`);
            reelCanvas.style.background = "";
        }
        saveTemplateQuietly();
    });

    bgColorPicker.addEventListener("input", (e) => {
        currentTemplate.customColor = e.target.value;
        reelCanvas.style.background = e.target.value;
        saveTemplateQuietly();
    });

    // FUENTE Y COLORES DE TEXTO INDIVIDUALES
    fontTitleSelect.addEventListener("change", (e) => {
        currentTemplate.fontTitle = e.target.value;
        headerCard.style.fontFamily = e.target.value;
        footerCard.style.fontFamily = e.target.value;
        saveTemplateQuietly();
    });

    colorTextPicker.addEventListener("input", (e) => {
        if (!activeCardKey || activeCardKey === "media") return;
        currentTemplate.styles[activeCardKey].color = e.target.value;
        applyTextStyle();
        saveTemplateQuietly();
    });

    colorBoxPicker.addEventListener("input", (e) => {
        if (!activeCardKey || activeCardKey === "media") return;
        currentTemplate.styles[activeCardKey].boxColor = e.target.value;
        applyTextStyle();
        saveTemplateQuietly();
    });

    boxOpacitySlider.addEventListener("input", (e) => {
        if (!activeCardKey || activeCardKey === "media") return;
        currentTemplate.styles[activeCardKey].opacity = parseInt(e.target.value);
        applyTextStyle();
        saveTemplateQuietly();
    });

    boxWidthSlider.addEventListener("input", (e) => {
        if (!activeCardKey || activeCardKey === "media") return;
        const val = parseInt(e.target.value);
        if (activeCardKey === "logo") {
            boxWidthVal.textContent = val + "px";
            currentTemplate.logoSize = val;
            if (logoCard) {
                logoCard.style.width = val + "px";
                logoCard.style.height = val + "px";
            }
            saveTemplateQuietly();
            return;
        }
        boxWidthVal.textContent = val + "%";
        currentTemplate.styles[activeCardKey].width = val;
        applyTextStyle();
        saveTemplateQuietly();
    });

    // AJUSTE FINO DE DESLIZADORES CON BOTONES (+ / -)
    const adjustSlider = (slider, delta) => {
        const val = parseInt(slider.value) + delta;
        slider.value = Math.max(parseInt(slider.min), Math.min(parseInt(slider.max), val));
        slider.dispatchEvent(new Event("input"));
    };

    if (fontDecBtn) fontDecBtn.addEventListener("click", () => adjustSlider(fontSizeSlider, -1));
    if (fontIncBtn) fontIncBtn.addEventListener("click", () => adjustSlider(fontSizeSlider, 1));
    if (widthDecBtn) widthDecBtn.addEventListener("click", () => adjustSlider(boxWidthSlider, -1));
    if (widthIncBtn) widthIncBtn.addEventListener("click", () => adjustSlider(boxWidthSlider, 1));

    function syncAdjustButtonsState() {
        if (fontDecBtn) fontDecBtn.disabled = fontSizeSlider.disabled;
        if (fontIncBtn) fontIncBtn.disabled = fontSizeSlider.disabled;
        if (widthDecBtn) widthDecBtn.disabled = boxWidthSlider.disabled;
        if (widthIncBtn) widthIncBtn.disabled = boxWidthSlider.disabled;
    }

    function applyTextStyle() {
        ["header", "footer"].forEach(key => {
            const card = key === "header" ? headerCard : footerCard;
            const style = currentTemplate.styles[key];
            if (!style) return;
            
            card.style.color = style.color;
            card.style.width = style.width + "%";
            
            const hex = style.boxColor;
            const opacity = style.opacity / 100;
            
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            card.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        });
    }

    // CENTRAR BLOQUE HORIZONTALMENTE
    centerBlockBtn.addEventListener("click", () => {
        if (!activeCardKey) {
            alert("Selecciona primero el bloque de texto o multimedia haciendo clic sobre él.");
            return;
        }
        
        const activeEl = activeCardKey === "header" ? headerCard : (activeCardKey === "footer" ? footerCard : mediaContainer);
        const parentWidth = reelCanvas.offsetWidth;
        const elWidth = activeEl.offsetWidth;
        
        const leftPx = Math.round((parentWidth - elWidth) / 2);
        activeEl.style.left = leftPx + "px";
        
        if (!currentTemplate.positions) currentTemplate.positions = {};
        if (!currentTemplate.positions[activeCardKey]) currentTemplate.positions[activeCardKey] = {};
        currentTemplate.positions[activeCardKey].left = leftPx + "px";
        
        saveTemplateQuietly();
    });

    // EXPORTACIÓN A PDF (Impresión nativa)
    exportBtn.addEventListener("click", () => {
        selectCard(null);
        syncDOMToState();
        window.print();
    });

    // SISTEMA DE PROYECTOS / GESTIÓN DE PLANTILLAS
    function initProjects() {
        const savedList = localStorage.getItem("reels_projects");
        if (savedList) {
            try { templatesList = JSON.parse(savedList); } catch (e) {}
        }
        
        projectSelect.innerHTML = "";
        templatesList.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.id;
            opt.textContent = p.name === "default" ? "Diseño por Defecto" : p.name;
            projectSelect.appendChild(opt);
        });
    }

    function syncDOMToState() {
        currentTemplate.headerText = headerTextEl.innerHTML;
        currentTemplate.footerText = footerTextEl.innerHTML;
    }

    function saveTemplateQuietly() {
        syncDOMToState();
        localStorage.setItem(`reels_project_${currentTemplateName}`, JSON.stringify(currentTemplate));
        
        if (saveStatus) {
            saveStatus.textContent = "Guardando...";
            saveStatus.style.color = "#dfb15b";
            setTimeout(() => {
                saveStatus.textContent = "Autoguardado";
                saveStatus.style.color = "#10b981";
            }, 500);
        }
    }

    // Guardado manual
    saveBtn.addEventListener("click", () => {
        saveTemplateQuietly();
        alert(`¡Plantilla "${currentTemplateName === "default" ? "por Defecto" : currentTemplateName}" guardada con éxito!`);
    });

    // Crear nuevo proyecto
    newProjectBtn.addEventListener("click", () => {
        const name = prompt("Introduce el nombre de la nueva plantilla de Reel:");
        if (!name) return;
        const cleanName = name.replace(/[^\w-]/g, '').trim();
        if (!cleanName) return;

        if (templatesList.some(p => p.id === cleanName)) {
            alert("Ya existe una plantilla con ese nombre.");
            return;
        }

        templatesList.push({ id: cleanName, name: cleanName });
        localStorage.setItem("reels_projects", JSON.stringify(templatesList));
        
        initProjects();
        projectSelect.value = cleanName;
        
        // Clonar actual y guardar
        currentTemplateName = cleanName;
        saveTemplateQuietly();
        alert(`Nueva plantilla "${cleanName}" creada.`);
    });

    // Guardar copia
    saveProjectAsBtn.addEventListener("click", () => {
        const name = prompt("Guardar diseño actual como (nombre nuevo):");
        if (!name) return;
        const cleanName = name.replace(/[^\w-]/g, '').trim();
        if (!cleanName) return;

        if (templatesList.some(p => p.id === cleanName)) {
            alert("Ese nombre ya existe.");
            return;
        }

        templatesList.push({ id: cleanName, name: cleanName });
        localStorage.setItem("reels_projects", JSON.stringify(templatesList));
        
        initProjects();
        projectSelect.value = cleanName;
        currentTemplateName = cleanName;
        saveTemplateQuietly();
    });

    // Cargar plantilla al cambiar selector
    projectSelect.addEventListener("change", (e) => {
        const selected = e.target.value;
        if (confirm(`¿Quieres cargar la plantilla "${selected === "default" ? "por defecto" : selected}"?`)) {
            loadTemplateData(selected);
        } else {
            projectSelect.value = currentTemplateName;
        }
    });

    function loadTemplateData(name) {
        currentTemplateName = name;
        const savedData = localStorage.getItem(`reels_project_${name}`);
        if (savedData) {
            try {
                currentTemplate = JSON.parse(savedData);
            } catch (e) {
                console.error("Error cargando plantilla:", e);
            }
        }

        // Aplicar estilos a la interfaz e individualizar
        headerTextEl.innerHTML = currentTemplate.headerText;
        footerTextEl.innerHTML = currentTemplate.footerText;
        
        themeSelect.value = currentTemplate.theme;
        reelCanvas.className = "reel-canvas";
        if (currentTemplate.theme === "custom") {
            customColorWrapper.style.display = "block";
            reelCanvas.style.background = currentTemplate.customColor;
            bgColorPicker.value = currentTemplate.customColor;
        } else {
            customColorWrapper.style.display = "none";
            reelCanvas.classList.add(`theme-${currentTemplate.theme}`);
            reelCanvas.style.background = "";
        }
        
        fontTitleSelect.value = currentTemplate.fontTitle;
        headerCard.style.fontFamily = currentTemplate.fontTitle;
        footerCard.style.fontFamily = currentTemplate.fontTitle;
        
        // Migrar templates antiguos que no tengan estilos individuales
        if (!currentTemplate.styles) {
            currentTemplate.styles = {
                header: { 
                    color: currentTemplate.textColor || "#ffffff", 
                    boxColor: currentTemplate.boxColor || "#000000", 
                    opacity: currentTemplate.boxOpacity !== undefined ? currentTemplate.boxOpacity : 85,
                    width: 85
                },
                footer: { 
                    color: currentTemplate.textColor || "#ffffff", 
                    boxColor: currentTemplate.boxColor || "#000000", 
                    opacity: currentTemplate.boxOpacity !== undefined ? currentTemplate.boxOpacity : 85,
                    width: 85
                }
            };
        }
        applyTextStyle();
        
        // Aplicar posiciones guardadas
        if (currentTemplate.positions) {
            if (currentTemplate.positions.header) {
                headerCard.style.top = currentTemplate.positions.header.top;
                headerCard.style.left = currentTemplate.positions.header.left;
            }
            if (currentTemplate.positions.media) {
                mediaContainer.style.top = currentTemplate.positions.media.top;
                mediaContainer.style.left = currentTemplate.positions.media.left;
            } else {
                mediaContainer.style.top = "210px";
                mediaContainer.style.left = "20px";
            }
            if (currentTemplate.positions.footer) {
                footerCard.style.top = currentTemplate.positions.footer.top;
                footerCard.style.left = currentTemplate.positions.footer.left;
                if (currentTemplate.positions.footer.top === "auto") {
                    footerCard.style.bottom = "80px";
                } else {
                    footerCard.style.bottom = "auto";
                }
            }
            if (currentTemplate.positions.logo) {
                logoCard.style.top = currentTemplate.positions.logo.top;
                logoCard.style.left = currentTemplate.positions.logo.left;
            } else {
                logoCard.style.top = "150px";
                logoCard.style.left = "140px";
            }
        }
        
        // Aplicar tamaños de fuente
        headerCard.style.fontSize = (currentTemplate.fontSizes.header / 100) + "rem";
        footerCard.style.fontSize = (currentTemplate.fontSizes.footer / 100) + "rem";

        // Aplicar tamaño del logo
        if (logoCard) {
            const logoSize = currentTemplate.logoSize || 80;
            logoCard.style.width = logoSize + "px";
            logoCard.style.height = logoSize + "px";
        }

        applyMedia();
        applyLogo();
        selectCard(null);
    }

    // Auto-guardado cada 30 segundos
    setInterval(() => {
        saveTemplateQuietly();
    }, 30000);

    // SISTEMA DE EXPORTACIÓN DE VIDEO EN SERVIDOR (MP4)
    function logToServer(msg) {
        console.log(msg);
        fetch("/api/log", {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: typeof msg === "object" ? JSON.stringify(msg) : String(msg)
        }).catch(err => {});
    }

    recordVideoBtn.addEventListener("click", async () => {
        logToServer(`[Grabador] Click en botón de exportación. mediaType=${currentTemplate.mediaType}, tieneFile=${!!rawVideoFile}`);

        if (currentTemplate.mediaType !== "video" || !rawVideoFile) {
            logToServer("[Grabador] Error: Intento de exportar sin un archivo de video seleccionado.");
            alert("Por favor, selecciona de nuevo el video (.mp4) haciendo clic en 'Cargar Multimedia' antes de exportarlo.");
            return;
        }

        try {
            recordVideoBtn.disabled = true;
            recordVideoBtn.classList.add("recording");
            recordVideoBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Subiendo video...';

            logToServer("[Grabador] Subiendo video bruto al servidor...");
            
            // 1. Subir archivo de video bruto al servidor
            const uploadRes = await fetch('/api/upload-video', {
                method: 'POST',
                headers: { 'Content-Type': rawVideoFile.type },
                body: rawVideoFile
            });

            if (!uploadRes.ok) {
                throw new Error("No se pudo subir el archivo de video al servidor.");
            }

            logToServer("[Grabador] Video subido con éxito. Solicitando procesamiento FFmpeg...");
            recordVideoBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando en Servidor...';

            // 2. Disparar exportación del video en el servidor
            const exportPayload = {
                theme: themeSelect.value,
                customColor: currentTemplate.customColor,
                canvasWidth: reelCanvas.offsetWidth,
                canvasHeight: reelCanvas.offsetHeight,
                videoLeft: mediaContainer.offsetLeft,
                videoTop: mediaContainer.offsetTop,
                videoWidth: mediaContainer.offsetWidth,
                videoHeight: mediaContainer.offsetHeight,
                headerHtml: headerTextEl.innerHTML,
                headerStyle: {
                    fontFamily: window.getComputedStyle(headerTextEl).fontFamily,
                    fontSize: window.getComputedStyle(headerTextEl).fontSize,
                    fontWeight: window.getComputedStyle(headerTextEl).fontWeight,
                    color: window.getComputedStyle(headerTextEl).color,
                    backgroundColor: window.getComputedStyle(headerCard).backgroundColor,
                    borderRadius: window.getComputedStyle(headerCard).borderRadius,
                    padding: window.getComputedStyle(headerCard).padding,
                    textAlign: window.getComputedStyle(headerTextEl).textAlign,
                    lineHeight: window.getComputedStyle(headerCard).lineHeight,
                    width: headerCard.offsetWidth,
                    height: headerCard.offsetHeight,
                    left: headerCard.offsetLeft,
                    top: headerCard.offsetTop
                },
                footerHtml: footerTextEl.innerHTML,
                footerStyle: {
                    fontFamily: window.getComputedStyle(footerTextEl).fontFamily,
                    fontSize: window.getComputedStyle(footerTextEl).fontSize,
                    fontWeight: window.getComputedStyle(footerTextEl).fontWeight,
                    color: window.getComputedStyle(footerTextEl).color,
                    backgroundColor: window.getComputedStyle(footerCard).backgroundColor,
                    borderRadius: window.getComputedStyle(footerCard).borderRadius,
                    padding: window.getComputedStyle(footerCard).padding,
                    textAlign: window.getComputedStyle(footerTextEl).textAlign,
                    lineHeight: window.getComputedStyle(footerCard).lineHeight,
                    width: footerCard.offsetWidth,
                    height: footerCard.offsetHeight,
                    left: footerCard.offsetLeft,
                    top: footerCard.offsetTop
                },
                logoSrc: currentTemplate.logoSrc || null,
                logoStyle: currentTemplate.logoSrc ? {
                    width: logoCard.offsetWidth,
                    height: logoCard.offsetHeight,
                    left: logoCard.offsetLeft,
                    top: logoCard.offsetTop
                } : null
            };

            const exportRes = await fetch('/api/export-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(exportPayload)
            });

            if (!exportRes.ok) {
                const errData = await exportRes.json().catch(() => ({}));
                throw new Error(errData.error || "Error durante el procesamiento del video en el servidor.");
            }

            logToServer("[Grabador] Video procesado con éxito. Descargando MP4 final...");
            recordVideoBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Descargando...';

            // Descargar el archivo binario final de video MP4
            const blob = await exportRes.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `reel_${Date.now()}.mp4`;
            a.click();
            URL.revokeObjectURL(url);
            
            logToServer("[Grabador] Descarga final completada.");

        } catch (err) {
            logToServer(`[Grabador] Error crítico al exportar: ${err.message}`);
            alert(`Error al exportar video: ${err.message}`);
        } finally {
            recordVideoBtn.disabled = false;
            recordVideoBtn.classList.remove("recording");
            recordVideoBtn.innerHTML = '<i class="fa-solid fa-circle-dot"></i> Exportar Video (MP4/WebM)';
        }
    });

    if (toggleIgOverlay && instagramOverlay) {
        toggleIgOverlay.addEventListener("change", (e) => {
            instagramOverlay.style.display = e.target.checked ? "block" : "none";
        });
    }
});
