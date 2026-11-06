document.addEventListener("DOMContentLoaded", () => {
    // ESTADO DE LA APLICACIÓN
    let templatesList = [{ id: "default", name: "Diseño por Defecto" }];
    let currentTemplateName = "default";
    let activeCardKey = null;
    let currentUploadTarget = "top"; // "top" o "bottom" // 'header', 'footer', 'media', o 'logo'
    let rawVideoFile = null;
    
    // Proyecto activo en memoria (que contiene múltiples pantallas)
    // Utilidad para comprimir imágenes y evitar llenar el localStorage
    
    
    // Utilidades delegadas al módulo js/utils.js
    const cleanAllMojibakeAndComments = window.ReelsUtils.cleanAllMojibakeAndComments;
    const sanitizeMojibake = window.ReelsUtils.sanitizeMojibake;
    const compressImage = window.ReelsUtils.compressImage;
    
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
    let mediaContainerBottom = null;
    let reelVideoBottom = null;
    let reelImgBottom = null;
    let mediaPlaceholderBottom = null;
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
    
    // Controles de Línea de Tiempo y Pausa de Video (Rama 1)
    const videoTimelineControls = document.getElementById("video-timeline-controls");
    const videoTimeDisplay = document.getElementById("video-time-display");
    const videoScrubber = document.getElementById("video-scrubber");
    const stepBackBtn = document.getElementById("step-back-btn");
    const stepForwardBtn = document.getElementById("step-forward-btn");
    const freezeFrameBtn = document.getElementById("freeze-frame-btn");
    const unfreezeFrameBtn = document.getElementById("unfreeze-frame-btn");
    const freezeStatusBadge = document.getElementById("freeze-status-badge");
    const freezeTimeText = document.getElementById("freeze-time-text");
    let isScrubbing = false;
    
    // Barra Flotante de Reproducción Inferior (Debajo de los teléfonos)
    const bottomPlayerDock = document.getElementById("bottom-player-dock");
    const bottomPlayBtn = document.getElementById("bottom-play-btn");
    const bottomStepBackBtn = document.getElementById("bottom-step-back-btn");
    const bottomStepFwdBtn = document.getElementById("bottom-step-fwd-btn");
    const bottomTimeDisplay = document.getElementById("bottom-time-display");
    const bottomScrubber = document.getElementById("bottom-scrubber");
    const bottomMuteBtn = document.getElementById("bottom-mute-btn");
    const bottomFreezeBtn = document.getElementById("bottom-freeze-btn");
    const bottomUnfreezeBtn = document.getElementById("bottom-unfreeze-btn");
    const bottomFreezeBadge = document.getElementById("bottom-freeze-badge");
    const bottomFreezeTimeText = document.getElementById("bottom-freeze-time-text");
    
    const themeSelect = document.getElementById("theme-select");
    const customColorWrapper = document.getElementById("custom-color-wrapper");
    const bgColorPicker = document.getElementById("bg-color-picker");
    const bgColorHex = document.getElementById("bg-color-hex");
    const bgImageWrapper = document.getElementById("bg-image-wrapper");
    const bgImageInput = document.getElementById("bg-image-input");
    const bgImageBtnText = document.getElementById("bg-image-btn-text");
    const bgImageActions = document.getElementById("bg-image-actions");
    const bgImageThumb = document.getElementById("bg-image-thumb");
    const changeBgImageBtn = document.getElementById("change-bg-image-btn");
    const removeBgImageBtn = document.getElementById("remove-bg-image-btn");
    const bgEffectGroup = document.getElementById("bg-effect-group");
    const bgEffectSelect = document.getElementById("bg-effect-select");
    
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
    const stickerInput = document.getElementById("sticker-input");

    const toggleIgOverlay = document.getElementById("toggle-ig-overlay");
    const toggleHeaderCard = document.getElementById("toggle-header-card");
    const toggleFooterCard = document.getElementById("toggle-footer-card");
    const sidebarHeaderInput = document.getElementById("sidebar-header-input");
    const sidebarFooterInput = document.getElementById("sidebar-footer-input");

    const htmlToPlainText = window.ReelsUtils.htmlToPlainText;
    const plainTextToHtml = window.ReelsUtils.plainTextToHtml;
    const autoResizeTextarea = window.ReelsUtils.autoResizeTextarea;

    function updateSidebarTextInputs() {
        if (!currentTemplate) return;
        if (sidebarHeaderInput && document.activeElement !== sidebarHeaderInput) {
            sidebarHeaderInput.value = htmlToPlainText(currentTemplate.headerText || "");
            autoResizeTextarea(sidebarHeaderInput);
        }
        if (sidebarFooterInput && document.activeElement !== sidebarFooterInput) {
            sidebarFooterInput.value = htmlToPlainText(currentTemplate.footerText || "");
            autoResizeTextarea(sidebarFooterInput);
        }
    }

    function syncTextBlocksVisibilityUI() {
        if (!currentTemplate) return;
        const showHeader = currentTemplate.showHeaderCard !== false;
        const showFooter = currentTemplate.showFooterCard !== false;

        const headerInput = document.getElementById("sidebar-header-input");
        const footerInput = document.getElementById("sidebar-footer-input");
        const targetHeaderBtn = document.querySelector('.card-target-btn[data-target="header"]');
        const targetFooterBtn = document.querySelector('.card-target-btn[data-target="footer"]');

        const emojiBarHeader = document.getElementById("emoji-bar-header");
        const emojiBarFooter = document.getElementById("emoji-bar-footer");
        const emojiBtnHeader = document.getElementById("btn-emoji-header");
        const emojiBtnFooter = document.getElementById("btn-emoji-footer");

        if (headerInput) headerInput.style.display = showHeader ? "" : "none";
        if (footerInput) footerInput.style.display = showFooter ? "" : "none";

        if (emojiBarHeader && !showHeader) emojiBarHeader.style.display = "none";
        if (emojiBarFooter && !showFooter) emojiBarFooter.style.display = "none";

        if (emojiBtnHeader) {
            emojiBtnHeader.style.display = showHeader ? "" : "none";
            if (!showHeader) emojiBtnHeader.classList.remove("active");
        }
        if (emojiBtnFooter) {
            emojiBtnFooter.style.display = showFooter ? "" : "none";
            if (!showFooter) emojiBtnFooter.classList.remove("active");
        }

        if (toggleHeaderCard) toggleHeaderCard.checked = showHeader;
        if (toggleFooterCard) toggleFooterCard.checked = showFooter;

        if (targetHeaderBtn) {
            targetHeaderBtn.style.opacity = showHeader ? "1" : "0.45";
            targetHeaderBtn.title = showHeader ? "Título activo" : "Título oculto (haz clic para activarlo)";
        }
        if (targetFooterBtn) {
            targetFooterBtn.style.opacity = showFooter ? "1" : "0.45";
            targetFooterBtn.title = showFooter ? "Descripción activa" : "Descripción oculta (haz clic para activarla)";
        }

        // Redirigir el bloque seleccionado si el actual se ocultó
        if (activeCardKey === "header" && !showHeader) {
            if (showFooter) selectCard("footer");
            else selectCard("media");
        } else if (activeCardKey === "footer" && !showFooter) {
            if (showHeader) selectCard("header");
            else selectCard("media");
        }
    }

    // Botones de gestión de pantallas
    const addPhoneBtn = document.getElementById("add-phone-btn");
    const duplicatePhoneBtn = document.getElementById("duplicate-phone-btn");
    const deletePhoneBtn = document.getElementById("delete-phone-btn");

    // TEMAS PREESTABLECIDOS Y CONTROL DE DROPDOWN DE FONDO
    const PRESET_THEMES = {
        "dark": { label: "Negro Profundo (#141619)", bg: "#141619" },
        "light": { label: "Blanco Minimalista (#FAFAFA)", bg: "#fafafa" },
        "neon": { label: "Neón Cyberpunk (Púrpura)", bg: "linear-gradient(135deg, #0b001a 0%, #1a0033 100%)" },
        "gradient-sunset": { label: "Sunset Orange (Degradado)", bg: "linear-gradient(180deg, #ff5e62 0%, #ff9966 100%)" },
        "gradient-forest": { label: "Deep Forest (Degradado)", bg: "linear-gradient(180deg, #11998e 0%, #38ef7d 100%)" },
        "custom": { label: "Color Personalizado", bg: "#141414" },
        "image": { label: "Foto de Fondo", bg: "#1a1d24" }
    };

    function syncThemeDropdownUI(theme) {
        try {
            const triggerLabel = document.getElementById("theme-dropdown-current-label");
            const triggerSwatch = document.getElementById("theme-dropdown-current-swatch");
            if (!triggerLabel || !triggerSwatch) return;

            if (theme === "custom") {
                const hex = currentTemplate ? (currentTemplate.customColor || (bgColorPicker ? bgColorPicker.value : "#141414")) : "#141414";
                triggerLabel.textContent = `Personalizado (${hex ? hex.toUpperCase() : "#141414"})`;
                triggerSwatch.style.background = hex || "#141414";
            } else if (theme === "image") {
                triggerLabel.textContent = "Foto de Fondo";
                if (currentTemplate && currentTemplate.bgImageSrc) {
                    triggerSwatch.style.background = `url("${currentTemplate.bgImageSrc}") center/cover no-repeat`;
                } else {
                    triggerSwatch.style.background = "#141619";
                }
            } else {
                const preset = (PRESET_THEMES && PRESET_THEMES[theme]) ? PRESET_THEMES[theme] : (PRESET_THEMES ? PRESET_THEMES["dark"] : { label: "Tema", bg: "#141619" });
                triggerLabel.textContent = preset ? preset.label : "Tema";
                triggerSwatch.style.background = preset ? preset.bg : "#141619";
            }

            document.querySelectorAll(".theme-dropdown-item").forEach(item => {
                item.classList.toggle("active", item.dataset.value === theme);
            });
        } catch (err) {
            console.warn("syncThemeDropdownUI error:", err);
        }
    }

    const themeDropdown = document.getElementById("theme-dropdown");
    const themeDropdownTrigger = document.getElementById("theme-dropdown-trigger");
    const themeDropdownMenu = document.getElementById("theme-dropdown-menu");

    if (themeDropdownTrigger && themeDropdownMenu) {
        themeDropdownTrigger.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = themeDropdownMenu.style.display === "flex";
            themeDropdownMenu.style.display = isOpen ? "none" : "flex";
        });

        document.querySelectorAll(".theme-dropdown-item").forEach(item => {
            item.addEventListener("click", (e) => {
                e.stopPropagation();
                const val = item.dataset.value;
                themeDropdownMenu.style.display = "none";
                if (themeSelect) {
                    themeSelect.value = val;
                    themeSelect.dispatchEvent(new Event("change"));
                }
                syncThemeDropdownUI(val);
            });
        });

        document.addEventListener("click", (e) => {
            if (themeDropdown && !themeDropdown.contains(e.target)) {
                themeDropdownMenu.style.display = "none";
            }
        });
    }

    // CARGA INICIAL
    initProjects();
    loadTemplateData("default");
    if (sidebarHeaderInput) autoResizeTextarea(sidebarHeaderInput);
    if (sidebarFooterInput) autoResizeTextarea(sidebarFooterInput);

    function adjustMockupScale() {
        // Handled directly by CSS scale(0.75) within .phone-wrapper
    }
    
    // Utilidad para posicionar el cursor al final del texto editable
    function placeCaretAtEnd(el) {
        if (!el) return;
        const sel = window.getSelection ? window.getSelection() : null;
        if (sel && !sel.isCollapsed && sel.toString().length > 0) {
            return; // Respetar la selección activa del usuario
        }
        el.focus();
        if (typeof window.getSelection !== "undefined" && typeof document.createRange !== "undefined") {
            try {
                const range = document.createRange();
                range.selectNodeContents(el);
                range.collapse(false);
                const s = window.getSelection();
                s.removeAllRanges();
                s.addRange(range);
            } catch (err) {}
        }
    }

    function checkTextEmptyState(el) {
        if (!el) return;
        const text = el.textContent.trim();
        if (!text || text === "") {
            el.setAttribute("data-empty", "true");
        } else {
            el.removeAttribute("data-empty");
        }
    }

    // FUNCIONES DE ARRASTRE (DRAG & DROP)
    function setupDraggable(el, key, index) {
        if (!el) return;
        el.addEventListener("mousedown", (e) => {
            // No arrastrar si se hace clic en texto editable o dentro de text-content
            if (e.target.closest("[contenteditable='true']") || e.target.closest(".text-content")) return;
            if (e.target.closest(".resize-handle")) return;
            
            e.preventDefault();
            const wasAlreadyActive = (currentProject.activeScreenIndex === index);
            if (!wasAlreadyActive) {
                selectScreen(index);
            }
            selectCard(key);
            
            const startY = e.clientY;
            const startTop = el.offsetTop;
            const startX = e.clientX;
            const startLeft = el.offsetLeft;
            
            // Escala del simulador para corregir la velocidad del cursor
            const scale = 0.75;
            let hasMoved = false;
            let rafId = null;
            let currentTop = startTop;
            let currentLeft = startLeft;
            el.classList.add("is-dragging");
            
            function onMouseMove(moveEvent) {
                const dyRaw = Math.abs(moveEvent.clientY - startY);
                const dxRaw = Math.abs(moveEvent.clientX - startX);
                if (dyRaw > 3 || dxRaw > 3) {
                    hasMoved = true;
                }
                const dy = (moveEvent.clientY - startY) / scale;
                const dx = (moveEvent.clientX - startX) / scale;
                
                const canvas = document.getElementById(`reel-canvas-${index}`);
                let top = startTop + dy;
                let left = startLeft + dx;
                
                // Límites de la pantalla del teléfono
                top = Math.max(10, Math.min(canvas.offsetHeight - el.offsetHeight - 10, top));
                if (key === 'header' || key === 'footer') {
                    left = 20; // Bloqueado al ancho y centrado del video
                } else if (key === 'media' || key === 'mediaBottom') {
                    left = Math.max(10, Math.round((canvas.offsetWidth - el.offsetWidth) / 2)); // Centrado horizontal
                } else {
                    left = Math.max(10, Math.min(canvas.offsetWidth - el.offsetWidth - 10, left));
                }
                
                currentTop = top;
                currentLeft = left;
                
                // Sincronizar actualización visual con el refresco de pantalla para evitar estelas o desgarros de GPU
                if (rafId) cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(() => {
                    el.style.top = top + "px";
                    el.style.left = left + "px";
                    el.style.bottom = "auto";
                });
                
                const screenData = currentProject.screens[index];
                if (key.startsWith('sticker_')) {
                    const sIdx = parseInt(key.split('_')[1], 10);
                    if(screenData.stickers && screenData.stickers[sIdx]) {
                        screenData.stickers[sIdx].top = top + "px";
                        screenData.stickers[sIdx].left = left + "px";
                    }
                } else {
                    if (!screenData.positions) screenData.positions = {};
                    screenData.positions[key] = {
                        top: top + "px",
                        left: (key === 'header' || key === 'footer') ? "20px" : left + "px"
                    };
                }
            }
            
            function onMouseUp(upEvent) {
                if (rafId) cancelAnimationFrame(rafId);
                el.classList.remove("is-dragging");
                if (hasMoved) {
                    el.style.top = currentTop + "px";
                    el.style.left = currentLeft + "px";
                    el.style.bottom = "auto";
                }
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
                saveTemplateQuietly();

                // Si fue un clic simple sin arrastrar en la tarjeta de texto
                if (!hasMoved && (key === 'header' || key === 'footer')) {
                    const hasSelection = window.getSelection && !window.getSelection().isCollapsed && window.getSelection().toString().length > 0;
                    if (!upEvent?.target?.closest(".resize-handle") && !upEvent?.target?.closest(".text-content") && !hasSelection) {
                        if (document.activeElement && document.activeElement !== document.body) {
                            document.activeElement.blur();
                        }
                        const textEl = el.querySelector(".text-content");
                        if (textEl && (!textEl.textContent.trim() || textEl.getAttribute("data-empty") === "true")) {
                            placeCaretAtEnd(textEl);
                        }
                    }
                }
                
                // Si fue un clic simple en el video (sin arrastrar y no sobre placeholder)
                if (!hasMoved && key === 'media') {
                    const isPlaceholder = upEvent && upEvent.target && upEvent.target.closest('.media-placeholder');
                    const targetScreen = currentProject.screens[index];
                    if (!isPlaceholder && targetScreen && targetScreen.mediaType === 'video' && targetScreen.mediaSrc) {
                        // Si ya era la pantalla activa, alternar pausa/reproducción
                        // Si era una pantalla inactiva, selectScreen(index) ya la puso a reproducir
                        if (wasAlreadyActive) {
                            togglePlayPause();
                        }
                    }
                }
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
                        if (key.startsWith('sticker_')) {
                            cardEl.style.width = newWidthPx + "px";
                            const sIdx = parseInt(key.split('_')[1], 10);
                            if(screenData.stickers && screenData.stickers[sIdx]) {
                                screenData.stickers[sIdx].width = newWidthPx + "px";
                            }
                        } else if (key === 'logo') {
                            cardEl.style.width = newWidthPx + "px";
                            screenData.logoSize = newWidthPx;
                        } else {
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
                    }
                    
                    // Ajuste Alto (Vertical hacia abajo)
                    if (isBottom || isCorner) {
                        let newHeightPx = startHeight + dy;
                        
                        if (key.startsWith('sticker_') && isCorner) {
                            let newWidthPx = startWidth + dx;
                            newHeightPx = newWidthPx * (startHeight / startWidth);
                        }
                        
                        newHeightPx = Math.max(40, newHeightPx);
                        
                        cardEl.style.height = newHeightPx + "px";
                        
                        if (key.startsWith('sticker_')) {
                            const sIdx = parseInt(key.split('_')[1], 10);
                            if(screenData.stickers && screenData.stickers[sIdx]) {
                                screenData.stickers[sIdx].height = newHeightPx + "px";
                            }
                        } else if (key === 'logo') {
                            screenData.logoSize = newHeightPx;
                        } else {
                            if (!screenData.styles) screenData.styles = {};
                            if (!screenData.styles[key]) screenData.styles[key] = { color: "#ffffff", boxColor: "#000000", opacity: 85, width: 85 };
                            screenData.styles[key].height = newHeightPx;
                        }
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
                            
                            if (key.startsWith('sticker_')) {
                                const sIdx = parseInt(key.split('_')[1], 10);
                                if(screenData.stickers && screenData.stickers[sIdx]) {
                                    screenData.stickers[sIdx].top = newTopPx + "px";
                                    screenData.stickers[sIdx].height = newHeightPx + "px";
                                }
                            } else if (key === 'logo') {
                                screenData.logoSize = newHeightPx;
                                if (!screenData.positions) screenData.positions = {};
                                if (!screenData.positions[key]) screenData.positions[key] = {};
                                screenData.positions[key].top = newTopPx + "px";
                            } else {
                                if (!screenData.positions) screenData.positions = {};
                                if (!screenData.positions[key]) screenData.positions[key] = {};
                                screenData.positions[key].top = newTopPx + "px";
                                
                                if (!screenData.styles) screenData.styles = {};
                                if (!screenData.styles[key]) screenData.styles[key] = { color: "#ffffff", boxColor: "#000000", opacity: 85, width: 85 };
                                screenData.styles[key].height = newHeightPx;
                            }
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
        
        // Limpiar estilos de selección en canvas
        document.querySelectorAll(".text-card").forEach(c => c.classList.remove("card-selected-highlight"));
        document.querySelectorAll(".media-container").forEach(c => c.classList.remove("card-selected-highlight"));
        document.querySelectorAll(".logo-card").forEach(c => c.classList.remove("card-selected-highlight"));
        document.querySelectorAll(".sticker-card").forEach(c => c.classList.remove("card-selected-highlight"));
        document.querySelectorAll(".reel-canvas").forEach(c => c.classList.remove("canvas-selected-highlight"));
        
        // Sincronizar botones de bloque en el panel lateral
        document.querySelectorAll(".card-target-btn").forEach(btn => {
            btn.classList.toggle("active", key ? btn.dataset.target === key : false);
        });

        // Limpiar resaltado previo en inputs del panel lateral y selector de fondo
        const sidebarHeaderGrp = document.getElementById("sidebar-header-group");
        const sidebarFooterGrp = document.getElementById("sidebar-footer-group");
        const themeTrigger = document.getElementById("theme-dropdown-trigger");
        const customColorWrap = document.getElementById("custom-color-wrapper");

        if (sidebarHeaderGrp) sidebarHeaderGrp.classList.remove("sidebar-text-group-active");
        if (sidebarFooterGrp) sidebarFooterGrp.classList.remove("sidebar-text-group-active");
        if (themeTrigger) themeTrigger.classList.remove("sidebar-bg-active-highlight");
        if (customColorWrap) customColorWrap.classList.remove("sidebar-bg-active-highlight");

        // Si key es null o vacio (ej. clic fuera del telefono), deseleccionar todo y salir
        if (!key) {
            if (fontSizeSlider) fontSizeSlider.disabled = true;
            if (fontSizeLabel) fontSizeLabel.textContent = "Tamaño: Selecciona un bloque";
            if (boxWidthSlider) boxWidthSlider.disabled = true;
            if (boxWidthLabel) boxWidthLabel.textContent = "Ancho de Caja: Selecciona un bloque";
            syncAdjustButtonsState();
            return;
        }

        if (key === "background") {
            // 1. Resaltar visualmente el lienzo en el canvas
            const currentCanvas = document.getElementById(`reel-canvas-${currentProject.activeScreenIndex}`) || reelCanvas;
            if (currentCanvas) currentCanvas.classList.add("canvas-selected-highlight");

            // 2. Auto-desplegar la sección de Fondo ('apariencia') si está colapsada
            const aparienciaSection = document.querySelector('.sidebar-section[data-section="apariencia"]');
            if (aparienciaSection && !aparienciaSection.classList.contains("open")) {
                aparienciaSection.classList.add("open");
                try {
                    localStorage.setItem("sidebar_section_apariencia", "open");
                } catch (err) {}
            }

            // 3. Resaltar visualmente el selector de temas y color en la barra lateral
            if (themeTrigger) {
                themeTrigger.classList.add("sidebar-bg-active-highlight");
                try {
                    themeTrigger.scrollIntoView({ behavior: "smooth", block: "nearest" });
                } catch (e) {}
            }
            if (customColorWrap) {
                customColorWrap.classList.add("sidebar-bg-active-highlight");
            }

            if (fontSizeSlider) fontSizeSlider.disabled = true;
            if (fontSizeLabel) fontSizeLabel.textContent = "Fondo Seleccionado";
            if (boxWidthSlider) boxWidthSlider.disabled = true;
            if (boxWidthLabel) boxWidthLabel.textContent = "Ancho de Caja: N/A";
            syncAdjustButtonsState();
            return;
        }

        if (key.startsWith("sticker_")) {
            fontSizeSlider.disabled = true;
            fontSizeLabel.textContent = "Tamaño: Pegatina";
            
            const idx = parseInt(key.split('_')[1], 10);
            const sCard = document.getElementById(`sticker-card-${currentProject.activeScreenIndex}-${idx}`);
            if (sCard) {
                sCard.classList.add("card-selected-highlight");
                
                boxWidthSlider.disabled = false;
                boxWidthSlider.min = 10;
                boxWidthSlider.max = 100;
                // Get current width or default to 40
                const currentWidth = parseFloat(sCard.style.width) || 40;
                boxWidthSlider.value = currentWidth;
                boxWidthLabel.textContent = "Tamaño Pegatina:";
                boxWidthVal.textContent = Math.round(currentWidth) + "%";
            } else {
                boxWidthSlider.disabled = true;
                boxWidthLabel.textContent = "Ancho de Caja: N/A";
            }
            
            syncAdjustButtonsState();
            return;
        }
        
        if (key === "media" || key === "mediaBottom") {
            currentUploadTarget = (key === "mediaBottom") ? "bottom" : "top";
            fontSizeSlider.disabled = true;
            fontSizeLabel.textContent = key === "media" ? "Formato: Video Superior" : "Formato: Video Inferior";
            boxWidthSlider.disabled = true;
            boxWidthLabel.textContent = "Ancho de Caja: Auto";
            if (key === "media" && mediaContainer) {
                mediaContainer.classList.add("card-selected-highlight");
            } else if (key === "mediaBottom") {
                const mBottom = document.getElementById(`media-container-bottom-${currentProject.activeScreenIndex}`);
                if (mBottom) mBottom.classList.add("card-selected-highlight");
            }
            syncAdjustButtonsState();
            syncAspectRatioUI();
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

        // 1. Auto-desplegar la sección 'Texto y Tipografía' si está minimizada
        const textoSection = document.querySelector('.sidebar-section[data-section="texto"]');
        if (textoSection && !textoSection.classList.contains("open")) {
            textoSection.classList.add("open");
            try {
                localStorage.setItem("sidebar_section_texto", "open");
            } catch (err) {}
        }

        // 2. Resaltar visualmente el grupo de entrada correspondiente en la barra lateral
        const activeGroup = (key === "header") ? sidebarHeaderGrp : sidebarFooterGrp;
        if (activeGroup) {
            activeGroup.classList.add("sidebar-text-group-active");
            try {
                activeGroup.scrollIntoView({ behavior: "smooth", block: "nearest" });
            } catch (e) {}
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
        
        boxWidthSlider.disabled = true;
        boxWidthLabel.textContent = `Ancho: Fijo (Alineado al Video)`;
        boxWidthVal.textContent = "100%";
        
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
    
    // Delegación global: Doble clic en cualquier contenedor de media o clic en placeholder abre explorador de archivos
    document.addEventListener("dblclick", (e) => {
        const mc = e.target.closest(".media-container");
        if (mc) {
            const isBottom = mc.id.includes("-bottom-") || mc.dataset.mediaTarget === "bottom";
            currentUploadTarget = isBottom ? "bottom" : "top";
            const match = mc.id.match(/media-container-(?:bottom-)?(\d+)/);
            if (match) {
                const idx = parseInt(match[1], 10);
                selectScreen(idx);
                selectCard(isBottom ? "mediaBottom" : "media");
            }
            if (mediaInput) {
                mediaInput.value = "";
                mediaInput.click();
            }
        }
    });

    document.addEventListener("click", (e) => {
        const ph = e.target.closest(".media-placeholder");
        if (ph) {
            const mc = ph.closest(".media-container");
            if (mc) {
                const isBottom = mc.id.includes("-bottom-") || mc.dataset.mediaTarget === "bottom";
                currentUploadTarget = isBottom ? "bottom" : "top";
                const match = mc.id.match(/media-container-(?:bottom-)?(\d+)/);
                if (match) {
                    const idx = parseInt(match[1], 10);
                    selectScreen(idx);
                    selectCard(isBottom ? "mediaBottom" : "media");
                }
            }
            if (mediaInput) {
                mediaInput.value = "";
                mediaInput.click();
            }
        }
    });

    
    // Función unificada para cargar video o imagen en el contenedor 1:1 de una pantalla
    async function loadMediaFile(file, screenIndex, targetSlot) {
        if (!file) return;
        const targetIndex = (typeof screenIndex === 'number') ? screenIndex : currentProject.activeScreenIndex;
        const targetScreen = currentProject.screens[targetIndex];
        if (!targetScreen) return;

        const slot = targetSlot || currentUploadTarget || "top";
        const fileURL = URL.createObjectURL(file);
        const isVideo = file.type.startsWith("video/");

        try {
            if (slot === "bottom") {
                targetScreen.mediaBottomType = isVideo ? "video" : "image";
                targetScreen.mediaBottomSrc = fileURL;
            } else {
                targetScreen.mediaType = isVideo ? "video" : "image";
                targetScreen.mediaSrc = fileURL;
                targetScreen.fixedFrameTime = null;
            }

            if (targetIndex === currentProject.activeScreenIndex) {
                currentTemplate = targetScreen;
                if (slot === "top") rawVideoFile = isVideo ? file : null;
                const hasAnyVideo = targetScreen.mediaType === "video" || targetScreen.mediaBottomType === "video";
                if (playPauseBtn) playPauseBtn.disabled = !hasAnyVideo;
                if (muteBtn) muteBtn.disabled = !hasAnyVideo;
            }

            applyScreenMedia(targetIndex);
            saveTemplateQuietly();

            // Subir de forma persistente en segundo plano
            const uploadRes = await fetch('/api/upload-media', {
                method: 'POST',
                headers: { 'Content-Type': file.type },
                body: file
            });

            if (uploadRes.ok) {
                const resData = await uploadRes.json();
                if (slot === "bottom") {
                    targetScreen.mediaBottomSrc = resData.url;
                } else {
                    targetScreen.mediaSrc = resData.url;
                }
                console.log("[Editor] Media (" + slot + ") guardado de forma persistente:", resData.url);
                
                const videoEl = document.getElementById(slot === "bottom" ? `reel-video-bottom-${targetIndex}` : `reel-video-${targetIndex}`);
                if (videoEl) {
                    videoEl.dataset.serverUrl = resData.url;
                }

                // Si el video dio error al reproducirse con el blob local (ej. codec HEVC/MOV), recargar con version H.264 convertida
                if (isVideo && videoEl && (videoEl.error || videoEl.networkState === HTMLMediaElement.NETWORK_NO_SOURCE)) {
                    console.log("[Editor] Video local no soportado directamente por el navegador, aplicando version H.264 convertida");
                    applyScreenMedia(targetIndex);
                }
                saveTemplateQuietly();
            }
        } catch (err) {
            console.error("[Editor] Error cargando media:", err);
        }
    }

    // Soporte de Arrastrar y Soltar (Drag & Drop) sobre el contenedor central 1:1
    document.addEventListener("dragover", (e) => {
        const mc = e.target.closest(".media-container");
        if (mc) {
            e.preventDefault();
            mc.style.outline = "3px dashed #10b981";
        }
    });

    document.addEventListener("dragleave", (e) => {
        const mc = e.target.closest(".media-container");
        if (mc) {
            mc.style.outline = "";
        }
    });

    document.addEventListener("drop", (e) => {
        const mc = e.target.closest(".media-container");
        if (mc) {
            e.preventDefault();
            mc.style.outline = "";
            const match = mc.id.match(/media-container-(\d+)/);
            const idx = match ? parseInt(match[1], 10) : currentProject.activeScreenIndex;
            selectScreen(idx);
            selectCard("media");
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
                loadMediaFile(e.dataTransfer.files[0], idx);
            }
        }
    });

    mediaInput.addEventListener("change", (e) => loadMediaFile(e.target.files[0]));

    // CARGA DE PEGATINAS / IMÁGENES FLOTANTES (botón unificado)
    stickerInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            const compressedSrc = await compressImage(event.target.result, 800, 0.8);
            const screenData = currentProject.screens[currentProject.activeScreenIndex];
            if (!screenData.stickers) screenData.stickers = [];
            
            // Generate a random ID
            const sId = 'sticker-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
            
            screenData.stickers.push({
                src: compressedSrc,
                width: '40%',
                height: 'auto',
                top: '30%',
                left: '30%',
                id: sId
            });
            saveTemplateQuietly();
            renderScreens();
            
            // Habilitar botón "Editar última"
            const editLastStickerBtn = document.getElementById('edit-last-sticker-btn');
            if (editLastStickerBtn) editLastStickerBtn.disabled = false;
            
            // Limpiar input para permitir seleccionar el mismo archivo de nuevo
            stickerInput.value = "";
        };
        reader.readAsDataURL(file);
    });

    // CARGA DE LOGO FLOTANTE
    logoInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            currentTemplate.logoSrc = await compressImage(event.target.result, 400, 0.8);
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

    // =========================================================
    // RAMA 1: CONTROLES DE REPRODUCCIÓN, LÍNEA DE TIEMPO Y PAUSA
    // =========================================================

    function formatVideoTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return "00:00.0";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const dec = Math.floor((seconds % 1) * 10);
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${dec}`;
    }

    function updateVideoIndicator(index) {
        const targetIndex = index !== undefined ? index : currentProject.activeScreenIndex;
        const vid = document.getElementById(`reel-video-${targetIndex}`);
        const indicator = document.getElementById(`video-indicator-${targetIndex}`);
        if (!indicator) return;

        const screenData = currentProject.screens[targetIndex];
        const hasVideo = screenData && screenData.mediaType === "video" && screenData.mediaSrc;

        if (hasVideo && vid && vid.paused && targetIndex === currentProject.activeScreenIndex) {
            indicator.innerHTML = '<i class="fa-solid fa-pause"></i>';
            indicator.classList.add("paused-visible");
        } else {
            indicator.classList.remove("paused-visible");
        }
    }

    function updatePlayPauseUI() {
        if (!reelVideo) return;
        const isPaused = reelVideo.paused;
        if (playPauseBtn) {
            playPauseBtn.innerHTML = isPaused 
                ? '<i class="fa-solid fa-play"></i> Reproducir' 
                : '<i class="fa-solid fa-pause"></i> Pausar';
        }
        if (bottomPlayBtn) {
            bottomPlayBtn.innerHTML = isPaused 
                ? '<i class="fa-solid fa-play"></i>' 
                : '<i class="fa-solid fa-pause"></i>';
        }
        if (bottomMuteBtn) {
            bottomMuteBtn.innerHTML = reelVideo.muted 
                ? '<i class="fa-solid fa-volume-xmark"></i>' 
                : '<i class="fa-solid fa-volume-high"></i>';
        }
        updateVideoIndicator(currentProject.activeScreenIndex);
        syncBgAnimationWithPlayback(isPaused);
    }

    function syncBgAnimationWithPlayback(isPaused) {
        document.querySelectorAll(".reel-canvas").forEach(c => {
            if (isPaused) {
                c.classList.add("bg-paused");
            } else {
                c.classList.remove("bg-paused");
            }
        });
        if (window.ReelsWaterShader) {
            if (isPaused) {
                window.ReelsWaterShader.pause();
            } else {
                window.ReelsWaterShader.play();
            }
        }
    }

    function togglePlayPause() {
        const hasTopVideo = reelVideo && currentTemplate && currentTemplate.mediaType === "video" && currentTemplate.mediaSrc;
        const vidBottom = document.getElementById(`reel-video-bottom-${currentProject.activeScreenIndex}`);
        const hasBottomVideo = vidBottom && currentTemplate && currentTemplate.mediaBottomType === "video" && currentTemplate.mediaBottomSrc;

        if (!hasTopVideo && !hasBottomVideo) return;

        const isPaused = (hasTopVideo ? reelVideo.paused : true) && (hasBottomVideo ? vidBottom.paused : true);

        if (isPaused) {
            if (currentTemplate.fixedFrameTime !== undefined && currentTemplate.fixedFrameTime !== null) {
                currentTemplate.fixedFrameTime = null;
                saveTemplateQuietly();
                syncTimelineControls();
            }
            if (hasTopVideo) {
                reelVideo.muted = true;
                reelVideo.play().catch(err => console.log("Top play blocked:", err));
            }
            if (hasBottomVideo) {
                vidBottom.muted = true;
                vidBottom.play().catch(err => console.log("Bottom play blocked:", err));
            }
            updatePlayPauseUI();
        } else {
            if (hasTopVideo) reelVideo.pause();
            if (hasBottomVideo) vidBottom.pause();
            updatePlayPauseUI();
        }
    }

    function syncTimelineControls() {
        const hasVideo = currentTemplate && currentTemplate.mediaType === "video" && currentTemplate.mediaSrc;
        
        if (videoTimelineControls) {
            videoTimelineControls.style.display = hasVideo ? "block" : "none";
        }
        if (bottomPlayerDock) {
            bottomPlayerDock.style.display = hasVideo ? "flex" : "none";
        }

        if (hasVideo && reelVideo) {
            const dur = reelVideo.duration || 0;
            const curTime = reelVideo.currentTime || 0;
            const timeStr = `${formatVideoTime(curTime)} / ${formatVideoTime(dur)}`;

            if (bottomScrubber) {
                bottomScrubber.max = dur > 0 ? dur : 100;
                if (!isScrubbing) {
                    bottomScrubber.value = curTime;
                }
            }
            if (bottomTimeDisplay) {
                bottomTimeDisplay.textContent = timeStr;
            }

            if (videoScrubber) {
                videoScrubber.max = dur > 0 ? dur : 100;
                if (!isScrubbing) videoScrubber.value = curTime;
            }
            if (videoTimeDisplay) {
                videoTimeDisplay.textContent = timeStr;
            }

            const isFrozen = currentTemplate.fixedFrameTime !== undefined && currentTemplate.fixedFrameTime !== null;
            if (isFrozen) {
                const frozenText = formatVideoTime(currentTemplate.fixedFrameTime);
                if (bottomFreezeBadge) {
                    bottomFreezeBadge.style.display = "inline-flex";
                    if (bottomFreezeTimeText) bottomFreezeTimeText.textContent = frozenText;
                }
                if (bottomUnfreezeBtn) bottomUnfreezeBtn.style.display = "inline-flex";
                if (bottomFreezeBtn) bottomFreezeBtn.style.display = "none";

                if (freezeStatusBadge) {
                    freezeStatusBadge.style.display = "block";
                    if (freezeTimeText) freezeTimeText.textContent = frozenText;
                }
                if (unfreezeFrameBtn) unfreezeFrameBtn.style.display = "inline-flex";
                if (freezeFrameBtn) freezeFrameBtn.style.display = "none";
            } else {
                if (bottomFreezeBadge) bottomFreezeBadge.style.display = "none";
                if (bottomUnfreezeBtn) bottomUnfreezeBtn.style.display = "none";
                if (bottomFreezeBtn) bottomFreezeBtn.style.display = "inline-flex";

                if (freezeStatusBadge) freezeStatusBadge.style.display = "none";
                if (unfreezeFrameBtn) unfreezeFrameBtn.style.display = "none";
                if (freezeFrameBtn) freezeFrameBtn.style.display = "inline-flex";
            }

            updatePlayPauseUI();
        }
    }

    if (playPauseBtn) {
        playPauseBtn.addEventListener("click", () => {
            togglePlayPause();
        });
    }

    if (muteBtn) {
        muteBtn.addEventListener("click", () => {
            if (!reelVideo) return;
            reelVideo.muted = !reelVideo.muted;
            muteBtn.innerHTML = reelVideo.muted 
                ? '<i class="fa-solid fa-volume-xmark"></i> Silenciar' 
                : '<i class="fa-solid fa-volume-high"></i> Sonido';
        });
    }

    if (videoScrubber) {
        videoScrubber.addEventListener("input", (e) => {
            isScrubbing = true;
            if (!reelVideo) return;
            const targetTime = parseFloat(e.target.value);
            reelVideo.currentTime = targetTime;
            if (videoTimeDisplay) {
                videoTimeDisplay.textContent = `${formatVideoTime(targetTime)} / ${formatVideoTime(reelVideo.duration || 0)}`;
            }
        });
        const stopScrub = () => { isScrubbing = false; };
        videoScrubber.addEventListener("change", stopScrub);
        videoScrubber.addEventListener("mouseup", stopScrub);
        videoScrubber.addEventListener("touchend", stopScrub);
    }

    if (stepBackBtn) {
        stepBackBtn.addEventListener("click", () => {
            if (!reelVideo) return;
            reelVideo.currentTime = Math.max(0, reelVideo.currentTime - 1);
            syncTimelineControls();
        });
    }

    if (stepForwardBtn) {
        stepForwardBtn.addEventListener("click", () => {
            if (!reelVideo) return;
            const maxTime = reelVideo.duration || 9999;
            reelVideo.currentTime = Math.min(maxTime, reelVideo.currentTime + 1);
            syncTimelineControls();
        });
    }

    if (freezeFrameBtn) {
        freezeFrameBtn.addEventListener("click", () => {
            if (!reelVideo || !currentTemplate) return;
            reelVideo.pause();
            currentTemplate.fixedFrameTime = reelVideo.currentTime;
            saveTemplateQuietly();
            syncTimelineControls();
            updatePlayPauseUI();
            updatePlayPauseUI();
        });
    }

    if (unfreezeFrameBtn) {
        unfreezeFrameBtn.addEventListener("click", () => {
            if (!reelVideo || !currentTemplate) return;
            currentTemplate.fixedFrameTime = null;
            saveTemplateQuietly();
            syncTimelineControls();
            reelVideo.play().catch(() => {});
            updatePlayPauseUI();
        });
    }

    // Atajo de teclado: Barra espaciadora para reproducir/pausar
    document.addEventListener("keydown", (e) => {
        if (e.code === "Space" || e.key === " ") {
            const active = document.activeElement;
            const isEditable = active && (
                active.tagName === "INPUT" || 
                active.tagName === "TEXTAREA" || 
                active.tagName === "SELECT" || 
                active.isContentEditable || 
                active.closest("[contenteditable='true']")
            );
            if (isEditable) return;
            
            if (currentTemplate && currentTemplate.mediaType === "video" && reelVideo && reelVideo.src) {
                e.preventDefault();
                togglePlayPause();
            }
        }
    });

    // Función para desplazar la caja activa con precisión
    function shiftActiveCard(dx, dy) {
        const screenIdx = (currentProject && typeof currentProject.activeScreenIndex === "number") 
            ? currentProject.activeScreenIndex 
            : 0;
        const screenData = currentProject?.screens?.[screenIdx] || currentTemplate;
        if (!screenData) return;

        let key = activeCardKey || "header";
        // Si la caja seleccionada está oculta, reubicar a una visible
        if (key === "header" && screenData.showHeaderCard === false) {
            if (screenData.showFooterCard !== false) key = "footer";
            else key = "media";
        } else if (key === "footer" && screenData.showFooterCard === false) {
            if (screenData.showHeaderCard !== false) key = "header";
            else key = "media";
        }

        let targetEl = null;
        if (key === "header") {
            targetEl = document.getElementById(`header-card-${screenIdx}`) || headerCard;
        } else if (key === "footer") {
            targetEl = document.getElementById(`footer-card-${screenIdx}`) || footerCard;
        } else if (key === "logo") {
            targetEl = document.getElementById(`logo-card-${screenIdx}`) || logoCard;
        } else if (key === "media") {
            targetEl = document.getElementById(`media-container-${screenIdx}`) || mediaContainer;
        } else if (key === "mediaBottom") {
            targetEl = document.getElementById(`media-container-bottom-${screenIdx}`);
        } else if (key.startsWith("sticker_")) {
            const sIdx = parseInt(key.split('_')[1], 10);
            targetEl = document.getElementById(`sticker-card-${screenIdx}-${sIdx}`);
        }

        if (!targetEl || targetEl.style.display === "none") return;

        const canvas = document.getElementById(`reel-canvas-${screenIdx}`) || reelCanvas;
        if (!canvas) return;

        // Asegurar que la caja tenga el borde visual de selección activo
        if (!targetEl.classList.contains("card-selected-highlight")) {
            selectCard(key);
        }

        let currentTop = parseFloat(targetEl.style.top);
        if (isNaN(currentTop)) currentTop = targetEl.offsetTop;
        
        let currentLeft = parseFloat(targetEl.style.left);
        if (isNaN(currentLeft)) currentLeft = targetEl.offsetLeft;

        let newTop = currentTop + dy;
        let newLeft = currentLeft + dx;

        // Límites de la pantalla del teléfono
        newTop = Math.max(10, Math.min(canvas.offsetHeight - targetEl.offsetHeight - 10, newTop));

        if (key === 'header' || key === 'footer') {
            newLeft = 20; // Alineado y centrado fijo
        } else if (key === 'media' || key === 'mediaBottom') {
            newLeft = Math.max(10, Math.round((canvas.offsetWidth - targetEl.offsetWidth) / 2));
        } else {
            newLeft = Math.max(10, Math.min(canvas.offsetWidth - targetEl.offsetWidth - 10, newLeft));
        }

        targetEl.style.top = Math.round(newTop) + "px";
        targetEl.style.left = Math.round(newLeft) + "px";
        targetEl.style.bottom = "auto";

        if (key.startsWith('sticker_')) {
            const sIdx = parseInt(key.split('_')[1], 10);
            if (screenData.stickers && screenData.stickers[sIdx]) {
                screenData.stickers[sIdx].top = Math.round(newTop) + "px";
                screenData.stickers[sIdx].left = Math.round(newLeft) + "px";
            }
        } else {
            if (!screenData.positions) screenData.positions = {};
            screenData.positions[key] = {
                top: Math.round(newTop) + "px",
                left: (key === 'header' || key === 'footer') ? "20px" : Math.round(newLeft) + "px"
            };
        }

        if (currentTemplate) {
            if (!currentTemplate.positions) currentTemplate.positions = {};
            currentTemplate.positions[key] = {
                top: Math.round(newTop) + "px",
                left: (key === 'header' || key === 'footer') ? "20px" : Math.round(newLeft) + "px"
            };
        }

        saveTemplateQuietly();
    }

    // Tecla Escape para salir de edición de texto y habilitar movimiento con flechas
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (document.activeElement && document.activeElement !== document.body) {
                document.activeElement.blur();
            }
        }
    });

    // Atajo de teclado: Flechas de dirección para deslazar cajas activas (arriba, abajo, izq, der)
    document.addEventListener("keydown", (e) => {
        const arrowKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
        if (!arrowKeys.includes(e.key)) return;

        // No desplazar si hay un modal de edición de sticker activo
        const stickerEditor = document.getElementById("sticker-editor-overlay");
        if (stickerEditor && (stickerEditor.classList.contains("active") || stickerEditor.style.display === "flex")) {
            return;
        }

        const active = document.activeElement;
        const isEditable = active && (
            active.tagName === "INPUT" || 
            active.tagName === "TEXTAREA" || 
            active.tagName === "SELECT" || 
            active.isContentEditable || 
            Boolean(active.closest && active.closest("[contenteditable='true']"))
        );

        // Si está escribiendo dentro del texto editable, no interferir con las flechas de escritura
        // a menos que mantenga pulsado Alt (atajo intencional de posicionamiento)
        if (isEditable && !e.altKey) return;

        e.preventDefault(); // Prevenir scroll nativo del navegador

        let step = 5; // Desplazamiento base suave
        if (e.shiftKey) step = 15; // Desplazamiento rápido con Shift
        else if (e.altKey && !isEditable) step = 1; // Micro-ajuste milimétrico con Alt

        let dx = 0;
        let dy = 0;

        if (e.key === "ArrowUp") dy = -step;
        else if (e.key === "ArrowDown") dy = step;
        else if (e.key === "ArrowLeft") dx = -step;
        else if (e.key === "ArrowRight") dx = step;

        shiftActiveCard(dx, dy);
    });

    // Listeners para la barra flotante de reproducción inferior
    if (bottomPlayBtn) {
        bottomPlayBtn.addEventListener("click", () => {
            togglePlayPause();
        });
    }

    if (bottomStepBackBtn) {
        bottomStepBackBtn.addEventListener("click", () => {
            if (!reelVideo) return;
            reelVideo.currentTime = Math.max(0, reelVideo.currentTime - 1);
            syncTimelineControls();
        });
    }

    if (bottomStepFwdBtn) {
        bottomStepFwdBtn.addEventListener("click", () => {
            if (!reelVideo) return;
            const maxTime = reelVideo.duration || 9999;
            reelVideo.currentTime = Math.min(maxTime, reelVideo.currentTime + 1);
            syncTimelineControls();
        });
    }

    if (bottomMuteBtn) {
        bottomMuteBtn.addEventListener("click", () => {
            if (!reelVideo) return;
            reelVideo.muted = !reelVideo.muted;
            if (muteBtn) {
                muteBtn.innerHTML = reelVideo.muted 
                    ? '<i class="fa-solid fa-volume-xmark"></i> Silenciar' 
                    : '<i class="fa-solid fa-volume-high"></i> Sonido';
            }
            updatePlayPauseUI();
        });
    }

    if (bottomScrubber) {
        bottomScrubber.addEventListener("input", (e) => {
            isScrubbing = true;
            if (!reelVideo) return;
            const targetTime = parseFloat(e.target.value);
            reelVideo.currentTime = targetTime;
            if (bottomTimeDisplay) {
                bottomTimeDisplay.textContent = `${formatVideoTime(targetTime)} / ${formatVideoTime(reelVideo.duration || 0)}`;
            }
        });
        const stopScrub = () => { isScrubbing = false; };
        bottomScrubber.addEventListener("change", stopScrub);
        bottomScrubber.addEventListener("mouseup", stopScrub);
        bottomScrubber.addEventListener("touchend", stopScrub);
    }

    if (bottomFreezeBtn) {
        bottomFreezeBtn.addEventListener("click", () => {
            if (!reelVideo || !currentTemplate) return;
            reelVideo.pause();
            currentTemplate.fixedFrameTime = reelVideo.currentTime;
            saveTemplateQuietly();
            syncTimelineControls();
            updatePlayPauseUI();
            updatePlayPauseUI();
        });
    }

    
    // Sincronizar botones de proporción de aspecto (1:1, 4:5, 9:16, 16:9)
    function syncAspectRatioUI() {
        const isBottom = (activeCardKey === "mediaBottom");
        const ratio = isBottom 
            ? (currentTemplate?.mediaBottomRatio || "1:1") 
            : (currentTemplate?.mediaRatio || "1:1");

        document.querySelectorAll(".aspect-btn").forEach(btn => {
            if (btn.dataset.ratio === ratio) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });
        const currentLabelEl = document.getElementById("aspect-dropdown-current");
        if (currentLabelEl) {
            const labelMap = {
                "1:1": "1:1 (Cuadrado)",
                "4:5": "4:5 (Retrato)",
                "9:16": "9:16 (Vertical)",
                "16:9": "16:9 (Horizontal)"
            };
            const prefix = isBottom ? "[Inferior] " : (currentTemplate?.layout === "split_dual" ? "[Superior] " : "");
            currentLabelEl.textContent = prefix + (labelMap[ratio] || ratio);
        }
    }

    document.querySelectorAll(".aspect-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const ratio = btn.dataset.ratio;
            if (!currentTemplate) return;
            if (activeCardKey === "mediaBottom") {
                currentTemplate.mediaBottomRatio = ratio;
            } else {
                currentTemplate.mediaRatio = ratio;
            }
            applyScreenMedia(currentProject.activeScreenIndex);
            syncAspectRatioUI();
            saveTemplateQuietly();
        });
    });

    if (bottomUnfreezeBtn) {
        bottomUnfreezeBtn.addEventListener("click", () => {
            if (!reelVideo || !currentTemplate) return;
            currentTemplate.fixedFrameTime = null;
            saveTemplateQuietly();
            syncTimelineControls();
            reelVideo.play().catch(() => {});
            updatePlayPauseUI();
        });
    }


    // TEMAS Y COLORES DE FONDO
    function updateBgImageUI() {
        if (!bgImageWrapper) return;
        const currentScreen = currentProject.screens[currentProject.activeScreenIndex];
        const hasBgImage = currentScreen && currentScreen.bgImageSrc;
        const uploadLabel = bgImageWrapper.querySelector('label[for="bg-image-input"]');
        const statusBadge = document.getElementById("bg-image-status-badge");
        
        if (hasBgImage) {
            if (uploadLabel) uploadLabel.style.display = "none";
            if (bgImageActions) bgImageActions.style.display = "flex";
            if (bgImageThumb) {
                bgImageThumb.style.backgroundImage = `url("${currentScreen.bgImageSrc}")`;
            }
            if (statusBadge) {
                statusBadge.textContent = "Activa";
                statusBadge.style.color = "#10b981";
            }
            if (bgEffectGroup) bgEffectGroup.style.display = "block";
        } else {
            if (uploadLabel) uploadLabel.style.display = "flex";
            if (bgImageBtnText) bgImageBtnText.textContent = "Subir Foto de Fondo";
            if (bgImageActions) bgImageActions.style.display = "none";
            if (statusBadge) {
                statusBadge.textContent = "(opcional)";
                statusBadge.style.color = "#64748b";
            }
            if (bgEffectGroup) bgEffectGroup.style.display = "none";
        }
        if (bgEffectSelect && currentScreen) {
            bgEffectSelect.value = currentScreen.bgEffect || "none";
        }
    }

    themeSelect.addEventListener("change", (e) => {
        const theme = e.target.value;
        currentTemplate.theme = theme;
        
        // Quitar temas anteriores
        reelCanvas.className = "reel-canvas";
        
        if (theme === "custom") {
            reelCanvas.style.background = bgColorPicker ? bgColorPicker.value : (currentTemplate.customColor || "#141414");
        } else if (theme === "image") {
            if (currentTemplate.bgImageSrc) {
                reelCanvas.style.background = `url("${currentTemplate.bgImageSrc}") center/cover no-repeat`;
            } else {
                reelCanvas.classList.add("theme-dark");
                reelCanvas.style.background = "";
            }
        } else {
            reelCanvas.classList.add(`theme-${theme}`);
            reelCanvas.style.background = "";
        }
        updateBgImageUI();
        syncThemeDropdownUI(theme);
        updateActiveBgAnimation();
        saveTemplateQuietly();
    });

    if (bgEffectSelect) {
        bgEffectSelect.addEventListener("change", (e) => {
            const effect = e.target.value;
            const currentScreen = currentProject.screens[currentProject.activeScreenIndex];
            if (currentScreen) {
                currentScreen.bgEffect = effect;
            }
            currentTemplate.bgEffect = effect;
            const index = currentProject.activeScreenIndex;
            const canvas = document.getElementById(`reel-canvas-${index}`);
            updateActiveBgAnimation();
            saveTemplateQuietly();
        });
    }

    if (bgImageInput) {
        bgImageInput.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const targetIndex = currentProject.activeScreenIndex;
                const targetScreen = currentProject.screens[targetIndex];

                const reader = new FileReader();
                reader.onload = async (event) => {
                    const compressedBase64 = await compressImage(event.target.result, 1080, 0.85);
                    targetScreen.theme = "image";
                    targetScreen.bgImageSrc = compressedBase64;
                    currentTemplate.theme = "image";
                    currentTemplate.bgImageSrc = compressedBase64;
                    themeSelect.value = "image";
                    
                    const canvas = document.getElementById(`reel-canvas-${targetIndex}`);
                    if (canvas) {
                        const effect = targetScreen.bgEffect || "none";
                        canvas.className = `reel-canvas ${effect !== 'none' ? 'bg-effect-' + effect : ''}`;
                        canvas.style.background = `url("${compressedBase64}") center/cover no-repeat`;
                    }
                    updateBgImageUI();
        syncThemeDropdownUI(currentTemplate.theme);
                    saveTemplateQuietly();
                };
                reader.readAsDataURL(file);

                const uploadRes = await fetch('/api/upload-media', {
                    method: 'POST',
                    headers: { 'Content-Type': file.type },
                    body: file
                });

                if (uploadRes.ok) {
                    const resData = await uploadRes.json();
                    targetScreen.bgImageSrc = resData.url;
                    currentTemplate.bgImageSrc = resData.url;
                    updateActiveBgAnimation();
                    saveTemplateQuietly();
                }
            } catch (err) {
                console.error("[Editor] Error cargando foto de fondo:", err);
            }
        });
    }

    if (removeBgImageBtn) {
        removeBgImageBtn.addEventListener("click", () => {
            const targetIndex = currentProject.activeScreenIndex;
            const targetScreen = currentProject.screens[targetIndex];
            targetScreen.bgImageSrc = null;
            targetScreen.theme = "dark";
            themeSelect.value = "dark";
            if (customColorWrapper) customColorWrapper.style.display = "none";
            
            const canvas = document.getElementById(`reel-canvas-${targetIndex}`);
            if (canvas) {
                canvas.className = "reel-canvas theme-dark";
                canvas.style.background = "";
            }
            updateBgImageUI();
        syncThemeDropdownUI(currentTemplate.theme);
            updateActiveBgAnimation();
            saveTemplateQuietly();
        });
    }

    if (changeBgImageBtn) {
        changeBgImageBtn.addEventListener("click", () => {
            if (bgImageInput) {
                bgImageInput.value = "";
                bgImageInput.click();
            }
        });
    }

    if (bgColorPicker) {
        bgColorPicker.addEventListener("input", (e) => {
            const val = e.target.value;
            currentTemplate.theme = "custom";
            currentTemplate.customColor = val;
            if (bgColorHex) bgColorHex.textContent = val;
            
            // Aplicar color liso y limpiar clases de tema preestablecido
            reelCanvas.className = "reel-canvas";
            reelCanvas.style.background = val;
            
            if (themeSelect) themeSelect.value = "custom";
            syncThemeDropdownUI("custom");
            saveTemplateQuietly();
        });
    }

    // --- GESTIÓN DE COLORES DE FONDO GUARDADOS ---
    const SAVED_BG_COLORS_KEY = 'reels_saved_bg_colors_list';
    const saveBgColorBtn = document.getElementById('save-bg-color-btn');
    const savedBgColorsContainer = document.getElementById('saved-bg-colors-container');
    const savedBgColorsList = document.getElementById('saved-bg-colors-list');

    function getSavedBgColors() {
        try {
            const saved = localStorage.getItem(SAVED_BG_COLORS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {}
        return [];
    }

    function renderSavedBgColors() {
        if (!savedBgColorsContainer || !savedBgColorsList) return;
        const colors = getSavedBgColors();
        if (colors.length === 0) {
            savedBgColorsContainer.style.display = "none";
            savedBgColorsList.innerHTML = "";
            return;
        }

        savedBgColorsContainer.style.display = "block";
        savedBgColorsList.innerHTML = "";

        colors.forEach((hex, idx) => {
            const swatch = document.createElement("button");
            swatch.type = "button";
            swatch.className = "saved-color-swatch";
            swatch.style.cssText = `width: 24px; height: 24px; border-radius: 6px; background-color: ${hex}; border: 1.5px solid rgba(255,255,255,0.3); cursor: pointer; transition: transform 0.15s, border-color 0.15s; flex-shrink: 0; padding: 0; outline: none;`;
            swatch.title = `${hex} (Clic para usar, clic derecho para eliminar)`;

            swatch.addEventListener("mouseenter", () => {
                swatch.style.transform = "scale(1.2)";
                swatch.style.borderColor = "#ffffff";
            });
            swatch.addEventListener("mouseleave", () => {
                swatch.style.transform = "scale(1)";
                swatch.style.borderColor = "rgba(255,255,255,0.3)";
            });

            // Clic para aplicar el color
            swatch.addEventListener("click", () => {
                currentTemplate.theme = "custom";
                currentTemplate.customColor = hex;
                if (bgColorPicker) bgColorPicker.value = hex;
                if (bgColorHex) bgColorHex.textContent = hex;
                
                reelCanvas.className = "reel-canvas";
                reelCanvas.style.background = hex;
                if (themeSelect) themeSelect.value = "custom";
                syncThemeDropdownUI("custom");
                saveTemplateQuietly();
            });

            // Clic derecho para eliminar color
            swatch.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                let updated = getSavedBgColors().filter((_, i) => i !== idx);
                try {
                    localStorage.setItem(SAVED_BG_COLORS_KEY, JSON.stringify(updated));
                } catch (err) {}
                renderSavedBgColors();
            });

            savedBgColorsList.appendChild(swatch);
        });
    }

    if (saveBgColorBtn) {
        saveBgColorBtn.addEventListener("click", () => {
            const colorToSave = (bgColorPicker ? bgColorPicker.value : currentTemplate.customColor || "#141414").toLowerCase();
            let colors = getSavedBgColors();
            if (!colors.map(c => c.toLowerCase()).includes(colorToSave)) {
                colors.unshift(colorToSave);
                if (colors.length > 20) colors = colors.slice(0, 20);
                try {
                    localStorage.setItem(SAVED_BG_COLORS_KEY, JSON.stringify(colors));
                } catch (e) {}
                renderSavedBgColors();
            }
            
            // Feedback visual temporal en el botón
            const originalHtml = saveBgColorBtn.innerHTML;
            saveBgColorBtn.innerHTML = `<i class="fa-solid fa-check" style="color: #4ade80;"></i> Guardado`;
            setTimeout(() => {
                saveBgColorBtn.innerHTML = originalHtml;
            }, 1200);
        });
    }

    renderSavedBgColors();

    // FUENTE Y COLORES DE TEXTO INDIVIDUALES
    fontTitleSelect.addEventListener("change", (e) => {
        currentTemplate.fontTitle = e.target.value;
        headerCard.style.fontFamily = e.target.value;
        footerCard.style.fontFamily = e.target.value;
        saveTemplateQuietly();
    });

    colorTextPicker.addEventListener("input", (e) => {
        const key = (activeCardKey === "footer") ? "footer" : "header";
        activeCardKey = key;
        if (!currentTemplate.styles[key]) currentTemplate.styles[key] = {};
        currentTemplate.styles[key].color = e.target.value;
        
        // Actualización directa e instantánea en el DOM
        const activeCard = document.getElementById(`${key}-card-${currentProject.activeScreenIndex}`);
        if (activeCard) {
            activeCard.style.color = e.target.value;
            const textContent = activeCard.querySelector(".text-content");
            if (textContent) {
                textContent.style.color = e.target.value;
            }
        }
        
        applyScreenStyles(currentProject.activeScreenIndex);
        saveTemplateQuietly();
    });

    colorBoxPicker.addEventListener("input", (e) => {
        const key = (activeCardKey === "footer") ? "footer" : "header";
        activeCardKey = key;
        if (!currentTemplate.styles[key]) currentTemplate.styles[key] = {};
        currentTemplate.styles[key].boxColor = e.target.value;
        
        // Actualización directa e instantánea en el DOM
        const hex = e.target.value;
        const opacity = (currentTemplate.styles[key].opacity ?? 85) / 100;
        const r = parseInt(hex.slice(1, 3), 16) || 0;
        const g = parseInt(hex.slice(3, 5), 16) || 0;
        const b = parseInt(hex.slice(5, 7), 16) || 0;
        const rgba = `rgba(${r}, ${g}, ${b}, ${opacity})`;

        const activeCard = document.getElementById(`${key}-card-${currentProject.activeScreenIndex}`);
        if (activeCard) {
            activeCard.style.backgroundColor = rgba;
        }
        
        applyScreenStyles(currentProject.activeScreenIndex);
        saveTemplateQuietly();
    });

    boxOpacitySlider.addEventListener("input", (e) => {
        const key = (activeCardKey === "footer") ? "footer" : "header";
        activeCardKey = key;
        if (!currentTemplate.styles[key]) currentTemplate.styles[key] = {};
        const opVal = parseInt(e.target.value);
        currentTemplate.styles[key].opacity = opVal;
        
        // Actualización directa e instantánea en el DOM
        const hex = currentTemplate.styles[key].boxColor || "#000000";
        const opacity = opVal / 100;
        const r = parseInt(hex.slice(1, 3), 16) || 0;
        const g = parseInt(hex.slice(3, 5), 16) || 0;
        const b = parseInt(hex.slice(5, 7), 16) || 0;
        const rgba = `rgba(${r}, ${g}, ${b}, ${opacity})`;

        const activeCard = document.getElementById(`${key}-card-${currentProject.activeScreenIndex}`);
        if (activeCard) {
            activeCard.style.backgroundColor = rgba;
        }
        
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
        if (activeCardKey.startsWith("sticker_")) {
            boxWidthVal.textContent = val + "%";
            const idx = parseInt(activeCardKey.split('_')[1], 10);
            const sCard = document.getElementById(`sticker-card-${currentProject.activeScreenIndex}-${idx}`);
            if (sCard) {
                sCard.style.width = val + "%";
                sCard.style.height = "auto";
                if(currentProject.screens[currentProject.activeScreenIndex].stickers[idx]) {
                    currentProject.screens[currentProject.activeScreenIndex].stickers[idx].width = val + "%";
                }
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
        if (!templatesList.some(p => p.id === "default")) {
            templatesList.unshift({ id: "default", name: "default" });
        }
        if (!templatesList.some(p => p.id === "doble_video")) {
            templatesList.push({ id: "doble_video", name: "Diseño Doble Video (2 Videos)" });
        }
        
        projectSelect.innerHTML = "";
        templatesList.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.id;
            let displayName = p.name;
            if (p.name === "default" || p.id === "default") displayName = "Diseño por Defecto (1 Video)";
            else if (p.name === "doble_video" || p.id === "doble_video") displayName = "Diseño Doble Video (2 Videos)";
            opt.textContent = displayName;
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
                saveStatus.textContent = "Autoguíardado";
                saveStatus.style.color = "#10b981";
            }, 500);
        }
    }

    // Guardado manual
    saveBtn.addEventListener("click", () => {
        saveTemplateQuietly();
        alert(`¡Plantilla "${currentTemplateName === "default" ? "por Defecto" : currentTemplateName}" guíardada con éxito!`);
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
        alert(`Copia guíardada como "${cleanName}".`);
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

        // Crear diseño de pantalla de Doble Video (Video Arriba, Texto al Medio, Video Abajo)
    function createDualVideoScreen(index = 0) {
        return {
            name: `Pantalla ${index + 1}`,
            layout: "split_dual",
            theme: "dark",
            customColor: "#141414",
            bgImageSrc: null,
            fontTitle: "'Montserrat', sans-serif",
            mediaType: null,
            mediaSrc: null,
            mediaBottomType: null,
            mediaBottomSrc: null,
            showHeaderCard: true,
            showFooterCard: false,
            showInstagramOverlay: false,
            headerText: `🔥 <strong>DISEÑO DOBLE ${index + 1}</strong>`,
            footerText: "👇 <strong>Comenta aquí abajo</strong> 🚀",
            fontSizes: {
                header: 95,
                footer: 95
            },
            positions: {
                media: { top: "20px", left: "20px" },
                header: { top: "295px", left: "20px" },
                mediaBottom: { top: "360px", left: "20px" },
                footer: { top: "580px", left: "20px" },
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

    // Crear diseño de pantalla por defecto
    function createDefaultScreen(index = 0) {
        return {
            name: `Pantalla ${index + 1}`,
            theme: "dark",
            customColor: "#141414",
            bgImageSrc: null,
            fontTitle: "'Montserrat', sans-serif",
            mediaType: null,
            mediaSrc: null,
            showHeaderCard: true,
            showFooterCard: true,
            showInstagramOverlay: false,
            headerText: index === 0
                ? "🔥 <strong>TÍTULO DE GANCHO</strong><br>¡Este tip te volará la cabeza!"
                : `🔥 <strong>DISEÑO DE REEL ${index + 1}</strong><br>Edita este texto para tu gancho.`,
            footerText: "👇 <strong>Aprende el secreto hoy</strong><br>Síguenos para más consejos diarios 🚀<br><span style='color: #dfb15b;'>#cocina #consejos #tutorial</span>",
            fontSizes: {
                header: 95,
                footer: 95
            },
            positions: {
                header: { top: "40px", left: "20px" },
                media: { top: "160px", left: "20px" },
                footer: { top: "490px", left: "20px" },
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
        if (!savedData && name === "doble_video") {
            currentProject = {
                name: "doble_video",
                activeScreenIndex: 0,
                screens: [createDualVideoScreen(0)]
            };
            currentTemplate = currentProject.screens[0];
            projectSelect.value = "doble_video";
            renderScreens();
            selectScreen(0);
            saveTemplateQuietly();
            return;
        }
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
        if (currentProject && Array.isArray(currentProject.screens)) {
            currentProject.screens.forEach(s => {
                if (s.headerText) s.headerText = cleanAllMojibakeAndComments(s.headerText);
                if (s.footerText) s.footerText = cleanAllMojibakeAndComments(s.footerText);
                if (!s.positions) s.positions = {};
                
                // Alineación horizontal y vertical armónica estándar (sin superposiciones)
                if (!s.positions.header || !s.positions.header.top) {
                    s.positions.header = { top: "40px", left: "20px" };
                } else {
                    s.positions.header.left = "20px";
                }
                
                // Si media estaba en 210px (valor desfasado anterior) o sin top, corregir a 160px
                if (!s.positions.media || !s.positions.media.top || s.positions.media.top === "210px") {
                    s.positions.media = { top: "160px", left: "20px" };
                } else {
                    s.positions.media.left = "20px";
                }
                
                // El pie de página siempre debe quedar debajo del video (160 + 320 = 480px -> mínimo 490px)
                const mediaTopVal = parseInt(s.positions.media.top) || 160;
                const minFooterTop = mediaTopVal + 320 + 10;
                if (!s.positions.footer || !s.positions.footer.top || parseInt(s.positions.footer.top) < (mediaTopVal + 320)) {
                    s.positions.footer = { top: minFooterTop + "px", left: "20px" };
                } else {
                    s.positions.footer.left = "20px";
                }

                // Igualar el tamaño del título al de la descripción según la solicitud del usuario
                if (!s.fontSizes) {
                    s.fontSizes = { header: 95, footer: 95 };
                } else if (s.fontSizes.header === 115 || s.fontSizes.header > (s.fontSizes.footer || 95)) {
                    s.fontSizes.header = s.fontSizes.footer || 95;
                }
            });
            saveTemplateQuietly();
        }
        if (currentProject && Array.isArray(currentProject.screens)) {
            currentProject.screens.forEach(s => {
                if (s.headerText) s.headerText = sanitizeMojibake(s.headerText);
                if (s.footerText) s.footerText = sanitizeMojibake(s.footerText);
            });
        }
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

    function deleteScreenByIndex(targetIndex) {
        if (currentProject.screens.length <= 1) {
            alert("Debes tener al menos una pantalla de teléfono en tu mesa de trabajo.");
            return;
        }

        const idx = (typeof targetIndex === "number") ? targetIndex : currentProject.activeScreenIndex;
        const screenName = currentProject.screens[idx]?.name || ("Pantalla " + (idx + 1));

        if (!confirm("¿Seguro que deseas eliminar " + screenName + "?")) return;

        currentProject.screens.splice(idx, 1);

        // Ajustar el índice activo
        if (currentProject.activeScreenIndex >= currentProject.screens.length) {
            currentProject.activeScreenIndex = Math.max(0, currentProject.screens.length - 1);
        } else if (idx < currentProject.activeScreenIndex) {
            currentProject.activeScreenIndex = Math.max(0, currentProject.activeScreenIndex - 1);
        }

        renderScreens();
        selectScreen(currentProject.activeScreenIndex);
        saveTemplateQuietly();
    }


    // =========================================================
    // RENDERIZADOR WEBGL DE EFECTOS LÍQUIDOS (Delegado a js/webgl-water.js)
    // =========================================================
    function setupWaterEffect(canvasEl, imageSrc, is3D = true) {
        return window.ReelsWaterShader.setup(canvasEl, imageSrc, is3D);
    }
    function stopWaterEffect() {
        return window.ReelsWaterShader.stop();
    }

    function updateActiveBgAnimation() {
        if (!currentProject || !currentProject.screens) return;
        const idx = currentProject.activeScreenIndex;
        const screen = currentProject.screens[idx];
        if (!screen) return;
        
        const canvas = document.getElementById(`reel-canvas-${idx}`) || document.getElementById("reel-canvas");
        const bgCanvas = document.getElementById(`reel-bg-canvas-${idx}`) || document.getElementById("reel-bg-canvas");
        const effect = screen.bgEffect || "none";
        const bgImg = screen.bgImageSrc;

        if (canvas) {
            canvas.classList.remove("bg-effect-kenburns", "bg-effect-pulse", "bg-effect-water");
        }

        const isWater = (effect === "water" || effect === "water_3d");
        const hasActiveVideo = reelVideo && currentTemplate && currentTemplate.mediaType === "video" && currentTemplate.mediaSrc;
        const shouldBePaused = hasActiveVideo && reelVideo.paused;

        if (isWater && bgImg) {
            setupWaterEffect(bgCanvas, bgImg, effect === "water_3d");
            if (shouldBePaused && window.ReelsWaterShader) {
                window.ReelsWaterShader.pause();
            }
        } else {
            stopWaterEffect();
            if (effect && effect !== "none" && canvas) {
                canvas.classList.add(`bg-effect-${effect}`);
                if (shouldBePaused) {
                    canvas.classList.add("bg-paused");
                }
            }
        }
    }

    function renderScreens() {
        if (!simulatorPane) return;
        simulatorPane.innerHTML = "";
        
        currentProject.screens.forEach((screenData, index) => {
            if (screenData.headerText) screenData.headerText = cleanAllMojibakeAndComments(screenData.headerText);
            if (screenData.footerText) screenData.footerText = cleanAllMojibakeAndComments(screenData.footerText);
            const wrapper = document.createElement("div");
            wrapper.className = "phone-wrapper";
            wrapper.dataset.index = index;
            wrapper.draggable = true;
            
            wrapper.innerHTML = `
                <div class="phone-header">
                    <span class="phone-title" contenteditable="true" id="phone-title-${index}" style="outline: none; cursor: text; display: inline-block; min-width: 80px; padding-right: 20px;">${screenData.name || 'Pantalla ' + (index + 1)}</span>
                    <div class="phone-header-actions">
                        <button type="button" class="phone-delete-btn" data-index="${index}" title="Eliminar esta pantalla">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                        <span class="drag-handle" title="Arrastra para reordenar"><i class="fa-solid fa-grip-vertical"></i></span>
                    </div>
                </div>
                <div class="phone-mockup ${index === currentProject.activeScreenIndex ? 'selected-phone' : ''}" data-index="${index}">
                    <div class="phone-screen">
                        <div class="reel-canvas theme-${screenData.theme} ${screenData.bgEffect && screenData.bgEffect !== 'none' ? 'bg-effect-' + screenData.bgEffect : ''}" id="reel-canvas-${index}" style="${
    screenData.theme === 'custom' 
        ? 'background: ' + screenData.customColor 
        : (screenData.theme === 'image' && screenData.bgImageSrc ? 'background: url(' + screenData.bgImageSrc + ') center/cover no-repeat;' : '')
}">
                            <canvas class="reel-bg-canvas" id="reel-bg-canvas-${index}" width="360" height="640" style="display: none;"></canvas>
                            
                            <!-- Bloque de texto superior -->
                            <div class="text-card drag-el" id="header-card-${index}" style="top: ${screenData.positions?.header?.top || (screenData.layout === 'split_dual' ? '295px' : '40px')}; left: 20px; width: calc(100% - 40px); display: ${screenData.showHeaderCard ? 'flex' : 'none'}; height: ${screenData.styles?.header?.height ? screenData.styles.header.height + 'px' : 'auto'};">
                                <div class="text-content" contenteditable="true" id="header-text-${index}" data-placeholder="Escribe el título aquí...">
                                    ${screenData.headerText || ''}
                                </div>
                                <div class="resize-handle resize-t" data-key="header" data-index="${index}"></div>
                                <div class="resize-handle resize-r" data-key="header" data-index="${index}"></div>
                                <div class="resize-handle resize-b" data-key="header" data-index="${index}"></div>
                                <div class="resize-handle resize-se" data-key="header" data-index="${index}"></div>
                            </div>

                            <!-- Bloque de video 1:1 (Superior) -->
                            <div class="media-container" id="media-container-${index}" data-media-target="top" style="top: ${screenData.positions?.media?.top || (screenData.layout === 'split_dual' ? '20px' : '160px')}; left: ${screenData.positions?.media?.left || '20px'};">
                                <video id="reel-video-${index}" loop muted playsinline style="display: none;"></video>
                                <img id="reel-img-${index}" src="" alt="Previsualización" style="display: none;">
                                <div class="media-placeholder" id="media-placeholder-${index}">
                                    <i class="fa-solid fa-video"></i>
                                    <span>${screenData.layout === 'split_dual' ? 'Video Superior 1:1' : 'Carga un video/imagen 1:1'}</span>
                                </div>
                                <div class="video-play-indicator" id="video-indicator-${index}"><i class="fa-solid fa-play"></i></div>
                            </div>

                            ${screenData.layout === 'split_dual' ? `
                            <!-- Bloque de video 1:1 (Inferior) para segundo video -->
                            <div class="media-container media-bottom-container" id="media-container-bottom-${index}" data-media-target="bottom" style="top: ${screenData.positions?.mediaBottom?.top || '360px'}; left: ${screenData.positions?.mediaBottom?.left || '20px'};">
                                <video id="reel-video-bottom-${index}" loop muted playsinline style="display: none;"></video>
                                <img id="reel-img-bottom-${index}" src="" alt="Previsualización" style="display: none;">
                                <div class="media-placeholder" id="media-placeholder-bottom-${index}">
                                    <i class="fa-solid fa-video"></i>
                                    <span>Video Inferior 1:1</span>
                                </div>
                                <div class="video-play-indicator" id="video-indicator-bottom-${index}"><i class="fa-solid fa-play"></i></div>
                            </div>
                            ` : ''}

                            <!-- Bloque de texto inferior -->
                            <div class="text-card drag-el" id="footer-card-${index}" style="top: ${screenData.positions?.footer?.top || '490px'}; left: 20px; width: calc(100% - 40px); display: ${screenData.showFooterCard ? 'flex' : 'none'}; height: ${screenData.styles?.footer?.height ? screenData.styles.footer.height + 'px' : 'auto'};">
                                <div class="text-content" contenteditable="true" id="footer-text-${index}" data-placeholder="Escribe la descripción aquí...">
                                    ${screenData.footerText || ''}
                                </div>
                                <div class="resize-handle resize-t" data-key="footer" data-index="${index}"></div>
                                <div class="resize-handle resize-r" data-key="footer" data-index="${index}"></div>
                                <div class="resize-handle resize-b" data-key="footer" data-index="${index}"></div>
                                <div class="resize-handle resize-se" data-key="footer" data-index="${index}"></div>
                            </div>

                            <!-- Logo flotante arrastrable -->
                            <div class="logo-card drag-el" id="logo-card-${index}" style="top: ${screenData.positions?.logo?.top || '150px'}; left: ${screenData.positions?.logo?.left || '140px'}; width: ${screenData.logoSize || 80}px; height: ${screenData.logoSize || 80}px; display: none;">
                                <img id="logo-img-preview-${index}" src="" alt="Logo" style="width: 100%; height: 100%; object-fit: contain; pointer-events: none;">
                                <div class="resize-handle resize-t" data-key="logo" data-index="${index}"></div>
                                <div class="resize-handle resize-r" data-key="logo" data-index="${index}"></div>
                                <div class="resize-handle resize-b" data-key="logo" data-index="${index}"></div>
                                <div class="resize-handle resize-se" data-key="logo" data-index="${index}"></div>
                            </div>

                            ${(screenData.stickers || []).map((sticker, sIdx) => `
                                <div class="sticker-card drag-el" id="sticker-card-${index}-${sIdx}" data-sticker-index="${sIdx}" style="top: ${sticker.top}; left: ${sticker.left}; width: ${sticker.width}; height: ${sticker.height}; position: absolute; z-index: 120;">
                                    <img src="${sticker.src}" alt="Pegatina" style="width: 100%; height: auto; display: block; pointer-events: none;">
                                    <button class="delete-sticker-btn" data-screen="${index}" data-sticker="${sIdx}" style="position: absolute; top: -10px; right: -10px; background: red; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; align-items: center; justify-content: center; font-size: 10px; z-index: 60;"><i class="fa-solid fa-xmark"></i></button>
                                    <div class="resize-handle resize-se" data-key="sticker_${sIdx}" data-index="${index}"></div>
                                </div>
                            `).join('')}

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
                                        <div class="ig-avatar">ðŸ ³</div>
                                        <span>chef_recetas</span>
                                        <button class="ig-follow-btn">Seguir</button>
                                    </div>
                                    <div class="ig-caption">¡Aprende esta increíble receta en pocos pasos! ... <span class="ig-more">más</span></div>
                                    <div class="ig-music-name">🎵 Audio original â€¢ chef_recetas</div>
                                </div>
                            </div>

                        </div>
                    </div>
                    <div class="phone-home-indicator"></div>
                </div>
            `;
            
            simulatorPane.appendChild(wrapper);
            
            // Aplicar configuraciones guíardadas
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
            const mContBottom = document.getElementById(`media-container-bottom-${index}`);
            if (mContBottom) {
                setupDraggable(mContBottom, "mediaBottom", index);
                mContBottom.addEventListener("click", (e) => {
                    e.stopPropagation();
                    selectScreen(index);
                    selectCard("mediaBottom");
                });
                mContBottom.addEventListener("dblclick", (e) => {
                    e.stopPropagation();
                    currentUploadTarget = "bottom";
                    selectScreen(index);
                    selectCard("mediaBottom");
                    if (mediaInput) {
                        mediaInput.value = "";
                        mediaInput.click();
                    }
                });
                const phBottom = mContBottom.querySelector(".media-placeholder");
                if (phBottom) {
                    phBottom.style.cursor = "pointer";
                    phBottom.addEventListener("click", (e) => {
                        e.stopPropagation();
                        currentUploadTarget = "bottom";
                        selectScreen(index);
                        selectCard("mediaBottom");
                        if (mediaInput) {
                            mediaInput.value = "";
                            mediaInput.click();
                        }
                    });
                }
                const screenVidBottom = document.getElementById(`reel-video-bottom-${index}`);
                if (screenVidBottom) {
                    screenVidBottom.addEventListener("play", () => {
                        if (index === currentProject.activeScreenIndex) updatePlayPauseUI();
                    });
                    screenVidBottom.addEventListener("pause", () => {
                        if (index === currentProject.activeScreenIndex) updatePlayPauseUI();
                    });
                    screenVidBottom.addEventListener("timeupdate", () => {
                        if (index === currentProject.activeScreenIndex && !isScrubbing) {
                            syncTimelineControls();
                        }
                    });
                }
            }
            const screenVid = document.getElementById(`reel-video-${index}`);
            if (screenVid) {
                screenVid.addEventListener("play", () => {
                    if (index === currentProject.activeScreenIndex) updatePlayPauseUI();
                });
                screenVid.addEventListener("pause", () => {
                    if (index === currentProject.activeScreenIndex) updatePlayPauseUI();
                });
                screenVid.addEventListener("timeupdate", () => {
                    if (index === currentProject.activeScreenIndex && !isScrubbing) {
                        syncTimelineControls();
                    }
                });
                screenVid.addEventListener("loadedmetadata", () => {
                    if (index === currentProject.activeScreenIndex) {
                        syncTimelineControls();
                    }
                });
            }
            if (mCont) {
                mCont.addEventListener("dblclick", (e) => {
                    e.stopPropagation();
                    selectScreen(index);
                    selectCard("media");
                    if (mediaInput) {
                        mediaInput.value = "";
                        mediaInput.click();
                    }
                });
                const placeholder = mCont.querySelector(".media-placeholder");
                if (placeholder) {
                    placeholder.style.cursor = "pointer";
                    placeholder.addEventListener("click", (e) => {
                        e.stopPropagation();
                        selectScreen(index);
                        selectCard("media");
                        if (mediaInput) {
                            mediaInput.value = "";
                            mediaInput.click();
                        }
                    });
                }
            }
            setupDraggable(lCard, "logo", index);
            
            setupResizable(hCard, "header", index);
            setupResizable(fCard, "footer", index);
            setupResizable(lCard, "logo", index);

            // Pegatinas dinámicas
            (screenData.stickers || []).forEach((_, sIdx) => {
                const sCard = document.getElementById(`sticker-card-${index}-${sIdx}`);
                if(sCard) {
                    setupDraggable(sCard, `sticker_${sIdx}`, index);
                    setupResizable(sCard, `sticker_${sIdx}`, index);
                    
                    const delBtn = sCard.querySelector('.delete-sticker-btn');
                    
                    if(delBtn) {
                        delBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            currentProject.screens[index].stickers.splice(sIdx, 1);
                            renderScreens();
                        });
                    }
                    
                    sCard.addEventListener("click", (e) => {
                        e.stopPropagation();
                        selectScreen(index);
                        selectCard(`sticker_${sIdx}`);
                    });
                    
                    sCard.addEventListener("dblclick", (e) => {
                        e.stopPropagation();
                        selectScreen(index);
                        selectCard(`sticker_${sIdx}`);
                        const imgEl = sCard.querySelector('img');
                        if (imgEl) {
                            window._editingStickerScreenIdx = index;
                            window._editingStickerIdx = sIdx;
                            window.openEraserEditor(imgEl);
                        }
                    });
                }
            });
            
            // Manejadores de eventos para arrastrar y soltar teléfonos (Mesa de trabajo)
            let dragAllowed = false;
            
            wrapper.addEventListener("mousedown", (e) => {
                if (e.target.closest(".phone-delete-btn")) {
                    dragAllowed = false;
                    return;
                }
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

            const canvasEl = document.getElementById(`reel-canvas-${index}`);
            if (canvasEl) {
                canvasEl.addEventListener("click", (e) => {
                    // Si el clic fue directamente en el lienzo de fondo o canvas WebGL (no en una tarjeta o video hijo)
                    if (e.target === canvasEl || e.target.classList.contains("reel-bg-canvas")) {
                        selectScreen(index);
                        selectCard("background");
                    }
                });
            }
            
            hCard.addEventListener("click", (e) => {
                e.stopPropagation();
                selectScreen(index);
                selectCard("header");
                const hasSelection = window.getSelection && !window.getSelection().isCollapsed && window.getSelection().toString().length > 0;
                if (!e.target.closest(".resize-handle") && !e.target.closest(".text-content") && !hasSelection) {
                    if (document.activeElement && document.activeElement !== document.body) {
                        document.activeElement.blur();
                    }
                    const txt = hCard.querySelector(".text-content");
                    if (txt && (!txt.textContent.trim() || txt.getAttribute("data-empty") === "true")) {
                        placeCaretAtEnd(txt);
                    }
                }
            });
            fCard.addEventListener("click", (e) => {
                e.stopPropagation();
                selectScreen(index);
                selectCard("footer");
                const hasSelection = window.getSelection && !window.getSelection().isCollapsed && window.getSelection().toString().length > 0;
                if (!e.target.closest(".resize-handle") && !e.target.closest(".text-content") && !hasSelection) {
                    if (document.activeElement && document.activeElement !== document.body) {
                        document.activeElement.blur();
                    }
                    const txt = fCard.querySelector(".text-content");
                    if (txt && (!txt.textContent.trim() || txt.getAttribute("data-empty") === "true")) {
                        placeCaretAtEnd(txt);
                    }
                }
            });
            // mCont click y selección ya se manejan limpiamente en setupDraggable
            lCard.addEventListener("click", (e) => {
                e.stopPropagation();
                selectScreen(index);
                selectCard("logo");
            });
            
            const hText = document.getElementById(`header-text-${index}`);
            const fText = document.getElementById(`footer-text-${index}`);
            
            if (hText) {
                checkTextEmptyState(hText);
                hText.addEventListener("input", () => {
                    checkTextEmptyState(hText);
                    currentProject.screens[index].headerText = hText.innerHTML;
                    if (index === currentProject.activeScreenIndex && sidebarHeaderInput && document.activeElement !== sidebarHeaderInput) {
                        sidebarHeaderInput.value = htmlToPlainText(hText.innerHTML);
                        autoResizeTextarea(sidebarHeaderInput);
                    }
                    saveTemplateQuietly();
                });
            }
            if (fText) {
                checkTextEmptyState(fText);
                fText.addEventListener("input", () => {
                    checkTextEmptyState(fText);
                    currentProject.screens[index].footerText = fText.innerHTML;
                    if (index === currentProject.activeScreenIndex && sidebarFooterInput && document.activeElement !== sidebarFooterInput) {
                        sidebarFooterInput.value = htmlToPlainText(fText.innerHTML);
                        autoResizeTextarea(sidebarFooterInput);
                    }
                    saveTemplateQuietly();
                });
            }

            // Botón eliminar pantalla en el encabezado
            const pDeleteBtn = wrapper.querySelector(".phone-delete-btn");
            if (pDeleteBtn) {
                pDeleteBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    deleteScreenByIndex(index);
                });
            }

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
        updateActiveBgAnimation();
    }


    // Sincronización y alternancia de Disposición / Layout (Opción 2)
    function syncLayoutButtonsUI() {
        const screenData = currentProject.screens[currentProject.activeScreenIndex];
        const isDual = screenData && screenData.layout === "split_dual";
        const btnSingle = document.getElementById("layout-btn-single");
        const btnDual = document.getElementById("layout-btn-dual");
        const indicator = document.getElementById("layout-indicator");

        if (btnSingle) btnSingle.classList.toggle("active", !isDual);
        if (btnDual) btnDual.classList.toggle("active", isDual);
        if (indicator) indicator.textContent = isDual ? "2 Videos (Doble)" : "1 Video (Estándar)";
    }

    function switchActiveScreenLayout(targetLayout) {
        const screenData = currentProject.screens[currentProject.activeScreenIndex];
        if (!screenData || screenData.layout === targetLayout) return;

        screenData.layout = targetLayout;
        if (!screenData.positions) screenData.positions = {};

        if (targetLayout === "split_dual") {
            screenData.positions.media = { top: "20px", left: "20px" };
            screenData.positions.header = { top: "295px", left: "20px" };
            screenData.positions.mediaBottom = { top: "360px", left: "20px" };
            screenData.showHeaderCard = true;
            screenData.showFooterCard = false;
            if (!screenData.headerText || screenData.headerText.includes("TÍTULO DE GANCHO") || screenData.headerText.includes("COMPARATIVA")) {
                screenData.headerText = `🔥 <strong>DISEÑO DOBLE ${currentProject.activeScreenIndex + 1}</strong>`;
            }
        } else {
            screenData.positions.media = { top: "160px", left: "20px" };
            screenData.positions.header = { top: "40px", left: "20px" };
            screenData.positions.footer = { top: "490px", left: "20px" };
            screenData.showHeaderCard = true;
            screenData.showFooterCard = true;
        }

        renderScreens();
        selectScreen(currentProject.activeScreenIndex);
        syncLayoutButtonsUI();
        saveTemplateQuietly();
    }

    const layoutBtnSingle = document.getElementById("layout-btn-single");
    if (layoutBtnSingle) {
        layoutBtnSingle.addEventListener("click", () => switchActiveScreenLayout("standard"));
    }
    const layoutBtnDual = document.getElementById("layout-btn-dual");
    if (layoutBtnDual) {
        layoutBtnDual.addEventListener("click", () => switchActiveScreenLayout("split_dual"));
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
        mediaContainerBottom = document.getElementById(`media-container-bottom-${index}`);
        reelVideoBottom = document.getElementById(`reel-video-bottom-${index}`);
        reelImgBottom = document.getElementById(`reel-img-bottom-${index}`);
        mediaPlaceholderBottom = document.getElementById(`media-placeholder-bottom-${index}`);
        logoCard = document.getElementById(`logo-card-${index}`);
        logoImgPreview = document.getElementById(`logo-img-preview-${index}`);
        instagramOverlay = document.getElementById(`instagram-overlay-${index}`);
        
        // Sincronizar selectores del panel izquierdo
        themeSelect.value = currentTemplate.theme || "dark";
        if (bgColorPicker) {
            const hexColor = currentTemplate.customColor || "#141414";
            bgColorPicker.value = hexColor;
            if (bgColorHex) bgColorHex.textContent = hexColor;
        }
        updateBgImageUI();
        syncThemeDropdownUI(currentTemplate.theme);
        
        if (fontTitleSelect) fontTitleSelect.value = currentTemplate.fontTitle;
        if (toggleHeaderCard) toggleHeaderCard.checked = currentTemplate.showHeaderCard;
        if (toggleFooterCard) toggleFooterCard.checked = currentTemplate.showFooterCard;
        if (toggleIgOverlay) toggleIgOverlay.checked = currentTemplate.showInstagramOverlay || false;
        
        // Sincronizar controles multimedia si hay video
        if (currentTemplate.mediaType === "video") {
            if (playPauseBtn) playPauseBtn.disabled = false;
            if (muteBtn) {
                muteBtn.disabled = false;
                muteBtn.innerHTML = (reelVideo && reelVideo.muted) 
                    ? '<i class="fa-solid fa-volume-xmark"></i> Silenciar' 
                    : '<i class="fa-solid fa-volume-high"></i> Sonido';
            }
            updatePlayPauseUI();
        } else {
            if (playPauseBtn) playPauseBtn.disabled = true;
            if (muteBtn) muteBtn.disabled = true;
        }
        syncTimelineControls();

        // Sincronizar botones de logo y media
        if (currentTemplate.logoSrc) {
            if (removeLogoBtn) removeLogoBtn.disabled = false;
            const editLogoBtn = document.getElementById('edit-logo-btn');
            if (editLogoBtn) editLogoBtn.disabled = false;
        } else {
            if (removeLogoBtn) removeLogoBtn.disabled = true;
            const editLogoBtn = document.getElementById('edit-logo-btn');
            if (editLogoBtn) editLogoBtn.disabled = true;
        }
        
        // Sincronizar botón "Editar última" según stickers de la pantalla activa
        const editLastStickerBtn = document.getElementById('edit-last-sticker-btn');
        if (editLastStickerBtn) {
            const hasStickers = currentTemplate.stickers && currentTemplate.stickers.length > 0;
            editLastStickerBtn.disabled = !hasStickers;
        }
        
        if (currentTemplate.mediaSrc) {
            const editMediaBtn = document.getElementById('edit-media-btn');
            if (editMediaBtn) editMediaBtn.disabled = false;
        } else {
            const editMediaBtn = document.getElementById('edit-media-btn');
            if (editMediaBtn) editMediaBtn.disabled = true;
        }

        // Pausar todos los videos de otras pantallas y reproducir los del teléfono seleccionado
        currentProject.screens.forEach((scr, idx) => {
            const vid = document.getElementById(`reel-video-${idx}`);
            const vidBottom = document.getElementById(`reel-video-bottom-${idx}`);
            
            if (idx === index) {
                if (vid && scr.mediaType === "video" && scr.mediaSrc) {
                    if (scr.fixedFrameTime !== undefined && scr.fixedFrameTime !== null) {
                        vid.currentTime = scr.fixedFrameTime;
                        vid.pause();
                    } else {
                        vid.muted = true;
                        vid.play().catch(() => {});
                    }
                }
                if (vidBottom && scr.mediaBottomType === "video" && scr.mediaBottomSrc) {
                    if (scr.fixedFrameTime !== undefined && scr.fixedFrameTime !== null) {
                        vidBottom.currentTime = scr.fixedFrameTime;
                        vidBottom.pause();
                    } else {
                        vidBottom.muted = true;
                        vidBottom.play().catch(() => {});
                    }
                }
            } else {
                if (vid) {
                    vid.pause();
                    vid.muted = true;
                    if (vid.currentTime === 0) vid.currentTime = 0.05;
                }
                if (vidBottom) {
                    vidBottom.pause();
                    vidBottom.muted = true;
                    if (vidBottom.currentTime === 0) vidBottom.currentTime = 0.05;
                }
            }
        });

        // Sincronizar tarjeta seleccionada (respetando visibilidad de bloques)
        let targetKeyToSelect = "header";
        if (currentTemplate.showHeaderCard && currentTemplate.showFooterCard) {
            targetKeyToSelect = (activeCardKey === "footer") ? "footer" : "header";
        } else if (currentTemplate.showHeaderCard) {
            targetKeyToSelect = "header";
        } else if (currentTemplate.showFooterCard) {
            targetKeyToSelect = "footer";
        } else {
            targetKeyToSelect = "media";
        }
        selectCard(targetKeyToSelect);
        syncTextBlocksVisibilityUI();
        syncAspectRatioUI();
        updateSidebarTextInputs();
        updateActiveBgAnimation();
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
            card.style.left = "20px";
            card.style.width = "calc(100% - 40px)";
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
        const mCont = document.getElementById(`media-container-${index}`);
        if (!video || !img || !placeholder) return;

        const classMap = { "1:1": "ratio-1-1", "4:5": "ratio-4-5", "9:16": "ratio-9-16", "16:9": "ratio-16-9" };
        const canvas = document.getElementById(`reel-canvas-${index}`);

        // Aplicar proporción seleccionada al contenedor superior
        if (mCont) {
            const ratio = screenData.mediaRatio || "1:1";
            mCont.classList.remove("ratio-1-1", "ratio-4-5", "ratio-9-16", "ratio-16-9");
            mCont.classList.add(classMap[ratio] || "ratio-1-1");

            if (canvas && mCont.offsetWidth > 0) {
                const autoLeft = Math.max(10, Math.round((canvas.offsetWidth - mCont.offsetWidth) / 2));
                mCont.style.left = autoLeft + "px";
            }
        }

        // Aplicar proporción seleccionada al contenedor inferior (Diseño Doble Video)
        const mContBottom = document.getElementById(`media-container-bottom-${index}`);
        if (mContBottom) {
            const bottomRatio = screenData.mediaBottomRatio || "1:1";
            mContBottom.classList.remove("ratio-1-1", "ratio-4-5", "ratio-9-16", "ratio-16-9");
            mContBottom.classList.add(classMap[bottomRatio] || "ratio-1-1");

            if (canvas && mContBottom.offsetWidth > 0) {
                const autoLeft = Math.max(10, Math.round((canvas.offsetWidth - mContBottom.offsetWidth) / 2));
                mContBottom.style.left = autoLeft + "px";
            }
        }
        
        if (window.resetMediaZoom) window.resetMediaZoom(index);

        if (screenData.mediaType === "video" && screenData.mediaSrc) {
            img.style.display = "none";
            video.style.display = "block";
            placeholder.style.display = "none";
            placeholder.style.visibility = "hidden";
            video.preload = "auto";

            const isAlreadyLoaded = (video.dataset.loadedSrc === screenData.mediaSrc) || 
                                    (video.dataset.serverUrl === screenData.mediaSrc);

            if (!isAlreadyLoaded) {
                video.dataset.loadedSrc = screenData.mediaSrc;
                video.src = screenData.mediaSrc;
                video.muted = true;

                const onMeta = () => {
                    if (video.currentTime === 0) video.currentTime = 0.05;
                };
                video.addEventListener("loadedmetadata", onMeta, { once: true });

                if (index === currentProject.activeScreenIndex) {
                    if (screenData.fixedFrameTime !== undefined && screenData.fixedFrameTime !== null) {
                        video.currentTime = screenData.fixedFrameTime;
                        video.pause();
                    } else {
                        video.play().catch(() => console.log("Video auto-play blocked."));
                    }
                    const editMediaBtn = document.getElementById('edit-media-btn');
                    if (editMediaBtn) editMediaBtn.disabled = true;
                    syncTimelineControls();
                } else {
                    video.pause();
                    if (screenData.fixedFrameTime !== undefined && screenData.fixedFrameTime !== null) {
                        video.currentTime = screenData.fixedFrameTime;
                    } else if (video.currentTime === 0) {
                        video.currentTime = 0.05;
                    }
                }
            } else {
                if (index === currentProject.activeScreenIndex) {
                    syncTimelineControls();
                }
            }
        } else if (screenData.mediaType === "image" && screenData.mediaSrc) {
            video.style.display = "none";
            video.pause();
            img.style.display = "block";
            placeholder.style.display = "none";
            placeholder.style.visibility = "hidden";
            img.src = screenData.mediaSrc;
            if (index === currentProject.activeScreenIndex) {
                const editMediaBtn = document.getElementById('edit-media-btn');
                if (editMediaBtn) editMediaBtn.disabled = false;
            }
        } else {
            video.style.display = "none";
            video.pause();
            img.style.display = "none";
            placeholder.style.display = "flex";
            placeholder.style.visibility = "visible";
            if (index === currentProject.activeScreenIndex) {
                const editMediaBtn = document.getElementById('edit-media-btn');
                if (editMediaBtn) editMediaBtn.disabled = true;
            }
        }

        // Aplicar a segundo contenedor si existe (Diseño Doble Video)
        const videoBottom = document.getElementById(`reel-video-bottom-${index}`);
        const imgBottom = document.getElementById(`reel-img-bottom-${index}`);
        const placeholderBottom = document.getElementById(`media-placeholder-bottom-${index}`);
        if (videoBottom && imgBottom && placeholderBottom) {
            if (screenData.mediaBottomType === "video" && screenData.mediaBottomSrc) {
                imgBottom.style.display = "none";
                videoBottom.style.display = "block";
                placeholderBottom.style.display = "none";
                placeholderBottom.style.visibility = "hidden";
                videoBottom.preload = "auto";

                const isAlreadyLoadedBottom = (videoBottom.dataset.loadedSrc === screenData.mediaBottomSrc) || 
                                              (videoBottom.dataset.serverUrl === screenData.mediaBottomSrc);

                if (!isAlreadyLoadedBottom) {
                    videoBottom.dataset.loadedSrc = screenData.mediaBottomSrc;
                    videoBottom.src = screenData.mediaBottomSrc;
                    videoBottom.muted = true;

                    const onMetaBottom = () => {
                        if (videoBottom.currentTime === 0) videoBottom.currentTime = 0.05;
                    };
                    videoBottom.addEventListener("loadedmetadata", onMetaBottom, { once: true });

                    if (index === currentProject.activeScreenIndex) {
                        videoBottom.play().catch(() => {});
                    } else {
                        videoBottom.pause();
                    }
                }
            } else if (screenData.mediaBottomType === "image" && screenData.mediaBottomSrc) {
                videoBottom.style.display = "none";
                videoBottom.pause();
                imgBottom.style.display = "block";
                placeholderBottom.style.display = "none";
                placeholderBottom.style.visibility = "hidden";
                imgBottom.src = screenData.mediaBottomSrc;
            } else {
                videoBottom.style.display = "none";
                videoBottom.pause();
                imgBottom.style.display = "none";
                placeholderBottom.style.display = "flex";
                placeholderBottom.style.visibility = "visible";
            }
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
            if (index === currentProject.activeScreenIndex) {
                if (removeLogoBtn) removeLogoBtn.disabled = false;
                const editLogoBtn = document.getElementById('edit-logo-btn');
                if (editLogoBtn) editLogoBtn.disabled = false;
            }
        } else {
            card.style.display = "none";
            preview.removeAttribute("src");
            if (index === currentProject.activeScreenIndex) {
                if (removeLogoBtn) removeLogoBtn.disabled = true;
                const editLogoBtn = document.getElementById('edit-logo-btn');
                if (editLogoBtn) editLogoBtn.disabled = true;
            }
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
        const activeScreen = currentProject.screens[currentProject.activeScreenIndex];
        const isDual = activeScreen ? (activeScreen.layout === "split_dual") : currentProject.screens.some(s => s.layout === "split_dual");
        const newScreen = isDual 
            ? createDualVideoScreen(currentProject.screens.length) 
            : createDefaultScreen(currentProject.screens.length);
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

    if (deletePhoneBtn) {
        deletePhoneBtn.addEventListener("click", () => {
            deleteScreenByIndex(currentProject.activeScreenIndex);
        });
    }

    // Control de menús desplegables de la barra superior (Formato, Preview, Exportar)
    const aspectDropdownTrigger = document.getElementById("aspect-dropdown-trigger");
    const aspectDropdownMenu = document.getElementById("aspect-dropdown-menu");
    const previewDropdownTrigger = document.getElementById("preview-dropdown-trigger");
    const previewDropdownMenu = document.getElementById("preview-dropdown-menu");
    const exportDropdownTrigger = document.getElementById("export-dropdown-trigger");
    const exportDropdownMenu = document.getElementById("export-dropdown-menu");

    function closeAllTopDropdowns() {
        if (aspectDropdownMenu) aspectDropdownMenu.classList.remove("open");
        if (aspectDropdownTrigger) aspectDropdownTrigger.classList.remove("open");
        if (previewDropdownMenu) previewDropdownMenu.classList.remove("open");
        if (previewDropdownTrigger) previewDropdownTrigger.classList.remove("open");
        if (exportDropdownMenu) exportDropdownMenu.classList.remove("open");
        if (exportDropdownTrigger) exportDropdownTrigger.classList.remove("open");
    }

    if (aspectDropdownTrigger && aspectDropdownMenu) {
        aspectDropdownTrigger.addEventListener("click", (e) => {
            e.stopPropagation();
            const wasOpen = aspectDropdownMenu.classList.contains("open");
            closeAllTopDropdowns();
            if (!wasOpen) {
                aspectDropdownMenu.classList.add("open");
                aspectDropdownTrigger.classList.add("open");
            }
        });

        aspectDropdownMenu.querySelectorAll(".topbar-dropdown-item").forEach(item => {
            item.addEventListener("click", () => {
                closeAllTopDropdowns();
            });
        });
    }

    if (previewDropdownTrigger && previewDropdownMenu) {
        previewDropdownTrigger.addEventListener("click", (e) => {
            e.stopPropagation();
            const wasOpen = previewDropdownMenu.classList.contains("open");
            closeAllTopDropdowns();
            if (!wasOpen) {
                previewDropdownMenu.classList.add("open");
                previewDropdownTrigger.classList.add("open");
            }
        });

        previewDropdownMenu.addEventListener("click", (e) => {
            e.stopPropagation(); // Permitir interactuar con el checkbox sin cerrar
        });
    }

    if (exportDropdownTrigger && exportDropdownMenu) {
        exportDropdownTrigger.addEventListener("click", (e) => {
            e.stopPropagation();
            const wasOpen = exportDropdownMenu.classList.contains("open");
            closeAllTopDropdowns();
            if (!wasOpen) {
                exportDropdownMenu.classList.add("open");
                exportDropdownTrigger.classList.add("open");
            }
        });

        exportDropdownMenu.querySelectorAll(".topbar-dropdown-item").forEach(item => {
            item.addEventListener("click", () => {
                closeAllTopDropdowns();
            });
        });

        if (recordVideoBtn) {
            const observer = new MutationObserver(() => {
                if (recordVideoBtn.classList.contains("recording")) {
                    exportDropdownTrigger.classList.add("recording");
                    exportDropdownTrigger.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Exportando...';
                } else {
                    exportDropdownTrigger.classList.remove("recording");
                    exportDropdownTrigger.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> Exportar <i class="fa-solid fa-chevron-down" style="font-size: 0.68rem; margin-left: 2px;"></i>';
                }
            });
            observer.observe(recordVideoBtn, { attributes: true, attributeFilter: ["class"] });
        }
    }

    document.addEventListener("click", () => {
        closeAllTopDropdowns();
    });

    // Listeners para botones de bloque (Título / Descripción) en el sidebar
    document.querySelectorAll(".card-target-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.dataset.target;
            if (target) {
                if (target === "header" && currentTemplate && currentTemplate.showHeaderCard === false) {
                    currentTemplate.showHeaderCard = true;
                    if (headerCard) headerCard.style.display = "flex";
                    syncTextBlocksVisibilityUI();
                    updateSidebarTextInputs();
                    saveTemplateQuietly();
                } else if (target === "footer" && currentTemplate && currentTemplate.showFooterCard === false) {
                    currentTemplate.showFooterCard = true;
                    if (footerCard) footerCard.style.display = "flex";
                    syncTextBlocksVisibilityUI();
                    updateSidebarTextInputs();
                    saveTemplateQuietly();
                }
                selectCard(target);
            }
        });
    });

    // Control de acordeón en el panel lateral (secciones colapsables)
    const sidebar = document.querySelector(".sidebar");
    if (sidebar) {
        sidebar.addEventListener("click", (e) => {
            const header = e.target.closest(".sidebar-section-header");
            if (!header) return;
            const section = header.closest(".sidebar-section");
            if (!section) return;

            const isOpen = section.classList.toggle("open");

            // Persistir estado en localStorage
            try {
                const sectionName = section.dataset.section;
                if (sectionName) {
                    localStorage.setItem(`sidebar_section_${sectionName}`, isOpen ? "open" : "closed");
                }
            } catch (err) {}
        });

        // Restaurar estado guardado desde localStorage
        try {
            document.querySelectorAll(".sidebar-section").forEach(sec => {
                const name = sec.dataset.section;
                if (!name) return;
                const saved = localStorage.getItem(`sidebar_section_${name}`);
                if (saved === "open") sec.classList.add("open");
                else if (saved === "closed") sec.classList.remove("open");
            });
        } catch (err) {}
    }

    // Auto-guíardado cada 30 segundos
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
        const hasTopVideo = currentTemplate.mediaType === "video" && (currentTemplate.mediaSrc || rawVideoFile);
        const hasBottomVideo = currentTemplate.layout === "split_dual" && currentTemplate.mediaBottomType === "video" && currentTemplate.mediaBottomSrc;
        const hasPersistentVideo = (currentTemplate.mediaSrc && currentTemplate.mediaSrc.startsWith("/uploads/")) ||
                                   (currentTemplate.mediaBottomSrc && currentTemplate.mediaBottomSrc.startsWith("/uploads/"));

        logToServer(`[Grabador] Click en botón de exportación. mediaType=${currentTemplate.mediaType}, bottomType=${currentTemplate.mediaBottomType}, tieneFile=${!!rawVideoFile}, tienePersistencia=${hasPersistentVideo}`);

        if (!hasTopVideo && !hasBottomVideo) {
            alert("Por favor, selecciona al menos un video (.mp4) en el simulador antes de exportar.");
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

            const activeScreen = (currentProject && currentProject.screens) ? currentProject.screens[currentProject.activeScreenIndex] : null;
            const effBgImg = (activeScreen && activeScreen.bgImageSrc) || currentTemplate.bgImageSrc || null;
            const effBgEffect = (activeScreen && activeScreen.bgEffect) || currentTemplate.bgEffect || (bgEffectSelect ? bgEffectSelect.value : "none");
            const effTheme = effBgImg ? "image" : ((activeScreen && activeScreen.theme) || currentTemplate.theme || themeSelect.value || "dark");
            const effCustomColor = (activeScreen && activeScreen.customColor) || currentTemplate.customColor;
            const effLayout = (activeScreen && activeScreen.layout) || currentTemplate.layout || "single";
            const effMediaType = (activeScreen && activeScreen.mediaType) || currentTemplate.mediaType || null;
            const effMediaSrc = (activeScreen && activeScreen.mediaSrc) || currentTemplate.mediaSrc || null;
            const effMediaBottomType = (activeScreen && activeScreen.mediaBottomType) || currentTemplate.mediaBottomType || null;
            const effMediaBottomSrc = (activeScreen && activeScreen.mediaBottomSrc) || currentTemplate.mediaBottomSrc || null;

            const exportPayload = {
                theme: effTheme,
                customColor: effCustomColor,
                bgImageSrc: effBgImg,
                bgEffect: effBgEffect,
                canvasWidth: reelCanvas ? reelCanvas.offsetWidth : 360,
                canvasHeight: reelCanvas ? reelCanvas.offsetHeight : 640,
                layout: currentTemplate.layout || "single",
                mediaType: currentTemplate.mediaType || null,
                mediaSrc: currentTemplate.mediaSrc || null,
                videoLeft: mediaContainer ? mediaContainer.offsetLeft : 0,
                videoTop: mediaContainer ? mediaContainer.offsetTop : 0,
                videoWidth: mediaContainer ? mediaContainer.offsetWidth : 320,
                videoHeight: mediaContainer ? mediaContainer.offsetHeight : 320,
                mediaBottomType: currentTemplate.mediaBottomType || null,
                mediaBottomSrc: currentTemplate.mediaBottomSrc || null,
                videoBottomLeft: mediaContainerBottom ? mediaContainerBottom.offsetLeft : 20,
                videoBottomTop: mediaContainerBottom ? mediaContainerBottom.offsetTop : 360,
                videoBottomWidth: mediaContainerBottom ? mediaContainerBottom.offsetWidth : 320,
                videoBottomHeight: mediaContainerBottom ? mediaContainerBottom.offsetHeight : 320,
                borderRadius: 12,
                headerHtml: (currentTemplate.showHeaderCard && headerTextEl) ? headerTextEl.innerHTML : "",
                headerStyle: (currentTemplate.showHeaderCard && headerCard && headerTextEl) ? {
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
                footerHtml: (currentTemplate.showFooterCard && footerTextEl) ? footerTextEl.innerHTML : "",
                footerStyle: (currentTemplate.showFooterCard && footerCard && footerTextEl) ? {
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
                logoStyle: (currentTemplate.logoSrc && logoCard) ? {
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
            if (headerCard) headerCard.style.display = e.target.checked ? "flex" : "none";
            syncTextBlocksVisibilityUI();
            updateSidebarTextInputs();
            saveTemplateQuietly();
        });
    }

    if (toggleFooterCard) {
        toggleFooterCard.addEventListener("change", (e) => {
            currentTemplate.showFooterCard = e.target.checked;
            if (footerCard) footerCard.style.display = e.target.checked ? "flex" : "none";
            syncTextBlocksVisibilityUI();
            updateSidebarTextInputs();
            saveTemplateQuietly();
        });
    }

    if (sidebarHeaderInput) {
        sidebarHeaderInput.addEventListener("focus", () => {
            selectCard("header");
        });
        sidebarHeaderInput.addEventListener("input", () => {
            autoResizeTextarea(sidebarHeaderInput);
            if (!currentTemplate) return;
            const val = sidebarHeaderInput.value;
            const htmlVal = plainTextToHtml(val);
            currentTemplate.headerText = htmlVal;
            if (headerTextEl) {
                headerTextEl.innerHTML = htmlVal;
                checkTextEmptyState(headerTextEl);
            }
            saveTemplateQuietly();
        });
    }

    if (sidebarFooterInput) {
        sidebarFooterInput.addEventListener("focus", () => {
            selectCard("footer");
        });
        sidebarFooterInput.addEventListener("input", () => {
            autoResizeTextarea(sidebarFooterInput);
            if (!currentTemplate) return;
            const val = sidebarFooterInput.value;
            const htmlVal = plainTextToHtml(val);
            currentTemplate.footerText = htmlVal;
            if (footerTextEl) {
                footerTextEl.innerHTML = htmlVal;
                checkTextEmptyState(footerTextEl);
            }
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
        if (currentProject && Array.isArray(currentProject.screens)) {
            currentProject.screens.forEach(s => {
                if (s.headerText) s.headerText = sanitizeMojibake(s.headerText);
                if (s.footerText) s.footerText = sanitizeMojibake(s.footerText);
            });
        }
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
    let shouldCancelBulkExport = false;

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
            if (isBulkExportRunning) {
                if (confirm("¿Deseas cancelar el procesamiento en lote actual? (Se detendrá en el video actual)")) {
                    shouldCancelBulkExport = true;
                }
                return;
            }
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
            shouldCancelBulkExport = false;
            disableBulkModalControls(true);
            bulkProgressContainer.style.display = "block";
            
            let completedCount = 0;
            const totalCount = indices.length;

            updateBulkProgress(0, totalCount, "Iniciando cola de procesamiento...");

            for (let i = 0; i < totalCount; i++) {
                if (shouldCancelBulkExport) {
                    updateBulkProgress(i, totalCount, "Procesamiento cancelado por el usuario.");
                    break;
                }

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

            if (shouldCancelBulkExport) {
                updateBulkProgress(completedCount, totalCount, "¡Exportación en lote cancelada!");
            } else {
                updateBulkProgress(totalCount, totalCount, "¡Exportación en lote finalizada!");
            }
            isBulkExportRunning = false;
            shouldCancelBulkExport = false;
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
                <div class="text-card" style="top: ${screen.positions?.header?.top || '40px'}; left: 20px; width: calc(100% - 40px); font-family: ${screen.fontTitle}; font-size: ${(screen.fontSizes.header / 100)}rem; color: ${screen.styles.header.color}; background-color: rgba(${hexToRgb(screen.styles.header.boxColor)}, ${screen.styles.header.opacity / 100}); display: block;">
                    <div class="text-content" style="font-size: 1.15em !important; line-height: 1.45 !important;">
                        ${screen.headerText}
                    </div>
                </div>
            ` : "";
            
            const mediaHtml = `
                <div class="media-container" style="top: ${screen.positions?.media?.top || '160px'}; left: 20px; display: flex;">
                    ${screen.mediaSrc ? (
                        screen.mediaType === "video" 
                        ? `<video src="${screen.mediaSrc}" preload="metadata" muted></video><div class="mini-play-icon" style="position: absolute; z-index: 10; font-size: 1.5rem; color: rgba(255,255,255,0.8); background: rgba(0,0,0,0.5); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-play"></i></div>`
                        : `<img src="${screen.mediaSrc}" style="width:100%; height:100%; object-fit:cover;" />`
                    ) : '<i class="fa-solid fa-video placeholder" style="font-size: 2.5rem; color:#4b5260;"></i>'}
                </div>
            `;
            
            const footerHtml = screen.showFooterCard && screen.styles?.footer ? `
                <div class="text-card" style="top: ${screen.positions?.footer?.top || '490px'}; left: 20px; width: calc(100% - 40px); font-family: ${screen.fontTitle}; font-size: ${(screen.fontSizes.footer / 100)}rem; color: ${screen.styles.footer.color}; background-color: rgba(${hexToRgb(screen.styles.footer.boxColor)}, ${screen.styles.footer.opacity / 100}); display: block;">
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
        cancelBulkBtn.disabled = false; // El botón de Cancelar siempre queda habilitado
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
        const mContBottom = document.getElementById(`media-container-bottom-${index}`);
        const lCard = document.getElementById(`logo-card-${index}`);
        
        const effBgImg = screenData.bgImageSrc || null;
        const effTheme = effBgImg ? "image" : (screenData.theme || "dark");

        return {
            theme: effTheme,
            customColor: screenData.customColor,
            bgImageSrc: screenData.bgImageSrc || null,
            bgEffect: screenData.bgEffect || "none",
            canvasWidth: scrCanvas ? scrCanvas.offsetWidth : 360,
            canvasHeight: scrCanvas ? scrCanvas.offsetHeight : 640,
            layout: screenData.layout || "single",
            mediaType: screenData.mediaType || null,
            mediaSrc: screenData.mediaSrc || null,
            videoLeft: mContainer ? mContainer.offsetLeft : 0,
            videoTop: mContainer ? mContainer.offsetTop : 0,
            videoWidth: mContainer ? mContainer.offsetWidth : 320,
            videoHeight: mContainer ? mContainer.offsetHeight : 320,
            mediaBottomType: screenData.mediaBottomType || null,
            mediaBottomSrc: screenData.mediaBottomSrc || null,
            videoBottomLeft: mContBottom ? mContBottom.offsetLeft : 20,
            videoBottomTop: mContBottom ? mContBottom.offsetTop : 360,
            videoBottomWidth: mContBottom ? mContBottom.offsetWidth : 320,
            videoBottomHeight: mContBottom ? mContBottom.offsetHeight : 320,
            borderRadius: 12,
            headerHtml: (screenData.showHeaderCard && hText) ? hText.innerHTML : "",
            headerStyle: (screenData.showHeaderCard && hCard && hText) ? {
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
            footerHtml: (screenData.showFooterCard && fText) ? fText.innerHTML : "",
            footerStyle: (screenData.showFooterCard && fCard && fText) ? {
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
            logoStyle: (screenData.logoSrc && lCard) ? {
                width: lCard.offsetWidth,
                height: lCard.offsetHeight,
                left: lCard.offsetLeft,
                top: lCard.offsetTop
            } : null
        };
    }

    // --- STICKER EDITOR LOGIC ---
    (function setupStickerEditor() {
        const overlay = document.getElementById('sticker-editor-overlay');
        if (!overlay) return;

        const modal         = document.getElementById('sticker-editor-modal');
        const canvas        = document.getElementById('sticker-editor-canvas');
        const ctx           = canvas.getContext('2d', { willReadFrequently: true });
        const cursorDiv     = document.getElementById('eraser-cursor-preview');
        const sizeSlider    = document.getElementById('eraser-size-slider');
        const sizeLabel     = document.getElementById('eraser-size-label');
        const sizeWrap      = document.getElementById('eraser-size-wrap');
        const undoBtn       = document.getElementById('eraser-undo-btn');
        const confirmBtn    = document.getElementById('sticker-editor-confirm');
        const cancelBtn     = document.getElementById('sticker-editor-cancel');
        const eraserToolBtn  = document.getElementById('tool-eraser-btn');
        const magicWandToolBtn = document.getElementById('tool-magicwand-btn');
        const restoreToolBtn = document.getElementById('tool-restore-btn');
        const cropToolBtn    = document.getElementById('tool-crop-btn');
        const canvasWrap     = document.getElementById('sticker-canvas-wrap');
        const cropOverlay    = document.getElementById('sticker-crop-overlay');
        const cropCtx        = cropOverlay ? cropOverlay.getContext('2d') : null;
        const cropHint       = document.getElementById('crop-hint');
        const cropPiecesList = document.getElementById('crop-pieces-list');
        const cropApplyBtn   = document.getElementById('sticker-crop-apply-btn');
        const cropPiecesCountEl = document.getElementById('crop-pieces-count');

        let editingImg    = null;
        let currentTool   = 'eraser'; 
        let undoStack     = [];        
        let isDrawing     = false;
        let eraserSize    = 20;

        let cropPieces      = [];
        let isCropDragging  = false;
        let cropStartX = 0, cropStartY = 0;

        const magicWandTolWrap = document.getElementById('magicwand-tol-wrap');
        const magicWandTolSlider = document.getElementById('magicwand-tol-slider');
        const magicWandTolLabel = document.getElementById('magicwand-tol-label');
        if(magicWandTolSlider) {
            magicWandTolSlider.addEventListener('input', (e) => {
                magicWandTolLabel.textContent = e.target.value;
            });
        }

        function getCanvasScale() {
            const rect = canvas.getBoundingClientRect();
            return { sx: canvas.width / rect.width, sy: canvas.height / rect.height };
        }

        function pushUndo() {
            undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
            if (undoStack.length > 30) undoStack.shift();
        }

        window.openEraserEditor = function(imgElement, initialTool = 'eraser') {
            editingImg = imgElement;
            undoStack  = [];
            resetCropState();
            setTool(initialTool);

            const natural = new Image();
            natural.crossOrigin = 'anonymous';
            natural.onload = () => {
                const maxW = 900, maxH = 700;
                let w = natural.width, h = natural.height;
                if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
                if (h > maxH) { w = Math.round(w * maxH / h); h = maxH; }
                canvas.width  = w;
                canvas.height = h;
                if (cropOverlay) {
                    cropOverlay.width = w;
                    cropOverlay.height = h;
                }
                ctx.clearRect(0, 0, w, h);
                ctx.drawImage(natural, 0, 0, w, h);
                pushUndo(); 
                overlay.classList.add('active');
            };
            natural.src = imgElement.src;
        };

        function setTool(tool) {
            currentTool = tool;
            eraserToolBtn.classList.toggle('active-tool', tool === 'eraser');
            magicWandToolBtn.classList.toggle('active-tool', tool === 'magicwand');
            restoreToolBtn.classList.toggle('active-tool', tool === 'restore');
            if (cropToolBtn) cropToolBtn.classList.toggle('active-tool', tool === 'crop');

            const isMagic = tool === 'magicwand';
            const isCrop = tool === 'crop';
            if (canvasWrap) canvasWrap.classList.toggle('crop-mode', isCrop);
            canvas.style.cursor = isMagic ? 'crosshair' : 'none';
            sizeWrap.style.display   = (isCrop || isMagic) ? 'none' : 'flex';
            if (magicWandTolWrap) magicWandTolWrap.style.display = isMagic ? 'flex' : 'none';
            
            undoBtn.style.display    = isCrop ? 'none' : 'flex';
            if (cropHint) cropHint.style.display   = isCrop ? 'block' : 'none';
            if (cropPiecesList) cropPiecesList.style.display = (isCrop && cropPieces.length > 0) ? 'flex' : 'none';
            confirmBtn.style.display = isCrop ? 'none' : 'flex';
            if (cropApplyBtn) cropApplyBtn.style.display = (isCrop && cropPieces.length > 0) ? 'flex' : 'none';
            
            if (isCrop || isMagic) cursorDiv.style.display = 'none';
        }

        eraserToolBtn.addEventListener('click', () => setTool('eraser'));
        magicWandToolBtn.addEventListener('click', () => setTool('magicwand'));
        restoreToolBtn.addEventListener('click', () => setTool('restore'));
        if (cropToolBtn) cropToolBtn.addEventListener('click', () => setTool('crop'));

        function resetCropState() {
            cropPieces = [];
            isCropDragging = false;
            if(cropPiecesList) {
                cropPiecesList.innerHTML = '';
                cropPiecesList.style.display = 'none';
            }
            if(cropApplyBtn) cropApplyBtn.style.display = 'none';
            if(cropPiecesCountEl) cropPiecesCountEl.textContent = '0';
            if (cropCtx && cropOverlay) cropCtx.clearRect(0, 0, cropOverlay.width, cropOverlay.height);
        }

        let activeCropPieceIndex = -1;
        let activeCropMode = null;
        let cropDragOffsetX = 0;
        let cropDragOffsetY = 0;
        const HANDLE_SIZE = 8;

        function autoTrimPiece(piece, sourceCtx) {
            const imgData = sourceCtx.getImageData(piece.x, piece.y, piece.w, piece.h);
            const data = imgData.data;
            const w = imgData.width;
            const h = imgData.height;
            let minX = w, minY = h, maxX = -1, maxY = -1;
            let hasPixels = false;
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const alpha = data[(y * w + x) * 4 + 3];
                    if (alpha > 10) {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                        hasPixels = true;
                    }
                }
            }
            if (!hasPixels) return null;
            return {
                x: piece.x + minX,
                y: piece.y + minY,
                w: maxX - minX + 1,
                h: maxY - minY + 1
            };
        }

        function drawCropHandle(x, y) {
            cropCtx.fillStyle = '#fff';
            cropCtx.fillRect(x - HANDLE_SIZE/2, y - HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE);
            cropCtx.strokeRect(x - HANDLE_SIZE/2, y - HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE);
        }

        function redrawCropOverlay(liveRect) {
            if(!cropCtx || !cropOverlay) return;
            cropCtx.clearRect(0, 0, cropOverlay.width, cropOverlay.height);
            cropCtx.lineWidth = 2;
            cropCtx.strokeStyle = '#8e44ad';
            
            cropPieces.forEach(p => {
                cropCtx.fillStyle = 'rgba(142, 68, 173, 0.18)';
                cropCtx.fillRect(p.x, p.y, p.w, p.h);
                cropCtx.strokeRect(p.x, p.y, p.w, p.h);
                
                drawCropHandle(p.x, p.y);
                drawCropHandle(p.x + p.w, p.y);
                drawCropHandle(p.x, p.y + p.h);
                drawCropHandle(p.x + p.w, p.y + p.h);
            });
            
            if (liveRect) {
                cropCtx.setLineDash([6, 4]);
                cropCtx.strokeStyle = '#e74c3c';
                cropCtx.fillStyle = 'rgba(231, 76, 60, 0.15)';
                cropCtx.fillRect(liveRect.x, liveRect.y, liveRect.w, liveRect.h);
                cropCtx.strokeRect(liveRect.x, liveRect.y, liveRect.w, liveRect.h);
                cropCtx.setLineDash([]);
            }
        }

        function addCropPieceThumb(piece, index) {
            const thumbCanvas = document.createElement('canvas');
            thumbCanvas.width  = piece.w;
            thumbCanvas.height = piece.h;
            thumbCanvas.getContext('2d').drawImage(
                canvas, piece.x, piece.y, piece.w, piece.h, 0, 0, piece.w, piece.h
            );
            const wrapDiv = document.createElement('div');
            wrapDiv.className = 'crop-piece-thumb';
            const img = document.createElement('img');
            img.src = thumbCanvas.toDataURL('image/webp', 0.8);
            wrapDiv.appendChild(img);
            const rmBtn = document.createElement('button');
            rmBtn.className = 'crop-piece-remove';
            rmBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
            rmBtn.addEventListener('click', () => {
                cropPieces.splice(index, 1);
                rebuildCropPiecesList();
            });
            wrapDiv.appendChild(rmBtn);
            if(cropPiecesList) cropPiecesList.appendChild(wrapDiv);
        }

        function rebuildCropPiecesList() {
            if(!cropPiecesList) return;
            cropPiecesList.innerHTML = '';
            cropPieces.forEach((p, i) => addCropPieceThumb(p, i));
            if(cropPiecesCountEl) cropPiecesCountEl.textContent = cropPieces.length;
            const hasPieces = cropPieces.length > 0;
            cropPiecesList.style.display = hasPieces ? 'flex' : 'none';
            if(cropApplyBtn) cropApplyBtn.style.display   = hasPieces ? 'flex' : 'none';
            redrawCropOverlay();
        }

        if(cropOverlay) {
            cropOverlay.addEventListener('mousedown', (e) => {
                if (currentTool !== 'crop') return;
                const rect = cropOverlay.getBoundingClientRect();
                const { sx, sy } = getCanvasScale();
                const curX = (e.clientX - rect.left) * sx;
                const curY = (e.clientY - rect.top)  * sy;

                activeCropPieceIndex = -1;
                activeCropMode = null;

                for (let i = cropPieces.length - 1; i >= 0; i--) {
                    const p = cropPieces[i];
                    const hs = HANDLE_SIZE;
                    if (Math.abs(curX - p.x) <= hs && Math.abs(curY - p.y) <= hs) {
                        activeCropPieceIndex = i; activeCropMode = 'nw'; break;
                    }
                    if (Math.abs(curX - (p.x + p.w)) <= hs && Math.abs(curY - p.y) <= hs) {
                        activeCropPieceIndex = i; activeCropMode = 'ne'; break;
                    }
                    if (Math.abs(curX - p.x) <= hs && Math.abs(curY - (p.y + p.h)) <= hs) {
                        activeCropPieceIndex = i; activeCropMode = 'sw'; break;
                    }
                    if (Math.abs(curX - (p.x + p.w)) <= hs && Math.abs(curY - (p.y + p.h)) <= hs) {
                        activeCropPieceIndex = i; activeCropMode = 'se'; break;
                    }
                    if (curX >= p.x && curX <= p.x + p.w && curY >= p.y && curY <= p.y + p.h) {
                        activeCropPieceIndex = i; 
                        activeCropMode = 'move';
                        cropDragOffsetX = curX - p.x;
                        cropDragOffsetY = curY - p.y;
                        break;
                    }
                }

                if (activeCropPieceIndex !== -1) {
                    isCropDragging = true;
                    return;
                }

                cropStartX = curX;
                cropStartY = curY;
                isCropDragging = true;
            });
            cropOverlay.addEventListener('mousemove', (e) => {
                if (currentTool !== 'crop') return;
                const rect = cropOverlay.getBoundingClientRect();
                const { sx, sy } = getCanvasScale();
                const curX = (e.clientX - rect.left) * sx;
                const curY = (e.clientY - rect.top)  * sy;

                let hoverMode = null;
                for (let i = cropPieces.length - 1; i >= 0; i--) {
                    const p = cropPieces[i];
                    const hs = HANDLE_SIZE;
                    if (Math.abs(curX - p.x) <= hs && Math.abs(curY - p.y) <= hs) { hoverMode = 'nwse-resize'; break; }
                    if (Math.abs(curX - (p.x + p.w)) <= hs && Math.abs(curY - (p.y + p.h)) <= hs) { hoverMode = 'nwse-resize'; break; }
                    if (Math.abs(curX - (p.x + p.w)) <= hs && Math.abs(curY - p.y) <= hs) { hoverMode = 'nesw-resize'; break; }
                    if (Math.abs(curX - p.x) <= hs && Math.abs(curY - (p.y + p.h)) <= hs) { hoverMode = 'nesw-resize'; break; }
                    if (curX >= p.x && curX <= p.x + p.w && curY >= p.y && curY <= p.y + p.h) { hoverMode = 'move'; break; }
                }
                cropOverlay.style.cursor = hoverMode || 'crosshair';

                if (!isCropDragging) return;

                if (activeCropPieceIndex !== -1) {
                    const p = cropPieces[activeCropPieceIndex];
                    if (activeCropMode === 'move') {
                        p.x = curX - cropDragOffsetX;
                        p.y = curY - cropDragOffsetY;
                    } else if (activeCropMode === 'nw') {
                        const newW = p.w + (p.x - curX);
                        const newH = p.h + (p.y - curY);
                        if (newW > 10) { p.w = newW; p.x = curX; }
                        if (newH > 10) { p.h = newH; p.y = curY; }
                    } else if (activeCropMode === 'ne') {
                        const newW = curX - p.x;
                        const newH = p.h + (p.y - curY);
                        if (newW > 10) { p.w = newW; }
                        if (newH > 10) { p.h = newH; p.y = curY; }
                    } else if (activeCropMode === 'sw') {
                        const newW = p.w + (p.x - curX);
                        const newH = curY - p.y;
                        if (newW > 10) { p.w = newW; p.x = curX; }
                        if (newH > 10) { p.h = newH; }
                    } else if (activeCropMode === 'se') {
                        const newW = curX - p.x;
                        const newH = curY - p.y;
                        if (newW > 10) { p.w = newW; }
                        if (newH > 10) { p.h = newH; }
                    }
                    redrawCropOverlay();
                    return;
                }

                const liveRect = {
                    x: Math.min(cropStartX, curX),
                    y: Math.min(cropStartY, curY),
                    w: Math.abs(curX - cropStartX),
                    h: Math.abs(curY - cropStartY)
                };
                redrawCropOverlay(liveRect);
            });
            window.addEventListener('mouseup', (e) => {
                if (currentTool !== 'crop' || !isCropDragging) return;
                isCropDragging = false;

                if (activeCropPieceIndex !== -1) {
                    activeCropPieceIndex = -1;
                    activeCropMode = null;
                    rebuildCropPiecesList();
                    return;
                }

                const rect = cropOverlay.getBoundingClientRect();
                const { sx, sy } = getCanvasScale();
                const curX = (e.clientX - rect.left) * sx;
                const curY = (e.clientY - rect.top)  * sy;
                const piece = {
                    x: Math.max(0, Math.round(Math.min(cropStartX, curX))),
                    y: Math.max(0, Math.round(Math.min(cropStartY, curY))),
                    w: Math.round(Math.abs(curX - cropStartX)),
                    h: Math.round(Math.abs(curY - cropStartY))
                };
                if (piece.w >= 8 && piece.h >= 8) {
                    piece.w = Math.min(piece.w, canvas.width  - piece.x);
                    piece.h = Math.min(piece.h, canvas.height - piece.y);
                    const trimmed = autoTrimPiece(piece, ctx);
                    if (trimmed && trimmed.w >= 8 && trimmed.h >= 8) {
                        cropPieces.push(trimmed);
                        rebuildCropPiecesList();
                    } else {
                        redrawCropOverlay();
                    }
                } else {
                    redrawCropOverlay();
                }
            });
        }

        if(cropApplyBtn) {
            cropApplyBtn.addEventListener('click', () => {
                if (!editingImg || cropPieces.length === 0) return;
                const parentBox = editingImg.parentElement;
                const originalW = parentBox ? parentBox.offsetWidth : 120;
                const originalH = parentBox ? parentBox.offsetHeight : 120;
                const scaleX = originalW / canvas.width;
                const scaleY = originalH / canvas.height;

                const screen = currentProject.screens[currentProject.activeScreenIndex];
                if(!screen.stickers) screen.stickers = [];

                cropPieces.forEach((piece, index) => {
                    const pieceCanvas = document.createElement('canvas');
                    pieceCanvas.width  = piece.w;
                    pieceCanvas.height = piece.h;
                    pieceCanvas.getContext('2d').drawImage(
                        canvas, piece.x, piece.y, piece.w, piece.h, 0, 0, piece.w, piece.h
                    );
                    const pieceSrc = pieceCanvas.toDataURL('image/webp', 0.8);
                    
                    const topPercent = 30 + (index * 5);
                    const leftPercent = 30 + (index * 5);
                    
                    screen.stickers.push({
                        src: pieceSrc,
                        width: '40%',
                        height: 'auto',
                        top: topPercent + '%',
                        left: leftPercent + '%',
                        id: 'sticker-' + Date.now() + '-' + Math.floor(Math.random() * 1000)
                    });
                });
                
                overlay.classList.remove('active');
                renderScreens(); // Re-render to show stickers
                selectScreen(currentProject.activeScreenIndex);
            });
        }

        sizeSlider.addEventListener('input', () => {
            eraserSize = parseInt(sizeSlider.value);
            sizeLabel.textContent = eraserSize + 'px';
            updateCursorSize();
        });

        function updateCursorSize() {
            const rect = canvas.getBoundingClientRect();
            const displayScale = rect.width / canvas.width;
            const displayPx = eraserSize * displayScale;
            cursorDiv.style.width  = displayPx + 'px';
            cursorDiv.style.height = displayPx + 'px';
        }

        canvas.addEventListener('mouseenter', () => {
            if (currentTool === 'magicwand') return;
            cursorDiv.style.display = 'block';
            updateCursorSize();
        });
        canvas.addEventListener('mouseleave', () => {
            cursorDiv.style.display = 'none';
        });
        canvas.addEventListener('mousemove', (e) => {
            if (currentTool === 'magicwand') return;
            cursorDiv.style.left = e.clientX + 'px';
            cursorDiv.style.top  = e.clientY + 'px';
            if (isDrawing) applyBrush(e);
        });

        function applyBrush(e) {
            const rect = canvas.getBoundingClientRect();
            const { sx, sy } = getCanvasScale();
            const cx = (e.clientX - rect.left) * sx;
            const cy = (e.clientY - rect.top)  * sy;
            const r  = eraserSize / 2;

            if (currentTool === 'eraser') {
                ctx.save();
                ctx.globalCompositeOperation = 'destination-out';
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0,0,0,1)';
                ctx.fill();
                ctx.restore();
            } else if (currentTool === 'restore') {
                if (undoStack.length === 0) return;
                const original = undoStack[0];
                const x0 = Math.max(0, Math.floor(cx - r));
                const y0 = Math.max(0, Math.floor(cy - r));
                const x1 = Math.min(canvas.width,  Math.ceil(cx + r));
                const y1 = Math.min(canvas.height, Math.ceil(cy + r));
                const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
                for (let py = y0; py < y1; py++) {
                    for (let px = x0; px < x1; px++) {
                        const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
                        if (dist <= r) {
                            const idx = (py * canvas.width + px) * 4;
                            current.data[idx]     = original.data[idx];
                            current.data[idx + 1] = original.data[idx + 1];
                            current.data[idx + 2] = original.data[idx + 2];
                            current.data[idx + 3] = original.data[idx + 3];
                        }
                    }
                }
                ctx.putImageData(current, 0, 0);
            }
        }

        canvas.addEventListener('mousedown', (e) => {
            if (currentTool === 'magicwand') {
                pushUndo();
                const rect = canvas.getBoundingClientRect();
                const { sx, sy } = getCanvasScale();
                const cx = Math.floor((e.clientX - rect.left) * sx);
                const cy = Math.floor((e.clientY - rect.top)  * sy);
                const tol = parseInt(magicWandTolSlider.value);
                
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                const targetIdx = (cy * canvas.width + cx) * 4;
                const tr = data[targetIdx], tg = data[targetIdx+1], tb = data[targetIdx+2], ta = data[targetIdx+3];
                
                if (ta === 0) return; 
                
                function match(pos) {
                    const r = data[pos], g = data[pos+1], b = data[pos+2], a = data[pos+3];
                    if (a === 0) return false;
                    return Math.abs(r - tr) <= tol && Math.abs(g - tg) <= tol && Math.abs(b - tb) <= tol && Math.abs(a - ta) <= tol;
                }

                const stack = [[cx, cy]];
                while(stack.length > 0) {
                    let [x, y] = stack.pop();
                    let pos = (y * canvas.width + x) * 4;
                    
                    while(y >= 0 && match(pos)) { y--; pos -= canvas.width * 4; }
                    pos += canvas.width * 4; y++;
                    
                    let reachLeft = false, reachRight = false;
                    while(y < canvas.height && match(pos)) {
                        data[pos+3] = 0; data[pos] = 0; data[pos+1] = 0; data[pos+2] = 0; 
                        
                        if(x > 0) {
                            if(match(pos - 4)) {
                                if(!reachLeft) { stack.push([x - 1, y]); reachLeft = true; }
                            } else reachLeft = false;
                        }
                        if(x < canvas.width - 1) {
                            if(match(pos + 4)) {
                                if(!reachRight) { stack.push([x + 1, y]); reachRight = true; }
                            } else reachRight = false;
                        }
                        y++; pos += canvas.width * 4;
                    }
                }
                ctx.putImageData(imageData, 0, 0);
            } else if (currentTool === 'eraser' || currentTool === 'restore') {
                pushUndo();
                isDrawing = true;
                applyBrush(e);
            }
        });
        window.addEventListener('mouseup', () => { isDrawing = false; });

        undoBtn.addEventListener('click', () => {
            if (undoStack.length <= 1) return; 
            undoStack.pop();
            ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);
        });

        confirmBtn.addEventListener('click', () => {
            if (!editingImg) return;
            const newSrc = canvas.toDataURL('image/png');
            editingImg.src = newSrc;
            
            // Determinar si era media, logo o sticker para guíardarlo en los datos persistentes de la pantalla
            if (editingImg.id.startsWith('reel-img-')) {
                const idx = editingImg.id.replace('reel-img-', '');
                currentProject.screens[idx].mediaSrc = newSrc;
                saveTemplateQuietly();
            } else if (editingImg.id.startsWith('logo-img-preview-')) {
                const idx = editingImg.id.replace('logo-img-preview-', '');
                currentProject.screens[idx].logoSrc = newSrc;
                saveTemplateQuietly();
            } else if (window._editingStickerScreenIdx !== undefined && window._editingStickerIdx !== undefined) {
                // Era un sticker editado desde el botón unificado
                const sIdx = window._editingStickerScreenIdx;
                const stickIdx = window._editingStickerIdx;
                if (currentProject.screens[sIdx] && currentProject.screens[sIdx].stickers && currentProject.screens[sIdx].stickers[stickIdx]) {
                    currentProject.screens[sIdx].stickers[stickIdx].src = newSrc;
                    saveTemplateQuietly();
                }
                window._editingStickerScreenIdx = undefined;
                window._editingStickerIdx = undefined;
            }
            closeEditor();
        });

        cancelBtn.addEventListener('click', closeEditor);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeEditor();
        });

        function closeEditor() {
            overlay.classList.remove('active');
            cursorDiv.style.display = 'none';
            editingImg = null;
            undoStack  = [];
            window._editingStickerScreenIdx = undefined;
            window._editingStickerIdx = undefined;
        }

        const editMediaBtn = document.getElementById('edit-media-btn');
        const editLogoBtn = document.getElementById('edit-logo-btn');

        if(editMediaBtn) {
            editMediaBtn.addEventListener('click', () => {
                const idx = currentProject.activeScreenIndex;
                const reelImg = document.getElementById(`reel-img-${idx}`);
                if (reelImg && reelImg.src && reelImg.style.display !== 'none') {
                    window.openEraserEditor(reelImg);
                } else {
                    alert('El editor mágico solo funciona con imágenes, no con videos.');
                }
            });
        }

        if(editLogoBtn) {
            editLogoBtn.addEventListener('click', () => {
                const idx = currentProject.activeScreenIndex;
                const logoImgPreview = document.getElementById(`logo-img-preview-${idx}`);
                if (logoImgPreview && logoImgPreview.src) {
                    window.openEraserEditor(logoImgPreview);
                }
            });
        }

        // BOTÓN EDITAR STICKER SELECCIONADA O ÚLTIMA CARGADA
        const editLastStickerBtn = document.getElementById('edit-last-sticker-btn');
        if (editLastStickerBtn) {
            editLastStickerBtn.addEventListener('click', () => {
                const idx = currentProject.activeScreenIndex;
                const screenData = currentProject.screens[idx];
                if (!screenData.stickers || screenData.stickers.length === 0) return;

                let targetStickerIdx = screenData.stickers.length - 1;
                
                // Si hay un sticker seleccionado, usar ese en lugar del último
                if (activeCardKey && activeCardKey.startsWith('sticker_')) {
                    const selectedIdx = parseInt(activeCardKey.split('_')[1], 10);
                    if (!isNaN(selectedIdx) && selectedIdx >= 0 && selectedIdx < screenData.stickers.length) {
                        targetStickerIdx = selectedIdx;
                    }
                }

                const stickerImgEl = document.querySelector(`#sticker-card-${idx}-${targetStickerIdx} img`);
                if (stickerImgEl) {
                    // Al confirmar, guíardar de vuelta en el sticker correspondiente
                    window._editingStickerScreenIdx = idx;
                    window._editingStickerIdx = targetStickerIdx;
                    window.openEraserEditor(stickerImgEl);
                }
            });
        }

    })();

    // --- ZOOM LOGIC FOR MEDIA (Delegado a js/media-zoom.js) ---

    // --- GESTIÓN COMPLETA DE EMOJIS (BOTÓN DIRECTO, DESPLEGABLE Y ÚLTIMOS USADOS) ---
    const RECENT_EMOJIS_KEY = 'reels_recent_emojis_list';
    const DEFAULT_RECENTS = ['🔥', '💡', '👇', '🚀', '😱', '🤯', '🎯', '⚡', '✨', '🎬', '❤️', '👏'];
    const POPULAR_QUICK_EMOJIS = ['🔥', '💡', '👇', '🚀', '😱', '🤯', '🎯', '⚡', '✨', '🎬', '❤️', '👏', '💯', '📌', '⚠️', '✅', '💬', '💥', '👀', '🎉'];

    function getRecentEmojis() {
        try {
            const saved = localStorage.getItem(RECENT_EMOJIS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch(e) {}
        return DEFAULT_RECENTS;
    }

    function addRecentEmoji(emoji) {
        if (!emoji) return;
        let list = getRecentEmojis().filter(e => e !== emoji);
        list.unshift(emoji);
        if (list.length > 12) list = list.slice(0, 12);
        try {
            localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(list));
        } catch(e) {}
        renderRecentEmojis();
    }

    function insertEmojiAtCursor(textarea, emoji) {
        if (!textarea) return;
        const start = textarea.selectionStart !== undefined ? textarea.selectionStart : textarea.value.length;
        const end = textarea.selectionEnd !== undefined ? textarea.selectionEnd : textarea.value.length;
        const originalText = textarea.value;
        const before = originalText.substring(0, start);
        const after = originalText.substring(end);

        textarea.value = before + emoji + after;
        const newPos = start + emoji.length;
        textarea.selectionStart = newPos;
        textarea.selectionEnd = newPos;
        textarea.focus();

        // Disparar input event para que sincronice de inmediato con el lienzo
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        addRecentEmoji(emoji);
    }

    function getActiveTextarea() {
        const headerInput = sidebarHeaderInput || document.getElementById('sidebar-header-input');
        const footerInput = sidebarFooterInput || document.getElementById('sidebar-footer-input');
        const showHeader = !currentTemplate || currentTemplate.showHeaderCard !== false;
        const showFooter = !currentTemplate || currentTemplate.showFooterCard !== false;

        if (activeCardKey === "footer" && showFooter) return footerInput;
        if (activeCardKey === "header" && showHeader) return headerInput;
        if (showHeader) return headerInput;
        if (showFooter) return footerInput;
        return null;
    }

    function renderRecentEmojis() {
        const bar = document.getElementById('recent-emojis-bar');
        if (!bar) return;
        const recents = getRecentEmojis();
        bar.innerHTML = recents.map(emoji => `
            <button type="button" class="quick-emoji-item" data-emoji="${emoji}" title="${emoji}">${emoji}</button>
        `).join('');
    }

    const EMOJI_CATEGORIES = {
        "🔥 Populares": ['🔥', '💡', '👇', '🚀', '😱', '🤯', '🎯', '⚡', '✨', '🎬', '❤️', '👏', '💯', '📌', '⚠️', '✅', '💬', '💥', '👀', '🎉'],
        "😂 Expresiones": ['😂', '🤣', '😍', '🥰', '😎', '🤩', '🤔', '🤫', '🥳', '🥺', '😡', '🥵', '🥶', '😴', '😇', '🤠', '🤖', '🤤'],
        "💪 Gestos & Éxito": ['🙌', '🙏', '🤝', '👍', '👎', '👊', '✌️', '👌', '🤞', '🤙', '🤳', '💪', '🧠', '👑', '🏆', '🥇', '💎'],
        "📈 Negocios & Redes": ['💰', '💵', '📈', '📉', '🔔', '📣', '🚨', '🛑', '🔑', '🏷️', '📱', '💻', '📸', '🎙️', '🎥', '⏳', '📅', '📍'],
        "🌟 Extras": ['🍿', '☕', '🍔', '🥑', '🍕', '🍻', '🚗', '✈️', '☀️', '🌙', '🌈', '🎁', '🎈', '🎵', '🎶', '❌', '❓', '❗']
    };

    function setupEmojiSystem() {
        // Posición manual personalizada si el usuario arrastra la ventana
        let userEmojiPos = null;

        // 1. Configurar botones directos en cabecera de título y descripción con vista rápida, categorías y biblioteca completa
        function setupQuickBar(btnId, barId, inputId) {
            const btn = document.getElementById(btnId);
            const bar = document.getElementById(barId);
            const input = document.getElementById(inputId);
            if (!btn || !bar || !input) return;

            // Mover el contenedor de emojis al body para que pueda desbordar libremente sin ser recortado
            if (bar.parentElement !== document.body) {
                document.body.appendChild(bar);
            }

            // Modo guardado ('floating' por defecto, o 'docked_right')
            let currentMode = 'floating';
            try {
                const savedMode = localStorage.getItem('reels_emoji_panel_mode');
                if (savedMode === 'docked_right' || savedMode === 'floating') currentMode = savedMode;
            } catch(e) {}

            bar.innerHTML = `
                <div class="quick-emoji-header">
                    <div class="quick-emoji-drag-handle" title="Arrastrar ventana a cualquier lugar">
                        <i class="fa-solid fa-grip-lines"></i>
                        <span>Emojis</span>
                    </div>
                    <div class="quick-emoji-header-actions">
                        <button type="button" class="quick-emoji-mode-btn" title="Alternar entre flotante y anclado al lateral derecho">
                            <i class="fa-solid fa-thumbtack"></i> <span class="mode-text">Anclar a la derecha</span>
                        </button>
                        <button type="button" class="quick-emoji-close-btn" title="Cerrar">&times;</button>
                    </div>
                </div>
                <div class="quick-emoji-top">
                    <div class="quick-emoji-grid">
                        ${POPULAR_QUICK_EMOJIS.map(emoji => `
                            <button type="button" class="quick-emoji-item" data-emoji="${emoji}" title="${emoji}">${emoji}</button>
                        `).join('')}
                    </div>
                    <div class="quick-emoji-footer-bar">
                        <button type="button" class="action-btn text-btn btn-toggle-more-emojis" style="font-size:0.72rem; padding: 3px 8px; border-radius:4px; border-color: rgba(255,255,255,0.2); color: #93c5fd;" title="Ver más categorías de emojis">➕ Ver más</button>
                        <button type="button" class="action-btn text-btn btn-open-full-picker" style="font-size:0.72rem; padding: 3px 8px; border-radius:4px; border-color: rgba(255,255,255,0.2); color: #34d399; margin-left: auto;" title="Buscador completo con 3000+ emojis">🔍 Toda la biblioteca</button>
                    </div>
                </div>
                <div class="quick-emoji-more-section" style="display: none;">
                    <div class="quick-emoji-expanded-wrap">
                        ${Object.entries(EMOJI_CATEGORIES).map(([catName, emojis]) => `
                            <div class="quick-emoji-category-title">${catName}</div>
                            <div class="quick-emoji-grid">
                                ${emojis.map(e => `<button type="button" class="quick-emoji-item" data-emoji="${e}" title="${e}">${e}</button>`).join('')}
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="quick-emoji-picker-container" style="display: none;"></div>
            `;

            const moreSection = bar.querySelector('.quick-emoji-more-section');
            const pickerContainer = bar.querySelector('.quick-emoji-picker-container');
            const toggleMoreBtn = bar.querySelector('.btn-toggle-more-emojis');
            const openFullPickerBtn = bar.querySelector('.btn-open-full-picker');
            const dragHandle = bar.querySelector('.quick-emoji-drag-handle');
            const modeBtn = bar.querySelector('.quick-emoji-mode-btn');
            const closeBtn = bar.querySelector('.quick-emoji-close-btn');
            let embeddedPicker = null;

            function applyModeUI() {
                if (currentMode === 'docked_right') {
                    bar.classList.add('is-docked-right');
                    bar.style.left = 'auto';
                    bar.style.right = '20px';
                    bar.style.top = '74px';
                    if (modeBtn) {
                        modeBtn.innerHTML = '<i class="fa-solid fa-up-right-from-square"></i> <span class="mode-text">Modo flotante</span>';
                        modeBtn.title = 'Cambiar a ventana flotante arrastrable';
                    }
                    if (dragHandle) dragHandle.style.cursor = 'default';
                } else {
                    bar.classList.remove('is-docked-right');
                    bar.style.right = 'auto';
                    if (modeBtn) {
                        modeBtn.innerHTML = '<i class="fa-solid fa-thumbtack"></i> <span class="mode-text">Anclar a la derecha</span>';
                        modeBtn.title = 'Anclar como panel en el margen derecho de la pantalla';
                    }
                    if (dragHandle) dragHandle.style.cursor = 'move';
                    positionFloating();
                }
            }

            function positionFloating() {
                if (currentMode === 'docked_right') {
                    bar.style.left = 'auto';
                    bar.style.right = '20px';
                    bar.style.top = '74px';
                    return;
                }

                // 1. Si el usuario ya arrastró la ventana con el ratón, respetar su posición elegida
                if (userEmojiPos) {
                    let left = Math.max(10, Math.min(window.innerWidth - bar.offsetWidth - 10, userEmojiPos.left));
                    let top = Math.max(10, Math.min(window.innerHeight - bar.offsetHeight - 10, userEmojiPos.top));
                    bar.style.left = `${left}px`;
                    bar.style.top = `${top}px`;
                    bar.style.right = 'auto';
                    return;
                }

                // 2. Posición automática por defecto: A LA DERECHA DE PANTALLA 1 (para ver la pantalla completa)
                const activePhone = document.querySelector('.phone-wrapper.active') || document.querySelector('.phone-wrapper');
                let left = 740;
                let top = 100;

                if (activePhone) {
                    const phoneRect = activePhone.getBoundingClientRect();
                    left = phoneRect.right + 20; // Justo a la derecha de Pantalla 1
                    top = Math.max(74, phoneRect.top + 10);
                } else {
                    const sidebar = document.querySelector('.sidebar');
                    const sidebarRect = sidebar ? sidebar.getBoundingClientRect() : null;
                    left = (sidebarRect ? sidebarRect.right : 306) + 380;
                }

                // Si en monitores pequeños se sale de la pantalla por la derecha, ajustar
                if (left + 380 > window.innerWidth - 10) {
                    left = Math.max(10, window.innerWidth - 385);
                }

                const popupHeight = bar.offsetHeight || 380;
                if (top + popupHeight > window.innerHeight - 15) {
                    top = Math.max(15, window.innerHeight - popupHeight - 15);
                }

                bar.style.left = `${left}px`;
                bar.style.top = `${top}px`;
                bar.style.right = 'auto';
            }

            // Alternar modos (Flotante arrastrable vs Anclado a la derecha)
            if (modeBtn) {
                modeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    currentMode = (currentMode === 'docked_right') ? 'floating' : 'docked_right';
                    try {
                        localStorage.setItem('reels_emoji_panel_mode', currentMode);
                    } catch(err) {}
                    applyModeUI();
                });
            }

            // Botón de cerrar
            if (closeBtn) {
                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    bar.style.display = 'none';
                    btn.classList.remove('active');
                });
            }

            // Arrastre con el mouse en modo flotante
            let isDragging = false;
            let dragOffsetX = 0;
            let dragOffsetY = 0;

            if (dragHandle) {
                dragHandle.addEventListener('mousedown', (e) => {
                    if (currentMode === 'docked_right') return;
                    isDragging = true;
                    const barRect = bar.getBoundingClientRect();
                    dragOffsetX = e.clientX - barRect.left;
                    dragOffsetY = e.clientY - barRect.top;
                    document.body.style.userSelect = 'none';
                    e.preventDefault();
                });
            }

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                let newLeft = e.clientX - dragOffsetX;
                let newTop = e.clientY - dragOffsetY;

                newLeft = Math.max(10, Math.min(window.innerWidth - bar.offsetWidth - 10, newLeft));
                newTop = Math.max(10, Math.min(window.innerHeight - bar.offsetHeight - 10, newTop));

                bar.style.left = `${newLeft}px`;
                bar.style.top = `${newTop}px`;
                bar.style.right = 'auto';

                userEmojiPos = { left: newLeft, top: newTop };
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    document.body.style.userSelect = '';
                }
            });

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (input.style.display === 'none') return;
                const isOpen = (bar.style.display === 'flex');
                document.querySelectorAll('.quick-emoji-popup').forEach(b => b.style.display = 'none');
                document.querySelectorAll('.btn-insert-emoji').forEach(b => b.classList.remove('active'));

                if (!isOpen) {
                    bar.style.display = 'flex';
                    btn.classList.add('active');
                    applyModeUI();
                }
            });

            bar.addEventListener('click', (e) => {
                e.stopPropagation();
                const emojiBtn = e.target.closest('.quick-emoji-item');
                if (emojiBtn && emojiBtn.dataset.emoji) {
                    const target = (document.activeElement && document.activeElement.tagName === 'TEXTAREA')
                        ? document.activeElement
                        : (getActiveTextarea() || input);
                    insertEmojiAtCursor(target, emojiBtn.dataset.emoji);
                    return;
                }

                const moreBtn = e.target.closest('.btn-toggle-more-emojis');
                if (moreBtn && moreSection) {
                    const isMoreOpen = (moreSection.style.display === 'block');
                    moreSection.style.display = isMoreOpen ? 'none' : 'block';
                    moreBtn.textContent = isMoreOpen ? '➕ Ver más' : '➖ Menos';
                    if (currentMode === 'floating') requestAnimationFrame(positionFloating);
                    return;
                }

                const fullPickerBtn = e.target.closest('.btn-open-full-picker');
                if (fullPickerBtn && pickerContainer) {
                    const isPickerOpen = (pickerContainer.style.display === 'block');
                    if (!isPickerOpen) {
                        pickerContainer.style.display = 'block';
                        fullPickerBtn.textContent = '✖ Ocultar biblioteca';
                        if (!embeddedPicker) {
                            embeddedPicker = document.createElement('emoji-picker');
                            embeddedPicker.className = 'dark';
                            embeddedPicker.setAttribute('locale', 'es');
                            embeddedPicker.addEventListener('emoji-click', (ev) => {
                                const unicode = ev.detail?.unicode;
                                if (unicode) {
                                    const target = (document.activeElement && document.activeElement.tagName === 'TEXTAREA')
                                        ? document.activeElement
                                        : (getActiveTextarea() || input);
                                    insertEmojiAtCursor(target, unicode);
                                }
                            });
                            pickerContainer.appendChild(embeddedPicker);
                        }
                    } else {
                        pickerContainer.style.display = 'none';
                        fullPickerBtn.textContent = '🔍 Toda la biblioteca';
                    }
                    if (currentMode === 'floating') requestAnimationFrame(positionFloating);
                    return;
                }
            });

            window.addEventListener('resize', () => {
                if (bar.style.display === 'flex' && currentMode === 'floating') positionFloating();
            }, { passive: true });
        }

        setupQuickBar('btn-emoji-header', 'emoji-bar-header', 'sidebar-header-input');
        setupQuickBar('btn-emoji-footer', 'emoji-bar-footer', 'sidebar-footer-input');

        // Cerrar popups de emojis rápidos al hacer clic fuera (no cerrar si se hace clic en cajas de texto o tarjetas de edición)
        document.addEventListener('click', (e) => {
            const isClickInside = e.target.closest('.btn-insert-emoji') ||
                                  e.target.closest('.quick-emoji-popup') ||
                                  e.target.closest('emoji-picker') ||
                                  e.target.closest('.sidebar-text-textarea') ||
                                  e.target.closest('#sidebar-header-group') ||
                                  e.target.closest('#sidebar-footer-group') ||
                                  e.target.closest('.text-card');

            if (!isClickInside) {
                document.querySelectorAll('.quick-emoji-popup').forEach(b => b.style.display = 'none');
                document.querySelectorAll('.btn-insert-emoji').forEach(b => b.classList.remove('active'));
            }
        });

        // 2. Configurar barra de últimos usados en Sección 4
        const recentBar = document.getElementById('recent-emojis-bar');
        if (recentBar) {
            recentBar.addEventListener('click', (e) => {
                const btn = e.target.closest('.quick-emoji-item');
                if (btn && btn.dataset.emoji) {
                    const targetInput = getActiveTextarea();
                    if (targetInput) insertEmojiAtCursor(targetInput, btn.dataset.emoji);
                }
            });
            renderRecentEmojis();
        }

        // 3. Configurar desplegable y selector web component <emoji-picker>
        const togglePickerBtn = document.getElementById('toggle-emoji-picker-btn');
        const pickerDropdown = document.getElementById('emoji-picker-dropdown');
        const closePickerBtn = document.getElementById('close-emoji-picker-btn');
        const emojiPickerEl = document.querySelector('emoji-picker');

        if (togglePickerBtn && pickerDropdown) {
            togglePickerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = (pickerDropdown.style.display === 'block');
                pickerDropdown.style.display = isOpen ? 'none' : 'block';
            });
        }

        if (closePickerBtn && pickerDropdown) {
            closePickerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                pickerDropdown.style.display = 'none';
            });
        }

        if (emojiPickerEl) {
            emojiPickerEl.addEventListener('emoji-click', (e) => {
                const unicode = e.detail?.unicode;
                if (unicode) {
                    const targetInput = getActiveTextarea();
                    if (targetInput) insertEmojiAtCursor(targetInput, unicode);
                }
            });
        }
    }

    setupEmojiSystem();

});
