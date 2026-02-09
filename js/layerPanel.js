/**
 * Layer Panel UI
 * Handles layer list display and layer property controls
 */

const layerPanel = {
    fileInput: null,

    /**
     * Initialize the layer panel
     */
    init() {
        this.createFileInput();
        this.render();
    },

    /**
     * Create hidden file input for image uploads
     */
    createFileInput() {
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = 'image/png,image/jpeg,image/jpg,image/gif';
        this.fileInput.style.display = 'none';
        this.fileInput.onchange = (e) => this.handleFileSelect(e);
        document.body.appendChild(this.fileInput);
    },

    /**
     * Render the entire layer panel
     */
    render() {
        this.renderLayerList();
        this.renderLayerProperties();
    },

    /**
     * Render the layer list
     */
    renderLayerList() {
        const listContainer = document.getElementById('layer-list');
        if (!listContainer) return;

        const layerManager = gifStudio?.layerManager;
        if (!layerManager || layerManager.getLayerCount() === 0) {
            listContainer.innerHTML = `
                <div class="empty-layer-state">
                    <p>No layers added</p>
                    <p style="font-size: 11px; color: #666;">Click "+ Add" to add an overlay image</p>
                </div>
            `;
            return;
        }

        const currentFrame = playback?.currentFrameIndex || 0;
        let html = '';

        // Render in reverse order (top layer first in list)
        const layers = layerManager.getOrderedLayers().reverse();

        layers.forEach((layer, displayIndex) => {
            const actualIndex = layerManager.layers.indexOf(layer);
            const isSelected = actualIndex === layerManager.selectedLayerIndex;
            const props = layerManager.getPropertiesAtFrame(actualIndex, currentFrame);
            const hasKeyframe = layerManager.hasKeyframe(actualIndex, currentFrame);

            html += `
                <div class="layer-item ${isSelected ? 'selected' : ''}"
                     data-index="${actualIndex}"
                     onclick="layerPanel.selectLayer(${actualIndex})">
                    <span class="layer-visibility ${props.visible ? '' : 'hidden'}"
                          onclick="event.stopPropagation(); layerPanel.toggleVisibility(${actualIndex})"
                          title="${props.visible ? 'Hide layer' : 'Show layer'}">
                        ${props.visible ? '👁️' : '👁️‍🗨️'}
                    </span>
                    <span class="layer-name"
                          title="Double-click to rename"
                          ondblclick="event.stopPropagation(); layerPanel.startRename(${actualIndex})">
                        ${layer.name}
                        ${hasKeyframe ? '<span class="keyframe-dot" title="Has keyframe at this frame">◆</span>' : ''}
                    </span>
                    <div class="layer-actions">
                        <button class="layer-btn" onclick="event.stopPropagation(); layerPanel.duplicateLayer(${actualIndex})" title="Duplicate">📋</button>
                        <button class="layer-btn danger" onclick="event.stopPropagation(); layerPanel.deleteLayer(${actualIndex})" title="Delete">🗑️</button>
                    </div>
                </div>
            `;
        });

        listContainer.innerHTML = html;
    },

    /**
     * Render layer properties for selected layer
     */
    renderLayerProperties() {
        const propsContainer = document.getElementById('layer-properties');
        if (!propsContainer) return;

        const layerManager = gifStudio?.layerManager;
        const selectedLayer = layerManager?.getSelectedLayer();

        if (!selectedLayer) {
            propsContainer.innerHTML = `
                <p style="color: #666; font-size: 12px; text-align: center; padding: 12px;">
                    Select a layer to edit properties
                </p>
            `;
            return;
        }

        const currentFrame = playback?.currentFrameIndex || 0;
        const props = layerManager.getPropertiesAtFrame(layerManager.selectedLayerIndex, currentFrame);
        const hasKeyframe = layerManager.hasKeyframe(layerManager.selectedLayerIndex, currentFrame);
        const keyframeIndices = layerManager.getKeyframeIndices(layerManager.selectedLayerIndex);

        propsContainer.innerHTML = `
            <div class="layer-prop-row">
                <label>Opacity:</label>
                <input type="range" id="layer-opacity" min="0" max="100" value="${Math.round(props.opacity * 100)}"
                       onchange="layerPanel.updateOpacity(this.value)" oninput="layerPanel.previewOpacity(this.value)">
                <span id="opacity-value">${Math.round(props.opacity * 100)}%</span>
            </div>

            <div class="layer-prop-row">
                <label>Position:</label>
                <div class="prop-inputs">
                    <span>X:</span>
                    <input type="number" id="layer-x" value="${Math.round(props.x)}"
                           onchange="layerPanel.updatePosition()">
                    <span>Y:</span>
                    <input type="number" id="layer-y" value="${Math.round(props.y)}"
                           onchange="layerPanel.updatePosition()">
                </div>
            </div>

            <div class="layer-prop-row">
                <label>Scale:</label>
                <div class="prop-inputs">
                    <span>X:</span>
                    <input type="number" id="layer-scale-x" value="${props.scaleX.toFixed(2)}" step="0.1" min="0.1" max="10"
                           onchange="layerPanel.updateScale()">
                    <span>Y:</span>
                    <input type="number" id="layer-scale-y" value="${props.scaleY.toFixed(2)}" step="0.1" min="0.1" max="10"
                           onchange="layerPanel.updateScale()">
                </div>
            </div>

            <div class="layer-prop-row">
                <label>Rotation:</label>
                <div class="prop-inputs">
                    <input type="number" id="layer-rotation" value="${Math.round(props.rotation)}" step="1" min="-360" max="360"
                           onchange="layerPanel.updateRotation()">
                    <span>deg</span>
                </div>
            </div>

            <div class="keyframe-controls">
                <div class="keyframe-status">
                    ${hasKeyframe
                        ? `<span class="has-keyframe">◆ Keyframe at frame ${currentFrame + 1}</span>`
                        : `<span class="no-keyframe">◇ No keyframe (using frame ${this.findNearestKeyframe(keyframeIndices, currentFrame) + 1})</span>`
                    }
                </div>
                <div class="keyframe-buttons">
                    <button class="btn small secondary" onclick="layerPanel.setKeyframe()" title="Set keyframe at current frame">
                        Set Keyframe
                    </button>
                    <button class="btn small secondary" onclick="layerPanel.deleteKeyframe()"
                            ${!hasKeyframe || keyframeIndices.length <= 1 ? 'disabled' : ''}
                            title="Delete keyframe at current frame">
                        Delete Keyframe
                    </button>
                </div>
                <div class="keyframe-list">
                    <span style="font-size: 11px; color: #888;">Keyframes: </span>
                    ${keyframeIndices.map(f => `<span class="keyframe-badge ${f === currentFrame ? 'current' : ''}" onclick="playback.goToFrame(${f})">${f + 1}</span>`).join('')}
                </div>
            </div>
        `;
    },

    /**
     * Find nearest keyframe at or before given frame
     */
    findNearestKeyframe(keyframeIndices, frameIndex) {
        let nearest = keyframeIndices[0] || 0;
        for (const kf of keyframeIndices) {
            if (kf <= frameIndex) {
                nearest = kf;
            } else {
                break;
            }
        }
        return nearest;
    },

    /**
     * Open file picker to add a new layer
     */
    addLayer() {
        if (!gifStudio?.isLoaded) {
            ui.showToast('Load a GIF first before adding layers', 'error');
            return;
        }
        this.fileInput.click();
    },

    /**
     * Handle file selection for new layer
     */
    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Reset input for next selection
        this.fileInput.value = '';

        try {
            historyManager.saveState('Add Layer');

            const dataUrl = await this.fileToDataUrl(file);
            const name = file.name.replace(/\.[^/.]+$/, ''); // Remove extension

            const layer = await gifStudio.layerManager.addLayer(dataUrl, name);

            // Center the layer on the canvas
            const canvasWidth = gifStudio.frameManager?.width || 400;
            const canvasHeight = gifStudio.frameManager?.height || 300;
            const x = Math.round((canvasWidth - layer.image.width) / 2);
            const y = Math.round((canvasHeight - layer.image.height) / 2);

            gifStudio.layerManager.setKeyframe(gifStudio.layerManager.layers.length - 1, 0, {
                x: x,
                y: y
            });

            this.render();
            playback.renderCurrentFrame();
            if (typeof layerInteraction !== 'undefined') {
                layerInteraction.updateOverlay();
            }

            ui.showToast(`Added layer: ${layer.name}`, 'success');
        } catch (error) {
            console.error('Failed to add layer:', error);
            ui.showToast('Failed to add layer: ' + error.message, 'error');
        }
    },

    /**
     * Convert file to data URL
     */
    fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    },

    /**
     * Select a layer
     */
    selectLayer(index) {
        gifStudio.layerManager.selectLayer(index);
        this.render();
        // Update layer interaction overlay
        if (typeof layerInteraction !== 'undefined') {
            layerInteraction.updateOverlay();
        }
    },

    /**
     * Toggle layer visibility at current frame
     */
    toggleVisibility(index) {
        historyManager.saveState('Toggle Visibility');
        const currentFrame = playback?.currentFrameIndex || 0;
        gifStudio.layerManager.toggleVisibility(index, currentFrame);
        this.render();
        playback.renderCurrentFrame();
    },

    /**
     * Duplicate a layer
     */
    duplicateLayer(index) {
        historyManager.saveState('Duplicate Layer');
        const newLayer = gifStudio.layerManager.duplicateLayer(index);
        if (newLayer) {
            this.render();
            playback.renderCurrentFrame();
            ui.showToast(`Duplicated: ${newLayer.name}`, 'success');
        }
    },

    /**
     * Delete a layer
     */
    async deleteLayer(index) {
        const layer = gifStudio.layerManager.getLayer(index);
        if (!layer) return;

        const confirmed = await ui.showConfirm(`Delete layer "${layer.name}"?`, {
            title: 'Delete Layer',
            confirmText: 'Delete',
            danger: true
        });

        if (confirmed) {
            historyManager.saveState('Delete Layer');
            gifStudio.layerManager.deleteLayer(index);
            this.render();
            playback.renderCurrentFrame();
            if (typeof layerInteraction !== 'undefined') {
                layerInteraction.updateOverlay();
            }
            ui.showToast('Layer deleted', 'info');
        }
    },

    /**
     * Preview opacity change (during drag)
     */
    previewOpacity(value) {
        document.getElementById('opacity-value').textContent = value + '%';
        // Optionally render preview
        const currentFrame = playback?.currentFrameIndex || 0;
        const layerIndex = gifStudio.layerManager.selectedLayerIndex;
        if (layerIndex >= 0) {
            // Temporarily set and render
            const props = gifStudio.layerManager.getPropertiesAtFrame(layerIndex, currentFrame);
            props.opacity = value / 100;
            // We'll let updateOpacity do the actual save
        }
    },

    /**
     * Update layer opacity
     */
    updateOpacity(value) {
        const currentFrame = playback?.currentFrameIndex || 0;
        const layerIndex = gifStudio.layerManager.selectedLayerIndex;
        if (layerIndex >= 0) {
            historyManager.saveState('Change Opacity');
            gifStudio.layerManager.setOpacity(layerIndex, currentFrame, value / 100);
            playback.renderCurrentFrame();
            this.renderLayerProperties();
        }
    },

    /**
     * Update layer position
     */
    updatePosition() {
        const x = parseInt(document.getElementById('layer-x').value) || 0;
        const y = parseInt(document.getElementById('layer-y').value) || 0;
        const currentFrame = playback?.currentFrameIndex || 0;
        const layerIndex = gifStudio.layerManager.selectedLayerIndex;
        if (layerIndex >= 0) {
            historyManager.saveState('Change Position');
            gifStudio.layerManager.setPosition(layerIndex, currentFrame, x, y);
            playback.renderCurrentFrame();
            this.renderLayerProperties();
            if (typeof layerInteraction !== 'undefined') {
                layerInteraction.updateOverlay();
            }
        }
    },

    /**
     * Update layer scale
     */
    updateScale() {
        const scaleX = parseFloat(document.getElementById('layer-scale-x').value) || 1;
        const scaleY = parseFloat(document.getElementById('layer-scale-y').value) || 1;
        const currentFrame = playback?.currentFrameIndex || 0;
        const layerIndex = gifStudio.layerManager.selectedLayerIndex;
        if (layerIndex >= 0) {
            historyManager.saveState('Change Scale');
            gifStudio.layerManager.setScale(layerIndex, currentFrame, scaleX, scaleY);
            playback.renderCurrentFrame();
            this.renderLayerProperties();
            if (typeof layerInteraction !== 'undefined') {
                layerInteraction.updateOverlay();
            }
        }
    },

    /**
     * Update layer rotation
     */
    updateRotation() {
        const rotation = parseFloat(document.getElementById('layer-rotation').value) || 0;
        const currentFrame = playback?.currentFrameIndex || 0;
        const layerIndex = gifStudio.layerManager.selectedLayerIndex;
        if (layerIndex >= 0) {
            historyManager.saveState('Change Rotation');
            gifStudio.layerManager.setRotation(layerIndex, currentFrame, rotation);
            playback.renderCurrentFrame();
            this.renderLayerProperties();
            if (typeof layerInteraction !== 'undefined') {
                layerInteraction.updateOverlay();
            }
        }
    },

    /**
     * Set keyframe at current frame
     */
    setKeyframe() {
        const currentFrame = playback?.currentFrameIndex || 0;
        const layerIndex = gifStudio.layerManager.selectedLayerIndex;
        if (layerIndex >= 0) {
            historyManager.saveState('Set Keyframe');
            // Get current UI values
            const opacity = parseInt(document.getElementById('layer-opacity')?.value || 100) / 100;
            const x = parseInt(document.getElementById('layer-x')?.value || 0);
            const y = parseInt(document.getElementById('layer-y')?.value || 0);
            const scaleX = parseFloat(document.getElementById('layer-scale-x')?.value || 1);
            const scaleY = parseFloat(document.getElementById('layer-scale-y')?.value || 1);
            const rotation = parseFloat(document.getElementById('layer-rotation')?.value || 0);
            const props = gifStudio.layerManager.getPropertiesAtFrame(layerIndex, currentFrame);

            gifStudio.layerManager.setKeyframe(layerIndex, currentFrame, {
                visible: props.visible,
                opacity: opacity,
                x: x,
                y: y,
                scaleX: scaleX,
                scaleY: scaleY,
                rotation: rotation
            });

            this.renderLayerProperties();
            ui.showToast(`Keyframe set at frame ${currentFrame + 1}`, 'success');
        }
    },

    /**
     * Delete keyframe at current frame
     */
    deleteKeyframe() {
        const currentFrame = playback?.currentFrameIndex || 0;
        const layerIndex = gifStudio.layerManager.selectedLayerIndex;
        if (layerIndex >= 0) {
            historyManager.saveState('Delete Keyframe');
            if (gifStudio.layerManager.deleteKeyframe(layerIndex, currentFrame)) {
                playback.renderCurrentFrame();
                this.renderLayerProperties();
                ui.showToast(`Keyframe deleted at frame ${currentFrame + 1}`, 'info');
            } else {
                ui.showToast('Cannot delete the only keyframe', 'error');
            }
        }
    },

    /**
     * Start inline rename for a layer
     * @param {number} index - Layer index
     */
    startRename(index) {
        const layer = gifStudio.layerManager.getLayer(index);
        if (!layer) return;

        // Find the layer item element
        const layerItem = document.querySelector(`.layer-item[data-index="${index}"]`);
        if (!layerItem) return;

        const nameSpan = layerItem.querySelector('.layer-name');
        if (!nameSpan) return;

        // Create input field
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'layer-rename-input';
        input.value = layer.name;
        input.maxLength = 50;

        // Handle Enter key to confirm
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.confirmRename(index, input.value);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.cancelRename(index);
            }
        };

        // Handle blur to confirm
        input.onblur = () => {
            this.confirmRename(index, input.value);
        };

        // Replace name span with input
        nameSpan.innerHTML = '';
        nameSpan.appendChild(input);
        input.focus();
        input.select();
    },

    /**
     * Confirm layer rename
     * @param {number} index - Layer index
     * @param {string} newName - New layer name
     */
    confirmRename(index, newName) {
        const trimmed = newName.trim();
        if (trimmed.length === 0) {
            ui.showToast('Layer name cannot be empty', 'error');
            this.cancelRename(index);
            return;
        }

        historyManager.saveState('Rename Layer');
        if (gifStudio.layerManager.renameLayer(index, trimmed)) {
            ui.showToast(`Renamed to "${trimmed}"`, 'success');
        }
        this.render();
    },

    /**
     * Cancel layer rename
     * @param {number} index - Layer index
     */
    cancelRename(index) {
        this.render();
    }
};
