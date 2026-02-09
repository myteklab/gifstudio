/**
 * GIF Studio - Main Application Class
 * Coordinates all components and manages application state
 */

class GIFStudio {
    constructor() {
        this.parser = null;
        this.frameManager = null;
        this.layerManager = null;
        this.currentFilename = null;
        this.currentFileSize = 0;
        this.currentProjectId = null;
        this.currentProjectName = null;
        this.isLoaded = false;
    }

    /**
     * Initialize application
     */
    init() {
        console.log('GIF Studio initializing...');

        // Initialize components
        playback.init();
        timeline.init();
        zoomController.init();
        this.layerManager = new LayerManager();
        layerPanel.init();
        layerInteraction.init();

        // Setup drag and drop
        this.setupDragAndDrop();

        // Setup global keyboard shortcuts
        this.setupKeyboardShortcuts();

        console.log('GIF Studio initialized');
    }

    /**
     * Setup global keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger if typing in input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            // Ctrl+N - New Project
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                ui.showNewProjectModal();
            }
            // Ctrl+O - Open File
            else if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
                e.preventDefault();
                ui.openFile();
            }
            // Ctrl+S - Save
            else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                ui.saveGif();
            }
            // Ctrl+Z - Undo
            else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                historyManager.undo();
            }
            // Ctrl+Shift+Z or Ctrl+Y - Redo
            else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey) || (e.key === 'Z' && e.shiftKey))) {
                e.preventDefault();
                historyManager.redo();
            }
        });
    }

    /**
     * Setup drag and drop functionality
     */
    setupDragAndDrop() {
        const dropZone = document.getElementById('drop-zone');
        const body = document.body;

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            body.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // Highlight drop zone
        ['dragenter', 'dragover'].forEach(eventName => {
            body.addEventListener(eventName, () => {
                dropZone.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            body.addEventListener(eventName, () => {
                dropZone.classList.remove('drag-over');
            });
        });

        // Handle drop
        body.addEventListener('drop', async (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (file.type.includes('gif')) {
                    await this.loadGifFile(file);
                } else {
                    ui.showToast('Please drop a GIF file', 'error');
                }
            }
        });
    }

    /**
     * Load GIF file
     * @param {File} file - GIF file to load
     */
    async loadGifFile(file) {
        try {
            ui.setLoading(true, 'Loading GIF...');

            // Clear any existing layers (they'll be loaded separately for projects)
            if (this.layerManager) {
                this.layerManager.clear();
            }

            // Parse GIF
            this.parser = new GIFParser();
            const gifData = await this.parser.parse(file);

            // Store metadata
            this.currentFilename = file.name;
            this.currentFileSize = file.size;

            // Load into frame manager
            this.frameManager = new FrameManager();
            this.frameManager.loadFromParser(this.parser);

            // Setup display
            this.setupDisplay(gifData.width, gifData.height);

            // Build timeline
            timeline.build();

            // Update UI
            ui.updateGifInfo(
                gifData.width,
                gifData.height,
                gifData.frameCount,
                gifData.totalDuration,
                this.currentFileSize
            );

            // Reset playback and go to first frame
            playback.reset();
            playback.goToFrame(0);

            // Enable buttons
            ui.updateButtonStates(true);

            // Hide drop zone, show canvas
            document.getElementById('drop-zone').classList.add('hidden');
            document.getElementById('display-canvas').classList.add('active');

            this.isLoaded = true;

            // Clear and update history UI after loading
            if (typeof historyManager !== 'undefined') {
                historyManager.clear();
            }

            ui.showToast(`Loaded: ${this.currentFilename} (${gifData.frameCount} frames)`, 'success');

        } catch (error) {
            console.error('Error loading GIF:', error);
            ui.showToast('Failed to load GIF: ' + error.message, 'error');
        } finally {
            ui.setLoading(false);
        }
    }

    /**
     * Setup display canvas
     * @param {number} width - GIF width
     * @param {number} height - GIF height
     */
    setupDisplay(width, height) {
        const canvas = document.getElementById('display-canvas');
        canvas.width = width;
        canvas.height = height;

        // Set natural size for zoom controller
        zoomController.setNaturalSize(width, height);

        // Fit to window initially (good for large GIFs)
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            zoomController.fitToWindow();
        }, 50);

        // Clear canvas
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);
    }

    /**
     * Clear current GIF
     */
    clear() {
        if (this.parser) {
            this.parser.clear();
        }
        if (this.frameManager) {
            this.frameManager.clear();
        }

        playback.reset();
        timeline.clear();
        zoomController.reset();
        if (this.layerManager) {
            this.layerManager.clear();
        }

        // Clear undo/redo history
        if (typeof historyManager !== 'undefined') {
            historyManager.clear();
        }

        this.currentFilename = null;
        this.currentFileSize = 0;
        this.isLoaded = false;

        // Hide canvas, show drop zone
        document.getElementById('display-canvas').classList.remove('active');
        document.getElementById('drop-zone').classList.remove('hidden');

        // Reset UI
        ui.updateGifInfo(0, 0, 0, 0, 0);
        ui.updateButtonStates(false);
    }
}

// ── Platform Integration Helpers ──────────────────────────────

/**
 * Convert a Blob to a base64 data string (without the data: prefix)
 */
function blobToBase64(blob) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onloadend = function() {
            // Remove the "data:...;base64," prefix
            var base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Convert a base64 string back to a Blob
 */
function base64ToBlob(base64, mimeType) {
    var byteChars = atob(base64);
    var byteNumbers = new Array(byteChars.length);
    for (var i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
    }
    var byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
}

/**
 * Serialize the current project state for platform save
 * Returns JSON-safe object with base64-encoded GIF + layer data
 */
window.serializeProjectData = async function() {
    if (!gifStudio || !gifStudio.frameManager || gifStudio.frameManager.getFrameCount() === 0) {
        return null;
    }

    try {
        var blob = await ui.generateGifBlob();
        if (!blob) return null;

        var base64 = await blobToBase64(blob);
        var result = {
            gif: base64,
            width: gifStudio.frameManager.width,
            height: gifStudio.frameManager.height
        };

        if (gifStudio.layerManager && gifStudio.layerManager.getLayerCount() > 0) {
            result.layers = gifStudio.layerManager.exportData();
        }

        return result;
    } catch (err) {
        console.error('serializeProjectData error:', err);
        return null;
    }
};

/**
 * Load project data from platform
 * Decodes base64 GIF, feeds to loadGifFile, then restores layers
 */
window.loadProjectData = async function(data) {
    if (!data || !data.gif) return;

    try {
        var blob = base64ToBlob(data.gif, 'image/gif');
        var file = new File([blob], 'project.gif', { type: 'image/gif' });
        await gifStudio.loadGifFile(file);

        if (data.layers && Array.isArray(data.layers) && data.layers.length > 0) {
            await gifStudio.layerManager.importData(data.layers);
            layerPanel.render();
            playback.renderCurrentFrame();
        }
    } catch (err) {
        console.error('loadProjectData error:', err);
    }
};
