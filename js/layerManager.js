/**
 * Layer Manager
 * Handles overlay layers with per-frame keyframe support
 */

class LayerManager {
    constructor() {
        this.layers = [];
        this.selectedLayerIndex = -1;
    }

    /**
     * Add a new layer from an image
     * @param {string} imageDataUrl - Base64 data URL of the image
     * @param {string} name - Layer name
     * @returns {Promise<Object>} The created layer
     */
    async addLayer(imageDataUrl, name = null) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const layer = {
                    id: 'layer_' + Date.now(),
                    name: name || `Layer ${this.layers.length + 1}`,
                    image: img,
                    imageDataUrl: imageDataUrl,
                    order: this.layers.length,
                    keyframes: {
                        // Default keyframe at frame 0
                        0: this.createDefaultKeyframe()
                    }
                };

                this.layers.push(layer);
                this.selectedLayerIndex = this.layers.length - 1;

                resolve(layer);
            };

            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };

            img.src = imageDataUrl;
        });
    }

    /**
     * Create default keyframe properties
     * @returns {Object} Default keyframe
     */
    createDefaultKeyframe() {
        return {
            visible: true,
            opacity: 1.0,
            x: 0,
            y: 0,
            scaleX: 1.0,
            scaleY: 1.0,
            rotation: 0
        };
    }

    /**
     * Get layer by index
     * @param {number} index - Layer index
     * @returns {Object|null} Layer object
     */
    getLayer(index) {
        return this.layers[index] || null;
    }

    /**
     * Get layer by ID
     * @param {string} id - Layer ID
     * @returns {Object|null} Layer object
     */
    getLayerById(id) {
        return this.layers.find(l => l.id === id) || null;
    }

    /**
     * Get all layers ordered by their order property
     * @returns {Array} Ordered layers (lowest order first = bottom layer)
     */
    getOrderedLayers() {
        return [...this.layers].sort((a, b) => a.order - b.order);
    }

    /**
     * Get layer count
     * @returns {number} Number of layers
     */
    getLayerCount() {
        return this.layers.length;
    }

    /**
     * Get currently selected layer
     * @returns {Object|null} Selected layer
     */
    getSelectedLayer() {
        return this.layers[this.selectedLayerIndex] || null;
    }

    /**
     * Select a layer by index
     * @param {number} index - Layer index
     */
    selectLayer(index) {
        if (index >= -1 && index < this.layers.length) {
            this.selectedLayerIndex = index;
        }
    }

    /**
     * Delete a layer
     * @param {number} index - Layer index to delete
     * @returns {boolean} Success
     */
    deleteLayer(index) {
        if (index < 0 || index >= this.layers.length) {
            return false;
        }

        this.layers.splice(index, 1);

        // Update order values
        this.layers.forEach((layer, i) => {
            layer.order = i;
        });

        // Adjust selection
        if (this.selectedLayerIndex >= this.layers.length) {
            this.selectedLayerIndex = this.layers.length - 1;
        }

        return true;
    }

    /**
     * Duplicate a layer
     * @param {number} index - Layer index to duplicate
     * @returns {Object|null} New layer
     */
    duplicateLayer(index) {
        const layer = this.layers[index];
        if (!layer) return null;

        // Deep clone keyframes
        const clonedKeyframes = {};
        for (const frameIndex in layer.keyframes) {
            clonedKeyframes[frameIndex] = { ...layer.keyframes[frameIndex] };
        }

        const newLayer = {
            id: 'layer_' + Date.now(),
            name: layer.name + ' (Copy)',
            image: layer.image, // Same image reference is fine
            imageDataUrl: layer.imageDataUrl,
            order: this.layers.length,
            keyframes: clonedKeyframes
        };

        this.layers.push(newLayer);
        this.selectedLayerIndex = this.layers.length - 1;

        return newLayer;
    }

    /**
     * Rename a layer
     * @param {number} index - Layer index
     * @param {string} newName - New name
     * @returns {boolean} Success
     */
    renameLayer(index, newName) {
        const layer = this.layers[index];
        if (!layer) return false;

        const trimmed = newName.trim();
        if (trimmed.length === 0 || trimmed.length > 50) {
            return false;
        }

        layer.name = trimmed;
        return true;
    }

    /**
     * Reorder a layer
     * @param {number} fromIndex - Current index
     * @param {number} toIndex - Target index
     */
    reorderLayer(fromIndex, toIndex) {
        if (fromIndex === toIndex) return;
        if (fromIndex < 0 || fromIndex >= this.layers.length) return;
        if (toIndex < 0 || toIndex >= this.layers.length) return;

        const layer = this.layers.splice(fromIndex, 1)[0];
        this.layers.splice(toIndex, 0, layer);

        // Update order values
        this.layers.forEach((l, i) => {
            l.order = i;
        });

        // Update selection to follow the moved layer
        if (this.selectedLayerIndex === fromIndex) {
            this.selectedLayerIndex = toIndex;
        } else if (fromIndex < this.selectedLayerIndex && toIndex >= this.selectedLayerIndex) {
            this.selectedLayerIndex--;
        } else if (fromIndex > this.selectedLayerIndex && toIndex <= this.selectedLayerIndex) {
            this.selectedLayerIndex++;
        }
    }

    /**
     * Move layer up in stack (higher order = renders on top)
     * @param {number} index - Layer index
     */
    moveLayerUp(index) {
        if (index < this.layers.length - 1) {
            this.reorderLayer(index, index + 1);
        }
    }

    /**
     * Move layer down in stack
     * @param {number} index - Layer index
     */
    moveLayerDown(index) {
        if (index > 0) {
            this.reorderLayer(index, index - 1);
        }
    }

    /**
     * Set keyframe for a layer at a specific frame
     * @param {number} layerIndex - Layer index
     * @param {number} frameIndex - Frame index
     * @param {Object} properties - Keyframe properties (partial or full)
     */
    setKeyframe(layerIndex, frameIndex, properties) {
        const layer = this.layers[layerIndex];
        if (!layer) return;

        // Get current properties at this frame as base
        const currentProps = this.getPropertiesAtFrame(layerIndex, frameIndex);

        // Merge with new properties
        layer.keyframes[frameIndex] = {
            ...currentProps,
            ...properties
        };
    }

    /**
     * Delete keyframe for a layer at a specific frame
     * @param {number} layerIndex - Layer index
     * @param {number} frameIndex - Frame index
     * @returns {boolean} Success
     */
    deleteKeyframe(layerIndex, frameIndex) {
        const layer = this.layers[layerIndex];
        if (!layer) return false;

        // Don't delete if it's the only keyframe
        const keyframeCount = Object.keys(layer.keyframes).length;
        if (keyframeCount <= 1) {
            return false;
        }

        if (layer.keyframes[frameIndex]) {
            delete layer.keyframes[frameIndex];
            return true;
        }

        return false;
    }

    /**
     * Check if layer has a keyframe at specific frame
     * @param {number} layerIndex - Layer index
     * @param {number} frameIndex - Frame index
     * @returns {boolean} Has keyframe
     */
    hasKeyframe(layerIndex, frameIndex) {
        const layer = this.layers[layerIndex];
        if (!layer) return false;
        return layer.keyframes.hasOwnProperty(frameIndex);
    }

    /**
     * Get all keyframe indices for a layer
     * @param {number} layerIndex - Layer index
     * @returns {Array<number>} Array of frame indices with keyframes
     */
    getKeyframeIndices(layerIndex) {
        const layer = this.layers[layerIndex];
        if (!layer) return [];
        return Object.keys(layer.keyframes).map(Number).sort((a, b) => a - b);
    }

    /**
     * Get layer properties at a specific frame
     * Uses the most recent keyframe at or before the given frame
     * @param {number} layerIndex - Layer index
     * @param {number} frameIndex - Frame index
     * @returns {Object} Properties for this frame
     */
    getPropertiesAtFrame(layerIndex, frameIndex) {
        const layer = this.layers[layerIndex];
        if (!layer) {
            return this.createDefaultKeyframe();
        }

        // Find the nearest keyframe at or before this frame
        const keyframeIndices = this.getKeyframeIndices(layerIndex);

        if (keyframeIndices.length === 0) {
            return this.createDefaultKeyframe();
        }

        // Find the largest keyframe index <= frameIndex
        let nearestKeyframe = keyframeIndices[0];
        for (const kf of keyframeIndices) {
            if (kf <= frameIndex) {
                nearestKeyframe = kf;
            } else {
                break;
            }
        }

        return { ...layer.keyframes[nearestKeyframe] };
    }

    /**
     * Toggle layer visibility at current frame
     * @param {number} layerIndex - Layer index
     * @param {number} frameIndex - Frame index
     */
    toggleVisibility(layerIndex, frameIndex) {
        const props = this.getPropertiesAtFrame(layerIndex, frameIndex);
        this.setKeyframe(layerIndex, frameIndex, { visible: !props.visible });
    }

    /**
     * Set layer opacity at current frame
     * @param {number} layerIndex - Layer index
     * @param {number} frameIndex - Frame index
     * @param {number} opacity - Opacity (0-1)
     */
    setOpacity(layerIndex, frameIndex, opacity) {
        this.setKeyframe(layerIndex, frameIndex, {
            opacity: Math.max(0, Math.min(1, opacity))
        });
    }

    /**
     * Set layer position at current frame
     * @param {number} layerIndex - Layer index
     * @param {number} frameIndex - Frame index
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    setPosition(layerIndex, frameIndex, x, y) {
        this.setKeyframe(layerIndex, frameIndex, { x, y });
    }

    /**
     * Set layer scale at current frame
     * @param {number} layerIndex - Layer index
     * @param {number} frameIndex - Frame index
     * @param {number} scaleX - X scale
     * @param {number} scaleY - Y scale
     */
    setScale(layerIndex, frameIndex, scaleX, scaleY) {
        this.setKeyframe(layerIndex, frameIndex, { scaleX, scaleY });
    }

    /**
     * Set layer rotation at current frame
     * @param {number} layerIndex - Layer index
     * @param {number} frameIndex - Frame index
     * @param {number} rotation - Rotation in degrees
     */
    setRotation(layerIndex, frameIndex, rotation) {
        this.setKeyframe(layerIndex, frameIndex, { rotation });
    }

    /**
     * Copy keyframe from one frame to another
     * @param {number} layerIndex - Layer index
     * @param {number} fromFrame - Source frame
     * @param {number} toFrame - Target frame
     */
    copyKeyframe(layerIndex, fromFrame, toFrame) {
        const props = this.getPropertiesAtFrame(layerIndex, fromFrame);
        this.setKeyframe(layerIndex, toFrame, props);
    }

    /**
     * Apply current properties to all frames (set single keyframe at frame 0)
     * @param {number} layerIndex - Layer index
     * @param {Object} properties - Properties to set
     */
    applyToAllFrames(layerIndex, properties) {
        const layer = this.layers[layerIndex];
        if (!layer) return;

        // Clear all keyframes and set just one at frame 0
        layer.keyframes = {
            0: {
                ...this.createDefaultKeyframe(),
                ...properties
            }
        };
    }

    /**
     * Export layers data for saving
     * @returns {Array} Serializable layer data
     */
    exportData() {
        return this.layers.map(layer => ({
            id: layer.id,
            name: layer.name,
            imageDataUrl: layer.imageDataUrl,
            order: layer.order,
            keyframes: this.deepCloneKeyframes(layer.keyframes)
        }));
    }

    /**
     * Deep clone keyframes object
     * @param {Object} keyframes - Keyframes to clone
     * @returns {Object} Cloned keyframes
     */
    deepCloneKeyframes(keyframes) {
        const cloned = {};
        for (const frameIndex in keyframes) {
            cloned[frameIndex] = { ...keyframes[frameIndex] };
        }
        return cloned;
    }

    /**
     * Import layers from saved data
     * @param {Array} data - Saved layer data
     * @returns {Promise<void>}
     */
    async importData(data) {
        this.clear();

        for (const layerData of data) {
            try {
                const layer = await this.addLayer(layerData.imageDataUrl, layerData.name);
                layer.id = layerData.id;
                layer.order = layerData.order;
                layer.keyframes = layerData.keyframes || { 0: this.createDefaultKeyframe() };
            } catch (e) {
                console.error('Failed to load layer:', layerData.name, e);
            }
        }

        // Sort by order
        this.layers.sort((a, b) => a.order - b.order);

        // Update order values to be sequential
        this.layers.forEach((layer, i) => {
            layer.order = i;
        });

        this.selectedLayerIndex = this.layers.length > 0 ? 0 : -1;
    }

    /**
     * Clear all layers
     */
    clear() {
        this.layers = [];
        this.selectedLayerIndex = -1;
    }
}
