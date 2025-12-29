import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Evaluator } from 'three-bvh-csg';
import { JsonExport, JsonFloor, JsonConnection, JsonRoom } from './types';
import { DIMENSIONS, COLORS } from './constants';
import { MaterialFactory } from './materials';
import { WallGenerator } from './wall-generator';
import { parseFloorplanDSL, isFloorplanFile, isJsonFile } from './dsl-parser';

class Viewer {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;
    private floors: THREE.Group[] = [];
    private connections: JsonConnection[] = [];
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
        this.connections = data.connections;

        // Center camera roughly
        if (data.floors.length > 0 && data.floors[0].rooms.length > 0) {
            const firstRoom = data.floors[0].rooms[0];
            this.controls.target.set(firstRoom.x + firstRoom.width/2, 0, firstRoom.z + firstRoom.height/2);
        }

        // Generate floors
        data.floors.forEach((floorData) => {
            const floorGroup = this.generateFloor(floorData);
            this.scene.add(floorGroup);
            this.floors.push(floorGroup);
        });

        this.setExplodedView(this.explodedViewFactor);
    }

    private generateFloor(floorData: JsonFloor): THREE.Group {
        const group = new THREE.Group();
        group.name = floorData.id;

        // Create materials for this floor
        const materials = MaterialFactory.createMaterialSet();
        
        floorData.rooms.forEach(room => {
            // 1. Floor plate
            const floorMesh = this.createFloorMesh(room, materials.floor);
            group.add(floorMesh);

            // 2. Walls with doors, windows, and connections
            room.walls.forEach(wall => {
                this.wallGenerator.generateWall(
                    wall,
                    room,
                    floorData.rooms,
                    this.connections,
                    materials,
                    group
                );
            });
        });

        return group;
    }

    /**
     * Create a floor mesh for a room
     */
    private createFloorMesh(room: JsonRoom, material: THREE.Material): THREE.Mesh {
        const floorGeom = new THREE.BoxGeometry(room.width, DIMENSIONS.FLOOR.THICKNESS, room.height);
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

        this.floors.forEach((floorGroup, index) => {
            const yPos = index * (DIMENSIONS.WALL.HEIGHT + separation);
            floorGroup.position.y = yPos;
        });
    }
}

new Viewer();
