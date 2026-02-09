/**
 * Stair and lift geometry generation for 3D floorplan rendering
 */

import * as THREE from 'three';
import { MATERIAL_PROPERTIES } from './constants.js';
import type { JsonLift, JsonStair } from './types.js';

export class StairGenerator {
  private material: THREE.MeshStandardMaterial;

  constructor() {
    this.material = new THREE.MeshStandardMaterial({
      color: MATERIAL_PROPERTIES.STAIR.color,
      roughness: MATERIAL_PROPERTIES.STAIR.roughness,
      metalness: MATERIAL_PROPERTIES.STAIR.metalness,
    });
  }

  public generateStair(stair: JsonStair): THREE.Group {
    const group = new THREE.Group();
    group.name = `stair_${stair.name ?? 'unnamed'}`;

    // Generate geometry at local origin (0,0,0) first
    switch (stair.shape.type) {
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
      case 'custom':
        this.generateCustomStair(group, stair);
        break;
      default:
        // Fallback to straight stair
        this.generateStraightStair(group, stair);
        break;
    }

    // Normalize geometry so the top-left corner (min x, min z) is at (0,0)
    // This matches the 2D coordinate system where (x,y) is top-left
    this.normalizeGeometryOrigin(group);

    // Now place the group at the specified position
    group.position.set(stair.x, 0, stair.z);

    return group;
  }

  private normalizeGeometryOrigin(group: THREE.Group): void {
    // Compute bounding box of the generated geometry
    const box = new THREE.Box3().setFromObject(group);

    // If box is empty (no geometry), do nothing
    if (box.isEmpty()) return;

    const minX = box.min.x;
    const minZ = box.min.z;

    // Shift all children so min is at 0,0
    // We modify the children's positions directly to keep the group's pivot at the corner
    const shiftX = -minX;
    const shiftZ = -minZ;

    for (const child of group.children) {
      child.position.x += shiftX;
      child.position.z += shiftZ;
    }
  }

