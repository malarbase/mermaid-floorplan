import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { Evaluator } from 'three-bvh-csg';
// Import types and shared code from floorplan-3d-core for consistent rendering
import type { JsonExport, JsonFloor, JsonConnection, JsonRoom, JsonConfig, JsonStyle } from 'floorplan-3d-core';
import { 
  DIMENSIONS, COLORS, COLORS_DARK, getThemeColors,
  MaterialFactory, StairGenerator, normalizeToMeters,
  type ViewerTheme, type MaterialStyle
} from 'floorplan-3d-core';
// Import shared viewer interfaces, wall generator, and managers from viewer-core
import { 
  MeshRegistry, 
  WallGenerator, 
  PivotIndicator,
  KeyboardControls,
  CameraManager,
  AnnotationManager,
  FloorManager,
  Overlay2DManager,
  createDslEditor,
  type DslEditorInstance,
  type SceneContext, 
  type StyleResolver 
} from 'viewer-core';
import { parseFloorplanDSLWithDocument, isFloorplanFile, isJsonFile, ParseError } from './dsl-parser';
// Chat integration
import { OpenAIChatService } from './openai-chat';

class Viewer implements SceneContext {
    // Core Three.js (protected for subclass access)
    protected _scene: THREE.Scene;
    protected _perspectiveCamera: THREE.PerspectiveCamera;
    protected _orthographicCamera: THREE.OrthographicCamera;
    protected _renderer: THREE.WebGLRenderer;
    protected labelRenderer: CSS2DRenderer;
    protected _controls: OrbitControls;
    
    // Entity-mesh registry for selection support
    protected _meshRegistry: MeshRegistry;
    
    // Scene content
    protected _floors: THREE.Group[] = [];
    protected floorHeights: number[] = [];
    protected connections: JsonConnection[] = [];
    protected config: JsonConfig = {};
    protected styles: Map<string, JsonStyle> = new Map();
    protected explodedViewFactor: number = 0;
    
    // Generators
    protected wallGenerator: WallGenerator;
    protected stairGenerator: StairGenerator;
    
    // Light controls
    protected directionalLight: THREE.DirectionalLight;
    protected lightAzimuth: number = 45; // degrees
    protected lightElevation: number = 60; // degrees
    protected lightIntensity: number = 1.0;
    protected lightRadius: number = 100;
    
    // Validation warnings
    protected validationWarnings: ParseError[] = [];
    protected warningsPanel: HTMLElement | null = null;
    protected warningsPanelCollapsed: boolean = true;
    
    // Current floorplan data
    protected currentFloorplanData: JsonExport | null = null;
    
    // Theme state
    protected currentTheme: ViewerTheme = 'light';
    
    // Editor panel state
    protected editorInstance: DslEditorInstance | null = null;
    protected chatService: OpenAIChatService = new OpenAIChatService();
    protected editorPanelOpen: boolean = false;
    protected editorDebounceTimer: number | undefined;
    
    // Keyboard navigation
    protected pivotIndicator: PivotIndicator | null = null;
    protected keyboardControls: KeyboardControls | null = null;
    protected lastFrameTime: number = 0;
    
    // Managers
    protected cameraManager: CameraManager;
    protected annotationManager: AnnotationManager;
    protected floorManager: FloorManager;
    protected overlay2DManager: Overlay2DManager;
    
    // SceneContext interface getters
    get scene(): THREE.Scene { return this._scene; }
    get activeCamera(): THREE.Camera { return this.cameraManager.activeCamera; }
    get perspectiveCamera(): THREE.PerspectiveCamera { return this._perspectiveCamera; }
    get orthographicCamera(): THREE.OrthographicCamera { return this._orthographicCamera; }
    get renderer(): THREE.WebGLRenderer { return this._renderer; }
    get controls(): OrbitControls { return this._controls; }
    get domElement(): HTMLCanvasElement { return this._renderer.domElement; }
    get floors(): readonly THREE.Group[] { return this._floors; }
    get meshRegistry(): MeshRegistry { return this._meshRegistry; }

    constructor() {
        // Init mesh registry for entity-mesh tracking
        this._meshRegistry = new MeshRegistry();
        
        // Init scene
        this._scene = new THREE.Scene();
        this._scene.background = new THREE.Color(COLORS.BACKGROUND);

        // Init perspective camera
        const fov = 75;
        this._perspectiveCamera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 1000);
        this._perspectiveCamera.position.set(20, 20, 20);

