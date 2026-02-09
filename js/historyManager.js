/**
 * History Manager for GIF Studio
 * Provides undo/redo functionality for editing operations
 */

class HistoryManager {
    constructor(maxHistory = 50) {
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistory = maxHistory;
        this.isBatching = false;
        this.batchActions = [];
    }

    /**
     * Save current state to history
     * @param {string} actionName - Description of the action
     */
    saveState(actionName = 'Edit') {
        if (this.isBatching) {
            // Collect actions during batch
            this.batchActions.push(actionName);
            return;
        }

        const state = this.captureState();
        state.actionName = actionName;

        this.undoStack.push(state);

        // Limit history size
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }

        // Clear redo stack when new action is performed
        this.redoStack = [];

        this.updateUI();
    }

    /**
     * Start batching multiple operations into a single undo action
     * @param {string} actionName - Description of the batched action
     */
    startBatch(actionName) {
        this.isBatching = true;
        this.batchActionName = actionName;
        this.batchActions = [];
        // Capture state at start of batch
        this.batchStartState = this.captureState();
    }

    /**
     * End batching and save the combined action
     */
    endBatch() {
        if (!this.isBatching) return;

        this.isBatching = false;

        if (this.batchActions.length > 0) {
            const state = this.batchStartState;
            state.actionName = this.batchActionName;
            this.undoStack.push(state);

            if (this.undoStack.length > this.maxHistory) {
                this.undoStack.shift();
            }

            this.redoStack = [];
        }

        this.batchStartState = null;
        this.batchActions = [];
        this.updateUI();
    }

    /**
     * Capture current project state
     * @returns {Object} State snapshot
     */
    captureState() {
        const state = {
            timestamp: Date.now(),
            layers: null,
            frames: null,
            selectedLayerIndex: -1,
            currentFrameIndex: 0
        };

        // Capture layer state
        if (gifStudio?.layerManager) {
            state.layers = this.cloneLayers(gifStudio.layerManager.layers);
            state.selectedLayerIndex = gifStudio.layerManager.selectedLayerIndex;
        }

        // Capture frame metadata (not pixel data - too large)
        if (gifStudio?.frameManager) {
            state.frames = this.cloneFrameMetadata(gifStudio.frameManager.frames);
        }

        // Capture playback position
        if (typeof playback !== 'undefined') {
            state.currentFrameIndex = playback.currentFrameIndex;
        }

        return state;
    }

    /**
     * Clone layers for history (without Image objects, just data)
     * @param {Array} layers - Layers to clone
     * @returns {Array} Cloned layer data
     */
    cloneLayers(layers) {
        return layers.map(layer => ({
            id: layer.id,
            name: layer.name,
            imageDataUrl: layer.imageDataUrl, // Keep reference - not modified during editing
            order: layer.order,
            keyframes: this.deepCloneObject(layer.keyframes)
        }));
    }

    /**
     * Clone frame metadata (delays, disposal, etc - not pixel data)
     * @param {Array} frames - Frames to clone
     * @returns {Array} Cloned frame metadata
     */
    cloneFrameMetadata(frames) {
        return frames.map(frame => ({
            index: frame.index,
            delay: frame.delay,
            disposalType: frame.disposalType,
            left: frame.left,
            top: frame.top,
            // Note: imageData is NOT cloned - too expensive
            // Frame order is represented by array index
        }));
    }

    /**
     * Deep clone a plain object
     * @param {Object} obj - Object to clone
     * @returns {Object} Cloned object
     */
    deepCloneObject(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.deepCloneObject(item));
        }

        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepCloneObject(obj[key]);
            }
        }
        return cloned;
    }

    /**
     * Undo last action
     * @returns {boolean} Success
     */
    undo() {
        if (this.undoStack.length === 0) {
            ui.showToast('Nothing to undo', 'info');
            return false;
        }

        // Save current state for redo
        const currentState = this.captureState();
        currentState.actionName = 'Redo';
        this.redoStack.push(currentState);

        // Pop and restore previous state
        const previousState = this.undoStack.pop();
        this.restoreState(previousState);

        ui.showToast(`Undid: ${previousState.actionName}`, 'info');
        this.updateUI();
        return true;
    }

    /**
     * Redo last undone action
     * @returns {boolean} Success
     */
    redo() {
        if (this.redoStack.length === 0) {
            ui.showToast('Nothing to redo', 'info');
            return false;
        }

        // Save current state for undo
        const currentState = this.captureState();
        currentState.actionName = this.redoStack[this.redoStack.length - 1].actionName;
        this.undoStack.push(currentState);

        // Pop and restore redo state
        const redoState = this.redoStack.pop();
        this.restoreState(redoState);

        ui.showToast('Redone', 'info');
        this.updateUI();
        return true;
    }

    /**
     * Restore a saved state
     * @param {Object} state - State to restore
     */
    async restoreState(state) {
        // Restore layers
        if (state.layers && gifStudio?.layerManager) {
            await this.restoreLayers(state.layers);
            gifStudio.layerManager.selectedLayerIndex = state.selectedLayerIndex;
        }

        // Restore frame metadata
        if (state.frames && gifStudio?.frameManager) {
            this.restoreFrameMetadata(state.frames);
        }

        // Update UI
        if (typeof layerPanel !== 'undefined') {
            layerPanel.render();
        }
        if (typeof timeline !== 'undefined') {
            timeline.rebuild();
        }
        if (typeof playback !== 'undefined') {
            playback.goToFrame(state.currentFrameIndex);
        }
        if (typeof layerInteraction !== 'undefined') {
            layerInteraction.updateOverlay();
        }
    }

    /**
     * Restore layers from saved state
     * @param {Array} savedLayers - Saved layer data
     */
    async restoreLayers(savedLayers) {
        const layerManager = gifStudio.layerManager;

        // Clear current layers
        layerManager.layers = [];

        // Restore each layer
        for (const savedLayer of savedLayers) {
            try {
                // Create new layer from saved data
                const layer = await layerManager.addLayer(savedLayer.imageDataUrl, savedLayer.name);
                layer.id = savedLayer.id;
                layer.order = savedLayer.order;
                layer.keyframes = this.deepCloneObject(savedLayer.keyframes);
            } catch (e) {
                console.error('Failed to restore layer:', savedLayer.name, e);
            }
        }

        // Sort by order
        layerManager.layers.sort((a, b) => a.order - b.order);

        // Update order values
        layerManager.layers.forEach((layer, i) => {
            layer.order = i;
        });
    }

    /**
     * Restore frame metadata from saved state
     * @param {Array} savedFrames - Saved frame metadata
     */
    restoreFrameMetadata(savedFrames) {
        const frameManager = gifStudio.frameManager;

        // Only restore metadata that we saved (delays, etc)
        // We don't restore frame order or add/remove frames from metadata
        // as that would require pixel data
        savedFrames.forEach((saved, index) => {
            if (frameManager.frames[index]) {
                frameManager.frames[index].delay = saved.delay;
                frameManager.frames[index].disposalType = saved.disposalType;
            }
        });
    }

    /**
     * Check if undo is available
     * @returns {boolean}
     */
    canUndo() {
        return this.undoStack.length > 0;
    }

    /**
     * Check if redo is available
     * @returns {boolean}
     */
    canRedo() {
        return this.redoStack.length > 0;
    }

    /**
     * Update UI elements (buttons) to reflect current state
     */
    updateUI() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');

        if (undoBtn) {
            undoBtn.disabled = !this.canUndo();
            undoBtn.title = this.canUndo()
                ? `Undo: ${this.undoStack[this.undoStack.length - 1].actionName} (Ctrl+Z)`
                : 'Nothing to undo';
        }

        if (redoBtn) {
            redoBtn.disabled = !this.canRedo();
            redoBtn.title = this.canRedo()
                ? 'Redo (Ctrl+Y)'
                : 'Nothing to redo';
        }
    }

    /**
     * Clear all history
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this.isBatching = false;
        this.batchActions = [];
        this.updateUI();
    }

    /**
     * Get history info for debugging
     * @returns {Object} History info
     */
    getInfo() {
        return {
            undoCount: this.undoStack.length,
            redoCount: this.redoStack.length,
            maxHistory: this.maxHistory,
            lastAction: this.undoStack.length > 0
                ? this.undoStack[this.undoStack.length - 1].actionName
                : null
        };
    }
}

// Global history manager instance
const historyManager = new HistoryManager();
