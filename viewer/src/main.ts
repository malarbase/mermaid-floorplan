import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
// Import types and shared code from floorplan-3d-core for consistent rendering
import type { JsonExport } from 'floorplan-3d-core';
// Import shared viewer interfaces, wall generator, and managers from viewer-core
import { 
  BaseViewer,
  Overlay2DManager,
  createDslEditor,
  monaco,
  injectStyles,
  parseFloorplanDSLWithDocument,
  isFloorplanFile,
  isJsonFile,
  type DslEditorInstance,
  type ParseError,
} from 'viewer-core';
// Chat integration
import { OpenAIChatService } from './openai-chat';

// Inject shared styles before anything else
injectStyles();

class Viewer extends BaseViewer {
    // Light controls
    protected lightAzimuth: number = 45;
    protected lightElevation: number = 60;
    protected lightIntensity: number = 1.0;
    protected lightRadius: number = 100;
    
    // Validation warnings
    protected validationWarnings: ParseError[] = [];
    protected warningsPanel: HTMLElement | null = null;
    protected warningsPanelCollapsed: boolean = true;
    
    // Editor panel state
    protected editorInstance: DslEditorInstance | null = null;
    protected chatService: OpenAIChatService = new OpenAIChatService();
    protected editorPanelOpen: boolean = false;
    protected editorDebounceTimer: number | undefined;
    
    // 2D Overlay manager
    protected overlay2DManager: Overlay2DManager;

    constructor() {
        super({
            containerId: 'app',
            initialTheme: 'light',
            enableKeyboardControls: true,
        });
        
        // Initialize 2D overlay manager
        this.overlay2DManager = new Overlay2DManager({
            getCurrentTheme: () => this.currentTheme,
            getFloorplanData: () => this.currentFloorplanData,
            getVisibleFloorIds: () => this._floorManager.getVisibleFloorIds(),
        });

        // UI Controls
        this.setupUIControls();
        
        // Create warnings panel
        this.createWarningsPanel();
        
        // Setup help overlay close button and click-outside-to-close
        this.setupHelpOverlay();
        
        // Initialize editor panel
        this.setupEditorPanel();

        // Start animation loop
        this.startAnimation();
    }
    
    /**
     * Override to handle floor visibility changes in 2D overlay.
     */
    protected onFloorVisibilityChanged(): void {
        this.overlay2DManager.render();
    }
    
    /**
     * Override to update 2D overlay after floorplan loads.
     */
    protected onFloorplanLoaded(): void {
        this.overlay2DManager.render();
    }
    
    private setupUIControls() {
        // Exploded view slider
        const explodedSlider = document.getElementById('exploded-view') as HTMLInputElement;
        explodedSlider?.addEventListener('input', (e) => {
            const val = parseInt((e.target as HTMLInputElement).value);
            this.setExplodedView(val / 100);
            this.updateSliderValue('exploded-value', `${val}%`);
        });

        // File input
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        fileInput?.addEventListener('change', this.onFileLoad.bind(this));
        
        // Light controls
        const azimuthSlider = document.getElementById('light-azimuth') as HTMLInputElement;
        azimuthSlider?.addEventListener('input', (e) => {
            this.lightAzimuth = parseFloat((e.target as HTMLInputElement).value);
            this.updateLightPosition();
            this.updateSliderValue('light-azimuth-value', `${Math.round(this.lightAzimuth)}°`);
        });
        
        const elevationSlider = document.getElementById('light-elevation') as HTMLInputElement;
        elevationSlider?.addEventListener('input', (e) => {
            this.lightElevation = parseFloat((e.target as HTMLInputElement).value);
            this.updateLightPosition();
            this.updateSliderValue('light-elevation-value', `${Math.round(this.lightElevation)}°`);
        });
        
        const intensitySlider = document.getElementById('light-intensity') as HTMLInputElement;
        intensitySlider?.addEventListener('input', (e) => {
            this.lightIntensity = parseFloat((e.target as HTMLInputElement).value);
            this.directionalLight.intensity = this.lightIntensity;
            this.updateSliderValue('light-intensity-value', this.lightIntensity.toFixed(1));
        });
        
        // Export buttons
        const exportGlbBtn = document.getElementById('export-glb-btn') as HTMLButtonElement;
        exportGlbBtn?.addEventListener('click', () => this.exportGLTF(true));
        
        const exportGltfBtn = document.getElementById('export-gltf-btn') as HTMLButtonElement;
        exportGltfBtn?.addEventListener('click', () => this.exportGLTF(false));
        
        // Theme toggle
        const themeToggleBtn = document.getElementById('theme-toggle-btn') as HTMLButtonElement;
        themeToggleBtn?.addEventListener('click', () => {
            this.toggleTheme();
            this.updateThemeButton();
            // Update Monaco editor theme
            monaco.editor.setTheme(this.currentTheme === 'dark' ? 'vs-dark' : 'vs');
            // Update 2D overlay for theme change
            this.overlay2DManager.render();
        });
        
        // Collapsible sections
        document.querySelectorAll('.fp-section-header').forEach(header => {
            header.addEventListener('click', () => {
                const section = header.parentElement;
                section?.classList.toggle('collapsed');
            });
        });
        
        // Setup manager controls
        this._cameraManager.setupControls();
        this._annotationManager.setupControls();
        this._floorManager.setupControls();
        this.overlay2DManager.setupControls();
    }
    
