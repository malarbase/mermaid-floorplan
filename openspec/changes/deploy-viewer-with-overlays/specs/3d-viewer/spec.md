# 3D Viewer Spec Delta

## ADDED Requirements

### Requirement: Editor Panel Integration
The viewer SHALL provide a collapsible side panel containing a Monaco code editor and AI chat interface for editing floorplan DSL.

#### Scenario: Toggle Editor Panel
- **WHEN** the user clicks the editor toggle button
- **THEN** the editor panel SHALL slide in/out from the left side
- **AND** the toggle arrow SHALL indicate the current state (▶ closed, ◀ open)

#### Scenario: Live Preview
- **WHEN** the user edits the floorplan DSL in the editor
- **THEN** the 3D view SHALL update automatically after a debounce delay
- **AND** validation errors SHALL be displayed in the warnings panel

#### Scenario: AI Chat Integration
- **WHEN** the user enters an OpenAI API key and sends a chat message
- **THEN** the AI SHALL respond with floorplan suggestions or modifications
- **AND** if the response contains a floorplan code block, it SHALL be applied to the editor

#### Scenario: Configurable API Endpoint
- **WHEN** the user enters a custom API base URL
- **THEN** API requests SHALL be sent to that endpoint instead of the default OpenAI URL
- **AND** the URL and API key SHALL be persisted to localStorage

### Requirement: 2D Overlay Mini-map
The viewer SHALL provide a draggable, resizable 2D SVG overlay showing the current floor plan.

#### Scenario: Toggle 2D Overlay
- **WHEN** the user enables the "Show 2D Mini-map" checkbox
- **THEN** a 2D SVG representation of the floor plan SHALL appear in a floating window
- **AND** the overlay SHALL have configurable opacity

#### Scenario: Drag Overlay
- **WHEN** the user drags the overlay header
- **THEN** the overlay SHALL move to follow the cursor
- **AND** the overlay SHALL be constrained within the viewport bounds

#### Scenario: Resize Overlay
- **WHEN** the user drags the resize handle in the bottom-right corner
- **THEN** the overlay SHALL resize with the bottom-right corner following the cursor
- **AND** the overlay SHALL respect minimum size constraints (200x150 pixels)

#### Scenario: Close Overlay
- **WHEN** the user clicks the close button on the overlay header
- **THEN** the overlay SHALL be hidden
- **AND** the "Show 2D Mini-map" checkbox SHALL be unchecked

### Requirement: Floor Visibility Controls
The viewer SHALL provide controls to toggle the visibility of individual floors in the 3D view.

#### Scenario: Floor Checkboxes
- **WHEN** a floorplan with multiple floors is loaded
- **THEN** the Floors control section SHALL display a checkbox for each floor
- **AND** all floors SHALL be visible (checked) by default

#### Scenario: Toggle Floor Visibility
- **WHEN** the user unchecks a floor's checkbox
- **THEN** that floor SHALL be hidden in the 3D view
- **AND** the floor summary SHALL update to reflect only visible floors

#### Scenario: Show All / Hide All
- **WHEN** the user clicks "Show All" or "Hide All" button
- **THEN** all floor checkboxes SHALL be checked or unchecked respectively
- **AND** the 3D view SHALL update to show or hide all floors

### Requirement: GitHub Pages Deployment
The viewer SHALL be deployable to GitHub Pages as the primary application.

#### Scenario: Base Path Configuration
- **WHEN** the viewer is built for GitHub Pages deployment
- **THEN** all asset paths SHALL use the configured base path (e.g., `/mermaid-floorplan/`)
- **AND** the application SHALL load correctly at the deployed URL

