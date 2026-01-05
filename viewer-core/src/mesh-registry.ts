/**
 * MeshRegistry - Bidirectional mapping between entities and Three.js meshes.
 * 
 * Used to look up:
 * - Which mesh corresponds to a given entity (by type + ID)
 * - Which entity a given mesh belongs to
 * 
 * Supports multi-selection and batch lookups.
 */
import * as THREE from 'three';
import type { SelectableObject, SelectableEntityType, SourceRange } from './scene-context.js';

/**
 * Key for entity lookup: combines type and ID for uniqueness.
 */
export interface EntityKey {
  entityType: SelectableEntityType;
  entityId: string;
  floorId: string;
}

/**
 * Entry stored in the registry for each entity.
 */
export interface RegistryEntry {
  /** The Three.js object(s) representing this entity */
  meshes: THREE.Object3D[];
  /** Metadata about the entity */
  metadata: SelectableObject;
}

/**
 * Bidirectional registry mapping entities to meshes and vice versa.
 */
export class MeshRegistry {
  /** Map from entity key string to registry entry */
  private entityToMeshes = new Map<string, RegistryEntry>();
  
  /** Map from mesh UUID to entity key string */
  private meshToEntity = new Map<string, string>();
  
  /**
   * Create a key string from entity identifiers.
   */
  private makeKey(floorId: string, entityType: SelectableEntityType, entityId: string): string {
    return `${floorId}:${entityType}:${entityId}`;
  }
  
  /**
   * Register a mesh as belonging to an entity.
   * 
   * @param mesh - The Three.js object to register
   * @param entityType - Type of entity (room, wall, connection, etc.)
   * @param entityId - Unique identifier for the entity
   * @param floorId - ID of the floor containing this entity
   * @param sourceRange - Optional source location in DSL
   */
  register(
    mesh: THREE.Object3D,
    entityType: SelectableEntityType,
    entityId: string,
    floorId: string,
    sourceRange?: SourceRange
  ): void {
    const key = this.makeKey(floorId, entityType, entityId);
    
    // Create or update entity entry
    let entry = this.entityToMeshes.get(key);
    if (!entry) {
      entry = {
        meshes: [],
        metadata: {
          mesh, // Primary mesh reference
          entityType,
          entityId,
          floorId,
          sourceRange,
        },
      };
      this.entityToMeshes.set(key, entry);
    }
    
    // Add mesh to entry if not already present
    if (!entry.meshes.includes(mesh)) {
      entry.meshes.push(mesh);
    }
    
    // Update source range if provided
    if (sourceRange) {
      entry.metadata.sourceRange = sourceRange;
    }
    
    // Add reverse mapping
    this.meshToEntity.set(mesh.uuid, key);
    
    // Store metadata in mesh userData for raycasting
    mesh.userData.selectableType = entityType;
    mesh.userData.entityId = entityId;
    mesh.userData.floorId = floorId;
    if (sourceRange) {
      mesh.userData.sourceRange = sourceRange;
    }
  }
  
  /**
   * Register multiple meshes for a single entity (e.g., room with floor + walls).
   */
  registerMultiple(
    meshes: THREE.Object3D[],
    entityType: SelectableEntityType,
    entityId: string,
    floorId: string,
    sourceRange?: SourceRange
  ): void {
    for (const mesh of meshes) {
      this.register(mesh, entityType, entityId, floorId, sourceRange);
    }
  }
  
  /**
   * Unregister a mesh from the registry.
   */
  unregister(mesh: THREE.Object3D): void {
    const key = this.meshToEntity.get(mesh.uuid);
    if (!key) return;
    
    const entry = this.entityToMeshes.get(key);
    if (entry) {
      const index = entry.meshes.indexOf(mesh);
      if (index >= 0) {
        entry.meshes.splice(index, 1);
      }
      
      // Remove entry if no meshes left
      if (entry.meshes.length === 0) {
        this.entityToMeshes.delete(key);
      }
    }
    
    this.meshToEntity.delete(mesh.uuid);
  }
  
  /**
   * Get the entity metadata for a mesh.
   * Returns undefined if mesh is not registered.
   */
  getEntityForMesh(mesh: THREE.Object3D): SelectableObject | undefined {
    const key = this.meshToEntity.get(mesh.uuid);
    if (!key) return undefined;
    
    const entry = this.entityToMeshes.get(key);
    return entry?.metadata;
  }
  
  /**
   * Get all meshes for an entity.
   */
  getMeshesForEntity(
    floorId: string,
    entityType: SelectableEntityType,
    entityId: string
  ): THREE.Object3D[] {
    const key = this.makeKey(floorId, entityType, entityId);
    const entry = this.entityToMeshes.get(key);
    return entry?.meshes ?? [];
  }
  
  /**
   * Get the entry (meshes + metadata) for an entity.
   */
  getEntry(
    floorId: string,
    entityType: SelectableEntityType,
    entityId: string
  ): RegistryEntry | undefined {
    const key = this.makeKey(floorId, entityType, entityId);
    return this.entityToMeshes.get(key);
  }
  
  /**
   * Check if a mesh is registered as selectable.
   */
  isSelectable(mesh: THREE.Object3D): boolean {
    return this.meshToEntity.has(mesh.uuid);
  }
  
  /**
   * Get all registered entities.
   */
  getAllEntities(): SelectableObject[] {
    return Array.from(this.entityToMeshes.values()).map(entry => entry.metadata);
  }
  
  /**
   * Get all entities of a specific type.
   */
  getEntitiesByType(entityType: SelectableEntityType): SelectableObject[] {
    return this.getAllEntities().filter(e => e.entityType === entityType);
  }
  
  /**
   * Get all entities on a specific floor.
   */
  getEntitiesByFloor(floorId: string): SelectableObject[] {
    return this.getAllEntities().filter(e => e.floorId === floorId);
  }
  
  /**
   * Find the selectable ancestor of a mesh.
   * Walks up the parent hierarchy to find a registered mesh.
   * Useful when raycasting hits a child mesh.
   */
  findSelectableAncestor(mesh: THREE.Object3D): THREE.Object3D | null {
    let current: THREE.Object3D | null = mesh;
    
    while (current) {
      if (this.isSelectable(current)) {
        return current;
      }
      current = current.parent;
    }
    
    return null;
  }
  
  /**
   * Clear all registrations (e.g., when loading a new floorplan).
   */
  clear(): void {
    this.entityToMeshes.clear();
    this.meshToEntity.clear();
  }
  
  /**
   * Clear registrations for a specific floor.
   */
  clearFloor(floorId: string): void {
    // Find all keys for this floor
    const keysToDelete: string[] = [];
    for (const key of this.entityToMeshes.keys()) {
      if (key.startsWith(`${floorId}:`)) {
        keysToDelete.push(key);
      }
    }
    
    // Remove entries and reverse mappings
    for (const key of keysToDelete) {
      const entry = this.entityToMeshes.get(key);
      if (entry) {
        for (const mesh of entry.meshes) {
          this.meshToEntity.delete(mesh.uuid);
        }
      }
      this.entityToMeshes.delete(key);
    }
  }
  
  /**
   * Get registry statistics for debugging.
   */
  getStats(): { entityCount: number; meshCount: number } {
    return {
      entityCount: this.entityToMeshes.size,
      meshCount: this.meshToEntity.size,
    };
  }
}

