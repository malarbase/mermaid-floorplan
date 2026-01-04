## 1. Rendering API Refactor
- [x] 1.1 Replace floorIndex/renderAllFloors with visibleFloors array API
- [x] 1.2 Deprecate old options while maintaining backward compatibility
- [x] 1.3 Update renderMultipleFloors to accept filtered floor list
- [x] 1.4 Document new API in RenderOptions interface

## 2. Floor Manager Integration
- [x] 2.1 Add getVisibleFloorIds() method to FloorManager
- [x] 2.2 Connect FloorManager visibility changes to 2D overlay re-render
- [x] 2.3 Update Overlay2DManager to use visibleFloors API

## 3. Door Rendering Fix
- [x] 3.1 Fix right wall door swing direction logic
- [x] 3.2 Add explanatory comments about coordinate system perspective

## 4. Editor Panel Enhancement
- [x] 4.1 Add resize handle UI element with hover effects
- [x] 4.2 Implement drag-to-resize mouse event handlers
- [x] 4.3 Add CSS variables for editor width coordination
- [x] 4.4 Update panel positioning logic to handle dynamic width
- [x] 4.5 Prevent text selection during resize drag

