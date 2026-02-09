/**
 * Zoom Controller
 * Handles canvas zoom, pan, and fit-to-window functionality
 */

const zoomController = {
    currentZoom: 1,
    minZoom: 0.1,
    maxZoom: 8,
    zoomStep: 0.25,
    naturalWidth: 0,
    naturalHeight: 0,

    /**
     * Initialize zoom controller
     */
    init() {
        this.currentZoom = 1;
        this.setupMouseWheelZoom();
        this.setupKeyboardZoom();
        this.setupPanning();
    },

    /**
     * Setup mouse wheel zoom
     */
    setupMouseWheelZoom() {
        const scrollArea = document.getElementById('canvas-scroll-area');
        if (!scrollArea) return;

        scrollArea.addEventListener('wheel', (e) => {
            if (!gifStudio || !gifStudio.isLoaded) return;

            // Only zoom if Ctrl/Cmd is held
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();

                if (e.deltaY < 0) {
                    this.zoomIn();
                } else {
                    this.zoomOut();
                }
            }
        }, { passive: false });
    },

    /**
     * Setup keyboard zoom shortcuts
     */
    setupKeyboardZoom() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger if typing in input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (!gifStudio || !gifStudio.isLoaded) return;

            // + or = to zoom in
            if ((e.key === '+' || e.key === '=') && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                this.zoomIn();
            }
            // - to zoom out
            else if (e.key === '-' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                this.zoomOut();
            }
            // 0 to reset zoom
            else if (e.key === '0' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                this.resetZoom();
            }
            // F to fit to window
            else if (e.key === 'f' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                this.fitToWindow();
            }
        });
    },

    /**
     * Setup panning (drag to scroll when zoomed)
     */
    setupPanning() {
        const scrollArea = document.getElementById('canvas-scroll-area');
        if (!scrollArea) return;

        let isDragging = false;
        let startX, startY, scrollLeft, scrollTop;

        scrollArea.addEventListener('mousedown', (e) => {
            // Only pan when there's something to scroll
            if (scrollArea.scrollWidth <= scrollArea.clientWidth &&
                scrollArea.scrollHeight <= scrollArea.clientHeight) {
                return;
            }

            isDragging = true;
            scrollArea.classList.add('scrollable');
            startX = e.pageX - scrollArea.offsetLeft;
            startY = e.pageY - scrollArea.offsetTop;
            scrollLeft = scrollArea.scrollLeft;
            scrollTop = scrollArea.scrollTop;
        });

        scrollArea.addEventListener('mouseleave', () => {
            isDragging = false;
        });

        scrollArea.addEventListener('mouseup', () => {
            isDragging = false;
        });

        scrollArea.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();

            const x = e.pageX - scrollArea.offsetLeft;
            const y = e.pageY - scrollArea.offsetTop;
            const walkX = (x - startX) * 1.5; // Speed multiplier
            const walkY = (y - startY) * 1.5;

            scrollArea.scrollLeft = scrollLeft - walkX;
            scrollArea.scrollTop = scrollTop - walkY;
        });
    },

    /**
     * Set the natural (original) dimensions of the GIF
     */
    setNaturalSize(width, height) {
        this.naturalWidth = width;
        this.naturalHeight = height;
    },

    /**
     * Zoom in
     */
    zoomIn() {
        const newZoom = Math.min(this.maxZoom, this.currentZoom + this.zoomStep);
        this.setZoom(newZoom);
    },

    /**
     * Zoom out
     */
    zoomOut() {
        const newZoom = Math.max(this.minZoom, this.currentZoom - this.zoomStep);
        this.setZoom(newZoom);
    },

    /**
     * Reset to 100% zoom
     */
    resetZoom() {
        this.setZoom(1);
    },

    /**
     * Fit GIF to window
     */
    fitToWindow() {
        if (!this.naturalWidth || !this.naturalHeight) return;

        const wrapper = document.getElementById('canvas-wrapper');
        if (!wrapper) return;

        const padding = 40; // Account for padding
        const availableWidth = wrapper.clientWidth - padding;
        const availableHeight = wrapper.clientHeight - padding;

        const scaleX = availableWidth / this.naturalWidth;
        const scaleY = availableHeight / this.naturalHeight;

        // Use the smaller scale to fit entirely
        const fitZoom = Math.min(scaleX, scaleY, 1); // Don't zoom above 100% for fit

        this.setZoom(fitZoom);
    },

    /**
     * Set zoom level
     * @param {number} zoom - Zoom multiplier (1 = 100%)
     */
    setZoom(zoom) {
        this.currentZoom = zoom;

        const canvas = document.getElementById('display-canvas');
        const scrollArea = document.getElementById('canvas-scroll-area');

        if (!canvas || !this.naturalWidth) return;

        // Calculate new display size
        const displayWidth = Math.round(this.naturalWidth * zoom);
        const displayHeight = Math.round(this.naturalHeight * zoom);

        // Apply via CSS (canvas internal size stays the same for quality)
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';

        // Update scrollable state
        if (scrollArea) {
            const isScrollable = displayWidth > scrollArea.parentElement.clientWidth ||
                                 displayHeight > scrollArea.parentElement.clientHeight;
            scrollArea.classList.toggle('scrollable', isScrollable);
        }

        // Update display
        this.updateZoomDisplay();

        // Update layer interaction overlay
        if (typeof layerInteraction !== 'undefined') {
            setTimeout(() => layerInteraction.updateOverlay(), 10);
        }
    },

    /**
     * Update the zoom level display
     */
    updateZoomDisplay() {
        const display = document.getElementById('zoom-level');
        if (display) {
            display.textContent = Math.round(this.currentZoom * 100) + '%';
        }
    },

    /**
     * Get current zoom level
     * @returns {number} Current zoom multiplier
     */
    getZoom() {
        return this.currentZoom;
    },

    /**
     * Reset controller state
     */
    reset() {
        this.currentZoom = 1;
        this.naturalWidth = 0;
        this.naturalHeight = 0;
        this.updateZoomDisplay();

        const canvas = document.getElementById('display-canvas');
        if (canvas) {
            canvas.style.width = '';
            canvas.style.height = '';
        }
    }
};