        // Init orthographic camera
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 30;
        this._orthographicCamera = new THREE.OrthographicCamera(
            frustumSize * aspect / -2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            frustumSize / -2,
            0.1,
            1000
        );
        this._orthographicCamera.position.set(20, 20, 20);

        // Init WebGL renderer
        this._renderer = new THREE.WebGLRenderer({ antialias: true });
        this._renderer.setSize(window.innerWidth, window.innerHeight);
        this._renderer.shadowMap.enabled = true;
        this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('app')?.appendChild(this._renderer.domElement);

        // Init CSS2D renderer for labels
        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0px';
        this.labelRenderer.domElement.style.pointerEvents = 'none';
        document.getElementById('app')?.appendChild(this.labelRenderer.domElement);

        // Init controls (using perspective camera initially)
        this._controls = new OrbitControls(this._perspectiveCamera, this._renderer.domElement);
        this._controls.enableDamping = true;
        
        // Init pivot indicator
        this.pivotIndicator = new PivotIndicator(this._scene, this._controls);
        
        // Wire up controls events to show pivot indicator
        this._controls.addEventListener('change', () => {
            this.pivotIndicator?.onCameraActivity();
        });

        // Init lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this._scene.add(ambientLight);

        this.directionalLight = new THREE.DirectionalLight(0xffffff, this.lightIntensity);
        this.updateLightPosition();
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 4096;
        this.directionalLight.shadow.mapSize.height = 4096;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 500;
        this.directionalLight.shadow.camera.left = -50;
        this.directionalLight.shadow.camera.right = 50;
        this.directionalLight.shadow.camera.top = 50;
        this.directionalLight.shadow.camera.bottom = -50;
        this._scene.add(this.directionalLight);

        // Init wall generator with CSG evaluator
        this.wallGenerator = new WallGenerator(new Evaluator());
        this.wallGenerator.setTheme(this.currentTheme);

        // Init stair generator
        this.stairGenerator = new StairGenerator();

        // Initialize managers
        this.cameraManager = new CameraManager(
            this._perspectiveCamera,
            this._orthographicCamera,
            this._controls,
            {
                getFloors: () => this._floors,
                getKeyboardControls: () => this.keyboardControls,
            }
        );
        
        this.annotationManager = new AnnotationManager({
            getFloors: () => this._floors,
            getFloorplanData: () => this.currentFloorplanData,
            getConfig: () => this.config,
            getFloorVisibility: (id) => this.floorManager.getFloorVisibility(id),
        });
        
        this.floorManager = new FloorManager({
            getFloors: () => this._floors,
            getFloorplanData: () => this.currentFloorplanData,
            onVisibilityChange: () => {
                this.annotationManager.updateFloorSummary();
                // Re-render 2D overlay to reflect floor visibility changes
                this.overlay2DManager.render();
            },
        });
        
        this.overlay2DManager = new Overlay2DManager({
            getCurrentTheme: () => this.currentTheme,
            getFloorplanData: () => this.currentFloorplanData,
            getVisibleFloorIds: () => this.floorManager.getVisibleFloorIds(),
        });

        // Window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Initialize keyboard controls
        this.keyboardControls = new KeyboardControls(
            this._controls,
            this._perspectiveCamera,
            this._orthographicCamera,
            {
                onCameraModeToggle: () => this.cameraManager.toggleCameraMode(),
                onUpdateOrthographicSize: () => this.cameraManager.updateOrthographicSize(),
                getBoundingBox: () => this.cameraManager.getSceneBoundingBox(),
                setHelpOverlayVisible: (visible) => this.setHelpOverlayVisible(visible),
            }
        );
        this.keyboardControls.setPivotIndicator(this.pivotIndicator!);
        
        // Setup help overlay close button and click-outside-to-close
        this.setupHelpOverlay();

        // UI Controls
        this.setupUIControls();
        
        // Create warnings panel
        this.createWarningsPanel();
        
        // Initialize editor panel
        this.setupEditorPanel();