    // ==================== Editor Panel Setup ====================
    
    private async setupEditorPanel() {
        // Panel toggle button
        const toggleBtn = document.getElementById('editor-panel-toggle');
        
        toggleBtn?.addEventListener('click', () => {
            this.editorPanelOpen = !this.editorPanelOpen;
            this.updateEditorPanelPosition();
            if (toggleBtn) {
                toggleBtn.textContent = this.editorPanelOpen ? '◀' : '▶';
            }
        });
        
        // Setup resize handle
        this.setupEditorResize();
        
        // Initialize Monaco editor with default content
        const defaultContent = this.getDefaultFloorplanContent();
        try {
            this.editorInstance = createDslEditor({
                containerId: 'editor-container',
                initialContent: defaultContent,
                theme: 'vs-dark',
                fontSize: 13,
                onChange: () => this.scheduleEditorUpdate(),
            });
            
            // Load the default floorplan
            this.loadFloorplanFromEditor();
        } catch (err) {
            console.error('Failed to initialize editor:', err);
        }
        
        // Setup chat
        this.setupChat();
    }
    
    private updateEditorPanelPosition() {
        const panel = document.getElementById('editor-panel');
        if (!panel) return;
        
        const width = panel.offsetWidth;
        panel.style.transform = this.editorPanelOpen ? 'translateX(0)' : `translateX(-${width}px)`;
        document.body.classList.toggle('editor-open', this.editorPanelOpen);
        
        // Update CSS variable for other elements
        if (this.editorPanelOpen) {
            document.documentElement.style.setProperty('--editor-width', `${width}px`);
        }
        
        // Notify 2D overlay manager of editor state change to adjust position
        this.overlay2DManager.onEditorStateChanged(this.editorPanelOpen, width);
    }
    
    private setupEditorResize() {
        const resizeHandle = document.getElementById('editor-resize-handle');
        const panel = document.getElementById('editor-panel');
        
        if (!resizeHandle || !panel) return;
        
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;
        
        const onMouseDown = (e: MouseEvent) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = panel.offsetWidth;
            
            resizeHandle.classList.add('active');
            panel.classList.add('resizing');
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
            
            e.preventDefault();
        };
        
        const onMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            
            const deltaX = e.clientX - startX;
            const newWidth = Math.max(300, Math.min(startWidth + deltaX, window.innerWidth * 0.8));
            
            panel.style.width = `${newWidth}px`;
            panel.style.transform = this.editorPanelOpen ? 'translateX(0)' : `translateX(-${newWidth}px)`;
            
