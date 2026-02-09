/**
 * Playback Controller
 * Handles GIF playback, frame navigation, and timing
 */

const playback = {
    currentFrameIndex: 0,
    isPlaying: false,
    loop: true,
    speed: 1.0,
    animationTimeout: null,

    /**
     * Initialize playback controller
     */
    init() {
        this.currentFrameIndex = 0;
        this.isPlaying = false;
        this.loop = true;
        this.speed = 1.0;
        this.setupKeyboardShortcuts();
    },

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts if typing in input
            if (e.target.tagName === 'INPUT') return;

            switch(e.key) {
                case ' ': // Space - play/pause
                    e.preventDefault();
                    this.togglePlay();
                    break;
                case 'ArrowLeft': // Previous frame
                    e.preventDefault();
                    this.previousFrame();
                    break;
                case 'ArrowRight': // Next frame
                    e.preventDefault();
                    this.nextFrame();
                    break;
                case 'Home': // First frame
                    e.preventDefault();
                    this.goToFrame(0);
                    break;
                case 'End': // Last frame
                    e.preventDefault();
                    if (gifStudio.frameManager) {
                        this.goToFrame(gifStudio.frameManager.getFrameCount() - 1);
                    }
                    break;
            }
        });
    },

    /**
     * Toggle play/pause
     */
    togglePlay() {
        if (!gifStudio.frameManager || gifStudio.frameManager.getFrameCount() === 0) {
            return;
        }

        this.isPlaying = !this.isPlaying;
        const playBtn = document.getElementById('play-icon');

        if (this.isPlaying) {
            playBtn.textContent = '⏸';

            // When starting playback, rebuild canvas state from frame 0 to current
            // This ensures disposal methods are properly applied
            this.rebuildCanvasState();

            this.play();
        } else {
            playBtn.textContent = '▶';
            if (this.animationTimeout) {
                clearTimeout(this.animationTimeout);
                this.animationTimeout = null;
            }
        }
    },

    /**
     * Start playback
     */
    play() {
        if (!this.isPlaying) return;

        const frame = gifStudio.frameManager.getFrame(this.currentFrameIndex);
        if (!frame) {
            this.stop();
            return;
        }

        // Render current frame
        this.renderCurrentFrame();

        // Calculate next frame delay (adjusted for speed)
        const delay = frame.delay / this.speed;

        // Schedule next frame
        this.animationTimeout = setTimeout(() => {
            this.nextFrame();
            if (this.isPlaying) {
                this.play();
            }
        }, delay);
    },

    /**
     * Stop playback
     */
    stop() {
        this.isPlaying = false;
        document.getElementById('play-icon').textContent = '▶';

        if (this.animationTimeout) {
            clearTimeout(this.animationTimeout);
            this.animationTimeout = null;
        }
    },

    /**
     * Go to next frame
     */
    nextFrame() {
        if (!gifStudio.frameManager) return;

        const frameCount = gifStudio.frameManager.getFrameCount();
        this.currentFrameIndex++;

        if (this.currentFrameIndex >= frameCount) {
            if (this.loop) {
                this.currentFrameIndex = 0;
            } else {
                this.currentFrameIndex = frameCount - 1;
                this.stop();
            }
        }

        this.renderCurrentFrame();
        this.updateUI();
    },

    /**
     * Go to previous frame
     */
    previousFrame() {
        if (!gifStudio.frameManager) return;

        const frameCount = gifStudio.frameManager.getFrameCount();
        this.currentFrameIndex--;

        if (this.currentFrameIndex < 0) {
            if (this.loop) {
                this.currentFrameIndex = frameCount - 1;
            } else {
                this.currentFrameIndex = 0;
            }
        }

        this.renderCurrentFrame();
        this.updateUI();
    },

    /**
     * Go to specific frame
     * @param {number} index - Frame index
     */
    goToFrame(index) {
        if (!gifStudio.frameManager) return;

        const frameCount = gifStudio.frameManager.getFrameCount();
        this.currentFrameIndex = Math.max(0, Math.min(index, frameCount - 1));

        // Frames are pre-composited during parsing, so just render directly
        this.renderCurrentFrame();
        this.updateUI();
    },

    /**
     * Rebuild canvas state (simplified - frames are pre-composited)
     */
    rebuildCanvasState() {
        // Frames are now pre-composited during parsing
        // Just render the current frame directly
        this.renderCurrentFrame();
    },

    /**
     * Render current frame to canvas
     */
    renderCurrentFrame() {
        if (!gifStudio.frameManager) return;

        const canvas = document.getElementById('display-canvas');
        gifStudio.frameManager.renderFrameToCanvas(this.currentFrameIndex, canvas);
    },

    /**
     * Update UI elements
     */
    updateUI() {
        if (!gifStudio.frameManager) return;

        const frameCount = gifStudio.frameManager.getFrameCount();

        // Update frame indicator
        document.getElementById('frame-indicator').textContent =
            `Frame: ${this.currentFrameIndex + 1} / ${frameCount}`;

        // Calculate elapsed time
        let elapsedTime = 0;
        for (let i = 0; i < this.currentFrameIndex; i++) {
            const frame = gifStudio.frameManager.getFrame(i);
            if (frame) {
                elapsedTime += frame.delay;
            }
        }
        document.getElementById('time-display').textContent =
            `${(elapsedTime / 1000).toFixed(2)}s`;

        // Update properties panel
        ui.updatePropertiesPanel();

        // Update timeline
        timeline.setActiveFrame(this.currentFrameIndex);

        // Update layer panel (keyframe indicators may change per frame)
        if (typeof layerPanel !== 'undefined') {
            layerPanel.render();
        }

        // Update layer interaction overlay
        if (typeof layerInteraction !== 'undefined') {
            layerInteraction.updateOverlay();
        }
    },

    /**
     * Toggle loop mode
     */
    toggleLoop() {
        this.loop = !this.loop;
        const loopIcon = document.getElementById('loop-icon');

        if (this.loop) {
            loopIcon.textContent = '🔁';
            loopIcon.style.opacity = '1';
        } else {
            loopIcon.textContent = '🔁';
            loopIcon.style.opacity = '0.5';
        }
    },

    /**
     * Set playback speed
     * @param {number} speed - Speed multiplier
     */
    setSpeed(speed) {
        this.speed = parseFloat(speed);
    },

    /**
     * Reset playback state
     */
    reset() {
        this.stop();
        this.currentFrameIndex = 0;
        this.updateUI();
    }
};
