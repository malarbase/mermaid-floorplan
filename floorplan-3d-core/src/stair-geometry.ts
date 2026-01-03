/**
 * Stair and lift geometry generation for 3D floorplan rendering
 */

import * as THREE from 'three';
import type { JsonStair, JsonLift } from './types.js';
import { MATERIAL_PROPERTIES } from './constants.js';

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
    group.name = `stair_${stair.name}`;
    group.position.set(stair.x, 0, stair.z);

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
        // Fallback to straight stair
        this.generateStraightStair(group, stair);
        break;
    }

    return group;
  }

  public generateLift(lift: JsonLift, floorHeight: number): THREE.Group {
    const group = new THREE.Group();
    group.name = `lift_${lift.name}`;
    group.position.set(lift.x, 0, lift.z);

    const width = lift.width;
    const depth = lift.height; // mapped from height in JSON to depth (Z)
    const wallThickness = 0.2;

    // Lift shaft - semi-transparent box
    const geometry = new THREE.BoxGeometry(width, floorHeight, depth);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      color: MATERIAL_PROPERTIES.LIFT.color,
      transparent: true,
      opacity: MATERIAL_PROPERTIES.LIFT.opacity,
      roughness: MATERIAL_PROPERTIES.LIFT.roughness,
      metalness: MATERIAL_PROPERTIES.LIFT.metalness,
    }));
    mesh.position.y = floorHeight / 2;
    group.add(mesh);

    // Door indicators
    lift.doors.forEach(dir => {
      const doorGeom = new THREE.BoxGeometry(
        (dir === 'top' || dir === 'bottom') ? width * 0.8 : wallThickness * 1.1,
        floorHeight * 0.8,
        (dir === 'right' || dir === 'left') ? depth * 0.8 : wallThickness * 1.1
      );
      const doorMesh = new THREE.Mesh(doorGeom, new THREE.MeshStandardMaterial({ color: 0x333333 }));

      doorMesh.position.y = floorHeight / 2;
      if (dir === 'top') doorMesh.position.z = -depth / 2;
      if (dir === 'bottom') doorMesh.position.z = depth / 2;
      if (dir === 'right') doorMesh.position.x = width / 2;
      if (dir === 'left') doorMesh.position.x = -width / 2;

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
    const direction = stair.shape.direction || 'top';
    switch (direction) {
      case 'top': rotation = 0; break;
      case 'bottom': rotation = Math.PI; break;
      case 'right': rotation = -Math.PI / 2; break;
      case 'left': rotation = Math.PI / 2; break;
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
            metalness: 0.9
          });
        }
        const riserGeom = new THREE.BoxGeometry(width, actualRiser, 0.02);
        const riser = new THREE.Mesh(riserGeom, riserMat);
        riser.position.y = (i + 0.5) * actualRiser;
        riser.position.z = treadDepth / 2;
        stepGroup.add(riser);
      }

      stepGroup.position.z = -(i * treadDepth) - (treadDepth / 2);
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
        this.createHandrail(group,
          new THREE.Vector3(-width / 2, startY, startZ),
          new THREE.Vector3(-width / 2, endY, endZ)
        );
      }
      if (stair.handrail === 'both' || stair.handrail === 'right') {
        this.createHandrail(group,
          new THREE.Vector3(width / 2, startY, startZ),
          new THREE.Vector3(width / 2, endY, endZ)
        );
      }
    }
  }

  private generateLShapedStair(group: THREE.Group, stair: JsonStair): void {
    const runs = stair.shape.runs || [10, 10];
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
    landing.position.set(0, landingY, -(run1Steps * treadDepth) - (landingDepth / 2) + (treadDepth / 2));
    group.add(landing);

    // Second run
    const turn = stair.shape.turn || 'right';
    const turnAngle = turn === 'right' ? -Math.PI / 2 : Math.PI / 2;

    const run2StartPos = new THREE.Vector3(0, landingY, -(run1Steps * treadDepth) - (landingDepth / 2) + (treadDepth / 2));

    const run2Group = new THREE.Group();
    run2Group.position.copy(run2StartPos);
    run2Group.rotation.y = turnAngle;

    for (let i = 0; i < run2Steps; i++) {
      this.createStep(run2Group, width, treadDepth, actualRiser, i, 0, 0, -(landingDepth / 2 + treadDepth / 2));
    }

    group.add(run2Group);

    // Apply entry rotation (view-relative: top/bottom/left/right)
    const entry = stair.shape.entry || 'top';
    let rotation = 0;
    switch (entry) {
      case 'top': rotation = 0; break;
      case 'bottom': rotation = Math.PI; break;
      case 'right': rotation = -Math.PI / 2; break;
      case 'left': rotation = Math.PI / 2; break;
    }
    group.rotation.y = rotation;
  }

  private generateUShapedStair(group: THREE.Group, stair: JsonStair): void {
    // Simplified U-shaped stair - two L-shaped runs
    this.generateStraightStair(group, stair);
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
    const anglePerStep = (Math.PI * 2) / 12 * rotationDir;

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
    startZ: number = 0
  ): void {
    const treadGeom = new THREE.BoxGeometry(width, 0.05, depth);
    const tread = new THREE.Mesh(treadGeom, this.material);
    tread.position.set(xOffset, (index + 1) * height, startZ - (index * depth) - (depth / 2) + zOffset);
    tread.castShadow = true;
    tread.receiveShadow = true;
    group.add(tread);

    // Riser
    const riserGeom = new THREE.BoxGeometry(width, height, 0.02);
    const riser = new THREE.Mesh(riserGeom, this.material);
    riser.position.set(xOffset, (index + 0.5) * height, startZ - (index * depth) + (depth / 2) - depth);
    group.add(riser);
  }

  private createHandrail(group: THREE.Group, start: THREE.Vector3, end: THREE.Vector3, height: number = 0.9): void {
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

    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    mid.y += height;
    rail.position.copy(mid);

    const target = new THREE.Vector3(end.x, end.y + height, end.z);
    rail.lookAt(target);
    rail.rotateX(-Math.PI / 2);

    group.add(rail);
  }
}

