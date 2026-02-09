/**
 * UI Helper Functions for GIF Studio
 * Handles toasts, modals, file dialogs, and user interactions
 */

const ui = {
    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;

        // Trigger reflow for animation
        void toast.offsetWidth;

        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    },

    /**
     * Show custom confirm dialog (replaces native confirm())
     * @param {string} message - Message to display
     * @param {Object} options - Optional settings
     * @returns {Promise<boolean>} Resolves true if confirmed, false if cancelled
     */
    showConfirm(message, options = {}) {
        return new Promise((resolve) => {
            const modal = document.getElementById('dialog-modal');
            const title = document.getElementById('dialog-title');
            const messageEl = document.getElementById('dialog-message');
            const inputContainer = document.getElementById('dialog-input-container');
            const cancelBtn = document.getElementById('dialog-cancel-btn');
            const confirmBtn = document.getElementById('dialog-confirm-btn');

            // Configure dialog
            title.textContent = options.title || 'Confirm';
            messageEl.textContent = message;
            inputContainer.style.display = 'none';

            // Set button text and style
            cancelBtn.textContent = options.cancelText || 'Cancel';
            confirmBtn.textContent = options.confirmText || 'OK';

            // Apply danger style if specified
            if (options.danger) {
                confirmBtn.classList.add('danger');
            } else {
                confirmBtn.classList.remove('danger');
            }

            // Cleanup function
            const cleanup = () => {
                modal.classList.remove('active');
                cancelBtn.removeEventListener('click', onCancel);
                confirmBtn.removeEventListener('click', onConfirm);
                document.removeEventListener('keydown', onKeydown);
            };

            // Event handlers
            const onCancel = () => {
                cleanup();
                resolve(false);
            };

            const onConfirm = () => {
                cleanup();
                resolve(true);
            };

            const onKeydown = (e) => {
                if (e.key === 'Escape') {
                    onCancel();
                } else if (e.key === 'Enter') {
                    onConfirm();
                }
            };

            // Attach listeners
            cancelBtn.addEventListener('click', onCancel);
            confirmBtn.addEventListener('click', onConfirm);
            document.addEventListener('keydown', onKeydown);

            // Show modal
            modal.classList.add('active');
            confirmBtn.focus();
        });
    },

    /**
     * Show custom prompt dialog (replaces native prompt())
     * @param {string} message - Message to display
     * @param {string} defaultValue - Default input value
     * @param {Object} options - Optional settings
     * @returns {Promise<string|null>} Resolves with input value or null if cancelled
     */
    showPrompt(message, defaultValue = '', options = {}) {
        return new Promise((resolve) => {
            const modal = document.getElementById('dialog-modal');
            const title = document.getElementById('dialog-title');
            const messageEl = document.getElementById('dialog-message');
            const inputContainer = document.getElementById('dialog-input-container');
            const input = document.getElementById('dialog-input');
            const cancelBtn = document.getElementById('dialog-cancel-btn');
            const confirmBtn = document.getElementById('dialog-confirm-btn');

            // Configure dialog
            title.textContent = options.title || 'Input';
            messageEl.textContent = message;
            inputContainer.style.display = 'block';
            input.value = defaultValue;
            input.placeholder = options.placeholder || '';

            // Set button text
            cancelBtn.textContent = options.cancelText || 'Cancel';
            confirmBtn.textContent = options.confirmText || 'OK';
            confirmBtn.classList.remove('danger');

            // Cleanup function
            const cleanup = () => {
                modal.classList.remove('active');
                cancelBtn.removeEventListener('click', onCancel);
                confirmBtn.removeEventListener('click', onConfirm);
                input.removeEventListener('keydown', onInputKeydown);
                document.removeEventListener('keydown', onKeydown);
            };

            // Event handlers
            const onCancel = () => {
                cleanup();
                resolve(null);
            };

            const onConfirm = () => {
                const value = input.value.trim();
                cleanup();
                resolve(value || null);
            };

            const onInputKeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    onConfirm();
                }
            };

            const onKeydown = (e) => {
                if (e.key === 'Escape') {
                    onCancel();
                }
            };

            // Attach listeners
            cancelBtn.addEventListener('click', onCancel);
            confirmBtn.addEventListener('click', onConfirm);
            input.addEventListener('keydown', onInputKeydown);
            document.addEventListener('keydown', onKeydown);

            // Show modal and focus input
            modal.classList.add('active');
            setTimeout(() => {
                input.focus();
                input.select();
            }, 50);
        });
    },

    /**
     * Show loading indicator
     */
    setLoading(isLoading, message = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        const text = document.getElementById('loading-text');
        if (isLoading) {
            text.textContent = message;
            overlay.classList.add('active');
        } else {
            overlay.classList.remove('active');
        }
    },

    /**
     * Open file picker to load GIF
     */
    openFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/gif';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                if (!file.type.includes('gif')) {
                    ui.showToast('Please select a GIF file', 'error');
                    return;
                }
                await gifStudio.loadGifFile(file);
            }
        };

        input.click();
    },

    /**
     * Save current GIF — platform adapter handles actual save via Platform.save()
     */
    async saveGif() {
        // Dispatches platform:requestSave which the adapter listens for
        window.dispatchEvent(new CustomEvent('platform:requestSave'));
    },

    /**
     * Generate GIF blob from current frames
     * @returns {Promise<Blob>} GIF blob
     */
    async generateGifBlob() {
        return new Promise((resolve, reject) => {
            try {
                const gif = new GIF({
                    workers: 2,
                    quality: 10,
                    workerScript: 'libs/gif.worker.js',
                    repeat: 0 // Loop forever
                });

                const frames = gifStudio.frameManager.getAllFrames();
                const canvas = document.getElementById('display-canvas');

                // Add frames to encoder (with layers composited)
                for (let i = 0; i < frames.length; i++) {
                    const frame = frames[i];

                    // Use renderFrameToCanvas which includes layer compositing
                    gifStudio.frameManager.renderFrameToCanvas(i, canvas);

                    // Add to GIF with delay
                    gif.addFrame(canvas, { delay: frame.delay, copy: true });
                }

                // Render GIF
                gif.on('finished', (blob) => {
                    resolve(blob);
                });

                gif.on('error', (error) => {
                    reject(error);
                });

                gif.render();

            } catch (error) {
                reject(error);
            }
        });
    },

    /**
     * Show export modal
     */
    exportGif() {
        if (!gifStudio.frameManager || gifStudio.frameManager.getFrameCount() === 0) {
            ui.showToast('No GIF loaded to export', 'error');
            return;
        }

        document.getElementById('export-modal').classList.add('active');
    },

    /**
     * Start GIF export process (local download)
     */
    async startExport() {
        const quality = parseInt(document.getElementById('export-quality').value);
        const loop = document.getElementById('export-loop').checked;
        const progressDiv = document.getElementById('export-progress');
        const progressBar = document.getElementById('export-progress-bar');
        const statusText = document.getElementById('export-status');
        const confirmBtn = document.getElementById('export-confirm-btn');

        // Show progress
        progressDiv.style.display = 'block';
        confirmBtn.disabled = true;

        try {
            // Create GIF encoder
            const gif = new GIF({
                workers: 2,
                quality: quality,
                workerScript: 'libs/gif.worker.js',
                repeat: loop ? 0 : -1 // 0 = loop forever, -1 = no loop
            });

            const frames = gifStudio.frameManager.getAllFrames();
            const canvas = document.getElementById('display-canvas');

            // Add frames to encoder (with layers composited)
            for (let i = 0; i < frames.length; i++) {
                const frame = frames[i];
                statusText.textContent = `Processing frame ${i + 1}/${frames.length}...`;
                progressBar.style.width = `${(i / frames.length) * 50}%`;

                gifStudio.frameManager.renderFrameToCanvas(i, canvas);
                gif.addFrame(canvas, { delay: frame.delay, copy: true });

                await new Promise(resolve => setTimeout(resolve, 0));
            }

            statusText.textContent = 'Rendering GIF...';
            progressBar.style.width = '75%';

            gif.on('finished', function(blob) {
                statusText.textContent = 'Complete!';
                progressBar.style.width = '100%';

                // Download as file
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = (gifStudio.currentFilename || 'export') + '.gif';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                setTimeout(function() {
                    document.getElementById('export-modal').classList.remove('active');
                    progressDiv.style.display = 'none';
                    progressBar.style.width = '0%';
                    confirmBtn.disabled = false;
                    ui.showToast('GIF exported!', 'success');
                }, 500);
            });

            gif.render();

        } catch (error) {
            console.error('Export error:', error);
            ui.showToast('Export failed: ' + error.message, 'error');
            progressDiv.style.display = 'none';
            confirmBtn.disabled = false;
        }
    },

    /**
     * Apply delay to current frame
     */
    applyDelay() {
        const delay = parseInt(document.getElementById('delay-input').value);
        const currentIndex = playback.currentFrameIndex;

        if (gifStudio.frameManager) {
            historyManager.saveState('Change Frame Delay');
            gifStudio.frameManager.setFrameDelay(currentIndex, delay);
            timeline.updateFrameInfo(currentIndex);
            ui.updatePropertiesPanel();
            ui.showToast(`Frame delay set to ${delay}ms`, 'success');
        }
    },

    /**
     * Apply delay to all frames
     */
    applyDelayToAll() {
        const delay = parseInt(document.getElementById('delay-input').value);

        if (gifStudio.frameManager) {
            historyManager.saveState('Change All Frame Delays');
            const frameCount = gifStudio.frameManager.getFrameCount();
            for (let i = 0; i < frameCount; i++) {
                gifStudio.frameManager.setFrameDelay(i, delay);
                timeline.updateFrameInfo(i);
            }
            ui.updatePropertiesPanel();
            ui.showToast(`All frame delays set to ${delay}ms`, 'success');
        }
    },

    /**
     * Reverse frame order
     */
    reverseFrames() {
        if (gifStudio.frameManager) {
            historyManager.saveState('Reverse Frames');
            gifStudio.frameManager.reverseFrames();
            timeline.rebuild();
            playback.goToFrame(0);
            ui.showToast('Frames reversed', 'success');
        }
    },

    /**
     * Duplicate current frame
     */
    duplicateFrame() {
        const currentIndex = playback.currentFrameIndex;

        if (gifStudio.frameManager) {
            historyManager.saveState('Duplicate Frame');
            gifStudio.frameManager.duplicateFrame(currentIndex);
            timeline.rebuild();
            playback.goToFrame(currentIndex + 1);
            ui.showToast('Frame duplicated', 'success');
        }
    },

    /**
     * Delete current frame
     */
    async deleteFrame() {
        const currentIndex = playback.currentFrameIndex;
        const frameCount = gifStudio.frameManager.getFrameCount();

        if (frameCount <= 1) {
            ui.showToast('Cannot delete the last frame', 'error');
            return;
        }

        const confirmed = await ui.showConfirm('Delete this frame?', {
            title: 'Delete Frame',
            confirmText: 'Delete',
            danger: true
        });

        if (confirmed) {
            historyManager.saveState('Delete Frame');
            gifStudio.frameManager.deleteFrame(currentIndex);
            timeline.rebuild();

            // Go to previous frame or stay at 0
            const newIndex = Math.max(0, currentIndex - 1);
            playback.goToFrame(newIndex);

            ui.showToast('Frame deleted', 'success');
        }
    },

    /**
     * Update GIF information panel
     */
    updateGifInfo(width, height, frameCount, duration, fileSize) {
        document.getElementById('gif-dimensions').textContent = `${width} × ${height}px`;
        document.getElementById('gif-frame-count').textContent = frameCount;
        document.getElementById('gif-duration').textContent = `${(duration / 1000).toFixed(2)}s`;
        document.getElementById('gif-size').textContent = ui.formatFileSize(fileSize || 0);
    },

    /**
     * Update current frame properties panel
     */
    updatePropertiesPanel() {
        if (!gifStudio.frameManager) return;

        const currentIndex = playback.currentFrameIndex;
        const frame = gifStudio.frameManager.getFrame(currentIndex);

        if (frame) {
            document.getElementById('current-frame-num').textContent = currentIndex + 1;
            document.getElementById('frame-delay').textContent = `${frame.delay}ms`;
            document.getElementById('frame-disposal').textContent = ui.getDisposalMethodName(frame.disposalType);
            document.getElementById('delay-input').value = frame.delay;
        }
    },

    /**
     * Get disposal method name
     */
    getDisposalMethodName(type) {
        const methods = {
            0: 'None',
            1: 'Keep',
            2: 'Background',
            3: 'Previous'
        };
        return methods[type] || 'Unknown';
    },

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 10) / 10 + ' ' + sizes[i];
    },

    /**
     * Enable/disable action buttons
     */
    updateButtonStates(hasGif) {
        document.getElementById('export-btn').disabled = !hasGif;
        document.getElementById('reverse-btn').disabled = !hasGif;
        document.getElementById('duplicate-btn').disabled = !hasGif;
        document.getElementById('delete-btn').disabled = !hasGif;
        const addFrameBtn = document.getElementById('add-frame-btn');
        if (addFrameBtn) addFrameBtn.disabled = !hasGif;
    },

    /**
     * Show new project modal
     */
    showNewProjectModal() {
        document.getElementById('new-project-modal').classList.add('active');
    },

    /**
     * Set new project size from preset button
     */
    setNewProjectSize(width, height) {
        document.getElementById('new-width').value = width;
        document.getElementById('new-height').value = height;
    },

    /**
     * Toggle background color picker visibility
     */
    toggleBgColorPicker() {
        const bgType = document.getElementById('new-bg-type').value;
        const colorPicker = document.getElementById('new-bg-color');
        colorPicker.style.display = bgType === 'custom' ? 'block' : 'none';
    },

    /**
     * Create a new blank project
     */
    createNewProject() {
        const width = parseInt(document.getElementById('new-width').value) || 400;
        const height = parseInt(document.getElementById('new-height').value) || 300;
        const frameCount = parseInt(document.getElementById('new-frame-count').value) || 1;
        const frameDelay = parseInt(document.getElementById('new-frame-delay').value) || 100;
        const bgType = document.getElementById('new-bg-type').value;
        const bgColor = document.getElementById('new-bg-color').value;

        // Validate dimensions
        if (width < 16 || width > 2048 || height < 16 || height > 2048) {
            ui.showToast('Dimensions must be between 16 and 2048 pixels', 'error');
            return;
        }

        // Close modal
        document.getElementById('new-project-modal').classList.remove('active');

        // Clear existing project
        gifStudio.clear();

        // Determine background color
        let bgRgba = { r: 0, g: 0, b: 0, a: 0 }; // Default transparent
        switch (bgType) {
            case 'white':
                bgRgba = { r: 255, g: 255, b: 255, a: 255 };
                break;
            case 'black':
                bgRgba = { r: 0, g: 0, b: 0, a: 255 };
                break;
            case 'custom':
                // Parse hex color
                const hex = bgColor.replace('#', '');
                bgRgba = {
                    r: parseInt(hex.substr(0, 2), 16),
                    g: parseInt(hex.substr(2, 2), 16),
                    b: parseInt(hex.substr(4, 2), 16),
                    a: 255
                };
                break;
        }

        // Create frame manager with blank frames
        gifStudio.frameManager = new FrameManager();
        gifStudio.frameManager.createBlankProject(width, height, frameCount, frameDelay, bgRgba);

        // Setup display
        gifStudio.setupDisplay(width, height);

        // Build timeline
        timeline.build();

        // Update UI
        ui.updateGifInfo(width, height, frameCount, frameCount * frameDelay, 0);

        // Reset playback and go to first frame
        playback.reset();
        playback.goToFrame(0);

        // Enable buttons
        ui.updateButtonStates(true);

        // Hide drop zone, show canvas
        document.getElementById('drop-zone').classList.add('hidden');
        document.getElementById('display-canvas').classList.add('active');

        gifStudio.isLoaded = true;
        gifStudio.currentFilename = null;
        gifStudio.currentProjectId = null;
        gifStudio.currentProjectName = 'New GIF';

        ui.showToast(`Created new ${width}×${height} GIF with ${frameCount} frame(s)`, 'success');
    },

    /**
     * Add a new blank frame after the current frame
     */
    addFrame() {
        if (!gifStudio.frameManager) {
            ui.showToast('No project loaded', 'error');
            return;
        }

        historyManager.saveState('Add Frame');

        const currentIndex = playback.currentFrameIndex;
        const currentFrame = gifStudio.frameManager.getFrame(currentIndex);
        const delay = currentFrame ? currentFrame.delay : 100;

        // Create new blank frame with same dimensions and delay
        const newIndex = gifStudio.frameManager.addBlankFrame(currentIndex + 1, delay);

        if (newIndex >= 0) {
            timeline.rebuild();
            playback.goToFrame(newIndex);
            ui.updateGifInfo(
                gifStudio.frameManager.width,
                gifStudio.frameManager.height,
                gifStudio.frameManager.getFrameCount(),
                gifStudio.frameManager.getTotalDuration(),
                0
            );
            ui.showToast('Frame added', 'success');
        }
    },

    /**
     * Insert a frame before the current frame
     */
    insertFrame() {
        if (!gifStudio.frameManager) {
            ui.showToast('No project loaded', 'error');
            return;
        }

        historyManager.saveState('Insert Frame');

        const currentIndex = playback.currentFrameIndex;
        const currentFrame = gifStudio.frameManager.getFrame(currentIndex);
        const delay = currentFrame ? currentFrame.delay : 100;

        // Create new blank frame at current position
        const newIndex = gifStudio.frameManager.addBlankFrame(currentIndex, delay);

        if (newIndex >= 0) {
            timeline.rebuild();
            playback.goToFrame(newIndex);
            ui.updateGifInfo(
                gifStudio.frameManager.width,
                gifStudio.frameManager.height,
                gifStudio.frameManager.getFrameCount(),
                gifStudio.frameManager.getTotalDuration(),
                0
            );
            ui.showToast('Frame inserted', 'success');
        }
    }
};
