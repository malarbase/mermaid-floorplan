/**
 * Tests for MeshRegistry
 */

import * as THREE from 'three';
import { beforeEach, describe, expect, it } from 'vitest';
import { MeshRegistry } from '../src/mesh-registry.js';

describe('MeshRegistry', () => {
  let registry: MeshRegistry;
  let mesh: THREE.Mesh;

  beforeEach(() => {
    registry = new MeshRegistry();
    mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  });

  describe('register', () => {
    it('should register a mesh with entity metadata', () => {
      registry.register(mesh, 'room', 'Kitchen', 'Floor1');

      const entity = registry.getEntityForMesh(mesh);
      expect(entity).toBeDefined();
      expect(entity?.entityType).toBe('room');
      expect(entity?.entityId).toBe('Kitchen');
      expect(entity?.floorId).toBe('Floor1');
    });

    it('should store metadata in mesh userData', () => {
      registry.register(mesh, 'room', 'Kitchen', 'Floor1', {
        startLine: 10,
        startColumn: 0,
        endLine: 12,
        endColumn: 5,
      });

      expect(mesh.userData.selectableType).toBe('room');
      expect(mesh.userData.entityId).toBe('Kitchen');
      expect(mesh.userData.floorId).toBe('Floor1');
      expect(mesh.userData.sourceRange).toEqual({
        startLine: 10,
        startColumn: 0,
        endLine: 12,
        endColumn: 5,
      });
    });

    it('should allow multiple meshes for one entity', () => {
      const mesh2 = new THREE.Mesh();

      registry.register(mesh, 'room', 'Kitchen', 'Floor1');
      registry.register(mesh2, 'room', 'Kitchen', 'Floor1');

      const meshes = registry.getMeshesForEntity('Floor1', 'room', 'Kitchen');
      expect(meshes).toHaveLength(2);
      expect(meshes).toContain(mesh);
      expect(meshes).toContain(mesh2);
    });
  });

  describe('unregister', () => {
    it('should remove a mesh from the registry', () => {
      registry.register(mesh, 'room', 'Kitchen', 'Floor1');
      registry.unregister(mesh);

      expect(registry.getEntityForMesh(mesh)).toBeUndefined();
      expect(registry.isSelectable(mesh)).toBe(false);
    });

    it('should keep entity if other meshes remain', () => {
      const mesh2 = new THREE.Mesh();

      registry.register(mesh, 'room', 'Kitchen', 'Floor1');
      registry.register(mesh2, 'room', 'Kitchen', 'Floor1');
      registry.unregister(mesh);

      const meshes = registry.getMeshesForEntity('Floor1', 'room', 'Kitchen');
      expect(meshes).toHaveLength(1);
      expect(meshes).toContain(mesh2);
    });
  });

  describe('findSelectableAncestor', () => {
    it('should find registered ancestor in hierarchy', () => {
      const parent = new THREE.Group();
      const child = new THREE.Mesh();
      parent.add(child);

      registry.register(parent, 'room', 'Kitchen', 'Floor1');

      const ancestor = registry.findSelectableAncestor(child);
      expect(ancestor).toBe(parent);
    });

    it('should return mesh itself if registered', () => {
      registry.register(mesh, 'room', 'Kitchen', 'Floor1');

      const ancestor = registry.findSelectableAncestor(mesh);
      expect(ancestor).toBe(mesh);
    });

    it('should return null if no selectable ancestor', () => {
      const unregistered = new THREE.Mesh();

      const ancestor = registry.findSelectableAncestor(unregistered);
      expect(ancestor).toBeNull();
    });
  });

  describe('clear', () => {
    it('should remove all registrations', () => {
      registry.register(mesh, 'room', 'Kitchen', 'Floor1');
      registry.clear();

      expect(registry.getStats().entityCount).toBe(0);
      expect(registry.getStats().meshCount).toBe(0);
    });
  });

  describe('clearFloor', () => {
    it('should remove only registrations for specified floor', () => {
      const mesh2 = new THREE.Mesh();

      registry.register(mesh, 'room', 'Kitchen', 'Floor1');
      registry.register(mesh2, 'room', 'Bedroom', 'Floor2');

      registry.clearFloor('Floor1');

      expect(registry.getEntityForMesh(mesh)).toBeUndefined();
      expect(registry.getEntityForMesh(mesh2)).toBeDefined();
    });
  });

  describe('getAllEntities', () => {
    it('should return all registered entities', () => {
      const mesh2 = new THREE.Mesh();

      registry.register(mesh, 'room', 'Kitchen', 'Floor1');
      registry.register(mesh2, 'connection', 'Door1', 'Floor1');

      const entities = registry.getAllEntities();
      expect(entities).toHaveLength(2);
    });
  });

  describe('getEntitiesByType', () => {
    it('should filter entities by type', () => {
      const mesh2 = new THREE.Mesh();
      const mesh3 = new THREE.Mesh();

      registry.register(mesh, 'room', 'Kitchen', 'Floor1');
      registry.register(mesh2, 'connection', 'Door1', 'Floor1');
      registry.register(mesh3, 'room', 'Bedroom', 'Floor1');

      const rooms = registry.getEntitiesByType('room');
      expect(rooms).toHaveLength(2);
      expect(rooms.every((e) => e.entityType === 'room')).toBe(true);
    });
  });
});
