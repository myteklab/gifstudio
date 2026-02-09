/**
 * GIF Studio - Help System
 * Educational content for students learning about GIF animation
 */

const helpSystem = {
    /**
     * Show help modal with specific topic
     */
    show(topic) {
        const modal = document.getElementById('help-modal');
        const title = document.getElementById('help-title');
        const content = document.getElementById('help-content');

        // Get help content for topic
        const helpData = this.getHelpContent(topic);

        if (helpData) {
            title.textContent = helpData.title;
            content.innerHTML = helpData.content;
            modal.classList.add('active');

            // Add keyboard listener for Escape key
            this.addEscapeListener();
        }
    },

    /**
     * Close help modal
     */
    close() {
        const modal = document.getElementById('help-modal');
        modal.classList.remove('active');

        // Remove keyboard listener
        this.removeEscapeListener();
    },

    /**
     * Handle Escape key press
     */
    handleEscape(event) {
        if (event.key === 'Escape') {
            helpSystem.close();
        }
    },

    /**
     * Add Escape key listener
     */
    addEscapeListener() {
        document.addEventListener('keydown', this.handleEscape);
    },

    /**
     * Remove Escape key listener
     */
    removeEscapeListener() {
        document.removeEventListener('keydown', this.handleEscape);
    },

    /**
     * Get help content for a specific topic
     */
    getHelpContent(topic) {
        const helpTopics = {
            'frames': {
                title: 'What are Frames?',
                content: `
                    <h3>Understanding GIF Frames</h3>
                    <p>A GIF (Graphics Interchange Format) animation is made up of multiple <strong>frames</strong> - just like a flip book or a cartoon!</p>

                    <h4>📚 How Frames Work</h4>
                    <p>Each frame is a single image. When these images are shown quickly one after another, they create the illusion of movement. This is called <strong>animation</strong>.</p>

                    <div class="example">
                        <strong>Example:</strong> A bouncing ball GIF might have:
                        <ul>
                            <li>Frame 1: Ball at the top</li>
                            <li>Frame 2: Ball halfway down</li>
                            <li>Frame 3: Ball touching ground</li>
                            <li>Frame 4: Ball bouncing up</li>
                        </ul>
                    </div>

                    <h4>🎬 Parts of a Frame</h4>
                    <ul>
                        <li><strong>Image Data:</strong> The actual picture for that frame</li>
                        <li><strong>Delay:</strong> How long to show this frame (in milliseconds)</li>
                        <li><strong>Disposal:</strong> What to do with the frame after showing it</li>
                    </ul>

                    <div class="tip-box">
                        <strong>💡 Tip:</strong> More frames = smoother animation, but larger file size!
                    </div>

                    <h4>🔍 In GIF Studio</h4>
                    <p>The left panel shows all your frames as thumbnails. Click any frame to select it and see its properties!</p>
                `
            },

            'gif-info': {
                title: 'GIF Information',
                content: `
                    <h3>Understanding GIF File Properties</h3>
                    <p>When you load a GIF, you can see important information about it in the properties panel.</p>

                    <h4>📐 Dimensions (Width × Height)</h4>
                    <p>This tells you the size of your GIF in <strong>pixels</strong>. For example, <code>400 × 300px</code> means 400 pixels wide by 300 pixels tall.</p>
                    <ul>
                        <li>Larger dimensions = better quality but bigger file</li>
                        <li>Smaller dimensions = faster to load but less detail</li>
                    </ul>

                    <h4>🎞️ Total Frames</h4>
                    <p>This is how many individual images make up your animation. More frames usually means smoother motion!</p>

                    <h4>⏱️ Duration</h4>
                    <p>How long the entire animation takes to play from start to finish, measured in seconds.</p>
                    <div class="example">
                        <strong>Example:</strong> If you have 10 frames, each shown for 0.1 seconds, the total duration is 1.0 second.
                    </div>

                    <h4>📦 File Size</h4>
                    <p>How much space the GIF takes up on your computer. Measured in KB (kilobytes) or MB (megabytes).</p>
                    <ul>
                        <li><strong>KB:</strong> Good for sharing online (faster to load)</li>
                        <li><strong>MB:</strong> Higher quality but slower to load</li>
                    </ul>

                    <div class="tip-box">
                        <strong>💡 Did You Know?</strong> The GIF format was invented in 1987 - that's over 35 years ago!
                    </div>
                `
            },

            'frame-properties': {
                title: 'Frame Properties',
                content: `
                    <h3>Understanding Frame Properties</h3>
                    <p>Each frame in your GIF has special properties that control how it looks and behaves.</p>

                    <h4>🔢 Frame Number</h4>
                    <p>Shows which frame you're currently viewing. Frames are numbered starting from 1.</p>

                    <h4>⏱️ Delay (Timing)</h4>
                    <p>How long this frame stays visible before moving to the next one, measured in <strong>milliseconds (ms)</strong>.</p>
                    <div class="example">
                        <strong>Understanding Milliseconds:</strong>
                        <ul>
                            <li><code>1000ms</code> = 1 second</li>
                            <li><code>500ms</code> = half a second</li>
                            <li><code>100ms</code> = one-tenth of a second (fast!)</li>
                            <li><code>50ms</code> = very fast animation</li>
                        </ul>
                    </div>

                    <h4>🎨 Disposal Method</h4>
                    <p>Tells the computer what to do with a frame after showing it:</p>
                    <ul>
                        <li><strong>None:</strong> Leave the frame on screen</li>
                        <li><strong>Keep:</strong> Keep this frame, draw next one on top</li>
                        <li><strong>Background:</strong> Clear to background color before next frame</li>
                        <li><strong>Previous:</strong> Go back to the previous frame's image</li>
                    </ul>

                    <div class="tip-box">
                        <strong>💡 Common Delays:</strong>
                        <ul>
                            <li>Slow motion: 200-500ms per frame</li>
                            <li>Normal speed: 50-100ms per frame</li>
                            <li>Fast action: 20-40ms per frame</li>
                        </ul>
                    </div>
                `
            },

            'frame-delay': {
                title: 'Editing Frame Delay',
                content: `
                    <h3>How to Adjust Animation Speed</h3>
                    <p>Frame delay controls how fast or slow your animation plays. It's like the speedometer for your GIF!</p>

                    <h4>⚙️ Setting the Delay</h4>
                    <ol>
                        <li>Select the frame you want to change</li>
                        <li>Type a number in the delay input box (in milliseconds)</li>
                        <li>Click <strong>"Apply"</strong> to change just that frame</li>
                        <li>Click <strong>"Apply to All"</strong> to change every frame</li>
                    </ol>

                    <h4>📊 Delay Values Guide</h4>
                    <div class="example">
                        <strong>What different delays feel like:</strong>
                        <ul>
                            <li><code>10ms</code> - Super fast, almost a blur</li>
                            <li><code>30ms</code> - Smooth, fast animation</li>
                            <li><code>50ms</code> - Normal animation speed</li>
                            <li><code>100ms</code> - Slower, clear movement</li>
                            <li><code>200ms</code> - Slow motion effect</li>
                            <li><code>500ms+</code> - Very slow, like a slideshow</li>
                        </ul>
                    </div>

                    <h4>🎬 Creative Uses</h4>
                    <ul>
                        <li><strong>Different delays per frame:</strong> Create dramatic pauses or speed ups!</li>
                        <li><strong>Longer delays at key frames:</strong> Let viewers see important moments</li>
                        <li><strong>Short delays for action:</strong> Make exciting moments feel fast</li>
                    </ul>

                    <div class="tip-box">
                        <strong>💡 Tip:</strong> Use the playback controls to preview your changes before exporting!
                    </div>
                `
            },

            'quick-actions': {
                title: 'Quick Actions',
                content: `
                    <h3>Frame Editing Tools</h3>
                    <p>These buttons help you quickly edit your animation without needing complicated software!</p>

                    <h4>↔️ Reverse Order</h4>
                    <p>Flips your entire animation backwards - the last frame becomes first, first becomes last!</p>
                    <div class="example">
                        <strong>Use Case:</strong> If you have a ball rolling right, reversing makes it roll left. Or create a "boomerang" effect that plays forward then backward!
                    </div>

                    <h4>📋 Duplicate Frame</h4>
                    <p>Makes an exact copy of the currently selected frame and puts it right after.</p>
                    <ul>
                        <li><strong>Why duplicate?</strong> To extend a moment or create smooth transitions</li>
                        <li><strong>Example:</strong> Duplicate a smile frame to make the smile last longer</li>
                    </ul>

                    <h4>🗑️ Delete Frame</h4>
                    <p>Removes the currently selected frame from your animation.</p>
                    <div class="tip-box">
                        <strong>⚠️ Warning:</strong> You can't delete the last remaining frame! Every GIF needs at least one frame.
                    </div>

                    <h4>🎯 Quick Tips</h4>
                    <ul>
                        <li>Select a frame first by clicking it in the frame list</li>
                        <li>All buttons are disabled until you load a GIF</li>
                        <li>Changes can be undone by reloading your project</li>
                    </ul>

                    <div class="tip-box">
                        <strong>💡 Creative Idea:</strong> Duplicate frames at different positions to create "freeze frame" effects in your animation!
                    </div>
                `
            },

            'playback': {
                title: 'Playback Controls',
                content: `
                    <h3>Controlling Your Animation</h3>
                    <p>These controls let you play, pause, and navigate through your GIF - like a video player!</p>

                    <h4>▶ Play/Pause</h4>
                    <p>Click to start or stop the animation. You can also press the <code>Spacebar</code> on your keyboard!</p>

                    <h4>⏮ Previous Frame / ⏭ Next Frame</h4>
                    <p>Jump one frame at a time to see your animation frame-by-frame.</p>
                    <ul>
                        <li><strong>Keyboard shortcut:</strong> Use arrow keys ← and →</li>
                        <li><strong>Great for:</strong> Finding the perfect frame to edit</li>
                    </ul>

                    <h4>↻ Loop Toggle</h4>
                    <p>Controls whether your animation repeats:</p>
                    <ul>
                        <li><strong>Loop ON (green):</strong> Animation plays forever</li>
                        <li><strong>Loop OFF (gray):</strong> Plays once then stops</li>
                    </ul>

                    <h4>⚡ Playback Speed</h4>
                    <p>Change how fast the animation plays for preview (doesn't change the actual GIF):</p>
                    <div class="example">
                        <ul>
                            <li><code>0.25x</code> - Quarter speed (slow motion for careful viewing)</li>
                            <li><code>0.5x</code> - Half speed</li>
                            <li><code>1x</code> - Normal speed (default)</li>
                            <li><code>1.5x</code> - 50% faster</li>
                            <li><code>2x</code> - Double speed</li>
                        </ul>
                    </div>

                    <h4>📊 Playback Info</h4>
                    <ul>
                        <li><strong>Frame:</strong> Shows current frame number / total frames</li>
                        <li><strong>Time:</strong> Current playback position in seconds</li>
                    </ul>

                    <h4>🔍 Zoom Controls</h4>
                    <p>Zoom in to see pixel details or zoom out to see the full animation:</p>
                    <ul>
                        <li><strong>+ / -</strong> buttons: Zoom in/out by 25%</li>
                        <li><strong>Percentage</strong> (click to reset): Shows current zoom, click to reset to 100%</li>
                        <li><strong>⊡ Fit to Window:</strong> Auto-fit GIF to the available space</li>
                    </ul>
                    <div class="example">
                        <strong>Keyboard shortcuts:</strong>
                        <ul>
                            <li><code>+</code> or <code>=</code> - Zoom in</li>
                            <li><code>-</code> - Zoom out</li>
                            <li><code>0</code> - Reset to 100%</li>
                            <li><code>F</code> - Fit to window</li>
                            <li><code>Ctrl + Scroll</code> - Mouse wheel zoom</li>
                        </ul>
                    </div>

                    <div class="tip-box">
                        <strong>💡 Pro Tip:</strong> Use slow playback (0.25x or 0.5x) to find frames that need timing adjustments! Zoom in to see fine details in your animation.
                    </div>
                `
            },

            'export': {
                title: 'Exporting Your GIF',
                content: `
                    <h3>Saving and Sharing Your Animation</h3>
                    <p>When you're happy with your GIF, you can export it to save or share with others!</p>

                    <h4>🎨 Quality Settings</h4>
                    <p>Controls how the GIF looks and how big the file will be:</p>
                    <ul>
                        <li><strong>High Quality:</strong> Best looking, but slower to create and bigger file</li>
                        <li><strong>Medium (Recommended):</strong> Good balance of quality and file size</li>
                        <li><strong>Low Quality:</strong> Faster to create and smaller file, but may look fuzzy</li>
                    </ul>

                    <div class="example">
                        <strong>When to use each setting:</strong>
                        <ul>
                            <li><strong>High:</strong> Important projects, art you want to preserve</li>
                            <li><strong>Medium:</strong> Sharing online, social media</li>
                            <li><strong>Low:</strong> Quick tests, very large animations</li>
                        </ul>
                    </div>

                    <h4>🔁 Loop Animation</h4>
                    <p>Checkbox to control if your GIF repeats:</p>
                    <ul>
                        <li><strong>Checked:</strong> GIF loops forever (recommended for most animations)</li>
                        <li><strong>Unchecked:</strong> Plays once and stops</li>
                    </ul>

                    <h4>💾 Save to MyTekOS</h4>
                    <p>When checked, your exported GIF will be saved to your MyTekOS account so you can access it later!</p>

                    <h4>📤 Export Process</h4>
                    <ol>
                        <li>Choose your quality setting</li>
                        <li>Select loop preference</li>
                        <li>Optionally check "Save to MyTekOS"</li>
                        <li>Click <strong>Export</strong></li>
                        <li>Wait for processing (may take a few seconds)</li>
                        <li>Your GIF will download automatically!</li>
                    </ol>

                    <div class="tip-box">
                        <strong>💡 File Size Tips:</strong>
                        <ul>
                            <li>Fewer frames = smaller file</li>
                            <li>Smaller dimensions = smaller file</li>
                            <li>Lower quality = smaller file</li>
                            <li>Solid colors compress better than gradients</li>
                        </ul>
                    </div>
                `
            },

            'properties': {
                title: 'Properties Panel',
                content: `
                    <h3>The Properties Panel</h3>
                    <p>The right side panel shows detailed information about your GIF and lets you make changes.</p>

                    <h4>📋 What's in the Properties Panel?</h4>
                    <ul>
                        <li><strong>GIF Information:</strong> Overall stats about your animation</li>
                        <li><strong>Current Frame:</strong> Details about the selected frame</li>
                        <li><strong>Edit Frame Delay:</strong> Tools to change timing</li>
                        <li><strong>Quick Actions:</strong> Buttons for common edits</li>
                    </ul>

                    <h4>🎯 How to Use It</h4>
                    <ol>
                        <li>Load a GIF file (Open or drag-and-drop)</li>
                        <li>Click a frame in the left panel to select it</li>
                        <li>The properties for that frame appear on the right</li>
                        <li>Make your changes using the tools provided</li>
                    </ol>

                    <div class="tip-box">
                        <strong>💡 Tip:</strong> Click the ? icon next to any section to learn more about it!
                    </div>
                `
            }
        };

        return helpTopics[topic] || null;
    }
};
