/**
 * Stair and lift geometry generation for 3D floorplan rendering
 */

import * as THREE from 'three';
import { MATERIAL_PROPERTIES } from './constants.js';
import type { JsonLift, JsonStair } from './types.js';

// Tread thickness used for stair tread BoxGeometry. Treads are positioned by
// their CENTER, so tread tops sit half this height above their position.y.
const TREAD_THICKNESS = 0.05;

// Vertical thickness of the structural concrete slab below the sloped soffit.
// Typical cast-in-place stair slabs are 150–200 mm. The bottom slope is
// parallel to the stair slope and offset downward by this amount. The portion
// below the floor level is naturally hidden by the floor slab.
const SOFFIT_THICKNESS = 0.15;

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

    // Normalize geometry so the top-left corner (min x, min z) is at (0,0).
    // This sets group.position to a compensating offset; we then add the
    // requested stair.x / stair.z on top.
    this.normalizeGeometryOrigin(group);

    // Place the group at the specified position (add to compensating offset)
    group.position.x += stair.x;
    group.position.z += stair.z;

    // Shift the entire stair down so the LAST tread's TOP sits ~25mm BELOW
    // the next floor's walking surface (= slab top). This achieves two things:
    //   1. Tread top doesn't poke above the slab through the cutout.
    //   2. Tread top doesn't z-fight with the slab top.
    // Because the tread is centered on its `position.y` (BoxGeometry of height
    // TREAD_THICKNESS), the tread *top* is `position.y + TREAD_THICKNESS/2`.
    // Last tread position.y = rise, so without offset the tread top would be
    // at rise + TREAD_THICKNESS/2 (poking above the slab). We offset the whole
    // group by -TREAD_THICKNESS to land 25mm below the slab top.
    group.position.y = -TREAD_THICKNESS;

    return group;
  }

  private normalizeGeometryOrigin(group: THREE.Group): void {
    // Compute world-space bounding box. This already includes any rotation
    // applied to the group itself (e.g., group.rotation.y for direction).
    const box = new THREE.Box3().setFromObject(group);

    // If box is empty (no geometry), do nothing
    if (box.isEmpty()) return;

    // Shift the group so its world-space min corner is at (0, 0).
    // We adjust group.position (parent-space, == world-space when group has
    // no parent yet) instead of children's local positions, which would be
    // re-rotated by the group's rotation and end up in the wrong direction.
    group.position.x = -box.min.x;
    group.position.z = -box.min.z;
  }

  /**
   * Build a single extruded sawtooth mesh representing an entire stair flight.
   *
   * The profile is drawn in the X-Y plane (shape x → depth axis, shape y →
   * height axis), then rotated -90° around Y so the depth axis maps to world Z
   * and the extrusion runs along world X. The width/2 translation centres the
   * mesh on x = 0, matching the legacy per-step layout.
   *
   * Y0 = TREAD_THICKNESS / 2 is baked into every y-coordinate so the last
   * tread top lands at N·R + TREAD_THICKNESS/2 in local space. Combined with
   * generateStair's group.position.y = −TREAD_THICKNESS, the world tread top =
   * rise − TREAD_THICKNESS/2 (25 mm below slab), identical to the legacy path.
   *
   * NOTE: open and glass stringers keep the legacy per-step path because the
   * sawtooth is a solid filled profile — it cannot represent open gaps between
   * treads or per-step glass material assignment.
   */
  private buildSawtoothFlight(
    width: number,
    treadDepth: number,
    riserHeight: number,
    stepCount: number,
    material: THREE.Material,
  ): THREE.Mesh {
    const T = treadDepth;
    const R = riserHeight;
    const N = stepCount;

    // Shift every y upward by TREAD_THICKNESS/2 so the sawtooth's world
    // tread-top matches the legacy BoxGeometry tread-top (see note above).
    const Y0 = TREAD_THICKNESS / 2;

    const shape = new THREE.Shape();
    shape.moveTo(N * T, Y0); // front-top corner (stair entry)
    for (let i = 0; i < N; i++) {
      const z = (N - i) * T;
      shape.lineTo(z, Y0 + (i + 1) * R); // riser top
      shape.lineTo(z - T, Y0 + (i + 1) * R); // tread back
    }
    // At (0, Y0 + N·R) — back-top corner. Drop straight down by SOFFIT_THICKNESS
    // to form the back face, then draw the parallel bottom slope back to the
    // front. closePath() closes the front face from the front-bottom up to the
    // entry point. Result: a concrete-slab cross-section with sloped soffit.
    shape.lineTo(0, Y0 + N * R - SOFFIT_THICKNESS); // back face (vertical)
    shape.lineTo(N * T, Y0 - SOFFIT_THICKNESS); // bottom slope (parallel, offset down)
    shape.closePath(); // front face back up to (N·T, Y0)

    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: width,
      bevelEnabled: false,
      steps: 1,
    });

    // ExtrudeGeometry extrudes along +Z with the shape in the X-Y plane.
    // Rotate -90° around Y: shape x-axis → world z-axis, extrusion → world -x-axis.
    geom.rotateY(-Math.PI / 2);
    // Re-centre the extruded mesh on x = 0 (matches per-step tread.position.x = 0).
    geom.translate(width / 2, 0, 0);

    const mesh = new THREE.Mesh(geom, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'stair_flight';
    return mesh;
  }

  public generateLift(lift: JsonLift, floorHeight: number): THREE.Group {
    const group = new THREE.Group();
    group.name = `lift_${lift.name ?? 'unnamed'}`;
    // Shift the lift down by half the tread thickness for the same reason as
    // stairs: the top of the shaft must sit just below (not coplanar with)
    // the next floor's slab top, so the cutout in that slab is visibly empty.
    group.position.set(lift.x, -TREAD_THICKNESS / 2, lift.z);

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

    // Emit step geometry — stringer-type determines the approach:
    if (stair.stringers === 'open') {
      // Open stringers: floating tread slabs, no risers. Individual boxes
      // preserved because the sawtooth is a solid fill and cannot represent gaps.
      for (let i = 0; i < stepCount; i++) {
        const treadGeom = new THREE.BoxGeometry(width, TREAD_THICKNESS, treadDepth);
        const tread = new THREE.Mesh(treadGeom, this.material);
        tread.position.set(0, (i + 1) * actualRiser, -(i * treadDepth) - treadDepth / 2);
        tread.castShadow = true;
        tread.receiveShadow = true;
        group.add(tread);
      }
    } else if (stair.stringers === 'glass') {
      // Glass stringers: per-step tread + transparent riser. Individual meshes
      // preserved so the glass material can be applied per-riser. See Phase B
      // note in stair_sawtooth_extrusion plan for the reasoning.
      for (let i = 0; i < stepCount; i++) {
        const stepGroup = new THREE.Group();

        const treadGeom = new THREE.BoxGeometry(width, TREAD_THICKNESS, treadDepth);
        const tread = new THREE.Mesh(treadGeom, this.material);
        tread.position.y = (i + 1) * actualRiser;
        tread.castShadow = true;
        tread.receiveShadow = true;
        stepGroup.add(tread);

        const glassMat = new THREE.MeshStandardMaterial({
          color: 0x88ccff,
          transparent: true,
          opacity: 0.5,
          roughness: 0.1,
          metalness: 0.9,
        });
        const riserGeom = new THREE.BoxGeometry(width, actualRiser, 0.02);
        const riser = new THREE.Mesh(riserGeom, glassMat);
        riser.position.y = (i + 0.5) * actualRiser;
        riser.position.z = treadDepth / 2;
        stepGroup.add(riser);

        stepGroup.position.z = -(i * treadDepth) - treadDepth / 2;
        group.add(stepGroup);
      }
    } else {
      // Closed stringers (default): single sawtooth extrusion for the entire
      // flight. Eliminates tread/riser inter-penetration and coplanar X-side
      // seams that produce per-step shimmer on oblique camera views.
      const flight = this.buildSawtoothFlight(
        width,
        treadDepth,
        actualRiser,
        stepCount,
        this.material,
      );
      // Sawtooth local front is at z = stepCount * treadDepth; shift so the
      // stair entry aligns to z = 0 in the group frame (matching legacy layout).
      flight.position.z = -stepCount * treadDepth;
      group.add(flight);
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

    // First run — single sawtooth flight; entry at z=0, back at z=-run1Steps*T
    const run1Flight = this.buildSawtoothFlight(
      width,
      treadDepth,
      actualRiser,
      run1Steps,
      this.material,
    );
    run1Flight.position.z = -run1Steps * treadDepth;
    group.add(run1Flight);

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

    // Second run — sawtooth; the legacy createStep used startZ = -(landingDepth/2 + treadDepth/2),
    // so the front of step 0 was at that z value in run2Group space.
    // Matching: front = flight.position.z + run2Steps*T = -(landingDepth/2 + treadDepth/2)
    const run2Flight = this.buildSawtoothFlight(
      width,
      treadDepth,
      actualRiser,
      run2Steps,
      this.material,
    );
    run2Flight.position.z = -run2Steps * treadDepth - (landingDepth / 2 + treadDepth / 2);
    run2Group.add(run2Flight);

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

    // Run 1: single sawtooth flight; entry at z=0, back at z=-run1Steps*T
    const uRun1Flight = this.buildSawtoothFlight(
      width,
      treadDepth,
      actualRiser,
      run1Steps,
      this.material,
    );
    uRun1Flight.position.z = -run1Steps * treadDepth;
    group.add(uRun1Flight);

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

    // Run 2: single sawtooth; run2Group.rotation.y=PI already flips its direction,
    // so the same position.z=-N*T formula as run 1 places the entry at z=0 in run2Group space.
    const run2Group = new THREE.Group();
    run2Group.position.set(offsetRun2, landingY, landingCenterZ - landingDepth / 2);
    run2Group.rotation.y = Math.PI;

    const uRun2Flight = this.buildSawtoothFlight(
      width,
      treadDepth,
      actualRiser,
      run2Steps,
      this.material,
    );
    uRun2Flight.position.z = -run2Steps * treadDepth;
    run2Group.add(uRun2Flight);
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
        const actualRiser = riserHeight;
        const flightLength = steps * treadDepth;

        // Single sawtooth per flight. The front (local z = flightLength) must
        // map to currentPos after rotation by currentRotation.
        // Derivation: world_front = flight.position + R(α) * (0, Y0, flightLength)
        //   x: px + sin(α)*flightLength = currentPos.x  → px = currentPos.x - sin(α)*L
        //   z: pz + cos(α)*flightLength = currentPos.z  → pz = currentPos.z - cos(α)*L
        const flight = this.buildSawtoothFlight(
          segWidth,
          treadDepth,
          actualRiser,
          steps,
          this.material,
        );
        flight.rotation.y = currentRotation;
        flight.position.set(
          currentPos.x - Math.sin(currentRotation) * flightLength,
          currentHeight,
          currentPos.z - Math.cos(currentRotation) * flightLength,
        );
        group.add(flight);

        // Advance currentPos to exit of this flight (back of sawtooth)
        currentPos.addScaledVector(forward, flightLength);
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
