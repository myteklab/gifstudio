/**
 * Layer Interaction Controller
 * Handles direct manipulation of layers on the canvas (drag, scale, rotate)
 */

const layerInteraction = {
    // Interaction state
    isEnabled: false,
    isDragging: false,
    isScaling: false,
    isRotating: false,

    // Current interaction target
    activeHandle: null, // 'move', 'nw', 'ne', 'sw', 'se', 'rotate'
    startX: 0,
    startY: 0,
    startProps: null, // Original layer properties when drag started

    // Handle sizes
    handleSize: 10,
    rotateHandleDistance: 25,

    // Overlay canvas for drawing handles
    overlayCanvas: null,
    overlayCtx: null,

    /**
     * Initialize the interaction controller
     */
    init() {
        this.createOverlayCanvas();
        this.setupEventListeners();
        this.isEnabled = true;
        console.log('Layer interaction controller initialized');
    },

    /**
     * Create overlay canvas for drawing selection handles
     */
    createOverlayCanvas() {
        const wrapper = document.getElementById('canvas-wrapper');
        const displayCanvas = document.getElementById('display-canvas');

        if (!wrapper || !displayCanvas) return;

        // Create overlay canvas
        this.overlayCanvas = document.createElement('canvas');
        this.overlayCanvas.id = 'layer-overlay-canvas';
        this.overlayCanvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            pointer-events: auto;
            z-index: 10;
        `;

        // Insert after display canvas in the scroll area
        const scrollArea = document.getElementById('canvas-scroll-area');
        if (scrollArea) {
            scrollArea.appendChild(this.overlayCanvas);
        }

        this.overlayCtx = this.overlayCanvas.getContext('2d');
    },

    /**
     * Setup mouse event listeners
     */
    setupEventListeners() {
        if (!this.overlayCanvas) return;

        this.overlayCanvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('mouseup', (e) => this.onMouseUp(e));

        // Update overlay when zoom changes
        this.overlayCanvas.addEventListener('wheel', (e) => {
            // Let the zoom controller handle it, then update overlay
            setTimeout(() => this.updateOverlay(), 50);
        });
    },

    /**
     * Sync overlay canvas size and position with display canvas
     */
    syncOverlaySize() {
        const displayCanvas = document.getElementById('display-canvas');
        const scrollArea = document.getElementById('canvas-scroll-area');
        if (!displayCanvas || !this.overlayCanvas || !scrollArea) return;

        // Match the internal resolution
        this.overlayCanvas.width = displayCanvas.width;
        this.overlayCanvas.height = displayCanvas.height;

        // Match the visual size
        this.overlayCanvas.style.width = displayCanvas.style.width || displayCanvas.width + 'px';
        this.overlayCanvas.style.height = displayCanvas.style.height || displayCanvas.height + 'px';

        // Position overlay to match display canvas position within scroll area
        const scrollRect = scrollArea.getBoundingClientRect();
        const displayRect = displayCanvas.getBoundingClientRect();

        // Calculate offset from scroll area to display canvas
        const offsetX = displayRect.left - scrollRect.left + scrollArea.scrollLeft;
        const offsetY = displayRect.top - scrollRect.top + scrollArea.scrollTop;

        this.overlayCanvas.style.left = offsetX + 'px';
        this.overlayCanvas.style.top = offsetY + 'px';
    },

    /**
     * Get mouse position relative to canvas
     */
    getCanvasPosition(e) {
        const rect = this.overlayCanvas.getBoundingClientRect();
        const scaleX = this.overlayCanvas.width / rect.width;
        const scaleY = this.overlayCanvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    },

    /**
     * Handle mouse down
     */
    onMouseDown(e) {
        if (!this.isEnabled || !gifStudio?.layerManager) return;

        const pos = this.getCanvasPosition(e);
        const selectedIndex = gifStudio.layerManager.selectedLayerIndex;

        // Check if clicking on a handle of the selected layer
        if (selectedIndex >= 0) {
            const handle = this.getHandleAtPosition(pos.x, pos.y, selectedIndex);
            if (handle) {
                this.startInteraction(e, handle, pos);
                return;
            }
        }

        // Check if clicking on any layer
        const clickedLayerIndex = this.getLayerAtPosition(pos.x, pos.y);

        if (clickedLayerIndex >= 0) {
            // Select and start dragging
            gifStudio.layerManager.selectLayer(clickedLayerIndex);
            layerPanel.render();
            this.startInteraction(e, 'move', pos);
        } else {
            // Clicked on empty space - deselect and allow panning
            if (selectedIndex >= 0) {
                gifStudio.layerManager.selectLayer(-1);
                layerPanel.render();
                this.updateOverlay();
            }
            // Let the event bubble up for scroll/pan functionality
            // Don't prevent default here
        }
    },

    /**
     * Start an interaction (drag, scale, rotate)
     */
    startInteraction(e, handle, pos) {
        e.preventDefault();

        // Save state for undo before modifying
        const actionName = handle === 'move' ? 'Move Layer' :
                          handle === 'rotate' ? 'Rotate Layer' : 'Scale Layer';
        historyManager.saveState(actionName);

        const layerIndex = gifStudio.layerManager.selectedLayerIndex;
        const currentFrame = playback?.currentFrameIndex || 0;
        const props = gifStudio.layerManager.getPropertiesAtFrame(layerIndex, currentFrame);

        this.activeHandle = handle;
        this.startX = pos.x;
        this.startY = pos.y;
        this.startProps = { ...props };

        if (handle === 'move') {
            this.isDragging = true;
        } else if (handle === 'rotate') {
            this.isRotating = true;
        } else {
            this.isScaling = true;
        }

        document.body.style.cursor = this.getCursorForHandle(handle);
    },

    /**
     * Handle mouse move
     */
    onMouseMove(e) {
        if (!this.isEnabled) return;

        if (this.isDragging || this.isScaling || this.isRotating) {
            this.handleDrag(e);
        } else {
            // Update cursor based on what's under mouse
            this.updateCursor(e);
        }
    },

    /**
     * Handle dragging/scaling/rotating
     */
    handleDrag(e) {
        const pos = this.getCanvasPosition(e);
        const layerIndex = gifStudio.layerManager.selectedLayerIndex;
        const currentFrame = playback?.currentFrameIndex || 0;
        const layer = gifStudio.layerManager.getLayer(layerIndex);

        if (!layer) return;

        const dx = pos.x - this.startX;
        const dy = pos.y - this.startY;

        if (this.isDragging) {
            // Move layer
            const newX = this.startProps.x + dx;
            const newY = this.startProps.y + dy;

            gifStudio.layerManager.setKeyframe(layerIndex, currentFrame, {
                x: Math.round(newX),
                y: Math.round(newY)
            });

        } else if (this.isScaling) {
            // Scale layer
            this.handleScale(pos, dx, dy, layer);

        } else if (this.isRotating) {
            // Rotate layer
            this.handleRotate(pos, layer);
        }

        // Update display
        playback.renderCurrentFrame();
        this.updateOverlay();
        layerPanel.renderLayerProperties();
    },

    /**
     * Handle scaling based on which handle is being dragged
     */
    handleScale(pos, dx, dy, layer) {
        const layerIndex = gifStudio.layerManager.selectedLayerIndex;
        const currentFrame = playback?.currentFrameIndex || 0;

        const originalWidth = layer.image.width * this.startProps.scaleX;
        const originalHeight = layer.image.height * this.startProps.scaleY;

        let newScaleX = this.startProps.scaleX;
        let newScaleY = this.startProps.scaleY;
        let newX = this.startProps.x;
        let newY = this.startProps.y;

        // Calculate scale change based on handle
        switch (this.activeHandle) {
            case 'se': // Bottom-right
                newScaleX = Math.max(0.1, (originalWidth + dx) / layer.image.width);
                newScaleY = Math.max(0.1, (originalHeight + dy) / layer.image.height);
                break;
            case 'sw': // Bottom-left
                newScaleX = Math.max(0.1, (originalWidth - dx) / layer.image.width);
                newScaleY = Math.max(0.1, (originalHeight + dy) / layer.image.height);
                newX = this.startProps.x + dx;
                break;
            case 'ne': // Top-right
                newScaleX = Math.max(0.1, (originalWidth + dx) / layer.image.width);
                newScaleY = Math.max(0.1, (originalHeight - dy) / layer.image.height);
                newY = this.startProps.y + dy;
                break;
            case 'nw': // Top-left
                newScaleX = Math.max(0.1, (originalWidth - dx) / layer.image.width);
                newScaleY = Math.max(0.1, (originalHeight - dy) / layer.image.height);
                newX = this.startProps.x + dx;
                newY = this.startProps.y + dy;
                break;
        }

        // Hold shift for proportional scaling
        if (window.event?.shiftKey) {
            const avgScale = (newScaleX + newScaleY) / 2;
            newScaleX = avgScale;
            newScaleY = avgScale;
        }

        gifStudio.layerManager.setKeyframe(layerIndex, currentFrame, {
            scaleX: Math.round(newScaleX * 100) / 100,
            scaleY: Math.round(newScaleY * 100) / 100,
            x: Math.round(newX),
            y: Math.round(newY)
        });
    },

    /**
     * Handle rotation
     */
    handleRotate(pos, layer) {
        const layerIndex = gifStudio.layerManager.selectedLayerIndex;
        const currentFrame = playback?.currentFrameIndex || 0;

        // Calculate center of layer
        const centerX = this.startProps.x + (layer.image.width * this.startProps.scaleX) / 2;
        const centerY = this.startProps.y + (layer.image.height * this.startProps.scaleY) / 2;

        // Calculate angle from center to mouse
        const angle = Math.atan2(pos.y - centerY, pos.x - centerX);
        const startAngle = Math.atan2(this.startY - centerY, this.startX - centerX);

        let rotation = this.startProps.rotation + ((angle - startAngle) * 180 / Math.PI);

        // Snap to 15-degree increments when holding shift
        if (window.event?.shiftKey) {
            rotation = Math.round(rotation / 15) * 15;
        }

        // Normalize to -360 to 360
        while (rotation > 360) rotation -= 360;
        while (rotation < -360) rotation += 360;

        gifStudio.layerManager.setKeyframe(layerIndex, currentFrame, {
            rotation: Math.round(rotation)
        });
    },

    /**
     * Handle mouse up
     */
    onMouseUp(e) {
        if (this.isDragging || this.isScaling || this.isRotating) {
            this.isDragging = false;
            this.isScaling = false;
            this.isRotating = false;
            this.activeHandle = null;
            document.body.style.cursor = '';

            // Update layer panel to reflect changes
            layerPanel.render();
        }
    },

    /**
     * Get which layer is at a given position (top-most first)
     */
    getLayerAtPosition(x, y) {
        const layerManager = gifStudio?.layerManager;
        if (!layerManager) return -1;

        const currentFrame = playback?.currentFrameIndex || 0;

        // Check layers in reverse order (top layer first)
        const layers = layerManager.getOrderedLayers().reverse();

        for (const layer of layers) {
            const layerIndex = layerManager.layers.indexOf(layer);
            const props = layerManager.getPropertiesAtFrame(layerIndex, currentFrame);

            if (!props.visible) continue;

            if (this.isPointInLayer(x, y, layer, props)) {
                return layerIndex;
            }
        }

        return -1;
    },

    /**
     * Check if a point is inside a layer (considering transforms)
     */
    isPointInLayer(x, y, layer, props) {
        // Get layer bounds
        const width = layer.image.width * props.scaleX;
        const height = layer.image.height * props.scaleY;
        const centerX = props.x + width / 2;
        const centerY = props.y + height / 2;

        // Transform point to layer's local space (reverse rotation)
        const angle = -props.rotation * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const localX = cos * (x - centerX) - sin * (y - centerY) + centerX;
        const localY = sin * (x - centerX) + cos * (y - centerY) + centerY;

        // Check if in bounds
        return localX >= props.x && localX <= props.x + width &&
               localY >= props.y && localY <= props.y + height;
    },

    /**
     * Get which handle is at a given position
     */
    getHandleAtPosition(x, y, layerIndex) {
        const layer = gifStudio.layerManager.getLayer(layerIndex);
        if (!layer) return null;

        const currentFrame = playback?.currentFrameIndex || 0;
        const props = gifStudio.layerManager.getPropertiesAtFrame(layerIndex, currentFrame);
        const handles = this.getHandlePositions(layer, props);

        const hitRadius = this.handleSize / 2 + 5;

        // Check rotate handle first (it's outside)
        if (this.distanceTo(x, y, handles.rotate.x, handles.rotate.y) < hitRadius) {
            return 'rotate';
        }

        // Check corner handles
        for (const [name, pos] of Object.entries(handles)) {
            if (name === 'rotate' || name === 'center') continue;
            if (this.distanceTo(x, y, pos.x, pos.y) < hitRadius) {
                return name;
            }
        }

        return null;
    },

    /**
     * Get handle positions for a layer
     */
    getHandlePositions(layer, props) {
        const width = layer.image.width * props.scaleX;
        const height = layer.image.height * props.scaleY;
        const centerX = props.x + width / 2;
        const centerY = props.y + height / 2;
        const angle = props.rotation * Math.PI / 180;

        // Corner positions before rotation
        const corners = {
            nw: { x: props.x, y: props.y },
            ne: { x: props.x + width, y: props.y },
            sw: { x: props.x, y: props.y + height },
            se: { x: props.x + width, y: props.y + height }
        };

        // Rotate corners around center
        const rotatedCorners = {};
        for (const [name, corner] of Object.entries(corners)) {
            rotatedCorners[name] = this.rotatePoint(corner.x, corner.y, centerX, centerY, angle);
        }

        // Rotate handle position (above top center)
        const topCenterX = props.x + width / 2;
        const topCenterY = props.y - this.rotateHandleDistance;
        rotatedCorners.rotate = this.rotatePoint(topCenterX, topCenterY, centerX, centerY, angle);
        rotatedCorners.center = { x: centerX, y: centerY };

        return rotatedCorners;
    },

    /**
     * Rotate a point around a center
     */
    rotatePoint(x, y, cx, cy, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: cos * (x - cx) - sin * (y - cy) + cx,
            y: sin * (x - cx) + cos * (y - cy) + cy
        };
    },

    /**
     * Calculate distance between two points
     */
    distanceTo(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    },

    /**
     * Update cursor based on what's under mouse
     */
    updateCursor(e) {
        if (!this.overlayCanvas) return;

        const pos = this.getCanvasPosition(e);
        const selectedIndex = gifStudio?.layerManager?.selectedLayerIndex ?? -1;

        let cursor = '';

        if (selectedIndex >= 0) {
            const handle = this.getHandleAtPosition(pos.x, pos.y, selectedIndex);
            if (handle) {
                cursor = this.getCursorForHandle(handle);
            } else if (this.getLayerAtPosition(pos.x, pos.y) >= 0) {
                cursor = 'move';
            }
        } else if (this.getLayerAtPosition(pos.x, pos.y) >= 0) {
            cursor = 'pointer';
        }

        this.overlayCanvas.style.cursor = cursor;
    },

    /**
     * Get cursor style for a handle
     */
    getCursorForHandle(handle) {
        switch (handle) {
            case 'nw': return 'nwse-resize';
            case 'se': return 'nwse-resize';
            case 'ne': return 'nesw-resize';
            case 'sw': return 'nesw-resize';
            case 'rotate': return 'grab';
            case 'move': return 'move';
            default: return '';
        }
    },

    /**
     * Update the overlay canvas (draw selection handles)
     */
    updateOverlay() {
        if (!this.overlayCanvas || !this.overlayCtx) return;

        // Sync size
        this.syncOverlaySize();

        // Clear
        this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

        // Draw selection if a layer is selected
        const selectedIndex = gifStudio?.layerManager?.selectedLayerIndex ?? -1;
        if (selectedIndex >= 0) {
            this.drawSelection(selectedIndex);
        }
    },

    /**
     * Draw selection box and handles for a layer
     */
    drawSelection(layerIndex) {
        const layer = gifStudio.layerManager.getLayer(layerIndex);
        if (!layer) return;

        const currentFrame = playback?.currentFrameIndex || 0;
        const props = gifStudio.layerManager.getPropertiesAtFrame(layerIndex, currentFrame);
        const handles = this.getHandlePositions(layer, props);

        const ctx = this.overlayCtx;

        // Draw bounding box
        ctx.save();
        ctx.strokeStyle = '#6c5ce7';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        ctx.beginPath();
        ctx.moveTo(handles.nw.x, handles.nw.y);
        ctx.lineTo(handles.ne.x, handles.ne.y);
        ctx.lineTo(handles.se.x, handles.se.y);
        ctx.lineTo(handles.sw.x, handles.sw.y);
        ctx.closePath();
        ctx.stroke();

        ctx.restore();

        // Draw line to rotate handle
        ctx.save();
        ctx.strokeStyle = '#6c5ce7';
        ctx.lineWidth = 1;
        const topCenter = {
            x: (handles.nw.x + handles.ne.x) / 2,
            y: (handles.nw.y + handles.ne.y) / 2
        };
        ctx.beginPath();
        ctx.moveTo(topCenter.x, topCenter.y);
        ctx.lineTo(handles.rotate.x, handles.rotate.y);
        ctx.stroke();
        ctx.restore();

        // Draw corner handles
        const cornerHandles = ['nw', 'ne', 'sw', 'se'];
        for (const name of cornerHandles) {
            this.drawHandle(handles[name].x, handles[name].y, '#6c5ce7', 'square');
        }

        // Draw rotate handle
        this.drawHandle(handles.rotate.x, handles.rotate.y, '#00cec9', 'circle');
    },

    /**
     * Draw a handle
     */
    drawHandle(x, y, color, shape) {
        const ctx = this.overlayCtx;
        const size = this.handleSize;

        ctx.save();
        ctx.fillStyle = color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;

        if (shape === 'circle') {
            ctx.beginPath();
            ctx.arc(x, y, size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillRect(x - size / 2, y - size / 2, size, size);
            ctx.strokeRect(x - size / 2, y - size / 2, size, size);
        }

        ctx.restore();
    },

    /**
     * Enable/disable interaction
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        if (this.overlayCanvas) {
            this.overlayCanvas.style.pointerEvents = enabled ? 'auto' : 'none';
        }
    }
};
