/**
 * InteractiveEditorCore - Editor application core extending FloorplanAppCore.
 *
 * This class adds editor-specific functionality on top of FloorplanAppCore:
 * - Parse error state management (show stale geometry during errors)
 * - Editor-specific events (selectionChange, parseError)
 * - Enhanced mesh registration for wall selection support
 * - Entity location tracking for DSL ↔ 3D bidirectional sync
 *
 * Use with EditorUI (Solid root) for the full editor experience.
 */

import type { JsonExport, JsonFloor, JsonRoom } from 'floorplan-3d-core';
import { DIMENSIONS, MaterialFactory } from 'floorplan-3d-core';
import * as THREE from 'three';
import {
  type EventHandler,
  FloorplanAppCore,
  type FloorplanAppCoreEvents,
  type FloorplanAppCoreOptions,
} from './floorplan-app-core.js';
import type { SelectableObject, SourceRange } from './scene-context.js';
import type { MarqueeMode } from './selection-manager.js';
import { createDebugLogger } from './utils/debug.js';

const log = createDebugLogger('[InteractiveEditorCore]');

// ============================================================================
// Types
// ============================================================================

/**
 * Entity location information for DSL ↔ 3D sync.
 * Maps entity names to their source locations in the DSL.
 */
export interface EntityLocation {
  name: string;
  type: 'room' | 'wall' | 'floor' | 'connection' | 'stair' | 'lift';
  floorId: string;
  sourceRange?: SourceRange;
}

/**
 * Editor-specific events extending FloorplanAppCoreEvents.
 */
export interface InteractiveEditorCoreEvents extends FloorplanAppCoreEvents {
  /** Emitted when selection changes */
  selectionChange: {
    selection: ReadonlySet<SelectableObject>;
    source: 'click' | 'marquee' | 'api';
  };
  /** Emitted when parse error state changes */
  parseError: { hasError: boolean; errorMessage?: string };
  /** Emitted when entity locations are updated */
  entityLocationsUpdate: { locations: EntityLocation[] };
}

/**
 * Configuration options for InteractiveEditorCore.
 */
export interface InteractiveEditorCoreOptions
  extends Omit<FloorplanAppCoreOptions, 'enableSelection' | 'allowSelectionToggle'> {
  /** Enable selection debug logging (default: false) */
  selectionDebug?: boolean;
  /** Initial marquee mode (default: 'intersection') */
  marqueeMode?: MarqueeMode;
}

// ============================================================================
// InteractiveEditorCore
// ============================================================================

/**
 * Editor-specific application core extending FloorplanAppCore.
 *
 * Key differences from FloorplanAppCore:
 * - Always enables selection (editor requires it)
 * - Tracks parse error state to show stale geometry during errors
 * - Registers wall meshes for selection (not just floor meshes)
 * - Tracks entity locations for DSL ↔ 3D bidirectional sync
 */
export class InteractiveEditorCore extends FloorplanAppCore {
  // Error state management
  private _hasParseError: boolean = false;
  private _lastValidFloorplanData: JsonExport | null = null;
  private _lastParseErrorMessage?: string;

  // Entity locations for DSL sync
  private _entityLocations: EntityLocation[] = [];

  // Selection debug flag
  private readonly _selectionDebug: boolean;

  // Getters
  /** Whether the current DSL has parse errors (3D view shows stale geometry) */
  get hasParseError(): boolean {
    return this._hasParseError;
  }

  /** The last successfully parsed floorplan data (used during error state) */
  get lastValidFloorplanData(): JsonExport | null {
    return this._lastValidFloorplanData;
  }

  /** Current entity locations for DSL sync */
  get entityLocations(): readonly EntityLocation[] {
    return this._entityLocations;
  }

  constructor(options: InteractiveEditorCoreOptions = {}) {
    // Editor always enables selection
    super({
      ...options,
      enableSelection: true,
      allowSelectionToggle: true,
    });

    this._selectionDebug = options.selectionDebug ?? false;

    // Set initial marquee mode if specified
    if (options.marqueeMode) {
      this.setMarqueeMode(options.marqueeMode);
    }

    // Wire up selection change events
    this.setupSelectionEvents();
  }

