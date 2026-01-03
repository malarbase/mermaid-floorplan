import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { Evaluator } from 'three-bvh-csg';
// Import types and shared code from floorplan-3d-core for consistent rendering
import type { JsonExport, JsonFloor, JsonConnection, JsonRoom, JsonConfig, JsonStyle } from 'floorplan-3d-core';
import { 
  DIMENSIONS, COLORS, COLORS_DARK, METERS_TO_UNIT, getThemeColors,
  MaterialFactory, StairGenerator, normalizeToMeters,
  type LengthUnit, type ViewerTheme, type MaterialStyle
} from 'floorplan-3d-core';
// Browser-specific modules (CSG, DSL parsing)
import { WallGenerator, StyleResolver } from './wall-generator';
import { parseFloorplanDSLWithDocument, isFloorplanFile, isJsonFile, ParseError } from './dsl-parser';
// 2D SVG rendering from language package
import { render as render2D, type RenderOptions } from 'floorplans-language';
// Editor and chat integration
import { initializeEditor, type EditorInstance } from './editor';
import { OpenAIChatService } from './openai-chat';

// Area unit type
type AreaUnit = 'sqft' | 'sqm';

// Annotation state
interface AnnotationState {
    showArea: boolean;
    showDimensions: boolean;
    showFloorSummary: boolean;
    areaUnit: AreaUnit;
    lengthUnit: LengthUnit;
}

// Camera mode
type CameraMode = 'perspective' | 'orthographic';

class Viewer {
    private scene: THREE.Scene;
    private perspectiveCamera: THREE.PerspectiveCamera;
    private orthographicCamera: THREE.OrthographicCamera;
    private activeCamera: THREE.Camera;
    private cameraMode: CameraMode = 'perspective';
    private renderer: THREE.WebGLRenderer;
    private labelRenderer: CSS2DRenderer;
    private controls: OrbitControls;
    private floors: THREE.Group[] = [];
    private floorHeights: number[] = [];
    private connections: JsonConnection[] = [];
    private config: JsonConfig = {};
    private styles: Map<string, JsonStyle> = new Map();
    private explodedViewFactor: number = 0;
    private wallGenerator: WallGenerator;
    private stairGenerator: StairGenerator;
    
    // Light controls
    private directionalLight: THREE.DirectionalLight;
    private lightAzimuth: number = 45; // degrees
    private lightElevation: number = 60; // degrees
    private lightIntensity: number = 1.0;
    private lightRadius: number = 100;
    
    // FOV
    private fov: number = 75;
    
    // Annotation state
    private annotationState: AnnotationState = {
        showArea: false,
        showDimensions: false,
        showFloorSummary: false,
        areaUnit: 'sqft',
        lengthUnit: 'ft',
    };
    
    // Annotation objects
    private areaLabels: CSS2DObject[] = [];
    private dimensionLabels: CSS2DObject[] = [];
    private floorSummaryPanel: HTMLElement | null = null;
    
    // Validation warnings
    private validationWarnings: ParseError[] = [];
    private warningsPanel: HTMLElement | null = null;
    private warningsPanelCollapsed: boolean = true;
    
    // Current floorplan data (for annotations)
    private currentFloorplanData: JsonExport | null = null;
    
    // Theme state
    private currentTheme: ViewerTheme = 'light';
    
    // 2D Overlay state
    private overlayVisible: boolean = false;
    private overlayOpacity: number = 0.60;
    private currentLangiumDoc: import('langium').LangiumDocument<import('floorplans-language').Floorplan> | null = null;
    
    // Floor visibility state
    private floorVisibility: Map<string, boolean> = new Map();
    
    // Editor panel state
    private editorInstance: EditorInstance | null = null;
    private chatService: OpenAIChatService = new OpenAIChatService();
    private editorPanelOpen: boolean = false;
    private editorDebounceTimer: number | undefined;

