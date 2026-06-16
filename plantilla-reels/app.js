document.addEventListener("DOMContentLoaded", () => {
    // ESTADO DE LA APLICACIÓN
    let templatesList = [{ id: "default", name: "Diseño por Defecto" }];
    let currentTemplateName = "default";
    let activeCardKey = null; // 'header', 'footer', 'media', o 'logo'
    let rawVideoFile = null;
    
    // Proyecto activo en memoria (que contiene múltiples pantallas)
    let currentProject = {
        name: "default",
        activeScreenIndex: 0,
        screens: []
    };
    
    // Referencia a la pantalla activa (se actualiza al seleccionar)
    let currentTemplate = null;

    // ELEMENTOS DINÁMICOS DEL DOM (se actualizan al seleccionar pantalla)
    let reelCanvas = null;
    let headerCard = null;
    let footerCard = null;
    let headerTextEl = null;
    let footerTextEl = null;
    let mediaContainer = null;
    let reelVideo = null;
    let reelImg = null;
    let mediaPlaceholder = null;
    let logoCard = null;
    let logoImgPreview = null;
    let instagramOverlay = null;

    // ELEMENTOS ESTÁTICOS DEL DOM DE LA BARRA LATERAL
    const simulatorPane = document.getElementById("simulator-pane");
    const projectSelect = document.getElementById("project-select");
    const newProjectBtn = document.getElementById("new-project-btn");
    const saveProjectAsBtn = document.getElementById("save-project-as-btn");
    const saveStatus = document.getElementById("save-status");
    const exportJsonBtn = document.getElementById("export-json-btn");
    const importJsonBtn = document.getElementById("import-json-btn");
    const importJsonInput = document.getElementById("import-json-input");
    
    const mediaInput = document.getElementById("media-input");
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

    const toggleIgOverlay = document.getElementById("toggle-ig-overlay");
    const toggleHeaderCard = document.getElementById("toggle-header-card");
    const toggleFooterCard = document.getElementById("toggle-footer-card");

    // Botones de gestión de pantallas
    const addPhoneBtn = document.getElementById("add-phone-btn");
    const duplicatePhoneBtn = document.getElementById("duplicate-phone-btn");
    const deletePhoneBtn = document.getElementById("delete-phone-btn");

    // CARGA INICIAL
    initProjects();
    loadTemplateData("default");

    function adjustMockupScale() {
        // Handled directly by CSS scale(0.75) within .phone-wrapper
    }
    
    // FUNCIONES DE ARRASTRE (DRAG & DROP)
    function setupDraggable(el, key, index) {
        if (!el) return;
        el.addEventListener("mousedown", (e) => {
            // No arrastrar si se hace clic en texto editable
            if (e.target.closest("[contenteditable='true']")) return;
            
            e.preventDefault();
            selectScreen(index);
            selectCard(key);
            
            const startY = e.clientY;
            const startTop = el.offsetTop;
            const startX = e.clientX;
            const startLeft = el.offsetLeft;
            
            // Escala del simulador para corregir la velocidad del cursor
            const scale = 0.75;
            
            function onMouseMove(moveEvent) {
                const dy = (moveEvent.clientY - startY) / scale;
                const dx = (moveEvent.clientX - startX) / scale;
                
                const canvas = document.getElementById(`reel-canvas-${index}`);
                let top = startTop + dy;
                let left = startLeft + dx;
                
                // Límites de la pantalla del teléfono
                top = Math.max(10, Math.min(canvas.offsetHeight - el.offsetHeight - 10, top));
                left = Math.max(10, Math.min(canvas.offsetWidth - el.offsetWidth - 10, left));
                
                el.style.top = top + "px";
                el.style.left = left + "px";
                el.style.bottom = "auto"; // Limpiar posicionamiento relativo de bottom
                
                const screenData = currentProject.screens[index];
                if (!screenData.positions) screenData.positions = {};
                screenData.positions[key] = {
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

    // FUNCIONES DE REDIMENSIONAMIENTO (RESIZE)
    function setupResizable(cardEl, key, index) {
        if (!cardEl) return;
        
        const handles = cardEl.querySelectorAll(".resize-handle");
        handles.forEach(handle => {
            handle.addEventListener("mousedown", (e) => {
                e.stopPropagation(); // Evitar que inicie el arrastre (drag) de la tarjeta entera
                e.preventDefault();
                
                selectScreen(index);
                selectCard(key);
                
                const startX = e.clientX;
                const startY = e.clientY;
                const startWidth = cardEl.offsetWidth;
                const startHeight = cardEl.offsetHeight;
                const startTop = cardEl.offsetTop;
                
                const canvas = document.getElementById(`reel-canvas-${index}`);
                const canvasWidth = canvas.offsetWidth;
                const scale = 0.75; // Escala del mockup
                
                const isRight = handle.classList.contains("resize-r");
                const isBottom = handle.classList.contains("resize-b");
                const isTop = handle.classList.contains("resize-t");
                const isCorner = handle.classList.contains("resize-se");
                
                function onMouseMove(moveEvent) {
                    const dx = (moveEvent.clientX - startX) / scale;
                    const dy = (moveEvent.clientY - startY) / scale;
                    
                    const screenData = currentProject.screens[index];
                    
                    // Ajuste Ancho (Horizontal)
                    if (isRight || isCorner) {
                        let newWidthPx = startWidth + dx;
                        let newWidthPercent = Math.round((newWidthPx / canvasWidth) * 100);
                        newWidthPercent = Math.max(30, Math.min(100, newWidthPercent));
                        
                        cardEl.style.width = newWidthPercent + "%";
                        if (!screenData.styles) screenData.styles = {};
                        if (!screenData.styles[key]) screenData.styles[key] = { color: "#ffffff", boxColor: "#000000", opacity: 85, width: 85 };
                        screenData.styles[key].width = newWidthPercent;
                        
                        // Sincronizar UI lateral
                        if (index === currentProject.activeScreenIndex && activeCardKey === key) {
                            boxWidthSlider.value = newWidthPercent;
                            boxWidthVal.textContent = newWidthPercent + "%";
                        }
                    }
                    
                    // Ajuste Alto (Vertical hacia abajo)
                    if (isBottom || isCorner) {
                        let newHeightPx = startHeight + dy;
                        newHeightPx = Math.max(40, newHeightPx);
                        
                        cardEl.style.height = newHeightPx + "px";
                        if (!screenData.styles) screenData.styles = {};
                        if (!screenData.styles[key]) screenData.styles[key] = { color: "#ffffff", boxColor: "#000000", opacity: 85, width: 85 };
                        screenData.styles[key].height = newHeightPx;
                    }

                    // Ajuste Alto (Vertical hacia arriba)
                    if (isTop) {
                        let newHeightPx = startHeight - dy;
                        if (newHeightPx >= 40) {
                            let newTopPx = startTop + dy;
                            newTopPx = Math.max(10, newTopPx);
                            
                            cardEl.style.top = newTopPx + "px";
                            cardEl.style.height = newHeightPx + "px";
                            cardEl.style.bottom = "auto";
                            
                            if (!screenData.positions) screenData.positions = {};
                            if (!screenData.positions[key]) screenData.positions[key] = {};
                            screenData.positions[key].top = newTopPx + "px";
                            
                            if (!screenData.styles) screenData.styles = {};
                            if (!screenData.styles[key]) screenData.styles[key] = { color: "#ffffff", boxColor: "#000000", opacity: 85, width: 85 };
                            screenData.styles[key].height = newHeightPx;
                        }
                    }
                }
                
                function onMouseUp() {
                    document.removeEventListener("mousemove", onMouseMove);
                    document.removeEventListener("mouseup", onMouseUp);
                    saveTemplateQuietly();
                }
                
                document.addEventListener("mousemove", onMouseMove);
                document.addEventListener("mouseup", onMouseUp);
            });
        });
    }

    document.addEventListener("click", (e) => {
        // Deseleccionar si hace clic fuera
        if (!e.target.closest(".text-card") && !e.target.closest(".media-container") && !e.target.closest(".logo-card") && !e.target.closest(".sidebar") && !e.target.closest(".phone-mockup")) {
            selectCard(null);
        }
    });

    function selectCard(key) {
        activeCardKey = key;
        
        // Limpiar estilos de selección
        document.querySelectorAll(".text-card").forEach(c => c.classList.remove("card-selected-highlight"));
        document.querySelectorAll(".media-container").forEach(c => c.classList.remove("card-selected-highlight"));
        document.querySelectorAll(".logo-card").forEach(c => c.classList.remove("card-selected-highlight"));
        
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
            if (mediaContainer) mediaContainer.classList.add("card-selected-highlight");
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
        if (activeEl) {
            activeEl.classList.add("card-selected-highlight");
        }
        
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
        if (activeEl) {
            activeEl.style.setProperty("font-size", (val / 100) + "rem", "important");
        }
    });

    // CARGA DE MULTIMEDIA (VIDEO / IMAGEN)
    mediaInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            // Mostrar previsualización temporal inmediata usando blob local
            const fileURL = URL.createObjectURL(file);
            currentTemplate.mediaType = file.type.startsWith("video/") ? "video" : "image";
            currentTemplate.mediaSrc = fileURL;

            if (currentTemplate.mediaType === "video") {
                rawVideoFile = file;
            } else {
                rawVideoFile = null;
            }

            applyScreenMedia(currentProject.activeScreenIndex);

            // Subir de forma persistente en segundo plano
            const uploadRes = await fetch('/api/upload-media', {
                method: 'POST',
                headers: { 'Content-Type': file.type },
                body: file
            });

            if (uploadRes.ok) {
                const resData = await uploadRes.json();
                currentTemplate.mediaSrc = resData.url; // Guardar URL persistente
                console.log("[Editor] Video guardado de forma persistente en servidor:", resData.url);
                saveTemplateQuietly();
            } else {
                console.warn("[Editor] Falló subida persistente, se usará sesión temporal.");
            }
        } catch (err) {
            console.error("[Editor] Error subiendo video persistentemente:", err);
        }

        // Habilitar controles si es video
        if (currentTemplate.mediaType === "video") {
            playPauseBtn.disabled = false;
            muteBtn.disabled = false;
        } else {
            playPauseBtn.disabled = true;
            muteBtn.disabled = true;
        }
        saveTemplateQuietly();
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
            applyScreenLogo(currentProject.activeScreenIndex);
            saveTemplateQuietly();
        };
        reader.readAsDataURL(file);
    });

    if (removeLogoBtn) {
        removeLogoBtn.addEventListener("click", () => {
            currentTemplate.logoSrc = null;
            applyScreenLogo(currentProject.activeScreenIndex);
            saveTemplateQuietly();
        });
    }

    // CONTROLES DE REPRODUCCIÓN DE VIDEO
    playPauseBtn.addEventListener("click", () => {
        if (!reelVideo) return;
        if (reelVideo.paused) {
            reelVideo.play();
            playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pausar';
        } else {
            reelVideo.pause();
            playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i> Reproducir';
        }
    });

    muteBtn.addEventListener("click", () => {
        if (!reelVideo) return;
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
        applyScreenStyles(currentProject.activeScreenIndex);
        saveTemplateQuietly();
    });

    colorBoxPicker.addEventListener("input", (e) => {
        if (!activeCardKey || activeCardKey === "media") return;
        currentTemplate.styles[activeCardKey].boxColor = e.target.value;
        applyScreenStyles(currentProject.activeScreenIndex);
        saveTemplateQuietly();
    });

    boxOpacitySlider.addEventListener("input", (e) => {
        if (!activeCardKey || activeCardKey === "media") return;
        currentTemplate.styles[activeCardKey].opacity = parseInt(e.target.value);
        applyScreenStyles(currentProject.activeScreenIndex);
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
        applyScreenStyles(currentProject.activeScreenIndex);
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

    // CENTRAR BLOQUE HORIZONTALMENTE
    centerBlockBtn.addEventListener("click", () => {
        if (!activeCardKey) {
            alert("Selecciona primero el bloque de texto o multimedia haciendo clic sobre él.");
            return;
        }
        
        const activeEl = activeCardKey === "header" ? headerCard : (activeCardKey === "footer" ? footerCard : mediaContainer);
        if (!activeEl) return;
        
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
        currentProject.screens.forEach((screenData, idx) => {
            const hText = document.getElementById(`header-text-${idx}`);
            const fText = document.getElementById(`footer-text-${idx}`);
            if (hText) screenData.headerText = hText.innerHTML;
            if (fText) screenData.footerText = fText.innerHTML;
        });
    }

    function saveTemplateQuietly() {
        syncDOMToState();
        localStorage.setItem(`reels_project_${currentTemplateName}`, JSON.stringify(currentProject));
        
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
        
        currentTemplateName = cleanName;
        currentProject = {
            name: cleanName,
            activeScreenIndex: 0,
            screens: [createDefaultScreen(0)]
        };
        currentTemplate = currentProject.screens[0];
        
        renderScreens();
        selectScreen(0);
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
        currentProject.name = cleanName;
        saveTemplateQuietly();
        alert(`Copia guardada como "${cleanName}".`);
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

        // Crear diseño de pantalla por defecto
    function createDefaultScreen(index = 0) {
        return {
            name: `Pantalla ${index + 1}`,
            theme: "dark",
            customColor: "#141414",
            fontTitle: "'Montserrat', sans-serif",
            mediaType: null,
            mediaSrc: null,
            showHeaderCard: true,
            showFooterCard: true,
            showInstagramOverlay: false,
            headerText: index === 0 
                ? "🔥 <strong>TÍTULO DE GANCHO</strong><br>¡Este tip te volará la cabeza!"
                : `🔥 <strong>DISEÑO DE REEL ${index + 1}</strong><br>Edita este texto para tu gancho.`,
            footerText: "💡 <strong>Aprende el secreto hoy</strong><br>Síguenos para más consejos diarios 👇<br><span style='color: #dfb15b;'>#cocina #consejos #tutorial</span>",
            fontSizes: {
                header: 115,
                footer: 95
            },
            positions: {
                header: { top: "40px", left: "28px" },
                media: { top: "160px", left: "20px" },
                footer: { top: "490px", left: "28px" },
                logo: { top: "150px", left: "140px" }
            },
            styles: {
                header: { color: "#ffffff", boxColor: "#000000", opacity: 85, width: 85 },
                footer: { color: "#ffffff", boxColor: "#000000", opacity: 85, width: 85 }
            },
            logoSrc: null,
            logoSize: 80
        };
    }

    function loadTemplateData(name) {
        currentTemplateName = name;
        const savedData = localStorage.getItem(`reels_project_${name}`);
        let parsed = null;
        if (savedData) {
            try {
                parsed = JSON.parse(savedData);
            } catch (e) {
                console.error("Error cargando plantilla:", e);
            }
        }

        if (parsed) {
            if (parsed.screens && Array.isArray(parsed.screens)) {
                currentProject = parsed;
            } else {
                // Migración para proyectos antiguos de pantalla única
                if (parsed.positions && parsed.positions.footer && parsed.positions.footer.top === "auto") {
                    parsed.positions.footer.top = "490px";
                }
                currentProject = {
                    name: name,
                    activeScreenIndex: 0,
                    screens: [parsed]
                };
            }
        } else {
            currentProject = {
                name: name,
                activeScreenIndex: 0,
                screens: [createDefaultScreen(0)]
            };
        }

        renderScreens();
        selectScreen(currentProject.activeScreenIndex);
    }

    function renderScreens() {
        if (!simulatorPane) return;
        simulatorPane.innerHTML = "";
        
        currentProject.screens.forEach((screenData, index) => {
            const wrapper = document.createElement("div");
            wrapper.className = "phone-wrapper";
            wrapper.dataset.index = index;
            wrapper.draggable = true;
            
            wrapper.innerHTML = `
                <div class="phone-header">
                    <span class="phone-title" contenteditable="true" id="phone-title-${index}" style="outline: none; cursor: text; display: inline-block; min-width: 80px; padding-right: 20px;">${screenData.name || 'Pantalla ' + (index + 1)}</span>
                    <span class="drag-handle" title="Arrastra para reordenar"><i class="fa-solid fa-grip-vertical"></i></span>
                </div>
                <div class="phone-mockup ${index === currentProject.activeScreenIndex ? 'selected-phone' : ''}" data-index="${index}">
                    <div class="phone-screen">
                        <div class="reel-canvas theme-${screenData.theme}" id="reel-canvas-${index}" style="${screenData.theme === 'custom' ? 'background: ' + screenData.customColor : ''}">
                            
                            <!-- Bloque de texto superior -->
                            <div class="text-card drag-el" id="header-card-${index}" style="top: ${screenData.positions?.header?.top || '40px'}; left: ${screenData.positions?.header?.left || '28px'}; width: ${screenData.styles?.header?.width || 85}%; display: ${screenData.showHeaderCard ? 'flex' : 'none'}; height: ${screenData.styles?.header?.height ? screenData.styles.header.height + 'px' : 'auto'};">
                                <div class="text-content" contenteditable="true" id="header-text-${index}">
                                    ${screenData.headerText}
                                </div>
                                <div class="resize-handle resize-t" data-key="header" data-index="${index}"></div>
                                <div class="resize-handle resize-r" data-key="header" data-index="${index}"></div>
                                <div class="resize-handle resize-b" data-key="header" data-index="${index}"></div>
                                <div class="resize-handle resize-se" data-key="header" data-index="${index}"></div>
                            </div>

                            <!-- Bloque central de video 1:1 -->
                            <div class="media-container" id="media-container-${index}" style="top: ${screenData.positions?.media?.top || '160px'}; left: ${screenData.positions?.media?.left || '20px'};">
                                <video id="reel-video-${index}" loop muted playsinline style="display: none;"></video>
                                <img id="reel-img-${index}" src="" alt="Previsualización" style="display: none;">
                                <div class="media-placeholder" id="media-placeholder-${index}">
                                    <i class="fa-solid fa-video"></i>
                                    <span>Carga un video/imagen 1:1</span>
                                </div>
                            </div>

                            <!-- Bloque de texto inferior -->
                            <div class="text-card drag-el" id="footer-card-${index}" style="top: ${screenData.positions?.footer?.top || '490px'}; left: ${screenData.positions?.footer?.left || '28px'}; width: ${screenData.styles?.footer?.width || 85}%; display: ${screenData.showFooterCard ? 'flex' : 'none'}; height: ${screenData.styles?.footer?.height ? screenData.styles.footer.height + 'px' : 'auto'};">
                                <div class="text-content" contenteditable="true" id="footer-text-${index}">
                                    ${screenData.footerText}
                                </div>
                                <div class="resize-handle resize-t" data-key="footer" data-index="${index}"></div>
                                <div class="resize-handle resize-r" data-key="footer" data-index="${index}"></div>
                                <div class="resize-handle resize-b" data-key="footer" data-index="${index}"></div>
                                <div class="resize-handle resize-se" data-key="footer" data-index="${index}"></div>
                            </div>

                            <!-- Logo flotante arrastrable -->
                            <div class="logo-card drag-el" id="logo-card-${index}" style="top: ${screenData.positions?.logo?.top || '150px'}; left: ${screenData.positions?.logo?.left || '140px'}; width: ${screenData.logoSize || 80}px; height: ${screenData.logoSize || 80}px; display: none;">
                                <img id="logo-img-preview-${index}" src="" alt="Logo" style="width: 100%; height: 100%; object-fit: contain; pointer-events: none;">
                            </div>

                            <!-- Simulación de interfaz de Instagram Reels -->
                            <div class="instagram-overlay" id="instagram-overlay-${index}" style="display: none;">
                                <div class="ig-actions">
                                    <div class="ig-action"><i class="fa-solid fa-heart"></i><span>12.4K</span></div>
                                    <div class="ig-action"><i class="fa-solid fa-comment"></i><span>382</span></div>
                                    <div class="ig-action"><i class="fa-solid fa-paper-plane"></i><span>95</span></div>
                                    <div class="ig-action"><i class="fa-solid fa-ellipsis-vertical"></i></div>
                                    <div class="ig-audio-disc">🎵</div>
                                </div>
                                <div class="ig-profile-info">
                                    <div class="ig-user">
                                        <div class="ig-avatar">🍳</div>
                                        <span>chef_recetas</span>
                                        <button class="ig-follow-btn">Seguir</button>
                                    </div>
                                    <div class="ig-caption">¡Aprende esta increíble receta en pocos pasos! ... <span class="ig-more">más</span></div>
                                    <div class="ig-music-name">🎵 Audio original • chef_recetas</div>
                                </div>
                            </div>

                        </div>
                    </div>
                    <div class="phone-home-indicator"></div>
                </div>
            `;
            
            simulatorPane.appendChild(wrapper);
            
            // Aplicar configuraciones guardadas
            applyScreenStyles(index);
            applyScreenMedia(index);
            applyScreenLogo(index);
            applyScreenIGOverlay(index);
            
            const mock = wrapper.querySelector(".phone-mockup");
            const hCard = document.getElementById(`header-card-${index}`);
            const fCard = document.getElementById(`footer-card-${index}`);
            const mCont = document.getElementById(`media-container-${index}`);
            const lCard = document.getElementById(`logo-card-${index}`);
            
            setupDraggable(hCard, "header", index);
            setupDraggable(fCard, "footer", index);
            setupDraggable(mCont, "media", index);
            setupDraggable(lCard, "logo", index);
            
            setupResizable(hCard, "header", index);
            setupResizable(fCard, "footer", index);
            
            // Manejadores de eventos para arrastrar y soltar teléfonos (Mesa de trabajo)
            let dragAllowed = false;
            
            wrapper.addEventListener("mousedown", (e) => {
                if (e.target.closest(".phone-header") || e.target.closest(".drag-handle")) {
                    if (e.target.closest("[contenteditable='true']")) {
                        dragAllowed = false;
                    } else {
                        dragAllowed = true;
                    }
                } else {
                    dragAllowed = false;
                }
            });
            
            wrapper.addEventListener("dragstart", (e) => {
                if (!dragAllowed) {
                    e.preventDefault();
                    return;
                }
                wrapper.classList.add("dragging");
                e.dataTransfer.effectAllowed = "move";
                window.draggedScreenIndex = index;
            });
            
            wrapper.addEventListener("dragover", (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (window.draggedScreenIndex !== undefined && window.draggedScreenIndex !== index) {
                    wrapper.classList.add("drag-over");
                }
            });
            
            wrapper.addEventListener("dragleave", () => {
                wrapper.classList.remove("drag-over");
            });
            
            wrapper.addEventListener("drop", (e) => {
                e.preventDefault();
                wrapper.classList.remove("drag-over");
                
                const fromIndex = window.draggedScreenIndex;
                const toIndex = index;
                
                if (fromIndex !== undefined && fromIndex !== toIndex) {
                    const [movedScreen] = currentProject.screens.splice(fromIndex, 1);
                    currentProject.screens.splice(toIndex, 0, movedScreen);
                    
                    // Actualizar el índice de la pantalla activa
                    if (currentProject.activeScreenIndex === fromIndex) {
                        currentProject.activeScreenIndex = toIndex;
                    } else if (currentProject.activeScreenIndex > fromIndex && currentProject.activeScreenIndex <= toIndex) {
                        currentProject.activeScreenIndex--;
                    } else if (currentProject.activeScreenIndex < fromIndex && currentProject.activeScreenIndex >= toIndex) {
                        currentProject.activeScreenIndex++;
                    }
                    
                    renderScreens();
                    selectScreen(currentProject.activeScreenIndex);
                    saveTemplateQuietly();
                }
                window.draggedScreenIndex = undefined;
            });
            
            wrapper.addEventListener("dragend", () => {
                wrapper.classList.remove("dragging");
                document.querySelectorAll(".phone-wrapper").forEach(w => w.classList.remove("drag-over"));
                window.draggedScreenIndex = undefined;
            });

            mock.addEventListener("mousedown", (e) => {
                if (currentProject.activeScreenIndex !== index) {
                    selectScreen(index);
                }
            });
            
            hCard.addEventListener("click", (e) => {
                e.stopPropagation();
                selectScreen(index);
                selectCard("header");
            });
            fCard.addEventListener("click", (e) => {
                e.stopPropagation();
                selectScreen(index);
                selectCard("footer");
            });
            mCont.addEventListener("click", (e) => {
                e.stopPropagation();
                selectScreen(index);
                selectCard("media");
            });
            lCard.addEventListener("click", (e) => {
                e.stopPropagation();
                selectScreen(index);
                selectCard("logo");
            });
            
            const hText = document.getElementById(`header-text-${index}`);
            const fText = document.getElementById(`footer-text-${index}`);
            
            hText.addEventListener("input", () => {
                currentProject.screens[index].headerText = hText.innerHTML;
                saveTemplateQuietly();
            });
            fText.addEventListener("input", () => {
                currentProject.screens[index].footerText = fText.innerHTML;
                saveTemplateQuietly();
            });

            // Actualizar nombre de la pantalla
            const pTitle = document.getElementById(`phone-title-${index}`);
            if (pTitle) {
                pTitle.addEventListener("input", () => {
                    currentProject.screens[index].name = pTitle.textContent.trim();
                    saveTemplateQuietly();
                });
                pTitle.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        pTitle.blur();
                    }
                });
            }
        });
    }

    function selectScreen(index) {
        if (index < 0 || index >= currentProject.screens.length) return;
        currentProject.activeScreenIndex = index;
        currentTemplate = currentProject.screens[index];
        
        // Actualizar visualmente la selección en la UI
        document.querySelectorAll(".phone-mockup").forEach(mock => {
            mock.classList.remove("selected-phone");
        });
        
        const selectedMock = document.querySelector(`.phone-mockup[data-index="${index}"]`);
        if (selectedMock) {
            selectedMock.classList.add("selected-phone");
        }
        
        // Vincular referencias a los elementos dinámicos
        reelCanvas = document.getElementById(`reel-canvas-${index}`);
        headerCard = document.getElementById(`header-card-${index}`);
        footerCard = document.getElementById(`footer-card-${index}`);
        headerTextEl = document.getElementById(`header-text-${index}`);
        footerTextEl = document.getElementById(`footer-text-${index}`);
        mediaContainer = document.getElementById(`media-container-${index}`);
        reelVideo = document.getElementById(`reel-video-${index}`);
        reelImg = document.getElementById(`reel-img-${index}`);
        mediaPlaceholder = document.getElementById(`media-placeholder-${index}`);
        logoCard = document.getElementById(`logo-card-${index}`);
        logoImgPreview = document.getElementById(`logo-img-preview-${index}`);
        instagramOverlay = document.getElementById(`instagram-overlay-${index}`);
        
        // Sincronizar selectores del panel izquierdo
        themeSelect.value = currentTemplate.theme;
        if (currentTemplate.theme === "custom") {
            customColorWrapper.style.display = "block";
            bgColorPicker.value = currentTemplate.customColor || "#141414";
        } else {
            customColorWrapper.style.display = "none";
        }
        
        fontTitleSelect.value = currentTemplate.fontTitle;
        toggleHeaderCard.checked = currentTemplate.showHeaderCard;
        toggleFooterCard.checked = currentTemplate.showFooterCard;
        toggleIgOverlay.checked = currentTemplate.showInstagramOverlay || false;
        
        // Sincronizar controles multimedia si hay video
        if (currentTemplate.mediaType === "video") {
            playPauseBtn.disabled = false;
            muteBtn.disabled = false;
            playPauseBtn.innerHTML = reelVideo.paused 
                ? '<i class="fa-solid fa-play"></i> Reproducir' 
                : '<i class="fa-solid fa-pause"></i> Pausar';
            muteBtn.innerHTML = reelVideo.muted 
                ? '<i class="fa-solid fa-volume-xmark"></i> Silenciar' 
                : '<i class="fa-solid fa-volume-high"></i> Sonido';
        } else {
            playPauseBtn.disabled = true;
            muteBtn.disabled = true;
        }

        // Pausar todos los videos de otras pantallas y reproducir el del teléfono seleccionado
        currentProject.screens.forEach((_, idx) => {
            const vid = document.getElementById(`reel-video-${idx}`);
            if (vid) {
                if (idx === index) {
                    if (currentTemplate.mediaType === "video") {
                        vid.play().catch(() => {});
                    }
                } else {
                    vid.pause();
                    vid.muted = true; // Asegurar que los no activos estén silenciados
                    if (vid.currentTime === 0) {
                        vid.currentTime = 0.1; // Forzar render del primer fotograma en inactivos
                    }
                }
            }
        });

        // Sincronizar tarjeta si había una seleccionada
        if (activeCardKey) {
            selectCard(activeCardKey);
        } else {
            selectCard(null);
        }
    }

    function applyScreenStyles(index) {
        const screenData = currentProject.screens[index];
        const hCard = document.getElementById(`header-card-${index}`);
        const fCard = document.getElementById(`footer-card-${index}`);
        if (!hCard || !fCard) return;
        
        hCard.style.fontFamily = screenData.fontTitle;
        fCard.style.fontFamily = screenData.fontTitle;
        
        hCard.style.setProperty("font-size", (screenData.fontSizes.header / 100) + "rem", "important");
        fCard.style.setProperty("font-size", (screenData.fontSizes.footer / 100) + "rem", "important");
        
        ["header", "footer"].forEach(key => {
            const card = key === "header" ? hCard : fCard;
            const style = screenData.styles[key];
            if (!style) return;
            
            card.style.color = style.color;
            card.style.width = style.width + "%";
            card.style.height = style.height ? style.height + "px" : "auto";
            
            const hex = style.boxColor;
            const opacity = style.opacity / 100;
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            card.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        });
    }

    function applyScreenMedia(index) {
        const screenData = currentProject.screens[index];
        const video = document.getElementById(`reel-video-${index}`);
        const img = document.getElementById(`reel-img-${index}`);
        const placeholder = document.getElementById(`media-placeholder-${index}`);
        if (!video || !img || !placeholder) return;
        
        if (screenData.mediaType === "video" && screenData.mediaSrc) {
            img.style.display = "none";
            video.style.display = "block";
            placeholder.style.display = "none";
            video.src = screenData.mediaSrc;
            video.muted = true; // Asegurar silencio inicial
            if (index === currentProject.activeScreenIndex) {
                video.play().catch(() => console.log("Video auto-play blocked."));
            } else {
                video.pause();
                if (video.currentTime === 0) {
                    video.currentTime = 0.1; // Forzar render del primer fotograma en inactivos
                }
            }
        } else if (screenData.mediaType === "image" && screenData.mediaSrc) {
            video.style.display = "none";
            video.pause();
            img.style.display = "block";
            placeholder.style.display = "none";
            img.src = screenData.mediaSrc;
        } else {
            video.style.display = "none";
            img.style.display = "none";
            placeholder.style.display = "flex";
        }
    }

    function applyScreenLogo(index) {
        const screenData = currentProject.screens[index];
        const card = document.getElementById(`logo-card-${index}`);
        const preview = document.getElementById(`logo-img-preview-${index}`);
        if (!card || !preview) return;
        
        if (screenData.logoSrc) {
            preview.src = screenData.logoSrc;
            card.style.display = "block";
            card.style.width = (screenData.logoSize || 80) + "px";
            card.style.height = (screenData.logoSize || 80) + "px";
        } else {
            card.style.display = "none";
            preview.removeAttribute("src");
        }
    }

    function applyScreenIGOverlay(index) {
        const screenData = currentProject.screens[index];
        const overlay = document.getElementById(`instagram-overlay-${index}`);
        if (!overlay) return;
        overlay.style.display = screenData.showInstagramOverlay ? "block" : "none";
    }

    // LISTENER DE GESTIÓN DE PANTALLAS (AÑADIR, DUPLICAR, ELIMINAR)
    addPhoneBtn.addEventListener("click", () => {
        const newScreen = createDefaultScreen(currentProject.screens.length);
        currentProject.screens.push(newScreen);
        currentProject.activeScreenIndex = currentProject.screens.length - 1;
        
        renderScreens();
        selectScreen(currentProject.activeScreenIndex);
        saveTemplateQuietly();
    });

    duplicatePhoneBtn.addEventListener("click", () => {
        const activeIdx = currentProject.activeScreenIndex;
        const originalScreen = currentProject.screens[activeIdx];
        const clonedScreen = JSON.parse(JSON.stringify(originalScreen));
        
        // Modificar el nombre de la pantalla clonada pero mantener el texto original del gancho sin "(Copia)"
        clonedScreen.name = originalScreen.name ? originalScreen.name + " (Copia)" : `Pantalla ${activeIdx + 2} (Copia)`;
        
        currentProject.screens.splice(activeIdx + 1, 0, clonedScreen);
        currentProject.activeScreenIndex = activeIdx + 1;
        
        renderScreens();
        selectScreen(currentProject.activeScreenIndex);
        saveTemplateQuietly();
    });

    deletePhoneBtn.addEventListener("click", () => {
        if (currentProject.screens.length <= 1) {
            alert("Debes tener al menos una pantalla de teléfono en tu mesa de trabajo.");
            return;
        }
        
        if (!confirm("¿Seguro que deseas eliminar la pantalla de teléfono seleccionada?")) return;
        
        const activeIdx = currentProject.activeScreenIndex;
        currentProject.screens.splice(activeIdx, 1);
        
        // Ajustar el índice activo
        currentProject.activeScreenIndex = Math.max(0, activeIdx - 1);
        
        renderScreens();
        selectScreen(currentProject.activeScreenIndex);
        saveTemplateQuietly();
    });

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
        const hasPersistentVideo = currentTemplate.mediaSrc && currentTemplate.mediaSrc.startsWith("/uploads/");
        logToServer(`[Grabador] Click en botón de exportación. mediaType=${currentTemplate.mediaType}, tieneFile=${!!rawVideoFile}, tienePersistencia=${hasPersistentVideo}`);

        if (currentTemplate.mediaType !== "video") {
            alert("Por favor, selecciona un video (.mp4) en el simulador antes de exportar.");
            return;
        }

        if (!rawVideoFile && !hasPersistentVideo) {
            logToServer("[Grabador] Error: Intento de exportar sin un archivo de video seleccionado.");
            alert("Por favor, selecciona de nuevo el video (.mp4) haciendo clic en 'Cargar Multimedia' antes de exportarlo.");
            return;
        }

        try {
            recordVideoBtn.disabled = true;
            recordVideoBtn.classList.add("recording");

            // Solo subir el archivo si es un archivo nuevo seleccionado en esta sesión
            if (rawVideoFile) {
                recordVideoBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Subiendo video...';
                logToServer("[Grabador] Subiendo video bruto al servidor...");
                
                const uploadRes = await fetch('/api/upload-video', {
                    method: 'POST',
                    headers: { 'Content-Type': rawVideoFile.type },
                    body: rawVideoFile
                });

                if (!uploadRes.ok) {
                    throw new Error("No se pudo subir el archivo de video al servidor.");
                }
                logToServer("[Grabador] Video subido con éxito.");
            }

            logToServer("[Grabador] Solicitando procesamiento FFmpeg...");
            recordVideoBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando en Servidor...';

            const exportPayload = {
                theme: themeSelect.value,
                customColor: currentTemplate.customColor,
                canvasWidth: reelCanvas.offsetWidth,
                canvasHeight: reelCanvas.offsetHeight,
                videoLeft: mediaContainer.offsetLeft,
                videoTop: mediaContainer.offsetTop,
                videoWidth: mediaContainer.offsetWidth,
                videoHeight: mediaContainer.offsetHeight,
                mediaSrc: currentTemplate.mediaSrc,
                headerHtml: currentTemplate.showHeaderCard ? headerTextEl.innerHTML : "",
                headerStyle: currentTemplate.showHeaderCard ? {
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
                } : null,
                footerHtml: currentTemplate.showFooterCard ? footerTextEl.innerHTML : "",
                footerStyle: currentTemplate.showFooterCard ? {
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
                } : null,
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

    if (toggleIgOverlay) {
        toggleIgOverlay.addEventListener("change", (e) => {
            currentTemplate.showInstagramOverlay = e.target.checked;
            if (instagramOverlay) {
                instagramOverlay.style.display = e.target.checked ? "block" : "none";
            }
            saveTemplateQuietly();
        });
    }

    if (toggleHeaderCard) {
        toggleHeaderCard.addEventListener("change", (e) => {
            currentTemplate.showHeaderCard = e.target.checked;
            headerCard.style.display = e.target.checked ? "flex" : "none";
            saveTemplateQuietly();
        });
    }

    if (toggleFooterCard) {
        toggleFooterCard.addEventListener("change", (e) => {
            currentTemplate.showFooterCard = e.target.checked;
            footerCard.style.display = e.target.checked ? "flex" : "none";
            saveTemplateQuietly();
        });
    }

    // EXPORTAR PROYECTO A ARCHIVO JSON
    if (exportJsonBtn) {
        exportJsonBtn.addEventListener("click", () => {
            syncDOMToState();
            const jsonString = JSON.stringify(currentProject, null, 2);
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${currentTemplateName || 'proyecto'}_backup.json`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    // IMPORTAR PROYECTO DESDE ARCHIVO JSON
    if (importJsonBtn && importJsonInput) {
        importJsonBtn.addEventListener("click", () => {
            importJsonInput.click();
        });

        importJsonInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const parsed = JSON.parse(event.target.result);

                    // Validar estructura básica
                    if (!parsed.screens || !Array.isArray(parsed.screens)) {
                        throw new Error("El archivo no tiene el formato de proyecto válido de Reels.");
                    }

                    // Forzar nombre y persistencia
                    const importedName = parsed.name || "importado_" + Date.now();
                    currentTemplateName = importedName;
                    currentProject = parsed;
                    currentProject.name = importedName;

                    // Agregar a la lista si no existe
                    if (!templatesList.some(p => p.id === importedName)) {
                        templatesList.push({ id: importedName, name: importedName });
                        localStorage.setItem("reels_projects", JSON.stringify(templatesList));
                        initProjects();
                    }

                    projectSelect.value = importedName;
                    saveTemplateQuietly();
                    renderScreens();
                    selectScreen(currentProject.activeScreenIndex || 0);
                    alert(`¡Proyecto "${importedName}" importado con éxito!`);
                } catch (err) {
                    alert("Error al importar el archivo JSON: " + err.message);
                }
            };
            reader.readAsText(file);
            importJsonInput.value = ""; // Limpiar
        });
    }

    // ==========================================
    // SISTEMA DE EXPORTACIÓN EN LOTE (MODAL)
    // ==========================================
    const bulkExportBtn = document.getElementById("bulk-export-btn");
    const bulkModal = document.getElementById("bulk-modal");
    const closeBulkModal = document.getElementById("close-bulk-modal");
    const cancelBulkBtn = document.getElementById("cancel-bulk-btn");
    const startBulkExportBtn = document.getElementById("start-bulk-export-btn");
    const bulkScreensGrid = document.getElementById("bulk-screens-grid");
    const bulkSelectAll = document.getElementById("bulk-select-all");
    const bulkDeselectAll = document.getElementById("bulk-deselect-all");
    const bulkProgressContainer = document.getElementById("bulk-progress-container");
    const bulkProgressBar = document.getElementById("bulk-progress-bar");
    const bulkProgressText = document.getElementById("bulk-progress-text");
    const bulkProgressPercentage = document.getElementById("bulk-progress-percentage");

    let selectedScreensToExport = new Set();
    let isBulkExportRunning = false;

    if (bulkExportBtn && bulkModal) {
        bulkExportBtn.addEventListener("click", () => {
            saveTemplateQuietly();
            openBulkModal();
        });

        closeBulkModal.addEventListener("click", () => {
            if (isBulkExportRunning) return;
            bulkModal.style.display = "none";
        });

        cancelBulkBtn.addEventListener("click", () => {
            if (isBulkExportRunning) return;
            bulkModal.style.display = "none";
        });

        bulkSelectAll.addEventListener("click", () => {
            if (isBulkExportRunning) return;
            currentProject.screens.forEach((_, idx) => selectedScreensToExport.add(idx));
            renderBulkScreensGrid();
        });

        bulkDeselectAll.addEventListener("click", () => {
            if (isBulkExportRunning) return;
            selectedScreensToExport.clear();
            renderBulkScreensGrid();
        });

        startBulkExportBtn.addEventListener("click", async () => {
            if (isBulkExportRunning) return;
            if (selectedScreensToExport.size === 0) {
                alert("Por favor, selecciona al menos una pantalla para exportar.");
                return;
            }

            const indices = Array.from(selectedScreensToExport).sort((a, b) => a - b);
            
            // Validar que todas las pantallas seleccionadas tengan un video
            for (let idx of indices) {
                const screen = currentProject.screens[idx];
                if (screen.mediaType !== "video" || (!screen.mediaSrc)) {
                    alert(`La "${screen.name || 'Pantalla ' + (idx + 1)}" no tiene un video cargado. Por favor, selecciona un video para todas las pantallas seleccionadas.`);
                    return;
                }
            }

            // Iniciar proceso
            isBulkExportRunning = true;
            disableBulkModalControls(true);
            bulkProgressContainer.style.display = "block";
            
            let completedCount = 0;
            const totalCount = indices.length;

            updateBulkProgress(0, totalCount, "Iniciando cola de procesamiento...");

            for (let i = 0; i < totalCount; i++) {
                const screenIndex = indices[i];
                const screen = currentProject.screens[screenIndex];
                const statusLabel = document.getElementById(`bulk-status-${screenIndex}`);
                const cardEl = document.querySelector(`.bulk-card[data-index="${screenIndex}"]`);
                
                if (statusLabel) {
                    statusLabel.className = "bulk-card-status processing";
                    statusLabel.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';
                }
                if (cardEl) {
                    cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }

                updateBulkProgress(i, totalCount, `Exportando "${screen.name || 'Pantalla ' + (screenIndex + 1)}"...`);

                try {
                    const payload = getExportPayloadForScreen(screenIndex);
                    
                    const exportRes = await fetch('/api/export-video', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (!exportRes.ok) {
                        const errData = await exportRes.json().catch(() => ({}));
                        throw new Error(errData.error || "Error en el servidor.");
                    }

                    const blob = await exportRes.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `reel_${screen.name ? screen.name.replace(/[^\w-]/g, '_') : screenIndex + 1}_${Date.now()}.mp4`;
                    a.click();
                    URL.revokeObjectURL(url);

                    if (statusLabel) {
                        statusLabel.className = "bulk-card-status done";
                        statusLabel.innerHTML = '<i class="fa-solid fa-circle-check"></i> Completado';
                    }
                    completedCount++;
                } catch (err) {
                    console.error(`Error exportando pantalla ${screenIndex}:`, err);
                    if (statusLabel) {
                        statusLabel.className = "bulk-card-status error";
                        statusLabel.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Error';
                    }
                }
                
                updateBulkProgress(i + 1, totalCount, `Progreso: ${i + 1} de ${totalCount} completado`);
            }

            updateBulkProgress(totalCount, totalCount, "¡Exportación en lote finalizada!");
            isBulkExportRunning = false;
            disableBulkModalControls(false);
            
            setTimeout(() => {
                alert(`Exportación en lote terminada. Se procesaron ${completedCount} de ${totalCount} videos con éxito.`);
            }, 500);
        });
    }

    function openBulkModal() {
        selectedScreensToExport.clear();
        // Por defecto seleccionar todas las que tengan video
        currentProject.screens.forEach((screen, idx) => {
            if (screen.mediaType === "video" && screen.mediaSrc) {
                selectedScreensToExport.add(idx);
            }
        });
        
        bulkProgressContainer.style.display = "none";
        bulkProgressBar.style.width = "0%";
        disableBulkModalControls(false);
        
        renderBulkScreensGrid();
        bulkModal.style.display = "flex";
    }

    function hexToRgb(hex) {
        if (!hex) return "0,0,0";
        const cleanHex = hex.replace('#', '');
        if (cleanHex.length === 3) {
            const r = parseInt(cleanHex[0] + cleanHex[0], 16) || 0;
            const g = parseInt(cleanHex[1] + cleanHex[1], 16) || 0;
            const b = parseInt(cleanHex[2] + cleanHex[2], 16) || 0;
            return `${r}, ${g}, ${b}`;
        }
        const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
        const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
        const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
        return `${r}, ${g}, ${b}`;
    }

    function renderBulkScreensGrid() {
        if (!bulkScreensGrid) return;
        bulkScreensGrid.innerHTML = "";

        currentProject.screens.forEach((screen, idx) => {
            const isSelected = selectedScreensToExport.has(idx);
            const card = document.createElement("div");
            card.className = `bulk-card ${isSelected ? 'selected' : ''}`;
            card.dataset.index = idx;
            
            // Determinar estilos de fondo del canvas
            let canvasBgStyle = "";
            if (screen.theme === "custom") {
                canvasBgStyle = `background: ${screen.customColor || '#141414'};`;
            }

            // Generar el clon exacto del HTML del canvas para esta pantalla
            const headerHtml = screen.showHeaderCard && screen.styles?.header ? `
                <div class="text-card" style="top: ${screen.positions?.header?.top || '40px'}; left: ${screen.positions?.header?.left || '28px'}; width: ${screen.styles?.header?.width || 85}%; font-family: ${screen.fontTitle}; font-size: ${(screen.fontSizes.header / 100)}rem; color: ${screen.styles.header.color}; background-color: rgba(${hexToRgb(screen.styles.header.boxColor)}, ${screen.styles.header.opacity / 100}); display: block;">
                    <div class="text-content" style="font-size: 1.15em !important; line-height: 1.45 !important;">
                        ${screen.headerText}
                    </div>
                </div>
            ` : "";
            
            const mediaHtml = `
                <div class="media-container" style="top: ${screen.positions?.media?.top || '160px'}; left: ${screen.positions?.media?.left || '20px'}; display: flex;">
                    ${screen.mediaSrc ? (
                        screen.mediaType === "video" 
                        ? `<video src="${screen.mediaSrc}" preload="metadata" muted></video><div class="mini-play-icon" style="position: absolute; z-index: 10; font-size: 1.5rem; color: rgba(255,255,255,0.8); background: rgba(0,0,0,0.5); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-play"></i></div>`
                        : `<img src="${screen.mediaSrc}" style="width:100%; height:100%; object-fit:cover;" />`
                    ) : '<i class="fa-solid fa-video placeholder" style="font-size: 2.5rem; color:#4b5260;"></i>'}
                </div>
            `;
            
            const footerHtml = screen.showFooterCard && screen.styles?.footer ? `
                <div class="text-card" style="top: ${screen.positions?.footer?.top || '490px'}; left: ${screen.positions?.footer?.left || '28px'}; width: ${screen.styles?.footer?.width || 85}%; font-family: ${screen.fontTitle}; font-size: ${(screen.fontSizes.footer / 100)}rem; color: ${screen.styles.footer.color}; background-color: rgba(${hexToRgb(screen.styles.footer.boxColor)}, ${screen.styles.footer.opacity / 100}); display: block;">
                    <div class="text-content" style="font-size: 1.15em !important; line-height: 1.45 !important;">
                        ${screen.footerText}
                    </div>
                </div>
            ` : "";
            
            const logoHtml = screen.logoSrc ? `
                <div class="logo-card" style="top: ${screen.positions?.logo?.top || '150px'}; left: ${screen.positions?.logo?.left || '140px'}; width: ${screen.logoSize || 80}px; height: ${screen.logoSize || 80}px; display: block;">
                    <img src="${screen.logoSrc}" style="width: 100%; height: 100%; object-fit: contain;" />
                </div>
            ` : "";
            
            card.innerHTML = `
                <div class="bulk-checkbox-container">
                    <input type="checkbox" class="bulk-checkbox" ${isSelected ? 'checked' : ''}>
                </div>
                <div class="bulk-card-content">
                    <span class="bulk-card-index">${screen.name || 'Pantalla ' + (idx + 1)}</span>
                    <div class="bulk-card-preview">
                        <div class="mini-phone-container">
                            <div class="mini-phone-screen-scaled reel-canvas theme-${screen.theme}" style="${canvasBgStyle}">
                                ${headerHtml}
                                ${mediaHtml}
                                ${footerHtml}
                                ${logoHtml}
                            </div>
                        </div>
                    </div>
                    <span id="bulk-status-${idx}" class="bulk-card-status pending"><i class="fa-solid fa-clock"></i> Pendiente</span>
                </div>
            `;
            
            // Permitir seleccionar haciendo clic en toda la tarjeta (excepto el checkbox directamente para evitar doble toggle)
            card.addEventListener("click", (e) => {
                if (isBulkExportRunning) return;
                
                if (selectedScreensToExport.has(idx)) {
                    selectedScreensToExport.delete(idx);
                } else {
                    selectedScreensToExport.add(idx);
                }
                renderBulkScreensGrid();
            });
            
            bulkScreensGrid.appendChild(card);
        });
    }

    function disableBulkModalControls(disable) {
        closeBulkModal.style.pointerEvents = disable ? "none" : "auto";
        cancelBulkBtn.disabled = disable;
        startBulkExportBtn.disabled = disable;
        bulkSelectAll.disabled = disable;
        bulkDeselectAll.disabled = disable;
        
        document.querySelectorAll(".bulk-checkbox").forEach(cb => cb.disabled = disable);
    }

    function updateBulkProgress(current, total, text) {
        const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
        bulkProgressBar.style.width = `${percentage}%`;
        bulkProgressText.textContent = text;
        bulkProgressPercentage.textContent = `${percentage}%`;
    }

    function getExportPayloadForScreen(index) {
        const screenData = currentProject.screens[index];
        const scrCanvas = document.getElementById(`reel-canvas-${index}`);
        const hCard = document.getElementById(`header-card-${index}`);
        const hText = document.getElementById(`header-text-${index}`);
        const fCard = document.getElementById(`footer-card-${index}`);
        const fText = document.getElementById(`footer-text-${index}`);
        const mContainer = document.getElementById(`media-container-${index}`);
        const lCard = document.getElementById(`logo-card-${index}`);
        
        return {
            theme: screenData.theme,
            customColor: screenData.customColor,
            canvasWidth: scrCanvas.offsetWidth,
            canvasHeight: scrCanvas.offsetHeight,
            videoLeft: mContainer.offsetLeft,
            videoTop: mContainer.offsetTop,
            videoWidth: mContainer.offsetWidth,
            videoHeight: mContainer.offsetHeight,
            mediaSrc: screenData.mediaSrc,
            headerHtml: screenData.showHeaderCard ? hText.innerHTML : "",
            headerStyle: screenData.showHeaderCard ? {
                fontFamily: window.getComputedStyle(hText).fontFamily,
                fontSize: window.getComputedStyle(hText).fontSize,
                fontWeight: window.getComputedStyle(hText).fontWeight,
                color: window.getComputedStyle(hText).color,
                backgroundColor: window.getComputedStyle(hCard).backgroundColor,
                borderRadius: window.getComputedStyle(hCard).borderRadius,
                padding: window.getComputedStyle(hCard).padding,
                textAlign: window.getComputedStyle(hText).textAlign,
                lineHeight: window.getComputedStyle(hCard).lineHeight,
                width: hCard.offsetWidth,
                height: hCard.offsetHeight,
                left: hCard.offsetLeft,
                top: hCard.offsetTop
            } : null,
            footerHtml: screenData.showFooterCard ? fText.innerHTML : "",
            footerStyle: screenData.showFooterCard ? {
                fontFamily: window.getComputedStyle(fText).fontFamily,
                fontSize: window.getComputedStyle(fText).fontSize,
                fontWeight: window.getComputedStyle(fText).fontWeight,
                color: window.getComputedStyle(fText).color,
                backgroundColor: window.getComputedStyle(fCard).backgroundColor,
                borderRadius: window.getComputedStyle(fCard).borderRadius,
                padding: window.getComputedStyle(fCard).padding,
                textAlign: window.getComputedStyle(fText).textAlign,
                lineHeight: window.getComputedStyle(fCard).lineHeight,
                width: fCard.offsetWidth,
                height: fCard.offsetHeight,
                left: fCard.offsetLeft,
                top: fCard.offsetTop
            } : null,
            logoSrc: screenData.logoSrc || null,
            logoStyle: screenData.logoSrc ? {
                width: lCard.offsetWidth,
                height: lCard.offsetHeight,
                left: lCard.offsetLeft,
                top: lCard.offsetTop
            } : null
        };
    }
});
