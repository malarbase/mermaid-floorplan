import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Evaluator } from 'three-bvh-csg';
import { JsonExport, JsonFloor, JsonConnection, JsonRoom, JsonConfig, JsonStyle } from './types';
import { DIMENSIONS, COLORS } from './constants';
import { MaterialFactory, MaterialStyle } from './materials';
import { WallGenerator, StyleResolver } from './wall-generator';
import { parseFloorplanDSL, isFloorplanFile, isJsonFile } from './dsl-parser';

class Viewer {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;
    private floors: THREE.Group[] = [];
    private floorHeights: number[] = [];  // Track height per floor for exploded view
    private connections: JsonConnection[] = [];
    private config: JsonConfig = {};
    private styles: Map<string, JsonStyle> = new Map();  // Style lookup by name
    private explodedViewFactor: number = 0;
    private wallGenerator: WallGenerator;

    constructor() {
        // Init scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(COLORS.BACKGROUND);

        // Init camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(20, 20, 20);

        // Init renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('app')?.appendChild(this.renderer.domElement);

        // Init controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        // Init lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(50, 100, 50);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 4096;
        dirLight.shadow.mapSize.height = 4096;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 500;
        dirLight.shadow.camera.left = -50;
        dirLight.shadow.camera.right = 50;
        dirLight.shadow.camera.top = 50;
        dirLight.shadow.camera.bottom = -50;
        this.scene.add(dirLight);

        // Init wall generator with CSG evaluator
        this.wallGenerator = new WallGenerator(new Evaluator());

        // Window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // UI Controls
        const explodedSlider = document.getElementById('exploded-view') as HTMLInputElement;
        explodedSlider?.addEventListener('input', (e) => {
            const val = parseInt((e.target as HTMLInputElement).value);
            this.setExplodedView(val / 100);
        });

        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        fileInput?.addEventListener('change', this.onFileLoad.bind(this));

        // Start loop
        this.animate();
    }

    private onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
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
                    const result = await parseFloorplanDSL(content);
                    if (result.errors.length > 0) {
                        const errorMsg = result.errors.map(e => 
                            e.line ? `Line ${e.line}: ${e.message}` : e.message
                        ).join('\n');
                        console.error("Parse errors:", result.errors);
                        alert(`Failed to parse floorplan:\n${errorMsg}`);
                        return;
                    }
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
        // Clear existing
        this.floors.forEach(f => this.scene.remove(f));
        this.floors = [];
        this.floorHeights = [];
        this.connections = data.connections;
        this.config = data.config || {};
        
        // Build style lookup map
        this.styles.clear();
        if (data.styles) {
            for (const style of data.styles) {
                this.styles.set(style.name, style);
            }
        }

        // Center camera roughly
        if (data.floors.length > 0 && data.floors[0].rooms.length > 0) {
            const firstRoom = data.floors[0].rooms[0];
            this.controls.target.set(firstRoom.x + firstRoom.width/2, 0, firstRoom.z + firstRoom.height/2);
        }

        // Generate floors and track heights
        const globalDefault = this.config.default_height ?? DIMENSIONS.WALL.HEIGHT;
        data.floors.forEach((floorData) => {
            const floorHeight = floorData.height ?? globalDefault;
            this.floorHeights.push(floorHeight);
            
            const floorGroup = this.generateFloor(floorData);
            this.scene.add(floorGroup);
            this.floors.push(floorGroup);
        });

        this.setExplodedView(this.explodedViewFactor);
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
            
            // Create materials for this room with style
            const materials = MaterialFactory.createMaterialSet(roomStyle);

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
    }
}

new Viewer();
