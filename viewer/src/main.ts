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
// Browser-specific modules (CSG, DSL parsing)
import { WallGenerator, StyleResolver } from './wall-generator';
import { parseFloorplanDSLWithDocument, isFloorplanFile, isJsonFile, ParseError } from './dsl-parser';
// Editor and chat integration
import { initializeEditor, type EditorInstance } from './editor';
import { OpenAIChatService } from './openai-chat';
// Keyboard navigation
import { PivotIndicator } from './pivot-indicator';
import { KeyboardControls } from './keyboard-controls';
// Extracted managers
import { CameraManager } from './camera-manager';
import { AnnotationManager } from './annotation-manager';
import { FloorManager } from './floor-manager';
import { Overlay2DManager } from './overlay-2d-manager';

class Viewer {
    // Core Three.js
    private scene: THREE.Scene;
    private perspectiveCamera: THREE.PerspectiveCamera;
    private orthographicCamera: THREE.OrthographicCamera;
    private renderer: THREE.WebGLRenderer;
    private labelRenderer: CSS2DRenderer;
    private controls: OrbitControls;
    
    // Scene content
    private floors: THREE.Group[] = [];
    private floorHeights: number[] = [];
    private connections: JsonConnection[] = [];
    private config: JsonConfig = {};
    private styles: Map<string, JsonStyle> = new Map();
    private explodedViewFactor: number = 0;
    
    // Generators
    private wallGenerator: WallGenerator;
    private stairGenerator: StairGenerator;
    
    // Light controls
    private directionalLight: THREE.DirectionalLight;
    private lightAzimuth: number = 45; // degrees
    private lightElevation: number = 60; // degrees
    private lightIntensity: number = 1.0;
    private lightRadius: number = 100;
    
    // Validation warnings
    private validationWarnings: ParseError[] = [];
    private warningsPanel: HTMLElement | null = null;
    private warningsPanelCollapsed: boolean = true;
    
    // Current floorplan data
    private currentFloorplanData: JsonExport | null = null;
    
    // Theme state
    private currentTheme: ViewerTheme = 'light';
    
    // Editor panel state
    private editorInstance: EditorInstance | null = null;
    private chatService: OpenAIChatService = new OpenAIChatService();
    private editorPanelOpen: boolean = false;
    private editorDebounceTimer: number | undefined;
    
    // Keyboard navigation
    private pivotIndicator: PivotIndicator | null = null;
    private keyboardControls: KeyboardControls | null = null;
    private lastFrameTime: number = 0;
    
    // Managers
    private cameraManager: CameraManager;
    private annotationManager: AnnotationManager;
    private floorManager: FloorManager;
    private overlay2DManager: Overlay2DManager;