  // ============================================================================
  // Event Emitter Extensions
  // ============================================================================

  /**
   * Subscribe to an editor-specific event.
   * Extends parent's on() to include editor events.
   */
  on<K extends keyof InteractiveEditorCoreEvents>(
    event: K,
    handler: EventHandler<InteractiveEditorCoreEvents[K]>,
  ): () => void {
    // Use parent's event system
    return super.on(
      event as keyof FloorplanAppCoreEvents,
      handler as EventHandler<FloorplanAppCoreEvents[keyof FloorplanAppCoreEvents]>,
    );
  }

  /**
   * Emit an editor-specific event.
   */
  protected emitEditorEvent<K extends keyof InteractiveEditorCoreEvents>(
    event: K,
    data: InteractiveEditorCoreEvents[K],
  ): void {
    // Access parent's private eventHandlers map
    // This is a workaround - ideally emit would be protected in parent
    const handlers = (this as unknown as { eventHandlers: Map<string, Set<EventHandler<unknown>>> })
      .eventHandlers;
    const eventHandlers = handlers.get(event);

    if (this._selectionDebug) {
      log(`emitEditorEvent('${event}')`, {
        hasHandlers: !!eventHandlers,
        handlerCount: eventHandlers?.size ?? 0,
      });
    }

    eventHandlers?.forEach((handler) => {
      (handler as EventHandler<InteractiveEditorCoreEvents[K]>)(data);
    });
  }

  /**
   * Setup selection change event forwarding.
   */
  private setupSelectionEvents(): void {
    const selectionManager = this.getSelectionManager();
    if (!selectionManager) {
      log.warn('No selection manager available');
      return;
    }

    log('Setting up selection events');

    // Listen for selection changes and forward as events
    selectionManager.onSelectionChange((event) => {
      log('Selection changed, emitting event:', {
        count: event.selection.size,
        source: event.source,
      });

      this.emitEditorEvent('selectionChange', {
        selection: event.selection,
        source: event.source as 'click' | 'marquee' | 'api',
      });
    });
  }

  // ============================================================================
  // Parse Error State Management
  // ============================================================================

  /**
   * Set the error state (called when DSL parse fails).
   * When in error state, the 3D view shows last valid geometry.
   *
   * @param hasError - Whether there are parse errors
   * @param errorMessage - Optional error message for display
   */
  public setErrorState(hasError: boolean, errorMessage?: string): void {
    const wasInError = this._hasParseError;
    this._hasParseError = hasError;
    this._lastParseErrorMessage = errorMessage;

    // Only emit if state changed
    if (wasInError !== hasError) {
      this.emitEditorEvent('parseError', { hasError, errorMessage });
    }
  }

  /**
   * Get the current parse error message.
   */
  public getParseErrorMessage(): string | undefined {
    return this._lastParseErrorMessage;
  }

  /**
   * Clear the error state after successful parse.
   */
  public clearErrorState(): void {
    this.setErrorState(false);
  }

  // ============================================================================
  // Entity Location Tracking
  // ============================================================================

  /**
   * Get entity locations for DSL ↔ 3D sync.
   * Returns all tracked entities with their source ranges.
   */
  public getEntityLocations(): readonly EntityLocation[] {
    return this._entityLocations;
  }

  /**
   * Find entity by name.
   */
  public findEntityByName(name: string): EntityLocation | undefined {
    return this._entityLocations.find((e) => e.name === name);
  }

  /**
   * Find entities at a specific line in the DSL.
   */
  public findEntitiesAtLine(line: number): EntityLocation[] {
    return this._entityLocations.filter(
      (e) => e.sourceRange && line >= e.sourceRange.startLine && line <= e.sourceRange.endLine,
    );
  }

