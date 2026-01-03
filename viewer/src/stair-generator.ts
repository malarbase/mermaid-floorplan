import * as THREE from 'three';
import { JsonStair, JsonLift } from './types';

export class StairGenerator {
    private material: THREE.MeshStandardMaterial;

    constructor() {
        this.material = new THREE.MeshStandardMaterial({
            color: 0xcccccc, // Default grey concrete
            roughness: 0.7,
            metalness: 0.1
        });
    }

    public generateStair(stair: JsonStair): THREE.Group {
        const group = new THREE.Group();
        group.name = `stair_${stair.name}`;
        group.position.set(stair.x, 0, stair.z);

        // Determine shape type
        const shapeType = stair.shape.type;

        switch (shapeType) {
            case 'straight':
                this.generateStraightStair(group, stair);
                break;
            case 'L-shaped':
                this.generateLShapedStair(group, stair);
                break;
            case 'U-shaped':
                this.generateUShapedStair(group, stair);
                break;
            case 'spiral':
                this.generateSpiralStair(group, stair);
                break;
            default:
                console.warn(`Unsupported stair shape: ${shapeType}`);
                // Fallback to straight stair or simple box
                this.generateStraightStair(group, stair);
                break;
        }

        return group;
    }

    public generateLift(lift: JsonLift, floorHeight: number): THREE.Group {
        const group = new THREE.Group();
        group.name = `lift_${lift.name}`;
        group.position.set(lift.x, 0, lift.z);

        // Lift shaft walls
        const width = lift.width;
        const depth = lift.height; // mapped from height in JSON to depth (Z)
        const wallThickness = 0.2; // default

        // 4 corner posts or just walls?
        // Let's make a box with open doors
        // For simplicity, just a wireframe or semi-transparent box for now
        // or actually walls around the shaft
        
        const geometry = new THREE.BoxGeometry(width, floorHeight, depth);
        const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
            color: 0xaaaaaa,
            transparent: true,
            opacity: 0.3,
            roughness: 0.1
        }));
        mesh.position.y = floorHeight / 2;
        group.add(mesh);

        // Add visual guide for doors
        lift.doors.forEach(dir => {
            const doorGeom = new THREE.BoxGeometry(
                (dir === 'north' || dir === 'south') ? width * 0.8 : wallThickness * 1.1,
                floorHeight * 0.8,
                (dir === 'east' || dir === 'west') ? depth * 0.8 : wallThickness * 1.1
            );
            const doorMesh = new THREE.Mesh(doorGeom, new THREE.MeshStandardMaterial({ color: 0x333333 }));
            
            doorMesh.position.y = floorHeight / 2;
            if (dir === 'north') doorMesh.position.z = -depth/2;
            if (dir === 'south') doorMesh.position.z = depth/2;
            if (dir === 'east') doorMesh.position.x = width/2;
            if (dir === 'west') doorMesh.position.x = -width/2;
            
            group.add(doorMesh);
        });

        return group;
    }

    private generateStraightStair(group: THREE.Group, stair: JsonStair) {
        const rise = stair.rise;
        // If run is not specified, calculate from tread * steps?
        // In basic shape, we might not have steps count directly if it's not in 'runs'.
        // But for straight stair, we expect `rise`, `run` (calculated from total depth?), or standard calculation.
        
        // Default values
        const riserHeight = stair.riser ?? 0.18; // ~7 inches
        const treadDepth = stair.tread ?? 0.28; // ~11 inches
        const width = stair.width ?? 1.0;
        
        const stepCount = Math.round(rise / riserHeight);
        const actualRiser = rise / stepCount;
        
        // Direction handling
        // 'north' means climbing towards north (decreasing Z)
        let rotation = 0;
        
        const direction = stair.shape.direction || 'north';
        switch (direction) {
            case 'north': rotation = 0; break;
            case 'south': rotation = Math.PI; break;
            case 'east': rotation = -Math.PI / 2; break;
            case 'west': rotation = Math.PI / 2; break;
        }

        // Create steps
        for (let i = 0; i < stepCount; i++) {
            const stepGroup = new THREE.Group();
            
            // Tread
            const treadGeom = new THREE.BoxGeometry(width, 0.05, treadDepth); // 5cm thick tread
            const tread = new THREE.Mesh(treadGeom, this.material);
            tread.position.y = (i + 1) * actualRiser;
            tread.castShadow = true;
            tread.receiveShadow = true;
            stepGroup.add(tread);

            // Riser (if closed or glass)
            if (stair.stringers !== 'open') {
                let riserMat = this.material;
                if (stair.stringers === 'glass') {
                     riserMat = new THREE.MeshStandardMaterial({
                        color: 0x88ccff,
                        transparent: true,
                        opacity: 0.5,
                        roughness: 0.1,
                        metalness: 0.9
                    });
                }
                const riserGeom = new THREE.BoxGeometry(width, actualRiser, 0.02);
                const riser = new THREE.Mesh(riserGeom, riserMat);
                riser.position.y = (i + 0.5) * actualRiser;
                riser.position.z = treadDepth / 2; // Front of the step behind
                stepGroup.add(riser);
            }
            
            // Position step
            // We start at 0,0 and move in direction
            // Wait, we need to rotate the whole stair group, or position steps incrementally.
            // Easier to build along -Z and then rotate the whole group.
            
            // Let's build "North" facing stair (up goes -Z)
            // i=0 is first step.
            stepGroup.position.z = -(i * treadDepth) - (treadDepth/2); 
            // This centers the tread at -0.5*depth, -1.5*depth, etc.
            
            group.add(stepGroup);
        }

        // Rotate group to match direction
        group.rotation.y = rotation;

        // Handrails
        if (stair.handrail && stair.handrail !== 'none') {
            const totalDepth = stepCount * treadDepth;
            const totalHeight = stepCount * actualRiser;
            
            // Start point (bottom)
            // Bottom step is at z = -treadDepth/2 (center), y = actualRiser
            // Let's start rail from ground? or first step?
            // Usually starts at bottom landing.
            const startZ = 0; // Front of first step approx
            const startY = 0;
            
            const endZ = -totalDepth;
            const endY = totalHeight;
            
            if (stair.handrail === 'both' || stair.handrail === 'left') {
                this.createHandrail(group, 
                    new THREE.Vector3(-width/2, startY, startZ), 
                    new THREE.Vector3(-width/2, endY, endZ)
                );
            }
            if (stair.handrail === 'both' || stair.handrail === 'right') {
                this.createHandrail(group, 
                    new THREE.Vector3(width/2, startY, startZ), 
                    new THREE.Vector3(width/2, endY, endZ)
                );
            }
        }
    }

    private generateLShapedStair(group: THREE.Group, stair: JsonStair) {
        // Simple L-shape: Run 1, Landing, Run 2
        // We need runs info from shape
        const runs = stair.shape.runs || [10, 10]; // default split if missing?
        const run1Steps = runs[0] || Math.floor(stair.rise / 0.18 / 2);
        const run2Steps = runs[1] || Math.floor(stair.rise / 0.18 / 2);
        
        const treadDepth = stair.tread ?? 0.28;
        const width = stair.width ?? 1.0;
        
        const actualRiser = stair.rise / (run1Steps + run2Steps); // Landing counts as one level? usually landing is at a riser height
        
        // Let's assume landing is at level run1Steps * actualRiser
        
        // Build first run (North facing by default)
        for (let i = 0; i < run1Steps; i++) {
             this.createStep(group, width, treadDepth, actualRiser, i, 0, 0, 0); // x, z offset
        }

        // Landing
        const landingY = run1Steps * actualRiser;
        const landingDepth = stair.shape.landing ? stair.shape.landing[1] : width; // usually square landing = width
        const landingWidth = stair.shape.landing ? stair.shape.landing[0] : width;
        
        const landingGeom = new THREE.BoxGeometry(landingWidth, 0.05, landingDepth);
        const landing = new THREE.Mesh(landingGeom, this.material);
        landing.position.set(0, landingY, -(run1Steps * treadDepth) - (landingDepth/2) + (treadDepth/2)); 
        // Logic for position: end of run 1
        
        group.add(landing);
        
        // Run 2
        // Direction depends on turn 'left' or 'right'
        const turn = stair.shape.turn || 'right';
        const turnAngle = turn === 'right' ? -Math.PI / 2 : Math.PI / 2;
        
        const run2StartPos = new THREE.Vector3(0, landingY, -(run1Steps * treadDepth) - (landingDepth/2) + (treadDepth/2));
        
        // Adjust for landing size
        // If turning right, we move +X. If left, -X.
        // And we rotate.
        
        const run2Group = new THREE.Group();
        run2Group.position.copy(run2StartPos);
        run2Group.rotation.y = turnAngle;
        
        // Shift to edge of landing
        // If turn right (-90 deg around Y), +Z in local space is +X in world. 
        // We want to start at the edge of the landing.
        // Local Z of run2Group points 'Right' relative to Run 1.
        
        // Let's keep it simple: build relative to run2Group origin
        for (let i = 0; i < run2Steps; i++) {
             // Steps go 'forward' in local Z (which is rotated)
             // Actually my generateStraightStair goes -Z.
             this.createStep(run2Group, width, treadDepth, actualRiser, i, 0, 0, -(landingDepth/2 + treadDepth/2)); 
        }
        
        group.add(run2Group);

        // Apply global rotation based on 'entry'
        const entry = stair.shape.entry || 'north';
        let rotation = 0;
        switch (entry) {
            case 'north': rotation = 0; break;
            case 'south': rotation = Math.PI; break;
            case 'east': rotation = -Math.PI / 2; break;
            case 'west': rotation = Math.PI / 2; break;
        }
        group.rotation.y = rotation;
    }

    private generateUShapedStair(group: THREE.Group, stair: JsonStair) {
        // Placeholder
        this.generateStraightStair(group, stair);
    }

    private generateSpiralStair(group: THREE.Group, stair: JsonStair) {
        const rise = stair.rise;
        const riserHeight = stair.riser ?? 0.18;
        const stepCount = Math.round(rise / riserHeight);
        const actualRiser = rise / stepCount;
        
        const outerRadius = stair.shape.outerRadius ?? 1.0;
        const innerRadius = stair.shape.innerRadius ?? 0.1;
        const width = outerRadius - innerRadius;
        
        const rotationDir = stair.shape.rotation === 'counterclockwise' ? 1 : -1;
        const anglePerStep = (Math.PI * 2) / 12 * rotationDir; // arbitrary 12 steps per circle default? or based on tread width?
        
        for (let i = 0; i < stepCount; i++) {
            const stepGroup = new THREE.Group();
            
            // Wedge shape for tread? Box for now, rotated.
            const treadGeom = new THREE.BoxGeometry(width, 0.05, 0.3); // approx depth
            const tread = new THREE.Mesh(treadGeom, this.material);
            
            // Shift so pivot is at inner radius
            tread.position.x = innerRadius + width/2; 
            tread.position.y = (i + 1) * actualRiser;
            
            stepGroup.add(tread);
            stepGroup.rotation.y = i * anglePerStep;
            
            group.add(stepGroup);
        }
    }

    private createStep(group: THREE.Group, width: number, depth: number, height: number, index: number, xOffset: number, zOffset: number, startZ: number = 0) {
        const treadGeom = new THREE.BoxGeometry(width, 0.05, depth);
        const tread = new THREE.Mesh(treadGeom, this.material);
        tread.position.set(xOffset, (index + 1) * height, startZ - (index * depth) - (depth/2) + zOffset);
        tread.castShadow = true;
        tread.receiveShadow = true;
        
        group.add(tread);
        
        // Riser
        const riserGeom = new THREE.BoxGeometry(width, height, 0.02);
        const riser = new THREE.Mesh(riserGeom, this.material);
        riser.position.set(xOffset, (index + 0.5) * height, startZ - (index * depth) + zOffset + 0.01); // slightly offset?
        // Actually riser should be at the BACK of the tread below? or FRONT of the tread above?
        // Usually front of step i is at z = -i*depth. Riser is there.
        riser.position.z = startZ - (index * depth) + (depth/2) - depth; // Back of current tread
        
        group.add(riser);
    }

    private createHandrail(group: THREE.Group, start: THREE.Vector3, end: THREE.Vector3, height: number = 0.9) {
        // Posts at start and end
        const postGeom = new THREE.CylinderGeometry(0.02, 0.02, height);
        const postMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.2 });
        
        const post1 = new THREE.Mesh(postGeom, postMat);
        post1.position.copy(start);
        post1.position.y += height / 2;
        group.add(post1);
        
        const post2 = new THREE.Mesh(postGeom, postMat);
        post2.position.copy(end);
        post2.position.y += height / 2;
        group.add(post2);
        
        // Rail
        const railLength = start.distanceTo(end);
        const railGeom = new THREE.CylinderGeometry(0.02, 0.02, railLength);
        const rail = new THREE.Mesh(railGeom, postMat);
        
        // Position at midpoint
        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        mid.y += height;
        rail.position.copy(mid);
        
        // Orient
        // Look at end point (elevated)
        const target = new THREE.Vector3(end.x, end.y + height, end.z);
        rail.lookAt(target);
        rail.rotateX(-Math.PI / 2); // Align cylinder Y to look direction
        
        group.add(rail);
    }
}