    constructor() {
        // Init scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(COLORS.BACKGROUND);

        // Init perspective camera
        const fov = 75;
        this.perspectiveCamera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.perspectiveCamera.position.set(20, 20, 20);

        // Init orthographic camera
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 30;
        this.orthographicCamera = new THREE.OrthographicCamera(
            frustumSize * aspect / -2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            frustumSize / -2,
            0.1,
            1000
        );
        this.orthographicCamera.position.set(20, 20, 20);

        // Init WebGL renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('app')?.appendChild(this.renderer.domElement);

        // Init CSS2D renderer for labels
        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0px';
        this.labelRenderer.domElement.style.pointerEvents = 'none';
        document.getElementById('app')?.appendChild(this.labelRenderer.domElement);

        // Init controls (using perspective camera initially)
        this.controls = new OrbitControls(this.perspectiveCamera, this.renderer.domElement);
        this.controls.enableDamping = true;
        
        // Init pivot indicator
        this.pivotIndicator = new PivotIndicator(this.scene, this.controls);
        
        // Wire up controls events to show pivot indicator
        this.controls.addEventListener('change', () => {
            this.pivotIndicator?.onCameraActivity();
        });

        // Init lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

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
        this.scene.add(this.directionalLight);

        // Init wall generator with CSG evaluator
        this.wallGenerator = new WallGenerator(new Evaluator());
        this.wallGenerator.setTheme(this.currentTheme);

        // Init stair generator
        this.stairGenerator = new StairGenerator();

        // Initialize managers
        this.cameraManager = new CameraManager(
            this.perspectiveCamera,
            this.orthographicCamera,
            this.controls,
            {
                getFloors: () => this.floors,
                getKeyboardControls: () => this.keyboardControls,
            }
        );
        
        this.annotationManager = new AnnotationManager({
            getFloors: () => this.floors,
            getFloorplanData: () => this.currentFloorplanData,
            getConfig: () => this.config,
            getFloorVisibility: (id) => this.floorManager.getFloorVisibility(id),
        });
        
        this.floorManager = new FloorManager({
            getFloors: () => this.floors,
            getFloorplanData: () => this.currentFloorplanData,
            onVisibilityChange: () => this.annotationManager.updateFloorSummary(),
        });
        
        this.overlay2DManager = new Overlay2DManager({
            getCurrentTheme: () => this.currentTheme,
            getFloorplanData: () => this.currentFloorplanData,
        });

        // Window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Initialize keyboard controls
        this.keyboardControls = new KeyboardControls(
            this.controls,
            this.perspectiveCamera,
            this.orthographicCamera,
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
        const panel = document.getElementById('editor-panel');
        
        toggleBtn?.addEventListener('click', () => {
            this.editorPanelOpen = !this.editorPanelOpen;
            panel?.classList.toggle('open', this.editorPanelOpen);
            document.body.classList.toggle('editor-open', this.editorPanelOpen);
            if (toggleBtn) {
                toggleBtn.textContent = this.editorPanelOpen ? '◀' : '▶';
            }
        });
        
        // Initialize Monaco editor with default content
        const defaultContent = this.getDefaultFloorplanContent();
        try {
            this.editorInstance = await initializeEditor('editor-container', defaultContent);
            
            // Wire up editor changes to reload floorplan (debounced)
            this.editorInstance.onDidChangeModelContent(() => {
                this.scheduleEditorUpdate();
            });
            
            // Load the default floorplan
            this.loadFloorplanFromEditor();
        } catch (err) {
            console.error('Failed to initialize editor:', err);
        }
        
        // Setup chat
        this.setupChat();
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
        this.scene.background = new THREE.Color(colors.BACKGROUND);

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
            const floorGroup = this.floors[floorIndex];
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
        this.floors.forEach(floorGroup => {
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
                    this.scene,
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
                listEl.innerHTML = this.validationWarnings.map(w => {
                    const lineInfo = w.line ? `<span class="line-number">line ${w.line}:</span> ` : '';
                    return `<div class="warning-item">${lineInfo}${w.message}</div>`;
                }).join('');
            }
        }
        
        // Show/hide panel based on whether there are warnings
        if (this.warningsPanel) {
            this.warningsPanel.style.display = this.validationWarnings.length > 0 ? 'block' : 'none';
        }
    }

    private onWindowResize() {
        this.cameraManager.onWindowResize();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
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
        
        this.controls.update();
        this.renderer.render(this.scene, this.cameraManager.activeCamera);
        this.labelRenderer.render(this.scene, this.cameraManager.activeCamera);
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
        this.floors.forEach(f => this.scene.remove(f));
        this.floors = [];
        this.floorHeights = [];
        this.connections = normalizedData.connections;
        this.config = normalizedData.config || {};
        
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
            this.controls.target.set(firstRoom.x + firstRoom.width/2, 0, firstRoom.z + firstRoom.height/2);
            
            // Store as default camera state for Home key reset
            this.keyboardControls?.storeDefaultCameraState();
        }

        // Generate floors and track heights
        const globalDefault = this.config.default_height ?? DIMENSIONS.WALL.HEIGHT;
        normalizedData.floors.forEach((floorData) => {
            const floorHeight = floorData.height ?? globalDefault;
            this.floorHeights.push(floorHeight);
            
            const floorGroup = this.generateFloor(floorData);
            this.scene.add(floorGroup);
            this.floors.push(floorGroup);
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
        this.floors.forEach((floorGroup, index) => {
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
