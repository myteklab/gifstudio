/**
 * Timeline UI Component
 * Manages the frame list display and interactions
 */

const timeline = {
    frameListElement: null,

    /**
     * Initialize timeline
     */
    init() {
        this.frameListElement = document.getElementById('frame-list');
    },

    /**
     * Build timeline with all frames
     */
    build() {
        if (!gifStudio.frameManager || !this.frameListElement) return;

        this.frameListElement.innerHTML = '';
        const frameCount = gifStudio.frameManager.getFrameCount();

        // Show empty state if no frames
        if (frameCount === 0) {
            this.showEmptyState();
            return;
        }

        // Create frame items
        for (let i = 0; i < frameCount; i++) {
            const frameItem = this.createFrameItem(i);
            this.frameListElement.appendChild(frameItem);
        }

        // Update frame count
        document.getElementById('frame-count').textContent = `${frameCount} frame${frameCount !== 1 ? 's' : ''}`;
    },

    /**
     * Rebuild timeline (after modifications)
     */
    rebuild() {
        this.build();
    },

    /**
     * Create frame item element
     * @param {number} index - Frame index
     * @returns {HTMLElement} Frame item
     */
    createFrameItem(index) {
        const frame = gifStudio.frameManager.getFrame(index);
        if (!frame) return null;

        const item = document.createElement('div');
        item.className = 'frame-item';
        item.dataset.index = index;

        // Create thumbnail
        const thumbnail = document.createElement('div');
        thumbnail.className = 'frame-thumbnail';

        const img = document.createElement('img');
        img.src = gifStudio.frameManager.createThumbnail(index);
        img.alt = `Frame ${index + 1}`;
        thumbnail.appendChild(img);

        // Create info
        const info = document.createElement('div');
        info.className = 'frame-info';
        info.innerHTML = `
            <span>Frame ${index + 1}</span>
            <span>${frame.delay}ms</span>
        `;

        item.appendChild(thumbnail);
        item.appendChild(info);

        // Click handler
        item.addEventListener('click', () => {
            playback.goToFrame(index);
        });

        return item;
    },

    /**
     * Update frame info (after delay change)
     * @param {number} index - Frame index
     */
    updateFrameInfo(index) {
        const item = this.frameListElement.querySelector(`[data-index="${index}"]`);
        if (!item) return;

        const frame = gifStudio.frameManager.getFrame(index);
        if (!frame) return;

        const info = item.querySelector('.frame-info');
        if (info) {
            info.innerHTML = `
                <span>Frame ${index + 1}</span>
                <span>${frame.delay}ms</span>
            `;
        }
    },

    /**
     * Set active frame
     * @param {number} index - Frame index
     */
    setActiveFrame(index) {
        // Remove active class from all items
        const items = this.frameListElement.querySelectorAll('.frame-item');
        items.forEach(item => item.classList.remove('active'));

        // Add active class to current item
        const activeItem = this.frameListElement.querySelector(`[data-index="${index}"]`);
        if (activeItem) {
            activeItem.classList.add('active');

            // Scroll into view if needed
            activeItem.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
    },

    /**
     * Show empty state
     */
    showEmptyState() {
        this.frameListElement.innerHTML = `
            <div class="empty-state">
                <p>No GIF loaded</p>
                <p style="font-size: 12px; color: #888;">Click "Open" to load an animated GIF</p>
            </div>
        `;
        document.getElementById('frame-count').textContent = '0 frames';
    },

    /**
     * Clear timeline
     */
    clear() {
        this.showEmptyState();
    }
};
