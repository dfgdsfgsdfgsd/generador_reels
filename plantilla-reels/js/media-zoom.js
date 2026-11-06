// =========================================================
// MÓDULO: MEDIA ZOOM (Zoom interactivo con rueda del ratón)
// =========================================================

(function(window) {
    "use strict";

    const ZOOM_SPEED = 0.05;
    const MIN_ZOOM = 1.0; // Bloqueado a 1.0 para que el video nunca deje marcos negros vacíos
    const MAX_ZOOM = 3.0;
    
    // Guardar zooms temporalmente por índice
    const zoomMap = {};

    function initMediaZoom() {
        document.addEventListener('wheel', (e) => {
            const mediaContainer = e.target.closest('.media-container');
            if (!mediaContainer) return;

            const match = mediaContainer.id.match(/media-container-(\d+)/);
            if (!match) return;
            const index = match[1];

            e.preventDefault();
            
            if (!zoomMap[index]) zoomMap[index] = 1;

            if (e.deltaY < 0) {
                zoomMap[index] += ZOOM_SPEED;
            } else {
                zoomMap[index] -= ZOOM_SPEED;
            }

            zoomMap[index] = Math.min(Math.max(zoomMap[index], MIN_ZOOM), MAX_ZOOM);

            const reelImg = document.getElementById(`reel-img-${index}`);
            const reelVideo = document.getElementById(`reel-video-${index}`);
            
            // Aplicar escala a los divs correspondientes
            if (reelImg && reelImg.style.display !== 'none') {
                reelImg.style.transform = `scale(${zoomMap[index]})`;
            }
            if (reelVideo && reelVideo.style.display !== 'none') {
                reelVideo.style.transform = `scale(${zoomMap[index]})`;
            }
        }, { passive: false });
    }

    function resetMediaZoom(index) {
        zoomMap[index] = 1;
        const reelImg = document.getElementById(`reel-img-${index}`);
        const reelVideo = document.getElementById(`reel-video-${index}`);
        if (reelImg) reelImg.style.transform = `scale(1)`;
        if (reelVideo) reelVideo.style.transform = `scale(1)`;
    }

    // Auto-iniciar al cargar el DOM o inmediatamente si ya cargó
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initMediaZoom);
    } else {
        initMediaZoom();
    }

    // Exponer API global unificada
    window.ReelsMediaZoom = {
        reset: resetMediaZoom
    };
    window.resetMediaZoom = resetMediaZoom;

})(typeof window !== "undefined" ? window : globalThis);