            // Update CSS variable for other elements that depend on editor width
            document.documentElement.style.setProperty('--editor-width', `${newWidth}px`);
        };
        
        const onMouseUp = () => {
            if (isResizing) {
                isResizing = false;
                resizeHandle.classList.remove('active');
                panel.classList.remove('resizing');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        };
        
        resizeHandle.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }
    
    private getDefaultFloorplanContent(): string {
        return `%%{version: 1.0}%%
floorplan
  # Style definitions
  style Modern {
    floor_color: "#E8E8E8",
    wall_color: "#505050",
    roughness: 0.4,
    metalness: 0.1
  }
  
  style WarmWood {
    floor_color: "#8B4513",
    wall_color: "#D2B48C",
    roughness: 0.7,
    metalness: 0.0
  }
  
  # Configuration
  config { default_style: Modern, wall_thickness: 0.25 }
  
  floor MainFloor {
    room LivingRoom at (0,0) size (12 x 10) walls [top: solid, right: solid, bottom: solid, left: window] label "Living Area" style WarmWood
    room Kitchen size (8 x 8) walls [top: solid, right: window, bottom: solid, left: open] right-of LivingRoom
    room Hallway size (4 x 10) walls [top: solid, right: solid, bottom: solid, left: solid] below LivingRoom gap 0.5
    room MasterBedroom size (10 x 10) walls [top: solid, right: window, bottom: solid, left: solid] right-of Hallway
  }
  
  connect LivingRoom.right to Kitchen.left door at 50%
  connect LivingRoom.bottom to Hallway.top door at 50%
  connect Hallway.right to MasterBedroom.left door at 50%
`;
    }
    
    private scheduleEditorUpdate() {
        if (this.editorDebounceTimer) {
            window.clearTimeout(this.editorDebounceTimer);
        }
        this.editorDebounceTimer = window.setTimeout(() => {
            this.loadFloorplanFromEditor();
        }, 500);
    }
    
    private async loadFloorplanFromEditor() {
        if (!this.editorInstance) return;
        
        const content = this.editorInstance.getValue();
        
        try {
            const result = await parseFloorplanDSLWithDocument(content);
            
            if (result.errors.length > 0) {
                // Don't update if there are errors
                this.validationWarnings = result.errors;
                this.updateWarningsPanel();
                return;
            }
            
            // Store validation warnings
            this.validationWarnings = result.warnings;
            this.updateWarningsPanel();
            
            // Store Langium document for 2D rendering
            this.overlay2DManager.setLangiumDocument(result.document ?? null);
            
            if (result.data) {
                this.loadFloorplan(result.data);
                
                // Update chat context with new floorplan
                this.chatService.updateFloorplanContext(content);
            }
        } catch (err) {
            console.error('Failed to parse floorplan from editor:', err);
        }
    }
    
    private setupChat() {
        const chatMessages = document.getElementById('chat-messages') as HTMLElement;
        const chatInput = document.getElementById('chat-input') as HTMLInputElement;
        const sendButton = document.getElementById('send-button') as HTMLButtonElement;
        const baseUrlInput = document.getElementById('base-url-input') as HTMLInputElement;
        const apiKeyInput = document.getElementById('api-key-input') as HTMLInputElement;
        const saveApiKeyButton = document.getElementById('save-api-key') as HTMLButtonElement;
        const removeApiKeyButton = document.getElementById('remove-api-key') as HTMLButtonElement;
        const apiKeyStatus = document.getElementById('api-key-status') as HTMLElement;
        const modelSelect = document.getElementById('model-select') as HTMLSelectElement;
        
        // Load saved settings
        const savedBaseUrl = localStorage.getItem('openai_base_url') || 'https://api.openai.com/v1';
        const savedApiKey = localStorage.getItem('openai_api_key');
        const savedModel = localStorage.getItem('openai_model') || 'gpt-4o-mini';
        
        // Apply saved base URL
        baseUrlInput.value = savedBaseUrl;
        this.chatService.setBaseUrl(savedBaseUrl);
        
        if (savedApiKey) {
            apiKeyInput.value = savedApiKey;
            this.chatService.setApiKey(savedApiKey);
            this.updateChatUI(true);
        }
        
        modelSelect.value = savedModel;
        this.chatService.setModel(savedModel);
        
        const updateChatUI = (apiKeyValid: boolean) => {
            if (apiKeyValid) {
                apiKeyStatus.textContent = 'API key is set';
                apiKeyStatus.className = 'api-key-status valid';
                chatInput.disabled = false;
                sendButton.disabled = false;
                removeApiKeyButton.style.display = 'inline-block';
            } else {
                apiKeyStatus.textContent = 'Enter API key for AI chat';
                apiKeyStatus.className = 'api-key-status invalid';
                chatInput.disabled = true;
                sendButton.disabled = true;
                removeApiKeyButton.style.display = 'none';
            }
        };
        
        this.updateChatUI = updateChatUI;
        
        const addMessage = (content: string, isUser: boolean, isLoading: boolean = false): HTMLElement => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${isUser ? 'user-message' : isLoading ? 'loading-message' : 'assistant-message'}`;
            
            if (isLoading) {
                messageDiv.innerHTML = `
                    <span>Thinking</span>
                    <div class="loading-ellipsis">
                        <div></div><div></div><div></div><div></div>
                    </div>
                `;
            } else {
                messageDiv.textContent = content;
            }
            
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            return messageDiv;
        };
        
        const extractFloorplanContent = (response: string): { floorplan: string | null; cleanedResponse: string } => {
            const floorplanRegex = /```\n*fp\n([\s\S]*?)\n```/g;
            const match = floorplanRegex.exec(response);
            
            if (match) {
                const floorplan = match[1].trim();
                const cleanedResponse = response.replace(floorplanRegex, '').trim();
                return { floorplan, cleanedResponse };
            }
            
            return { floorplan: null, cleanedResponse: response };
        };
        
        const sendMessage = async () => {
            const message = chatInput.value.trim();
            if (!message || !this.editorInstance) return;
            
            addMessage(message, true);
            chatInput.value = '';
            sendButton.disabled = true;
            
            const loadingMessage = addMessage('', false, true);
            
            try {
                const response = await this.chatService.sendMessage(message, this.editorInstance.getValue());
                const { floorplan, cleanedResponse } = extractFloorplanContent(response);
                
                // If floorplan content was found, update the editor
                if (floorplan && this.editorInstance) {
                    this.editorInstance.setValue(floorplan);
                }
                
                // Replace loading message with actual response
                loadingMessage.className = 'message assistant-message';
                loadingMessage.textContent = cleanedResponse || 'Done!';
            } catch (error) {
                loadingMessage.className = 'message assistant-message';
                loadingMessage.textContent = 'Error: ' + (error as Error).message;
            } finally {
                sendButton.disabled = false;
            }
        };
        
        const saveApiKey = async () => {
            const baseUrl = baseUrlInput.value.trim() || 'https://api.openai.com/v1';
            const apiKey = apiKeyInput.value.trim();
            
            if (!apiKey) {
                apiKeyStatus.textContent = 'Please enter an API key';
                apiKeyStatus.className = 'api-key-status invalid';
                return;
            }
            
            // Save base URL first
            this.chatService.setBaseUrl(baseUrl);
            localStorage.setItem('openai_base_url', baseUrl);
            
            saveApiKeyButton.disabled = true;
            saveApiKeyButton.textContent = 'Validating...';
            
            try {
                const isValid = await this.chatService.validateApiKey(apiKey);
                if (isValid) {
                    this.chatService.setApiKey(apiKey);
                    localStorage.setItem('openai_api_key', apiKey);
                    updateChatUI(true);
                } else {
                    apiKeyStatus.textContent = 'Invalid API key or URL';
                    apiKeyStatus.className = 'api-key-status invalid';
                }
            } catch {
                apiKeyStatus.textContent = 'Error validating (check URL)';
                apiKeyStatus.className = 'api-key-status invalid';
            } finally {
                saveApiKeyButton.disabled = false;
                saveApiKeyButton.textContent = 'Save';
            }
        };
        
        const removeApiKey = () => {
            localStorage.removeItem('openai_api_key');
            localStorage.removeItem('openai_base_url');
            this.chatService.setApiKey('');
            this.chatService.setBaseUrl('https://api.openai.com/v1');
            apiKeyInput.value = '';
            baseUrlInput.value = 'https://api.openai.com/v1';
            updateChatUI(false);
        };
        
        const updateModel = () => {
            const selectedModel = modelSelect.value;
            this.chatService.setModel(selectedModel);
            localStorage.setItem('openai_model', selectedModel);
        };
        
        // Event listeners
        saveApiKeyButton?.addEventListener('click', saveApiKey);
        removeApiKeyButton?.addEventListener('click', removeApiKey);
        modelSelect?.addEventListener('change', updateModel);
        baseUrlInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') saveApiKey();
        });
        apiKeyInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') saveApiKey();
        });
        sendButton?.addEventListener('click', sendMessage);
        chatInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
        
        // Initial UI state
        if (!savedApiKey) {
            updateChatUI(false);
        }
    }
    
    private updateChatUI: (valid: boolean) => void = () => {};
    
    private updateSliderValue(elementId: string, value: string) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    private updateThemeButton() {
        const btn = document.getElementById('theme-toggle-btn');
        if (btn) {
            switch (this.currentTheme) {
                case 'light':
                    btn.textContent = '🌙 Dark';
                    break;
                case 'dark':
                    btn.textContent = '☀️ Light';
                    break;
                case 'blueprint':
                    btn.textContent = '📐 Blueprint';
                    break;
            }
        }
    }
    
    /**
     * Setup help overlay close functionality
     */
    private setupHelpOverlay(): void {
        const overlay = document.getElementById('keyboard-help-overlay');
        const closeBtn = document.getElementById('keyboard-help-close');
        const panel = overlay?.querySelector('.fp-keyboard-help-panel');
        
        // Close button click
        closeBtn?.addEventListener('click', () => {
            this.setHelpOverlayVisible(false);
        });
        
        // Click outside panel to close
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.setHelpOverlayVisible(false);
            }
        });
        
        // Prevent clicks on panel from closing
        panel?.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    private async exportGLTF(binary: boolean) {
        const exporter = new GLTFExporter();
        
        try {
            const result = await new Promise<ArrayBuffer | object>((resolve, reject) => {
                exporter.parse(
                    this._scene,
                    (gltf) => resolve(gltf),
                    (error) => reject(error),
                    { binary }
                );
            });
            
            if (binary) {
                // GLB export
                const blob = new Blob([result as ArrayBuffer], { type: 'application/octet-stream' });
                this.downloadBlob(blob, 'floorplan.glb');
            } else {
                // GLTF export
                const json = JSON.stringify(result, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                this.downloadBlob(blob, 'floorplan.gltf');
            }
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export model');
        }
    }
    
    private downloadBlob(blob: Blob, filename: string) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // ==================== Validation Warnings Panel ====================
    
    private createWarningsPanel() {
        this.warningsPanel = document.createElement('div');
        this.warningsPanel.id = 'warnings-panel';
        this.warningsPanel.className = 'fp-warnings-panel collapsed';
        this.warningsPanel.innerHTML = `
            <div class="fp-warnings-header">
                <span class="fp-warnings-badge">⚠️ <span id="warning-count">0</span> warnings</span>
                <button id="toggle-warnings" class="fp-warnings-toggle">▼</button>
            </div>
            <div class="fp-warnings-list" id="warnings-list"></div>
        `;
        document.body.appendChild(this.warningsPanel);
        
        // Toggle collapse
        const toggleBtn = document.getElementById('toggle-warnings');
        toggleBtn?.addEventListener('click', () => {
            this.warningsPanelCollapsed = !this.warningsPanelCollapsed;
            this.warningsPanel?.classList.toggle('collapsed', this.warningsPanelCollapsed);
            if (toggleBtn) {
                toggleBtn.textContent = this.warningsPanelCollapsed ? '▼' : '▲';
            }
        });
    }
    
    private updateWarningsPanel() {
        const countEl = document.getElementById('warning-count');
        const listEl = document.getElementById('warnings-list');
        
        if (countEl) {
            countEl.textContent = String(this.validationWarnings.length);
        }
        
        if (listEl) {
            if (this.validationWarnings.length === 0) {
                listEl.innerHTML = '<div class="fp-no-warnings">No warnings</div>';
            } else {
                listEl.innerHTML = this.validationWarnings.map((w, index) => {
                    const lineInfo = w.line ? `<span class="fp-warning-line">line ${w.line}:</span> ` : '';
                    return `<div class="fp-warning-item" data-index="${index}" style="cursor: pointer;">${lineInfo}${w.message}</div>`;
                }).join('');
                
                // Add click handlers for navigation to editor
                listEl.querySelectorAll('.fp-warning-item').forEach((item) => {
                    item.addEventListener('click', () => {
                        const index = parseInt(item.getAttribute('data-index') || '0', 10);
                        const warning = this.validationWarnings[index];
                        if (warning.line && this.editorInstance) {
                            // Open editor panel if not already open
                            if (!this.editorPanelOpen) {
                                document.getElementById('editor-panel-toggle')?.click();
                            }
                            this.editorInstance.goToLine(warning.line, warning.column || 1);
                        }
                    });
                });
            }
        }
        
        // Show/hide panel based on whether there are warnings
        if (this.warningsPanel) {
            this.warningsPanel.style.display = this.validationWarnings.length > 0 ? 'block' : 'none';
        }
    }

    private onFileLoad(event: Event) {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target?.result as string;
            
            if (isFloorplanFile(file.name)) {
                // Parse DSL file directly
                try {
                    const result = await parseFloorplanDSLWithDocument(content);
                    if (result.errors.length > 0) {
                        const errorMsg = result.errors.map(e => 
                            e.line ? `Line ${e.line}: ${e.message}` : e.message
                        ).join('\n');
                        console.error("Parse errors:", result.errors);
                        alert(`Failed to parse floorplan:\n${errorMsg}`);
                        return;
                    }
                    
                    // Update editor with loaded content
                    if (this.editorInstance) {
                        this.editorInstance.setValue(content);
                    }
                    
                    // Store validation warnings
                    this.validationWarnings = result.warnings;
                    this.updateWarningsPanel();
                    
                    // Display warnings in console (keep for debugging)
                    if (result.warnings.length > 0) {
                        console.warn("⚠️  Validation warnings:");
                        for (const warning of result.warnings) {
                            const line = warning.line ? ` (line ${warning.line})` : "";
                            console.warn(`  ⚠ ${warning.message}${line}`);
                        }
                    }
                    
                    // Store Langium document for 2D rendering
                    this.overlay2DManager.setLangiumDocument(result.document ?? null);
                    
                    if (result.data) {
                        this.loadFloorplan(result.data);
                    }
                } catch (err) {
                    console.error("Failed to parse floorplan DSL", err);
                    alert("Failed to parse floorplan file");
                }
            } else if (isJsonFile(file.name)) {
                // Parse JSON file
                try {
                    const json = JSON.parse(content) as JsonExport;
                    // Clear warnings for JSON files (no validation)
                    this.validationWarnings = [];
                    this.updateWarningsPanel();
                    // JSON files don't have a Langium document for 2D rendering
                    this.overlay2DManager.setLangiumDocument(null);
                    this.loadFloorplan(json);
                } catch (err) {
                    console.error("Failed to parse JSON", err);
                    alert("Invalid JSON file");
                }
            } else {
                alert("Unsupported file type. Please use .floorplan or .json files.");
            }
        };
        reader.readAsText(file);
    }
}

new Viewer();
