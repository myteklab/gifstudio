/**
 * Frame Manager Class
 * Manages frame collection, modifications, and operations
 */

class FrameManager {
    constructor() {
        this.frames = [];
        this.width = 0;
        this.height = 0;
        this.parser = null;
    }

    /**
     * Load frames from parsed GIF data
     * @param {GIFParser} parser - GIF parser instance
     */
    loadFromParser(parser) {
        this.parser = parser;

        // Properly clone frames (can't use JSON.stringify on ImageData)
        const sourceFrames = parser.getAllFrames();
        this.frames = sourceFrames.map(frame => ({
            index: frame.index,
            imageData: frame.imageData, // ImageData objects can be referenced directly
            delay: frame.delay,
            disposalType: frame.disposalType,
            dims: { ...frame.dims },
            left: frame.left,
            top: frame.top
        }));

        const dims = parser.getDimensions();
        this.width = dims.width;
        this.height = dims.height;
    }

    /**
     * Get frame at index
     * @param {number} index - Frame index
     * @returns {Object|null} Frame data
     */
    getFrame(index) {
        return this.frames[index] || null;
    }

    /**
     * Get all frames
     * @returns {Array} All frames
     */
    getAllFrames() {
        return this.frames;
    }

    /**
     * Get frame count
     * @returns {number} Number of frames
     */
    getFrameCount() {
        return this.frames.length;
    }

    /**
     * Get total duration in milliseconds
     * @returns {number} Total duration
     */
    getTotalDuration() {
        return this.frames.reduce((total, frame) => total + frame.delay, 0);
    }

    /**
     * Set frame delay
     * @param {number} index - Frame index
     * @param {number} delay - Delay in milliseconds
     */
    setFrameDelay(index, delay) {
        if (this.frames[index]) {
            this.frames[index].delay = Math.max(10, Math.min(10000, delay));
        }
    }

    /**
     * Duplicate a frame
     * @param {number} index - Frame index to duplicate
     * @returns {number} Index of new frame
     */
    duplicateFrame(index) {
        const frame = this.frames[index];
        if (!frame) return -1;

        // Clone ImageData properly
        const clonedData = new Uint8ClampedArray(frame.imageData.data);
        const clonedImageData = new ImageData(
            clonedData,
            frame.imageData.width,
            frame.imageData.height
        );

        // Create new frame
        const newFrame = {
            index: this.frames.length,
            imageData: clonedImageData,
            delay: frame.delay,
            disposalType: frame.disposalType,
            dims: { ...frame.dims },
            left: frame.left,
            top: frame.top
        };

        // Insert after current frame
        this.frames.splice(index + 1, 0, newFrame);

        // Update indices
        this.updateIndices();

        return index + 1;
    }

    /**
     * Delete a frame
     * @param {number} index - Frame index to delete
     * @returns {boolean} Success
     */
    deleteFrame(index) {
        if (this.frames.length <= 1) {
            return false; // Can't delete the last frame
        }

        if (index >= 0 && index < this.frames.length) {
            this.frames.splice(index, 1);
            this.updateIndices();
            return true;
        }

        return false;
    }

    /**
     * Reverse frame order
     */
    reverseFrames() {
        this.frames.reverse();
        this.updateIndices();
    }

    /**
     * Move frame from one position to another
     * @param {number} fromIndex - Source index
     * @param {number} toIndex - Destination index
     */
    moveFrame(fromIndex, toIndex) {
        if (fromIndex === toIndex) return;
        if (fromIndex < 0 || fromIndex >= this.frames.length) return;
        if (toIndex < 0 || toIndex >= this.frames.length) return;

        const frame = this.frames.splice(fromIndex, 1)[0];
        this.frames.splice(toIndex, 0, frame);
        this.updateIndices();
    }

    /**
     * Update frame indices after reordering
     */
    updateIndices() {
        this.frames.forEach((frame, i) => {
            frame.index = i;
        });
    }

    /**
     * Render frame to canvas
     * @param {number} index - Frame index
     * @param {Canvas} canvas - Target canvas
     * @param {Canvas} [previousCanvas] - Previous frame for disposal (unused - frames are pre-composited)
     */
    renderFrameToCanvas(index, canvas, previousCanvas = null) {
        const frame = this.frames[index];
        if (!frame) return;

        const ctx = canvas.getContext('2d');

        // Set canvas size if needed
        if (canvas.width !== this.width || canvas.height !== this.height) {
            canvas.width = this.width;
            canvas.height = this.height;
        }

        // Frames are now pre-composited during parsing, so each frame is a complete snapshot
        // Just draw the frame directly - no disposal handling needed here
        ctx.putImageData(frame.imageData, 0, 0);

        // Render overlay layers on top
        this.renderLayers(ctx, index);
    }