  /**
   * Update entity locations from floorplan data.
   */
  private updateEntityLocations(data: JsonExport): void {
    const locations: EntityLocation[] = [];

    data.floors.forEach((floor) => {
      // Track rooms
      floor.rooms.forEach((room) => {
        locations.push({
          name: room.name,
          type: 'room',
          floorId: floor.id,
          sourceRange: room._sourceRange,
        });

        // Track walls within rooms
        room.walls.forEach((wall) => {
          const wallSourceRange = (wall as { _sourceRange?: SourceRange })._sourceRange;
          if (wallSourceRange) {
            locations.push({
              name: `${room.name}_${wall.direction}`,
              type: 'wall',
              floorId: floor.id,
              sourceRange: wallSourceRange,
            });
          }
        });
      });

      // Track stairs
      if (floor.stairs) {
        floor.stairs.forEach((stair) => {
          const stairSourceRange = (stair as { _sourceRange?: SourceRange })._sourceRange;
          locations.push({
            name: stair.name,
            type: 'stair',
            floorId: floor.id,
            sourceRange: stairSourceRange,
          });
        });
      }

      // Track lifts
      if (floor.lifts) {
        floor.lifts.forEach((lift) => {
          const liftSourceRange = (lift as { _sourceRange?: SourceRange })._sourceRange;
          locations.push({
            name: lift.name,
            type: 'lift',
            floorId: floor.id,
            sourceRange: liftSourceRange,
          });
        });
      }
    });

    // Track connections
    if (data.connections) {
      data.connections.forEach((conn) => {
        const connSourceRange = (conn as { _sourceRange?: SourceRange })._sourceRange;
        locations.push({
          name: `${conn.fromRoom}_${conn.toRoom}`,
          type: 'connection',
          floorId: '', // Connections span floors
          sourceRange: connSourceRange,
        });
      });
    }

    this._entityLocations = locations;
    this.emitEditorEvent('entityLocationsUpdate', { locations });
  }

  // ============================================================================
  // Overrides
  // ============================================================================

  /**
   * Override loadFloorplan to handle parse error state and entity tracking.
   * Preserves the current selection by snapshotting entity IDs before the
   * scene rebuild and restoring them from the new mesh registry afterwards.
   */
  public loadFloorplan(data: JsonExport): void {
    const sm = this.getSelectionManager();

    // Snapshot selected entity identifiers before the scene is rebuilt
    const previousSelection = sm
      ? Array.from(sm.getSelection()).map((e) => ({
          floorId: e.floorId,
          entityType: e.entityType,
          entityId: e.entityId,
        }))
      : [];

    // Silently deselect (old meshes are about to be destroyed)
    sm?.deselect();

    // Call parent implementation (clears mesh registry, rebuilds scene)
    super.loadFloorplan(data);

    // Restore selection from new mesh registry by matching entity IDs
    if (sm && previousSelection.length > 0) {
      const allEntities = this._meshRegistry.getAllEntities();
      const toReselect = previousSelection
        .map((prev) =>
          allEntities.find(
            (e) =>
              e.floorId === prev.floorId &&
              e.entityType === prev.entityType &&
              e.entityId === prev.entityId,
          ),
        )
        .filter((e): e is SelectableObject => e !== undefined);

      if (toReselect.length > 0) {
        sm.selectMultiple(toReselect, false, { silent: false });
      }
    }
  }

  /**
   * Override onFloorplanLoaded to update entity locations and clear error state.
   */
  protected onFloorplanLoaded(): void {
    super.onFloorplanLoaded();

    // Store as last valid data (clears error state)
    this._lastValidFloorplanData = this.currentFloorplanData;
    this.clearErrorState();

    // Update entity locations
    if (this.currentFloorplanData) {
      this.updateEntityLocations(this.currentFloorplanData);
    }
  }