  public generateLift(lift: JsonLift, floorHeight: number): THREE.Group {
    const group = new THREE.Group();
    group.name = `lift_${lift.name ?? 'unnamed'}`;
    group.position.set(lift.x, 0, lift.z);

    const width = lift.width;
    const depth = lift.height; // mapped from height in JSON to depth (Z)
    const wallThickness = 0.2;

    // Offset to align Top-Left (x,z) to Center
    const offsetX = width / 2;
    const offsetZ = depth / 2;

    // Lift shaft - semi-transparent box
    const geometry = new THREE.BoxGeometry(width, floorHeight, depth);
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: MATERIAL_PROPERTIES.LIFT.color,
        transparent: true,
        opacity: MATERIAL_PROPERTIES.LIFT.opacity,
        roughness: MATERIAL_PROPERTIES.LIFT.roughness,
        metalness: MATERIAL_PROPERTIES.LIFT.metalness,
      }),
    );
    mesh.position.set(offsetX, floorHeight / 2, offsetZ);
    group.add(mesh);

    // Door indicators
    lift.doors.forEach((dir) => {
      const doorGeom = new THREE.BoxGeometry(
        dir === 'top' || dir === 'bottom' ? width * 0.8 : wallThickness * 1.1,
        floorHeight * 0.8,
        dir === 'right' || dir === 'left' ? depth * 0.8 : wallThickness * 1.1,
      );
      const doorMesh = new THREE.Mesh(
        doorGeom,
        new THREE.MeshStandardMaterial({ color: 0x333333 }),
      );

      doorMesh.position.y = floorHeight / 2;

      // Calculate door position relative to centered lift, then apply offset
      let dx = 0,
        dz = 0;
      if (dir === 'top') dz = -depth / 2;
      if (dir === 'bottom') dz = depth / 2;
      if (dir === 'right') dx = width / 2;
      if (dir === 'left') dx = -width / 2;

      doorMesh.position.x = offsetX + dx;
      doorMesh.position.z = offsetZ + dz;

      group.add(doorMesh);
    });

    return group;
  }

  private generateStraightStair(group: THREE.Group, stair: JsonStair): void {
    const rise = stair.rise;
    const riserHeight = stair.riser ?? 0.18;
    const treadDepth = stair.tread ?? 0.28;
    const width = stair.width ?? 1.0;

    const stepCount = Math.round(rise / riserHeight);
    const actualRiser = rise / stepCount;

    // Direction handling (view-relative: top/bottom/left/right)
    let rotation = 0;
    switch (stair.shape.direction ?? 'top') {
      case 'top':
        rotation = 0;
        break;
      case 'bottom':
        rotation = Math.PI;
        break;
      case 'right':
        rotation = -Math.PI / 2;
        break;
      case 'left':
        rotation = Math.PI / 2;
        break;
    }

    // Create steps
    for (let i = 0; i < stepCount; i++) {
      const stepGroup = new THREE.Group();

      // Tread
      const treadGeom = new THREE.BoxGeometry(width, 0.05, treadDepth);
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
            metalness: 0.9,
          });
        }
        const riserGeom = new THREE.BoxGeometry(width, actualRiser, 0.02);
        const riser = new THREE.Mesh(riserGeom, riserMat);
        riser.position.y = (i + 0.5) * actualRiser;
        riser.position.z = treadDepth / 2;
        stepGroup.add(riser);
      }

      stepGroup.position.z = -(i * treadDepth) - treadDepth / 2;
      group.add(stepGroup);
    }

    group.rotation.y = rotation;

    // Handrails
    if (stair.handrail && stair.handrail !== 'none') {
      const totalDepth = stepCount * treadDepth;
      const totalHeight = stepCount * actualRiser;

      const startZ = 0;
      const startY = 0;
      const endZ = -totalDepth;
      const endY = totalHeight;

      if (stair.handrail === 'both' || stair.handrail === 'left') {
        this.createHandrail(
          group,
          new THREE.Vector3(-width / 2, startY, startZ),
          new THREE.Vector3(-width / 2, endY, endZ),
        );
      }
      if (stair.handrail === 'both' || stair.handrail === 'right') {
        this.createHandrail(
          group,
          new THREE.Vector3(width / 2, startY, startZ),
          new THREE.Vector3(width / 2, endY, endZ),
        );
      }
    }
  }

  private generateLShapedStair(group: THREE.Group, stair: JsonStair): void {
    const runs = stair.shape.runs ?? [10, 10];
    const run1Steps = runs[0] || Math.floor(stair.rise / 0.18 / 2);
    const run2Steps = runs[1] || Math.floor(stair.rise / 0.18 / 2);

    const treadDepth = stair.tread ?? 0.28;
    const width = stair.width ?? 1.0;

    const actualRiser = stair.rise / (run1Steps + run2Steps);

    // First run
    for (let i = 0; i < run1Steps; i++) {
      this.createStep(group, width, treadDepth, actualRiser, i, 0, 0, 0);
    }

    // Landing
    const landingY = run1Steps * actualRiser;
    const landingDepth = stair.shape.landing ? stair.shape.landing[1] : width;
    const landingWidth = stair.shape.landing ? stair.shape.landing[0] : width;

    const landingGeom = new THREE.BoxGeometry(landingWidth, 0.05, landingDepth);
    const landing = new THREE.Mesh(landingGeom, this.material);
    landing.position.set(
      0,
      landingY,
      -(run1Steps * treadDepth) - landingDepth / 2 + treadDepth / 2,
    );
    group.add(landing);

    // Second run
    const turn = stair.shape.turn ?? 'right';
    const turnAngle = turn === 'right' ? -Math.PI / 2 : Math.PI / 2;

    const run2StartPos = new THREE.Vector3(
      0,
      landingY,
      -(run1Steps * treadDepth) - landingDepth / 2 + treadDepth / 2,
    );

    const run2Group = new THREE.Group();
    run2Group.position.copy(run2StartPos);
    run2Group.rotation.y = turnAngle;

    for (let i = 0; i < run2Steps; i++) {
      this.createStep(
        run2Group,
        width,
        treadDepth,
        actualRiser,
        i,
        0,
        0,
        -(landingDepth / 2 + treadDepth / 2),
      );
    }

    group.add(run2Group);

    // Apply entry rotation (view-relative: top/bottom/left/right)
    const entry = stair.shape.entry ?? 'top';
    let rotation = 0;
    switch (entry) {
      case 'top':
        rotation = Math.PI;
        break; // From Top -> Walk South
      case 'bottom':
        rotation = 0;
        break; // From Bottom -> Walk North
      case 'right':
        rotation = -Math.PI / 2;
        break; // From Right -> Walk West
      case 'left':
        rotation = Math.PI / 2;
        break; // From Left -> Walk East
    }
    group.rotation.y = rotation;
  }

  private generateUShapedStair(group: THREE.Group, stair: JsonStair): void {
    const runs = stair.shape.runs ?? [10, 10];
    const riserHeight = stair.riser ?? 0.18;
    const totalSteps = Math.round(stair.rise / riserHeight);
    const run1Steps = runs[0] || Math.ceil(totalSteps / 2);
    const run2Steps = runs[1] || Math.floor(totalSteps / 2);

    const treadDepth = stair.tread ?? 0.28;
    const width = stair.width ?? 1.0;
    const actualRiser = stair.rise / (run1Steps + run2Steps);

    // Run 1: Up
    for (let i = 0; i < run1Steps; i++) {
      this.createStep(group, width, treadDepth, actualRiser, i, 0, 0, 0);
    }

    const landingY = run1Steps * actualRiser;
    // Landing position logic
    const gap = 0.2;
    const turn = stair.shape.turn ?? 'left';
    const direction = turn === 'left' ? 1 : -1;
    const offsetRun2 = direction === 1 ? -(width + gap) : width + gap;

    const _landingWidth = stair.shape.landing ? stair.shape.landing[0] : width * 2 + gap;
    const landingDepth = stair.shape.landing ? stair.shape.landing[1] : width;

    // Landing center
    // Run 1 center X=0. Run 2 center X=offsetRun2.
    // We position landing to cover both.
    const landingCenterX = offsetRun2 / 2;
    const landingCenterZ = -(run1Steps * treadDepth) - landingDepth / 2;

    const landingGeom = new THREE.BoxGeometry(Math.abs(offsetRun2) + width, 0.05, landingDepth);
    const landing = new THREE.Mesh(landingGeom, this.material);
    landing.position.set(landingCenterX, landingY, landingCenterZ);
    group.add(landing);

    // Run 2
    const run2Group = new THREE.Group();
    // Start at edge of landing
    run2Group.position.set(offsetRun2, landingY, landingCenterZ - landingDepth / 2);
    run2Group.rotation.y = Math.PI;

    for (let i = 0; i < run2Steps; i++) {
      this.createStep(run2Group, width, treadDepth, actualRiser, i, 0, 0, 0);
    }
    group.add(run2Group);

    // Entry Rotation
    const entry = stair.shape.entry ?? 'top';
    let rotation = 0;
    switch (entry) {
      case 'top':
        rotation = Math.PI;
        break;
      case 'bottom':
        rotation = 0;
        break;
      case 'right':
        rotation = -Math.PI / 2;
        break;
      case 'left':
        rotation = Math.PI / 2;
        break;
    }
    group.rotation.y = rotation;
  }

  private generateCustomStair(group: THREE.Group, stair: JsonStair): void {
    const shape = stair.shape;
    if (!shape.segments) return;

    const treadDepth = stair.tread ?? 0.28;
    const defaultWidth = stair.width ?? 1.0;

    // Calculate total steps across all flight segments
    const totalSteps = shape.segments
      .filter((seg) => seg.type === 'flight')
      .reduce((sum, seg) => sum + (seg.steps ?? 10), 0);

    // Calculate riser height from total rise / total steps
    // Use stair.rise if provided, otherwise fall back to riser or default
    const riserHeight =
      stair.rise && totalSteps > 0 ? stair.rise / totalSteps : (stair.riser ?? 0.18);

    const currentPos = new THREE.Vector3(0, 0, 0);
    let currentRotation = 0;
    let currentHeight = 0;
    const forward = new THREE.Vector3(0, 0, -1); // Initial forward direction (-Z)

    // Entry rotation
    const entry = shape.entry ?? 'top';
    let entryRotation = 0;
    switch (entry) {
      case 'top':
        entryRotation = Math.PI;
        break;
      case 'bottom':
        entryRotation = 0;
        break;
      case 'right':
        entryRotation = -Math.PI / 2;
        break;
      case 'left':
        entryRotation = Math.PI / 2;
        break;
    }
    group.rotation.y = entryRotation;

    for (let segIdx = 0; segIdx < shape.segments.length; segIdx++) {
      const segment = shape.segments[segIdx];
      if (segment.type === 'flight') {
        const steps = segment.steps ?? 10;
        const segWidth = segment.width ?? defaultWidth;
        // Use standard riser height for now as custom stairs can be complex
        const actualRiser = riserHeight;

        for (let i = 0; i < steps; i++) {
          // Calculate absolute position for the step center
          // Center is currentPos + forward * (i + 0.5) * depth
          const stepDist = treadDepth * i + treadDepth / 2;
          const stepPos = currentPos.clone().add(forward.clone().multiplyScalar(stepDist));

          const stepY = currentHeight + (i + 1) * actualRiser;

          this.createStepAbsolute(
            group,
            segWidth,
            treadDepth,
            actualRiser,
            stepPos,
            currentRotation,
            stepY,
          );
        }

        // Advance currentPos to end of flight
        currentPos.add(forward.clone().multiplyScalar(steps * treadDepth));
        currentHeight += steps * actualRiser;
      } else if (segment.type === 'turn') {
        const landingW = segment.landing ? segment.landing[0] : defaultWidth;
        const landingD = segment.landing ? segment.landing[1] : defaultWidth;

        // Look ahead to get next flight width for alignment
        const nextSegment = segIdx + 1 < shape.segments.length ? shape.segments[segIdx + 1] : null;
        const nextFlightWidth =
          nextSegment && nextSegment.type === 'flight' && nextSegment.width
            ? nextSegment.width
            : defaultWidth;

        // Landing center: currentPos + forward * (landingD / 2)
        const landingPos = currentPos.clone().add(forward.clone().multiplyScalar(landingD / 2));

        this.createLandingAbsolute(
          group,
          landingW,
          landingD,
          landingPos,
          currentRotation,
          currentHeight,
        );

        // Advance to center of landing
        currentPos.add(forward.clone().multiplyScalar(landingD / 2));

        // Turn
        const turnAngle = segment.direction === 'left' ? Math.PI / 2 : -Math.PI / 2;
        currentRotation += turnAngle;
        forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), turnAngle);

        // After turning, shift position to the edge of the landing in the NEW direction
        // The landing extends landingW/2 in the perpendicular direction (now forward)
        currentPos.add(forward.clone().multiplyScalar(landingW / 2));

        // Align next flight's outer edge with landing's outer edge
        // For right turn: outer edge is on the right (positive perpendicular)
        // For left turn: outer edge is on the left (negative perpendicular)
        // Perpendicular to new forward: rotate forward 90°
        const perpSign = segment.direction === 'right' ? 1 : -1;
        const perpendicular = forward
          .clone()
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
        const widthDiff = (landingW - nextFlightWidth) / 2;
        // Shift perpendicular to align outer edges
        currentPos.add(perpendicular.clone().multiplyScalar(widthDiff * perpSign));
      }
    }
  }

  private createStepAbsolute(
    group: THREE.Group,
    width: number,
    depth: number,
    height: number,
    position: THREE.Vector3,
    rotation: number,
    yPos: number,
  ): void {
    const stepGroup = new THREE.Group();
    stepGroup.position.copy(position);
    stepGroup.position.y = yPos;
    stepGroup.rotation.y = rotation;

    // Tread (centered at local 0,0,0, which is stepGroup position)
    const treadGeom = new THREE.BoxGeometry(width, 0.05, depth);
    const tread = new THREE.Mesh(treadGeom, this.material);
    tread.position.y = 0;
    tread.castShadow = true;
    tread.receiveShadow = true;
    stepGroup.add(tread);

    // Riser
    if (this.material) {
      // TODO: Check stringer config properly if available
      const riserGeom = new THREE.BoxGeometry(width, height, 0.02);
      const riser = new THREE.Mesh(riserGeom, this.material);
      // Riser goes down from tread.
      // Center of riser is height/2 below tread.
      // And aligned to front edge (local +Z if step grows -Z? No, tread is centered)
      // Tread Z range: [-d/2, d/2].
      // Riser should be at front edge?
      // If we walk towards -Z (forward), front edge is +Z? No, back edge is +Z.
      // We step UP onto the tread. Riser is at the "start" of the tread.
      // If forward is -Z, start is +Z.
      // So riser at Z = depth/2.
      riser.position.set(0, -height / 2, depth / 2);
      stepGroup.add(riser);
    }

    group.add(stepGroup);
  }

  private createLandingAbsolute(
    group: THREE.Group,
    width: number,
    depth: number,
    position: THREE.Vector3,
    rotation: number,
    yPos: number,
  ): void {
    const landingGeom = new THREE.BoxGeometry(width, 0.05, depth);
    const landing = new THREE.Mesh(landingGeom, this.material);
    landing.position.copy(position);
    landing.position.y = yPos;
    landing.rotation.y = rotation;
    group.add(landing);
  }

  private generateSpiralStair(group: THREE.Group, stair: JsonStair): void {
    const rise = stair.rise;
    const riserHeight = stair.riser ?? 0.18;
    const stepCount = Math.round(rise / riserHeight);
    const actualRiser = rise / stepCount;

    const outerRadius = stair.shape.outerRadius ?? 1.0;
    const innerRadius = stair.shape.innerRadius ?? 0.1;
    const stepWidth = outerRadius - innerRadius;

    const rotationDir = stair.shape.rotation === 'counterclockwise' ? 1 : -1;
    const anglePerStep = ((Math.PI * 2) / 12) * rotationDir;

    for (let i = 0; i < stepCount; i++) {
      const stepGroup = new THREE.Group();

      const treadGeom = new THREE.BoxGeometry(stepWidth, 0.05, 0.3);
      const tread = new THREE.Mesh(treadGeom, this.material);

      tread.position.x = innerRadius + stepWidth / 2;
      tread.position.y = (i + 1) * actualRiser;

      stepGroup.add(tread);
      stepGroup.rotation.y = i * anglePerStep;

      group.add(stepGroup);
    }
  }

  private createStep(
    group: THREE.Group,
    width: number,
    depth: number,
    height: number,
    index: number,
    xOffset: number,
    zOffset: number,
    startZ: number = 0,
  ): void {
    const treadGeom = new THREE.BoxGeometry(width, 0.05, depth);
    const tread = new THREE.Mesh(treadGeom, this.material);
    tread.position.set(xOffset, (index + 1) * height, startZ - index * depth - depth / 2 + zOffset);
    tread.castShadow = true;
    tread.receiveShadow = true;
    group.add(tread);

    // Riser
    const riserGeom = new THREE.BoxGeometry(width, height, 0.02);
    const riser = new THREE.Mesh(riserGeom, this.material);
    riser.position.set(xOffset, (index + 0.5) * height, startZ - index * depth + depth / 2 - depth);
    group.add(riser);
  }

  private createHandrail(
    group: THREE.Group,
    start: THREE.Vector3,
    end: THREE.Vector3,
    height: number = 0.9,
  ): void {
    const postGeom = new THREE.CylinderGeometry(0.02, 0.02, height);
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x555555,
      metalness: 0.8,
      roughness: 0.2,
    });

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

    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    mid.y += height;
    rail.position.copy(mid);

    const target = new THREE.Vector3(end.x, end.y + height, end.z);
    rail.lookAt(target);
    rail.rotateX(-Math.PI / 2);

    group.add(rail);
  }
}
