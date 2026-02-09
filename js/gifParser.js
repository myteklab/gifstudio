/**
 * GIF Parser Class
 * Handles parsing GIF files using omggif library
 * Extracts frames, delays, and metadata
 */

class GIFParser {
    constructor() {
        this.gifData = null;
        this.frames = [];
        this.width = 0;
        this.height = 0;
    }

    /**
     * Parse a GIF file
     * @param {File|ArrayBuffer} file - GIF file to parse
     * @returns {Promise<Object>} Parsed GIF data
     */
    async parse(file) {
        try {
            // Convert File to ArrayBuffer if needed
            let arrayBuffer;
            if (file instanceof ArrayBuffer) {
                arrayBuffer = file;
            } else {
                arrayBuffer = await file.arrayBuffer();
            }

            // Create Uint8Array for omggif
            const uint8Array = new Uint8Array(arrayBuffer);

            // Parse GIF using omggif
            const reader = new GifReader(uint8Array);

            // Store dimensions
            this.width = reader.width;
            this.height = reader.height;

            // Get number of frames
            const frameCount = reader.numFrames();

            // Create persistent canvas for frame compositing
            // This accumulates frame data like a real GIF renderer
            const canvas = document.createElement('canvas');
            canvas.width = this.width;
            canvas.height = this.height;
            const ctx = canvas.getContext('2d');

            // Canvas to store state before each frame (for disposal type 3)
            const restoreCanvas = document.createElement('canvas');
            restoreCanvas.width = this.width;
            restoreCanvas.height = this.height;
            const restoreCtx = restoreCanvas.getContext('2d');

            // Temp canvas for drawing raw frame data
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.width;
            tempCanvas.height = this.height;
            const tempCtx = tempCanvas.getContext('2d');

            // Process each frame
            this.frames = [];
            for (let i = 0; i < frameCount; i++) {
                const frameInfo = reader.frameInfo(i);

                // Save canvas state BEFORE rendering this frame (for disposal type 3)
                restoreCtx.clearRect(0, 0, this.width, this.height);
                restoreCtx.drawImage(canvas, 0, 0);

                // Decode raw frame data into temp buffer
                const frameData = new Uint8ClampedArray(this.width * this.height * 4);
                reader.decodeAndBlitFrameRGBA(i, frameData);

                // Put raw frame onto temp canvas
                const rawImageData = new ImageData(frameData, this.width, this.height);
                tempCtx.clearRect(0, 0, this.width, this.height);
                tempCtx.putImageData(rawImageData, 0, 0);

                // Composite onto main canvas (respects transparency)
                ctx.drawImage(tempCanvas, 0, 0);

                // Capture the fully composited frame
                const compositedImageData = ctx.getImageData(0, 0, this.width, this.height);

                // Store frame with the COMPOSITED image data
                this.frames.push({
                    index: i,
                    imageData: compositedImageData,
                    delay: (frameInfo.delay || 10) * 10, // Convert to milliseconds
                    disposalType: frameInfo.disposal || 0,
                    dims: {
                        width: this.width,
                        height: this.height,
                        left: frameInfo.x || 0,
                        top: frameInfo.y || 0
                    },
                    left: frameInfo.x || 0,
                    top: frameInfo.y || 0
                });

                // Handle disposal method for NEXT frame
                const disposal = frameInfo.disposal || 0;
                if (disposal === 2) {
                    // Restore to background (clear the frame area)
                    ctx.clearRect(
                        frameInfo.x || 0,
                        frameInfo.y || 0,
                        frameInfo.width || this.width,
                        frameInfo.height || this.height
                    );
                } else if (disposal === 3) {
                    // Restore to previous state
                    ctx.clearRect(0, 0, this.width, this.height);
                    ctx.drawImage(restoreCanvas, 0, 0);
                }
                // For disposal 0 or 1, keep canvas as-is (frame accumulation)
            }

            return {
                width: this.width,
                height: this.height,
                frameCount: this.frames.length,
                frames: this.frames,
                totalDuration: this.getTotalDuration(),
                loopCount: reader.loopCount() || 0
            };

        } catch (error) {
            console.error('Error parsing GIF:', error);
            throw new Error('Failed to parse GIF file: ' + error.message);
        }
    }

    /**
     * Get total duration of animation
     * @returns {number} Total duration in milliseconds
     */
    getTotalDuration() {
        return this.frames.reduce((total, frame) => total + frame.delay, 0);
    }

    /**
     * Get frame at specific index
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
     * Get GIF dimensions
     * @returns {Object} {width, height}
     */
    getDimensions() {
        return {
            width: this.width,
            height: this.height
        };
    }

    /**
     * Create a canvas with the full frame rendered
     * @param {number} frameIndex - Frame to render
     * @returns {Canvas} Canvas with frame rendered
     */
    renderFrame(frameIndex) {
        const frame = this.frames[frameIndex];
        if (!frame) return null;

        // Create canvas for this frame
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d');

        // Draw frame
        ctx.putImageData(frame.imageData, 0, 0);

        return canvas;
    }

    /**
     * Create thumbnail for a frame
     * @param {number} frameIndex - Frame index
     * @param {number} maxSize - Maximum width/height
     * @returns {string} Data URL of thumbnail
     */
    createThumbnail(frameIndex, maxSize = 150) {
        const canvas = this.renderFrame(frameIndex);
        if (!canvas) return null;

        // Calculate thumbnail size
        const scale = Math.min(1, maxSize / Math.max(canvas.width, canvas.height));
        const thumbWidth = Math.floor(canvas.width * scale);
        const thumbHeight = Math.floor(canvas.height * scale);

        // Create thumbnail canvas
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = thumbWidth;
        thumbCanvas.height = thumbHeight;
        const thumbCtx = thumbCanvas.getContext('2d');

        thumbCtx.drawImage(canvas, 0, 0, thumbWidth, thumbHeight);

        return thumbCanvas.toDataURL('image/png');
    }

    /**
     * Clear parser data
     */
    clear() {
        this.gifData = null;
        this.frames = [];
        this.width = 0;
        this.height = 0;
    }
}