  /**
   * Override generateFloorWithPenetrations to register wall meshes for selection.
   * This is the key difference from FloorplanAppCore - we need walls to be selectable.
   */
  protected generateFloorWithPenetrations(
    floorData: JsonFloor,
    prevFloorPenetrations: THREE.Box3[],
  ): { group: THREE.Group; penetrations: THREE.Box3[] } {
    const group = new THREE.Group();
    group.name = floorData.id;

    // Height resolution priority: room > floor > config > constant
    const globalDefault = this.config.default_height ?? DIMENSIONS.WALL.HEIGHT;
    const floorDefault = floorData.height ?? globalDefault;

    // Prepare all rooms with defaults for wall ownership detection
    const allRoomsWithDefaults = floorData.rooms.map((r) => ({
      ...r,
      roomHeight: r.roomHeight ?? floorDefault,
    }));

    // Set style resolver for wall ownership detection
    this.wallGenerator.setStyleResolver((room: JsonRoom) => this.resolveRoomStyle(room));

    floorData.rooms.forEach((room) => {
      // Apply default height to room if not specified
      const roomWithDefaults = {
        ...room,
        roomHeight: room.roomHeight ?? floorDefault,
      };

      // Resolve style for this room
      const roomStyle = this.resolveRoomStyle(room);

      // Create materials for this room with style and theme
      const hasExplicitStyle =
        (room.style && this.styles.has(room.style)) ||
        (this.config.default_style && this.styles.has(this.config.default_style));
      const materials = MaterialFactory.createMaterialSet(
        roomStyle,
        hasExplicitStyle ? undefined : this.currentTheme,
      );

      // 1. Floor plate with penetration support
      const floorMesh = this.createFloorMeshWithPenetrations(
        roomWithDefaults,
        materials.floor,
        prevFloorPenetrations,
      );
      group.add(floorMesh);

      // Register floor mesh in registry for selection support
      this._meshRegistry.register(floorMesh, 'room', room.name, floorData.id, room._sourceRange);

      // 2. Walls with doors, windows, and connections
      // Uses wall ownership detection to prevent Z-fighting
      roomWithDefaults.walls.forEach((wall) => {
        // Track wall meshes added by WallGenerator
        const wallMeshesBefore = new Set<THREE.Object3D>();
        group.traverse((obj) => wallMeshesBefore.add(obj));

        this.wallGenerator.generateWall(
          wall,
          roomWithDefaults,
          allRoomsWithDefaults,
          this.connections,
          materials,
          group,
          this.config,
        );

        // Find newly added meshes and register walls for selection
        group.traverse((obj) => {
          if (!wallMeshesBefore.has(obj) && obj instanceof THREE.Mesh) {
            // Check if this looks like a wall mesh (not a door/window)
            const isArrayMaterial = Array.isArray(obj.material);
            const isStandardMaterial = obj.material instanceof THREE.MeshStandardMaterial;
            const isTransparent =
              isStandardMaterial && (obj.material as THREE.MeshStandardMaterial).transparent;
            const isWallMesh = isArrayMaterial || (isStandardMaterial && !isTransparent);

            if (isWallMesh && !this._meshRegistry.getEntityForMesh(obj)) {
              const wallSourceRange = (wall as { _sourceRange?: SourceRange })._sourceRange;
              this._meshRegistry.register(
                obj,
                'wall',
                `${room.name}_${wall.direction}`,
                floorData.id,
                wallSourceRange,
              );
            }
          }
        });
      });
    });

    // Collect penetrations for the next floor
    const penetrations: THREE.Box3[] = [];

    // 3. Stairs
    if (floorData.stairs) {
      floorData.stairs.forEach((stair) => {
        const stairGroup = this.stairGenerator.generateStair(stair);
        group.add(stairGroup);

        // Compute penetration bounds for next floor
        penetrations.push(this.computeStairPenetration(stair, stair.tread, stair.rise));
      });
    }

    // 4. Lifts
    if (floorData.lifts) {
      floorData.lifts.forEach((lift) => {
        const liftGroup = this.stairGenerator.generateLift(lift, floorDefault);
        group.add(liftGroup);

        // Compute penetration bounds for next floor
        penetrations.push(this.computeLiftPenetration(lift));
      });
    }

    return { group, penetrations };
  }

  /**
   * Clean up resources.
   */
  public dispose(): void {
    this._entityLocations = [];
    super.dispose();
  }
}