    constructor() {
        // Init scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(COLORS.BACKGROUND);

        // Init perspective camera
        this.perspectiveCamera = new THREE.PerspectiveCamera(this.fov, window.innerWidth / window.innerHeight, 0.1, 1000);
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
        
        // Set active camera
        this.activeCamera = this.perspectiveCamera;

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

        // Init controls
        this.controls = new OrbitControls(this.activeCamera, this.renderer.domElement);
        this.controls.enableDamping = true;

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

        // Window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Keyboard shortcuts
        window.addEventListener('keydown', this.onKeyDown.bind(this));

        // UI Controls
        this.setupUIControls();
        
        // Create warnings panel
        this.createWarningsPanel();
        
        // Create floor summary panel
        this.createFloorSummaryPanel();
        
        // Initialize editor panel
        this.setupEditorPanel();
        
        // Setup 2D overlay drag functionality
        this.setup2DOverlayDrag();

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
        
        // Camera mode toggle
        const cameraModeBtn = document.getElementById('camera-mode-btn') as HTMLButtonElement;
        cameraModeBtn?.addEventListener('click', () => this.toggleCameraMode());
        
        // FOV slider
        const fovSlider = document.getElementById('fov-slider') as HTMLInputElement;
        fovSlider?.addEventListener('input', (e) => {
            this.fov = parseFloat((e.target as HTMLInputElement).value);
            this.perspectiveCamera.fov = this.fov;
            this.perspectiveCamera.updateProjectionMatrix();
            this.updateSliderValue('fov-value', `${Math.round(this.fov)}°`);
        });
        
        // Isometric button
        const isometricBtn = document.getElementById('isometric-btn') as HTMLButtonElement;
        isometricBtn?.addEventListener('click', () => this.setIsometricView());
        
        // Export buttons
        const exportGlbBtn = document.getElementById('export-glb-btn') as HTMLButtonElement;
        exportGlbBtn?.addEventListener('click', () => this.exportGLTF(true));
        
        const exportGltfBtn = document.getElementById('export-gltf-btn') as HTMLButtonElement;
        exportGltfBtn?.addEventListener('click', () => this.exportGLTF(false));
        
        // Annotation toggles
        const showAreaToggle = document.getElementById('show-area') as HTMLInputElement;
        showAreaToggle?.addEventListener('change', (e) => {
            this.annotationState.showArea = (e.target as HTMLInputElement).checked;
            this.updateAreaAnnotations();
        });
        
        const showDimensionsToggle = document.getElementById('show-dimensions') as HTMLInputElement;
        showDimensionsToggle?.addEventListener('change', (e) => {
            this.annotationState.showDimensions = (e.target as HTMLInputElement).checked;
            this.updateDimensionAnnotations();
        });
        
        const showFloorSummaryToggle = document.getElementById('show-floor-summary') as HTMLInputElement;
        showFloorSummaryToggle?.addEventListener('change', (e) => {
            this.annotationState.showFloorSummary = (e.target as HTMLInputElement).checked;
            this.updateFloorSummary();
        });
        
        // Unit dropdowns
        const areaUnitSelect = document.getElementById('area-unit') as HTMLSelectElement;
        areaUnitSelect?.addEventListener('change', (e) => {
            this.annotationState.areaUnit = (e.target as HTMLSelectElement).value as AreaUnit;
            this.updateAreaAnnotations();
            this.updateFloorSummary();
        });
        
        const lengthUnitSelect = document.getElementById('length-unit') as HTMLSelectElement;
        lengthUnitSelect?.addEventListener('change', (e) => {
            this.annotationState.lengthUnit = (e.target as HTMLSelectElement).value as LengthUnit;
            this.updateDimensionAnnotations();
        });
        
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
        
        // 2D Overlay controls
        const show2dOverlayToggle = document.getElementById('show-2d-overlay') as HTMLInputElement;
        show2dOverlayToggle?.addEventListener('change', (e) => {
            this.overlayVisible = (e.target as HTMLInputElement).checked;
            this.update2DOverlayVisibility();
        });
        
        const overlayOpacitySlider = document.getElementById('overlay-opacity') as HTMLInputElement;
        overlayOpacitySlider?.addEventListener('input', (e) => {
            const val = parseInt((e.target as HTMLInputElement).value);
            this.overlayOpacity = val / 100;
            this.update2DOverlayOpacity();
            this.updateSliderValue('overlay-opacity-value', `${val}%`);
        });
        
        // 2D Overlay close button
        const overlayCloseBtn = document.getElementById('overlay-2d-close');
        overlayCloseBtn?.addEventListener('click', (e) => {
            e.stopPropagation(); // Don't trigger drag
            this.overlayVisible = false;
            this.update2DOverlayVisibility();
            // Update the toggle checkbox
            if (show2dOverlayToggle) {
                show2dOverlayToggle.checked = false;
            }
        });
        
        // Floor visibility controls
        const showAllFloorsBtn = document.getElementById('show-all-floors') as HTMLButtonElement;
        showAllFloorsBtn?.addEventListener('click', () => this.setAllFloorsVisible(true));
        
        const hideAllFloorsBtn = document.getElementById('hide-all-floors') as HTMLButtonElement;
        hideAllFloorsBtn?.addEventListener('click', () => this.setAllFloorsVisible(false));
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
            this.currentLangiumDoc = result.document ?? null;
            
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
    
    private toggleCameraMode() {
        if (this.cameraMode === 'perspective') {
            this.cameraMode = 'orthographic';
            // Copy position and target from perspective camera
            this.orthographicCamera.position.copy(this.perspectiveCamera.position);
            this.activeCamera = this.orthographicCamera;
            this.updateOrthographicSize();
        } else {
            this.cameraMode = 'perspective';
            // Copy position from orthographic camera
            this.perspectiveCamera.position.copy(this.orthographicCamera.position);
            this.activeCamera = this.perspectiveCamera;
        }
        
        // Update controls
        this.controls.object = this.activeCamera;
        this.controls.update();
        
        // Update UI
        const btn = document.getElementById('camera-mode-btn');
        if (btn) {
            btn.textContent = this.cameraMode === 'perspective' ? 'Switch to Orthographic' : 'Switch to Perspective';
        }
        
        // Show/hide FOV slider based on camera mode
        const fovGroup = document.getElementById('fov-group');
        if (fovGroup) {
            fovGroup.style.display = this.cameraMode === 'perspective' ? 'flex' : 'none';
        }
    }
    
    private updateOrthographicSize() {
        const aspect = window.innerWidth / window.innerHeight;
        const distance = this.orthographicCamera.position.distanceTo(this.controls.target);
        const frustumSize = distance * 0.5;
        
        this.orthographicCamera.left = frustumSize * aspect / -2;
        this.orthographicCamera.right = frustumSize * aspect / 2;
        this.orthographicCamera.top = frustumSize / 2;
        this.orthographicCamera.bottom = frustumSize / -2;
        this.orthographicCamera.updateProjectionMatrix();
    }
    
    private setIsometricView() {
        // Switch to orthographic if not already
        if (this.cameraMode !== 'orthographic') {
            this.toggleCameraMode();
        }
        
        // Isometric angles: 45° azimuth, 35.264° elevation
        const azimuth = 45 * Math.PI / 180;
        const elevation = 35.264 * Math.PI / 180;
        
        // Calculate camera distance to fit model
        const boundingBox = new THREE.Box3();
        this.floors.forEach(floor => {
            boundingBox.expandByObject(floor);
        });
        
        const center = boundingBox.getCenter(new THREE.Vector3());
        const size = boundingBox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = maxDim * 2;
        
        // Position camera
        const x = center.x + distance * Math.cos(elevation) * Math.sin(azimuth);
        const y = center.y + distance * Math.sin(elevation);
        const z = center.z + distance * Math.cos(elevation) * Math.cos(azimuth);
        
        this.orthographicCamera.position.set(x, y, z);
        this.controls.target.copy(center);
        this.updateOrthographicSize();
        this.controls.update();
    }
    
    private onKeyDown(event: KeyboardEvent) {
        // Numpad 5 toggles camera mode
        if (event.code === 'Numpad5') {
            this.toggleCameraMode();
        }
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
    
    // Validation warnings panel
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
    
    // Floor summary panel
    private createFloorSummaryPanel() {
        this.floorSummaryPanel = document.createElement('div');
        this.floorSummaryPanel.id = 'floor-summary-panel';
        this.floorSummaryPanel.className = 'floor-summary-panel';
        this.floorSummaryPanel.style.display = 'none';
        document.body.appendChild(this.floorSummaryPanel);
    }
    
    private updateFloorSummary() {
        if (!this.floorSummaryPanel || !this.currentFloorplanData) return;
        
        if (!this.annotationState.showFloorSummary) {
            this.floorSummaryPanel.style.display = 'none';
            return;
        }
        
        this.floorSummaryPanel.style.display = 'block';
        
        const floors = this.currentFloorplanData.floors;
        // Filter to only visible floors
        const visibleFloors = floors.filter(floor => this.floorVisibility.get(floor.id) ?? true);
        
        let html = '<div class="floor-summary-title">Floor Summary</div>';
        
        if (visibleFloors.length === 0) {
            html += '<div class="no-floors-message">No visible floors</div>';
        } else {
            visibleFloors.forEach((floor) => {
                const roomCount = floor.rooms.length;
                let totalArea = 0;
                let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
                
                floor.rooms.forEach(room => {
                    totalArea += room.width * room.height;
                    minX = Math.min(minX, room.x);
                    maxX = Math.max(maxX, room.x + room.width);
                    minZ = Math.min(minZ, room.z);
                    maxZ = Math.max(maxZ, room.z + room.height);
                });
                
                const boundingArea = (maxX - minX) * (maxZ - minZ);
                const efficiency = boundingArea > 0 ? (totalArea / boundingArea * 100).toFixed(1) : 0;
                
                const areaDisplay = this.formatArea(totalArea);
                
                html += `
                    <div class="floor-summary-item">
                        <div class="floor-name">${floor.id}</div>
                        <div class="floor-stats">
                            <span>Rooms: ${roomCount}</span>
                            <span>Area: ${areaDisplay}</span>
                            <span>Efficiency: ${efficiency}%</span>
                        </div>
                    </div>
                `;
            });
        }
        
        this.floorSummaryPanel.innerHTML = html;
    }
    
    private formatArea(areaInMeters: number): string {
        if (this.annotationState.areaUnit === 'sqm') {
            return `${areaInMeters.toFixed(1)} sqm`;
        } else {
            // Convert to square feet
            const sqft = areaInMeters * 10.7639;
            return `${sqft.toFixed(0)} sqft`;
        }
    }
    
    private formatLength(lengthInMeters: number): string {
        const unit = this.annotationState.lengthUnit;
        const converted = lengthInMeters * METERS_TO_UNIT[unit];
        
        if (unit === 'ft') {
            return `${converted.toFixed(1)}ft`;
        } else if (unit === 'm') {
            return `${converted.toFixed(2)}m`;
        } else if (unit === 'cm') {
            return `${converted.toFixed(0)}cm`;
        } else if (unit === 'in') {
            return `${converted.toFixed(1)}in`;
        } else {
            return `${converted.toFixed(0)}mm`;
        }
    }
    
    // Area annotations
    private updateAreaAnnotations() {
        // Remove existing labels
        this.areaLabels.forEach(label => {
            label.parent?.remove(label);
            label.element.remove();
        });
        this.areaLabels = [];
        
        if (!this.annotationState.showArea || !this.currentFloorplanData) return;
        
        this.currentFloorplanData.floors.forEach((floor, floorIndex) => {
            floor.rooms.forEach(room => {
                const area = room.width * room.height;
                const areaText = this.formatArea(area);
                
                // Create label element
                const labelDiv = document.createElement('div');
                labelDiv.className = 'area-label';
                labelDiv.textContent = areaText;
                
                const label = new CSS2DObject(labelDiv);
                const centerX = room.x + room.width / 2;
                const centerZ = room.z + room.height / 2;
                // Use local coordinates (relative to floor group)
                const y = (room.elevation || 0) + 0.5;
                
                label.position.set(centerX, y, centerZ);
                this.floors[floorIndex]?.add(label);
                this.areaLabels.push(label);
            });
        });
    }
    
    // Dimension annotations
    private updateDimensionAnnotations() {
        // Remove existing labels
        this.dimensionLabels.forEach(label => {
            label.parent?.remove(label);
            label.element.remove();
        });
        this.dimensionLabels = [];
        
        if (!this.annotationState.showDimensions || !this.currentFloorplanData) return;
        
        const globalDefault = this.config.default_height ?? DIMENSIONS.WALL.HEIGHT;
        
        this.currentFloorplanData.floors.forEach((floor, floorIndex) => {
            const floorHeight = floor.height ?? globalDefault;
            
            floor.rooms.forEach(room => {
                // Width label (above room, along X axis)
                const widthText = this.formatLength(room.width);
                const widthDiv = document.createElement('div');
                widthDiv.className = 'dimension-label width-label';
                widthDiv.textContent = `w: ${widthText}`;
                
                const widthLabel = new CSS2DObject(widthDiv);
                // Use local coordinates (relative to floor group)
                const y = (room.elevation || 0) + 0.3;
                widthLabel.position.set(room.x + room.width / 2, y, room.z - 0.5);
                this.floors[floorIndex]?.add(widthLabel);
                this.dimensionLabels.push(widthLabel);
                
                // Depth label (beside room, along Z axis)
                const depthText = this.formatLength(room.height);
                const depthDiv = document.createElement('div');
                depthDiv.className = 'dimension-label depth-label';
                depthDiv.textContent = `d: ${depthText}`;
                
                const depthLabel = new CSS2DObject(depthDiv);
                depthLabel.position.set(room.x - 0.5, y, room.z + room.height / 2);
                this.floors[floorIndex]?.add(depthLabel);
                this.dimensionLabels.push(depthLabel);
                
                // Height label (only if non-default)
                const roomHeight = room.roomHeight ?? floorHeight;
                if (roomHeight !== floorHeight) {
                    const heightText = this.formatLength(roomHeight);
                    const heightDiv = document.createElement('div');
                    heightDiv.className = 'dimension-label height-label';
                    heightDiv.textContent = `h: ${heightText}`;
                    
                    const heightLabel = new CSS2DObject(heightDiv);
                    heightLabel.position.set(room.x + room.width / 2, y + roomHeight / 2, room.z + room.height / 2);
                    this.floors[floorIndex]?.add(heightLabel);
                    this.dimensionLabels.push(heightLabel);
                }
            });
        });
    }

    private onWindowResize() {
        const aspect = window.innerWidth / window.innerHeight;
        
        this.perspectiveCamera.aspect = aspect;
        this.perspectiveCamera.updateProjectionMatrix();
        
        this.updateOrthographicSize();
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    }

    private animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        this.renderer.render(this.scene, this.activeCamera);
        this.labelRenderer.render(this.scene, this.activeCamera);
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
                    this.currentLangiumDoc = result.document ?? null;
                    
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
                    this.currentLangiumDoc = null;
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
        if (this.config.area_unit === 'sqm') {
            this.annotationState.areaUnit = 'sqm';
            const areaUnitSelect = document.getElementById('area-unit') as HTMLSelectElement;
            if (areaUnitSelect) areaUnitSelect.value = 'sqm';
        }
        if (this.config.default_unit) {
            const unit = this.config.default_unit as LengthUnit;
            if (['m', 'ft', 'cm', 'in', 'mm'].includes(unit)) {
                this.annotationState.lengthUnit = unit;
                const lengthUnitSelect = document.getElementById('length-unit') as HTMLSelectElement;
                if (lengthUnitSelect) lengthUnitSelect.value = unit;
            }
        }
        
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
        this.updateAreaAnnotations();
        this.updateDimensionAnnotations();
        this.updateFloorSummary();
        
        // Update floor visibility UI
        this.initFloorVisibility();
        
        // Update 2D overlay
        this.render2DOverlay();
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
        this.updateAreaAnnotations();
        this.updateDimensionAnnotations();
        this.updateFloorSummary();
    }
    
    // ==================== 2D Overlay Methods ====================
    
    /**
     * Store the Langium document for 2D rendering
     */
    public setLangiumDocument(doc: import('langium').LangiumDocument<import('floorplans-language').Floorplan> | null) {
        this.currentLangiumDoc = doc;
        this.render2DOverlay();
    }
    
    /**
     * Update the 2D overlay visibility
     */
    private update2DOverlayVisibility() {
        const overlay = document.getElementById('overlay-2d');
        if (overlay) {
            overlay.classList.toggle('visible', this.overlayVisible);
            // Apply opacity when becoming visible
            if (this.overlayVisible) {
                this.update2DOverlayOpacity();
            }
        }
    }
    
    /**
     * Update the 2D overlay opacity
     */
    private update2DOverlayOpacity() {
        const overlay = document.getElementById('overlay-2d');
        if (overlay) {
            overlay.style.opacity = String(this.overlayOpacity);
        }
    }
    
    /**
     * Setup drag and resize functionality for the 2D overlay
     */
    private setup2DOverlayDrag() {
        const overlay = document.getElementById('overlay-2d');
        const header = document.getElementById('overlay-2d-header');
        const resizeHandle = document.getElementById('overlay-2d-resize');
        
        if (!overlay || !header) return;
        
        // ===== DRAG FUNCTIONALITY =====
        let isDragging = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let dragStartLeft = 0;
        let dragStartBottom = 0;
        
        const onDragStart = (e: MouseEvent) => {
            isDragging = true;
            overlay.classList.add('dragging');
            
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            
            const rect = overlay.getBoundingClientRect();
            dragStartLeft = rect.left;
            dragStartBottom = window.innerHeight - rect.bottom;
            
            e.preventDefault();
        };
        
        const onDragMove = (e: MouseEvent) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - dragStartX;
            const deltaY = e.clientY - dragStartY;
            
            let newLeft = dragStartLeft + deltaX;
            let newBottom = dragStartBottom - deltaY;
            
            const rect = overlay.getBoundingClientRect();
            const maxLeft = window.innerWidth - rect.width - 10;
            const maxBottom = window.innerHeight - rect.height - 10;
            
            newLeft = Math.max(10, Math.min(newLeft, maxLeft));
            newBottom = Math.max(10, Math.min(newBottom, maxBottom));
            
            overlay.style.left = `${newLeft}px`;
            overlay.style.bottom = `${newBottom}px`;
            overlay.style.right = 'auto';
            overlay.style.top = 'auto';
        };
        
        const onDragEnd = () => {
            if (isDragging) {
                isDragging = false;
                overlay.classList.remove('dragging');
            }
        };
        
        header.addEventListener('mousedown', onDragStart);
        
        // ===== RESIZE FUNCTIONALITY =====
        let isResizing = false;
        let resizeStartX = 0;
        let resizeStartY = 0;
        let resizeStartWidth = 0;
        let resizeStartHeight = 0;
        let resizeStartBottom = 0;
        
        const onResizeStart = (e: MouseEvent) => {
            isResizing = true;
            overlay.classList.add('dragging');
            
            resizeStartX = e.clientX;
            resizeStartY = e.clientY;
            resizeStartWidth = overlay.offsetWidth;
            resizeStartHeight = overlay.offsetHeight;
            
            // Get current bottom position
            const rect = overlay.getBoundingClientRect();
            resizeStartBottom = window.innerHeight - rect.bottom;
            
            e.preventDefault();
            e.stopPropagation();
        };
        
        const onResizeMove = (e: MouseEvent) => {
            if (!isResizing) return;
            
            const deltaX = e.clientX - resizeStartX;
            const deltaY = e.clientY - resizeStartY;
            
            // Calculate new size (resize from bottom-right corner)
            let newWidth = resizeStartWidth + deltaX;
            let newHeight = resizeStartHeight + deltaY;
            
            // Constrain to min/max sizes
            newWidth = Math.max(200, Math.min(newWidth, window.innerWidth - 20));
            newHeight = Math.max(150, Math.min(newHeight, window.innerHeight - 20));
            
            // Adjust bottom position so the bottom edge follows the mouse
            // deltaY positive = mouse moved down = bottom should decrease
            let newBottom = resizeStartBottom - deltaY;
            newBottom = Math.max(10, newBottom);
            
            overlay.style.width = `${newWidth}px`;
            overlay.style.height = `${newHeight}px`;
            overlay.style.bottom = `${newBottom}px`;
        };
        
        const onResizeEnd = () => {
            if (isResizing) {
                isResizing = false;
                overlay.classList.remove('dragging');
            }
        };
        
        resizeHandle?.addEventListener('mousedown', onResizeStart);
        
        // ===== SHARED MOUSE/TOUCH HANDLERS =====
        document.addEventListener('mousemove', (e) => {
            onDragMove(e);
            onResizeMove(e);
        });
        
        document.addEventListener('mouseup', () => {
            onDragEnd();
            onResizeEnd();
        });
        
        // Touch events for drag
        header.addEventListener('touchstart', (e: TouchEvent) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                onDragStart({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => e.preventDefault() } as MouseEvent);
            }
        }, { passive: false });
        
        // Touch events for resize
        resizeHandle?.addEventListener('touchstart', (e: TouchEvent) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                onResizeStart({ 
                    clientX: touch.clientX, 
                    clientY: touch.clientY, 
                    preventDefault: () => e.preventDefault(),
                    stopPropagation: () => e.stopPropagation()
                } as MouseEvent);
            }
        }, { passive: false });
        
        document.addEventListener('touchmove', (e: TouchEvent) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                if (isDragging) {
                    onDragMove({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
                }
                if (isResizing) {
                    onResizeMove({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
                }
            }
        }, { passive: true });
        
        document.addEventListener('touchend', () => {
            onDragEnd();
            onResizeEnd();
        });
    }
    
    /**
     * Render the 2D SVG overlay
     */
    private render2DOverlay() {
        const contentEl = document.getElementById('overlay-2d-content');
        const emptyEl = document.getElementById('overlay-2d-empty');
        
        if (!contentEl) return;
        
        // If no Langium document, show empty state
        if (!this.currentLangiumDoc) {
            if (emptyEl) {
                emptyEl.style.display = 'block';
                emptyEl.textContent = this.currentFloorplanData ? 'JSON files don\'t support 2D overlay' : 'Load a floorplan';
            }
            // Clear any existing SVG
            const existingSvg = contentEl.querySelector('svg');
            if (existingSvg) {
                existingSvg.remove();
            }
            return;
        }
        
        // Hide empty state
        if (emptyEl) {
            emptyEl.style.display = 'none';
        }
        
        try {
            // Render 2D SVG with all floors visible
            const renderOptions: RenderOptions = {
                renderAllFloors: true,
                includeStyles: true,
                theme: this.currentTheme === 'dark' ? { 
                    floorBackground: '#2d2d2d',
                    floorBorder: '#888',
                    wallColor: '#ccc',
                    textColor: '#eee'
                } : undefined,
            };
            
            const svg = render2D(this.currentLangiumDoc, renderOptions);
            
            // Clear existing content and add new SVG
            const existingSvg = contentEl.querySelector('svg');
            if (existingSvg) {
                existingSvg.remove();
            }
            
            // Parse and insert SVG
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
            const svgElement = svgDoc.querySelector('svg');
            
            if (svgElement) {
                // Ensure SVG scales properly
                svgElement.setAttribute('width', '100%');
                svgElement.setAttribute('height', '100%');
                svgElement.style.display = 'block';
                contentEl.appendChild(svgElement);
            }
        } catch (err) {
            console.error('Failed to render 2D overlay:', err);
            if (emptyEl) {
                emptyEl.style.display = 'block';
                emptyEl.textContent = 'Failed to render 2D';
            }
        }
    }
    
    // ==================== Floor Visibility Methods ====================
    
    /**
     * Update the floor list UI based on current floorplan data
     */
    private updateFloorListUI() {
        const floorListEl = document.getElementById('floor-list');
        if (!floorListEl) return;
        
        // Clear existing content
        floorListEl.innerHTML = '';
        
        if (!this.currentFloorplanData || this.currentFloorplanData.floors.length === 0) {
            floorListEl.innerHTML = '<div class="no-floors-message">Load a floorplan to see floors</div>';
            return;
        }
        
        // Create checkbox for each floor
        this.currentFloorplanData.floors.forEach((floor, index) => {
            const floorId = floor.id;
            const isVisible = this.floorVisibility.get(floorId) ?? true;
            
            const floorItem = document.createElement('div');
            floorItem.className = 'floor-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `floor-toggle-${index}`;
            checkbox.checked = isVisible;
            checkbox.addEventListener('change', () => {
                this.setFloorVisible(floorId, checkbox.checked);
            });
            
            const label = document.createElement('label');
            label.htmlFor = `floor-toggle-${index}`;
            label.textContent = floorId;
            
            floorItem.appendChild(checkbox);
            floorItem.appendChild(label);
            floorListEl.appendChild(floorItem);
        });
    }
    
    /**
     * Set visibility of a specific floor
     */
    private setFloorVisible(floorId: string, visible: boolean) {
        this.floorVisibility.set(floorId, visible);
        
        // Find and update the THREE.Group
        const floorIndex = this.currentFloorplanData?.floors.findIndex(f => f.id === floorId) ?? -1;
        if (floorIndex >= 0 && this.floors[floorIndex]) {
            this.floors[floorIndex].visible = visible;
        }
        
        // Update floor summary to only show visible floors
        this.updateFloorSummary();
    }
    
    /**
     * Set visibility of all floors
     */
    private setAllFloorsVisible(visible: boolean) {
        if (!this.currentFloorplanData) return;
        
        this.currentFloorplanData.floors.forEach((floor, index) => {
            this.floorVisibility.set(floor.id, visible);
            if (this.floors[index]) {
                this.floors[index].visible = visible;
            }
        });
        
        // Update UI checkboxes
        this.updateFloorListUI();
        this.updateFloorSummary();
    }
    
    /**
     * Initialize floor visibility state when loading a new floorplan
     */
    private initFloorVisibility() {
        this.floorVisibility.clear();
        
        if (this.currentFloorplanData) {
            // All floors visible by default
            this.currentFloorplanData.floors.forEach(floor => {
                this.floorVisibility.set(floor.id, true);
            });
        }
        
        this.updateFloorListUI();
    }
}

new Viewer();