    /**
     * Render overlay layers for a specific frame
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} frameIndex - Current frame index
     */
    renderLayers(ctx, frameIndex) {
        const layerManager = gifStudio?.layerManager;
        if (!layerManager || layerManager.getLayerCount() === 0) {
            return;
        }

        // Get layers in order (bottom to top)
        const layers = layerManager.getOrderedLayers();

        for (const layer of layers) {
            const layerIndex = layerManager.layers.indexOf(layer);
            const props = layerManager.getPropertiesAtFrame(layerIndex, frameIndex);

            // Skip invisible layers
            if (!props.visible || props.opacity <= 0) {
                continue;
            }

            ctx.save();

            // Apply opacity
            ctx.globalAlpha = props.opacity;

            // Calculate center point for transformations
            const centerX = props.x + (layer.image.width * props.scaleX) / 2;
            const centerY = props.y + (layer.image.height * props.scaleY) / 2;

            // Apply transformations (translate to center, rotate, scale, translate back)
            ctx.translate(centerX, centerY);
            ctx.rotate(props.rotation * Math.PI / 180);
            ctx.scale(props.scaleX, props.scaleY);

            // Draw image centered at origin (after transformations)
            ctx.drawImage(
                layer.image,
                -layer.image.width / 2,
                -layer.image.height / 2
            );

            ctx.restore();
        }
    }

    /**
     * Create thumbnail for frame
     * @param {number} index - Frame index
     * @param {number} maxSize - Maximum dimension
     * @returns {string} Data URL
     */
    createThumbnail(index, maxSize = 150) {
        const frame = this.frames[index];
        if (!frame) return null;

        // Create canvas and render all frames up to this one
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d');

        // Render all frames from 0 to index to build proper state
        let previousCanvas = null;
        for (let i = 0; i <= index; i++) {
            this.renderFrameToCanvas(i, canvas, previousCanvas);

            // Update previous canvas
            if (!previousCanvas) {
                previousCanvas = document.createElement('canvas');
                previousCanvas.width = canvas.width;
                previousCanvas.height = canvas.height;
            }
            const prevCtx = previousCanvas.getContext('2d');
            prevCtx.clearRect(0, 0, previousCanvas.width, previousCanvas.height);
            prevCtx.drawImage(canvas, 0, 0);
        }

        // Calculate thumbnail size
        const scale = Math.min(1, maxSize / Math.max(canvas.width, canvas.height));
        const thumbWidth = Math.floor(canvas.width * scale);
        const thumbHeight = Math.floor(canvas.height * scale);

        // Create thumbnail
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = thumbWidth;
        thumbCanvas.height = thumbHeight;
        const thumbCtx = thumbCanvas.getContext('2d');

        thumbCtx.drawImage(canvas, 0, 0, thumbWidth, thumbHeight);

        return thumbCanvas.toDataURL('image/png');
    }

    /**
     * Create a new blank project with specified dimensions
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @param {number} frameCount - Number of initial frames
     * @param {number} delay - Frame delay in ms
     * @param {Object} bgColor - Background color {r, g, b, a}
     */
    createBlankProject(width, height, frameCount = 1, delay = 100, bgColor = { r: 0, g: 0, b: 0, a: 0 }) {
        this.clear();
        this.width = width;
        this.height = height;
        this.bgColor = bgColor;

        // Create initial frames
        for (let i = 0; i < frameCount; i++) {
            this.createBlankFrame(i, delay);
        }
    }

    /**
     * Create a blank frame with background color
     * @param {number} index - Frame index
     * @param {number} delay - Frame delay in ms
     * @returns {Object} The created frame
     */
    createBlankFrame(index, delay = 100) {
        // Create ImageData with background color
        const imageData = new ImageData(this.width, this.height);
        const data = imageData.data;
        const bgColor = this.bgColor || { r: 0, g: 0, b: 0, a: 0 };

        for (let i = 0; i < data.length; i += 4) {
            data[i] = bgColor.r;
            data[i + 1] = bgColor.g;
            data[i + 2] = bgColor.b;
            data[i + 3] = bgColor.a;
        }

        const frame = {
            index: index,
            imageData: imageData,
            delay: delay,
            disposalType: 0,
            dims: { width: this.width, height: this.height },
            left: 0,
            top: 0
        };

        this.frames.push(frame);
        this.updateIndices();

        return frame;
    }

    /**
     * Add a blank frame at specified position
     * @param {number} position - Position to insert at
     * @param {number} delay - Frame delay in ms
     * @returns {number} Index of new frame, or -1 on error
     */
    addBlankFrame(position, delay = 100) {
        if (!this.width || !this.height) {
            return -1;
        }

        // Create ImageData with background color
        const imageData = new ImageData(this.width, this.height);
        const data = imageData.data;
        const bgColor = this.bgColor || { r: 0, g: 0, b: 0, a: 0 };

        for (let i = 0; i < data.length; i += 4) {
            data[i] = bgColor.r;
            data[i + 1] = bgColor.g;
            data[i + 2] = bgColor.b;
            data[i + 3] = bgColor.a;
        }

        const frame = {
            index: position,
            imageData: imageData,
            delay: delay,
            disposalType: 0,
            dims: { width: this.width, height: this.height },
            left: 0,
            top: 0
        };

        // Insert at position
        this.frames.splice(position, 0, frame);
        this.updateIndices();

        return position;
    }

    /**
     * Set the background color for new frames
     * @param {Object} bgColor - Background color {r, g, b, a}
     */
    setBackgroundColor(bgColor) {
        this.bgColor = bgColor;
    }

    /**
     * Clear all frames
     */
    clear() {
        this.frames = [];
        this.width = 0;
        this.height = 0;
        this.parser = null;
        this.bgColor = null;
    }
}
