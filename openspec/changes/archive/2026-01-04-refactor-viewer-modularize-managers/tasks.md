## 1. Extract Camera Manager
- [x] 1.1 Create CameraManager class with camera mode switching logic
- [x] 1.2 Move FOV control and isometric view setup
- [x] 1.3 Extract scene bounding box calculation
- [x] 1.4 Update main.ts to use CameraManager

## 2. Extract Annotation Manager
- [x] 2.1 Create AnnotationManager with area/dimension label logic
- [x] 2.2 Move floor summary panel creation and updates
- [x] 2.3 Extract unit formatting methods (formatArea, formatLength)
- [x] 2.4 Add initFromConfig for DSL config integration
- [x] 2.5 Update main.ts to delegate annotation operations

## 3. Extract Floor Manager
- [x] 3.1 Create FloorManager for floor visibility state
- [x] 3.2 Move floor list UI generation
- [x] 3.3 Implement setFloorVisible and setAllFloorsVisible
- [x] 3.4 Update main.ts to use FloorManager

## 4. Extract 2D Overlay Manager
- [x] 4.1 Create Overlay2DManager with Langium document management
- [x] 4.2 Move 2D SVG rendering logic
- [x] 4.3 Extract drag and resize functionality
- [x] 4.4 Update main.ts to use Overlay2DManager

## 5. Establish Manager Communication Pattern
- [x] 5.1 Define callback interfaces for cross-manager dependencies
- [x] 5.2 Wire up managers with dependency injection in Viewer constructor
- [x] 5.3 Update control setup to delegate to manager.setupControls()

## 6. Documentation and Licensing
- [x] 6.1 Add dual-licensing structure (GPL-3.0 for apps, MIT for libraries)
- [x] 6.2 Update LICENSE file with licensing explanation
- [x] 6.3 Update README with license table
- [x] 6.4 Add license and author fields to all package.json files
- [x] 6.5 Create individual LICENSE files for viewer, mcp-server, and libraries
- [x] 6.6 Clarify /speclife land command documentation (version bump timing)