        // Start loop
        this.animate();
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
        });
        
        // Collapsible sections
        document.querySelectorAll('.section-header').forEach(header => {
            header.addEventListener('click', () => {
                const section = header.parentElement;
                section?.classList.toggle('collapsed');
            });
        });
        
        // Setup manager controls
        this.cameraManager.setupControls();
        this.annotationManager.setupControls();
        this.floorManager.setupControls();
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
    
    private updateLightPosition() {
        // Convert spherical to cartesian coordinates
        const azimuthRad = (this.lightAzimuth * Math.PI) / 180;
        const elevationRad = (this.lightElevation * Math.PI) / 180;
        
        const x = this.lightRadius * Math.cos(elevationRad) * Math.sin(azimuthRad);
        const y = this.lightRadius * Math.sin(elevationRad);
        const z = this.lightRadius * Math.cos(elevationRad) * Math.cos(azimuthRad);
        
        this.directionalLight.position.set(x, y, z);
    }
    
    private toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        this.updateThemeButton();
    }
    
    public setTheme(theme: ViewerTheme) {
        this.currentTheme = theme;
        this.applyTheme();
        this.updateThemeButton();
    }
    
    private applyTheme() {
        const colors = getThemeColors(this.currentTheme);
        this._scene.background = new THREE.Color(colors.BACKGROUND);

        // Update wall generator theme
        this.wallGenerator.setTheme(this.currentTheme);

        // Regenerate materials for all rooms that don't have explicit styles
        this.regenerateMaterialsForTheme();
        
        // Update 2D overlay
        this.overlay2DManager.render();
    }

    /**
     * Regenerate materials for rooms without explicit styles when theme changes
     */
    private regenerateMaterialsForTheme() {
        if (!this.currentFloorplanData) return;

        const themeColors = getThemeColors(this.currentTheme);

        // Traverse all floors and update materials
        this.currentFloorplanData.floors.forEach((floorData, floorIndex) => {
            const floorGroup = this._floors[floorIndex];
            if (!floorGroup) return;

            floorData.rooms.forEach(room => {
                // Check if room has explicit style
                const hasExplicitStyle = (room.style && this.styles.has(room.style)) ||
                    (this.config.default_style && this.styles.has(this.config.default_style));

                // Only update materials for rooms without explicit styles
                if (!hasExplicitStyle) {
                    // Find and update floor mesh for this room
                    floorGroup.traverse((child) => {
                        if (child instanceof THREE.Mesh) {
                            const mesh = child as THREE.Mesh;
                            const material = mesh.material;

                            // Update floor materials (single material)
                            if (material instanceof THREE.MeshStandardMaterial && !Array.isArray(material)) {
                                // Check if it's a floor mesh (positioned at room elevation)
                                const elevation = room.elevation || 0;
                                if (Math.abs(mesh.position.y - elevation) < 0.1) {
                                    material.color.setHex(themeColors.FLOOR);
                                    material.needsUpdate = true;
                                }
                            }

                            // Update wall materials (material arrays for per-face materials)
                            if (Array.isArray(material)) {
                                material.forEach(mat => {
                                    if (mat instanceof THREE.MeshStandardMaterial) {
                                        // Update wall colors
                                        mat.color.setHex(themeColors.WALL);
                                        mat.needsUpdate = true;
                                    }
                                });
                            }
                        }
                    });
                }
            });
        });

        // Update door and window materials (they don't have explicit styles)
        this._floors.forEach(floorGroup => {
            floorGroup.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    const mesh = child as THREE.Mesh;
                    const material = mesh.material;

                    if (material instanceof THREE.MeshStandardMaterial) {
                        // Window materials are transparent
                        if (material.transparent && material.opacity < 1.0) {
                            material.color.setHex(themeColors.WINDOW);
                            material.needsUpdate = true;
                        }
                        // Door materials (identified by their color range)
                        else if (material.color.getHex() === COLORS.DOOR ||
                                 material.color.getHex() === COLORS_DARK.DOOR) {
                            material.color.setHex(themeColors.DOOR);
                            material.needsUpdate = true;
                        }
                    }
                }
            });
        });
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
     * Set keyboard help overlay visibility
     */
    private setHelpOverlayVisible(visible: boolean): void {
        const overlay = document.getElementById('keyboard-help-overlay');
        if (overlay) {
            overlay.classList.toggle('visible', visible);
        }
    }
    
    /**
     * Setup help overlay close functionality
     */
    private setupHelpOverlay(): void {
        const overlay = document.getElementById('keyboard-help-overlay');
        const closeBtn = document.getElementById('keyboard-help-close');
        const panel = overlay?.querySelector('.keyboard-help-panel');
        
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
        this.warningsPanel.className = 'warnings-panel collapsed';
        this.warningsPanel.innerHTML = `
            <div class="warnings-header">
                <span class="warnings-badge">⚠️ <span id="warning-count">0</span> warnings</span>
                <button id="toggle-warnings" class="toggle-btn">▼</button>
            </div>
            <div class="warnings-list" id="warnings-list"></div>
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
                listEl.innerHTML = '<div class="no-warnings">No warnings</div>';
            } else {
                listEl.innerHTML = this.validationWarnings.map((w, index) => {
                    const lineInfo = w.line ? `<span class="line-number">line ${w.line}:</span> ` : '';
                    return `<div class="warning-item" data-index="${index}" style="cursor: pointer;">${lineInfo}${w.message}</div>`;
                }).join('');
                
                // Add click handlers for navigation to editor
                listEl.querySelectorAll('.warning-item').forEach((item) => {
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

    private onWindowResize() {
        this.cameraManager.onWindowResize();
        this._renderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    }

    private animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        // Calculate delta time
        const now = performance.now();
        const deltaTime = this.lastFrameTime ? now - this.lastFrameTime : 16;
        this.lastFrameTime = now;
        
        // Update keyboard controls
        this.keyboardControls?.update(deltaTime);
        
        // Update pivot indicator
        this.pivotIndicator?.update(deltaTime);
        this.pivotIndicator?.updateSize(this.cameraManager.activeCamera);
        
        this._controls.update();
        this._renderer.render(this._scene, this.cameraManager.activeCamera);
        this.labelRenderer.render(this._scene, this.cameraManager.activeCamera);
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

    public loadFloorplan(data: JsonExport) {
        // Normalize all dimensions to meters for consistent 3D rendering
        const normalizedData = normalizeToMeters(data);
        this.currentFloorplanData = normalizedData;
        
        // Clear existing
        this._floors.forEach(f => this._scene.remove(f));
        this._floors = [];
        this.floorHeights = [];
        this.connections = normalizedData.connections;
        this.config = normalizedData.config || {};
        
        // Clear mesh registry for new floorplan
        this._meshRegistry.clear();
        
        // Initialize unit settings from config
        this.annotationManager.initFromConfig(this.config);
        
        // Apply theme from DSL config (6.7 & 6.8)
        if (this.config.theme === 'dark' || this.config.darkMode === true) {
            this.setTheme('dark');
        } else if (this.config.theme === 'blueprint') {
            this.setTheme('blueprint');
        } else if (this.config.theme === 'default') {
            this.setTheme('light');
        }
        
        // Build style lookup map
        this.styles.clear();
        if (normalizedData.styles) {
            for (const style of normalizedData.styles) {
                this.styles.set(style.name, style);
            }
        }

        // Center camera roughly
        if (normalizedData.floors.length > 0 && normalizedData.floors[0].rooms.length > 0) {
            const firstRoom = normalizedData.floors[0].rooms[0];
            this._controls.target.set(firstRoom.x + firstRoom.width/2, 0, firstRoom.z + firstRoom.height/2);
            
            // Store as default camera state for Home key reset
            this.keyboardControls?.storeDefaultCameraState();
        }

        // Generate floors and track heights
        const globalDefault = this.config.default_height ?? DIMENSIONS.WALL.HEIGHT;
        normalizedData.floors.forEach((floorData) => {
            const floorHeight = floorData.height ?? globalDefault;
            this.floorHeights.push(floorHeight);
            
            const floorGroup = this.generateFloor(floorData);
            this._scene.add(floorGroup);
            this._floors.push(floorGroup);
        });

        this.setExplodedView(this.explodedViewFactor);
        
        // Update annotations
        this.annotationManager.updateAll();
        
        // Update floor visibility UI
        this.floorManager.initFloorVisibility();
        
        // Update 2D overlay
        this.overlay2DManager.render();
    }

    /**
     * Resolve style for a room with fallback chain:
     * 1. Room's explicit style
     * 2. Default style from config
     * 3. undefined (use defaults)
     */
    private resolveRoomStyle(room: JsonRoom): MaterialStyle | undefined {
        // Try room's explicit style first
        if (room.style && this.styles.has(room.style)) {
            const style = this.styles.get(room.style)!;
            return MaterialFactory.jsonStyleToMaterialStyle(style);
        }
        
        // Try default style from config
        if (this.config.default_style && this.styles.has(this.config.default_style)) {
            const style = this.styles.get(this.config.default_style)!;
            return MaterialFactory.jsonStyleToMaterialStyle(style);
        }
        
        return undefined;
    }

    private generateFloor(floorData: JsonFloor): THREE.Group {
        const group = new THREE.Group();
        group.name = floorData.id;

        // Height resolution priority: room > floor > config > constant
        const globalDefault = this.config.default_height ?? DIMENSIONS.WALL.HEIGHT;
        const floorDefault = floorData.height ?? globalDefault;

        // Prepare all rooms with defaults for wall ownership detection
        const allRoomsWithDefaults = floorData.rooms.map(r => ({
            ...r,
            roomHeight: r.roomHeight ?? floorDefault
        }));

        // Set style resolver for wall ownership detection
        // This allows the wall generator to get styles for adjacent rooms
        const styleResolver: StyleResolver = (room: JsonRoom) => this.resolveRoomStyle(room);
        this.wallGenerator.setStyleResolver(styleResolver);
        
        floorData.rooms.forEach(room => {
            // Apply default height to room if not specified
            const roomWithDefaults = {
                ...room,
                roomHeight: room.roomHeight ?? floorDefault
            };

            // Resolve style for this room
            const roomStyle = this.resolveRoomStyle(room);

            // Create materials for this room with style and theme
            // Only pass theme if room doesn't have explicit style (so theme colors are used as defaults)
            const hasExplicitStyle = (room.style && this.styles.has(room.style)) ||
                (this.config.default_style && this.styles.has(this.config.default_style));
            const materials = MaterialFactory.createMaterialSet(
                roomStyle,
                hasExplicitStyle ? undefined : this.currentTheme
            );

            // 1. Floor plate
            const floorMesh = this.createFloorMesh(roomWithDefaults, materials.floor);
            group.add(floorMesh);
            
            // Register floor mesh in registry for selection support
            this._meshRegistry.register(
                floorMesh,
                'room',
                room.name,
                floorData.id
            );

            // 2. Walls with doors, windows, and connections
            // Now uses wall ownership detection to prevent Z-fighting
            roomWithDefaults.walls.forEach(wall => {
                this.wallGenerator.generateWall(
                    wall,
                    roomWithDefaults,
                    allRoomsWithDefaults,
                    this.connections,
                    materials,
                    group,
                    this.config
                );
            });
        });

        // 3. Stairs
        if (floorData.stairs) {
            floorData.stairs.forEach(stair => {
                const stairGroup = this.stairGenerator.generateStair(stair);
                group.add(stairGroup);
            });
        }

        // 4. Lifts
        if (floorData.lifts) {
            floorData.lifts.forEach(lift => {
                const liftGroup = this.stairGenerator.generateLift(lift, floorDefault);
                group.add(liftGroup);
            });
        }

        return group;
    }

    /**
     * Create a floor mesh for a room
     */
    private createFloorMesh(room: JsonRoom, material: THREE.Material): THREE.Mesh {
        const floorThickness = this.config.floor_thickness ?? DIMENSIONS.FLOOR.THICKNESS;
        const floorGeom = new THREE.BoxGeometry(room.width, floorThickness, room.height);
        const centerX = room.x + room.width / 2;
        const centerZ = room.z + room.height / 2;
        const elevation = room.elevation || 0;
        
        const floorMesh = new THREE.Mesh(floorGeom, material);
        floorMesh.position.set(centerX, elevation, centerZ);
        floorMesh.receiveShadow = true;
        return floorMesh;
    }


    private setExplodedView(factor: number) {
        this.explodedViewFactor = factor;
        const separation = DIMENSIONS.EXPLODED_VIEW.MAX_SEPARATION * factor;
        const defaultHeight = this.config.default_height ?? DIMENSIONS.WALL.HEIGHT;

        let cumulativeY = 0;
        this._floors.forEach((floorGroup, index) => {
            floorGroup.position.y = cumulativeY;
            // Use floor-specific height for calculating next floor position
            const floorHeight = this.floorHeights[index] ?? defaultHeight;
            cumulativeY += floorHeight + separation;
        });
        
        // Update annotations to match new positions
        this.annotationManager.updateAll();
    }
}

new Viewer();
