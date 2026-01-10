## ADDED Requirements

### Requirement: Desktop Application Packaging

The system SHALL provide a native desktop application that wraps the interactive editor web application using Tauri 2.0.

#### Scenario: Application launches successfully
- **GIVEN** a user has installed the desktop application
- **WHEN** the user launches the application
- **THEN** a native window opens with the interactive editor loaded
- **AND** WebGL 3D rendering works correctly
- **AND** Monaco Editor is functional

#### Scenario: Application works offline
- **GIVEN** a user has launched the desktop application
- **WHEN** the user has no network connection
- **THEN** all local features (editing, rendering, file operations) work correctly
- **AND** network-dependent features (OpenAI chat) show appropriate offline status

### Requirement: Native File Dialogs

The system SHALL provide native file open and save dialogs when running as a desktop application.

#### Scenario: Open floorplan file
- **GIVEN** a user clicks File > Open or presses Cmd/Ctrl+O
- **WHEN** the native file dialog appears
- **THEN** the dialog filters for `.floorplan` files by default
- **AND** selecting a file loads its content into the editor
- **AND** the window title updates to show the file name

#### Scenario: Save floorplan file
- **GIVEN** a user has made changes to a floorplan
- **WHEN** the user clicks File > Save (Cmd/Ctrl+S)
- **THEN** if no file path exists, a native save dialog appears
- **AND** if a file path exists, the file is saved directly
- **AND** a success indicator is shown

#### Scenario: Save As new file
- **GIVEN** a user wants to save to a new location
- **WHEN** the user clicks File > Save As (Cmd/Ctrl+Shift+S)
- **THEN** a native save dialog appears
- **AND** the user can specify a new file name and location
- **AND** subsequent saves go to the new location

#### Scenario: Web fallback for file operations
- **GIVEN** the application is running as a web app (not desktop)
- **WHEN** the user attempts file operations
- **THEN** browser-native alternatives are used (download for save, file input for open)

### Requirement: Native Menu Bar

The system SHALL provide a native menu bar with standard application menus.

#### Scenario: File menu operations
- **GIVEN** a user accesses the File menu
- **WHEN** the user selects a menu item
- **THEN** New creates an empty floorplan
- **AND** Open shows the file open dialog
- **AND** Save/Save As save the current document
- **AND** Export submenu offers PNG, SVG, and JSON options

#### Scenario: Edit menu operations
- **GIVEN** a user accesses the Edit menu
- **WHEN** the user selects a menu item
- **THEN** Undo/Redo work with editor history
- **AND** Cut/Copy/Paste work with system clipboard

#### Scenario: View menu operations
- **GIVEN** a user accesses the View menu
- **WHEN** the user selects a menu item
- **THEN** Toggle 3D/2D View switches between views
- **AND** Zoom controls adjust the view scale
- **AND** Fullscreen toggles fullscreen mode

#### Scenario: Platform-appropriate keyboard shortcuts
- **GIVEN** a user is on macOS
- **WHEN** keyboard shortcuts are used
- **THEN** Cmd key is used as modifier (Cmd+S, Cmd+O, etc.)
- **AND** standard macOS menu conventions are followed

#### Scenario: Platform-appropriate keyboard shortcuts on Windows/Linux
- **GIVEN** a user is on Windows or Linux
- **WHEN** keyboard shortcuts are used
- **THEN** Ctrl key is used as modifier (Ctrl+S, Ctrl+O, etc.)
- **AND** standard Windows/Linux menu conventions are followed

### Requirement: Recent Files

The system SHALL maintain a list of recently opened files.

#### Scenario: Recent files populated after opening
- **GIVEN** a user opens a `.floorplan` file
- **WHEN** the file loads successfully
- **THEN** the file path is added to the recent files list
- **AND** the File > Open Recent menu shows the file

#### Scenario: Open from recent files
- **GIVEN** a user has previously opened files
- **WHEN** the user selects a file from File > Open Recent
- **THEN** the file is opened directly without showing a file dialog

#### Scenario: Clear recent files
- **GIVEN** a user wants to clear history
- **WHEN** the user selects File > Open Recent > Clear Recent
- **THEN** the recent files list is emptied

### Requirement: Cross-Platform Distribution

The system SHALL provide installable packages for major desktop platforms.

#### Scenario: macOS installation
- **GIVEN** a user downloads the macOS installer
- **WHEN** the user opens the `.dmg` file
- **THEN** the user can drag the app to Applications folder
- **AND** the app launches without errors
- **AND** Gatekeeper warnings can be bypassed (unsigned builds)

#### Scenario: Windows installation
- **GIVEN** a user downloads the Windows installer
- **WHEN** the user runs the `.msi` or `.exe` installer
- **THEN** the application installs to Program Files
- **AND** a Start Menu shortcut is created
- **AND** the app launches without errors

#### Scenario: Linux installation
- **GIVEN** a user downloads the Linux package
- **WHEN** the user installs the `.deb` or runs the `.AppImage`
- **THEN** the application is available in the system
- **AND** the app launches without errors

### Requirement: Auto-Update

The system SHALL support checking for and installing application updates.

#### Scenario: Check for updates on startup
- **GIVEN** a user launches the application
- **WHEN** a newer version is available on GitHub Releases
- **THEN** a non-intrusive notification informs the user
- **AND** the user can choose to update or dismiss

#### Scenario: Manual update check
- **GIVEN** a user wants to check for updates
- **WHEN** the user selects Help > Check for Updates
- **THEN** the system checks for new versions
- **AND** shows the result (update available or up-to-date)

#### Scenario: Update installation
- **GIVEN** an update is available and user accepts
- **WHEN** the update is downloaded
- **THEN** the user is prompted to restart to apply the update
- **AND** the update is installed on restart

### Requirement: Bundle Size Efficiency

The system SHALL maintain small application bundle sizes by using system WebViews.

#### Scenario: Installer size target
- **GIVEN** a user downloads the desktop application
- **WHEN** the download completes
- **THEN** the installer size is less than 15MB
- **AND** the installed application is less than 50MB

### Requirement: WebGL and Monaco Compatibility

The system SHALL ensure Three.js WebGL and Monaco Editor work correctly in system WebViews.

#### Scenario: 3D rendering in system WebView
- **GIVEN** a floorplan is loaded in the desktop app
- **WHEN** the user views the 3D representation
- **THEN** Three.js renders correctly with WebGL
- **AND** camera controls (orbit, pan, zoom) work as expected

#### Scenario: Monaco Editor functionality
- **GIVEN** a user is editing in the desktop app
- **WHEN** the user types in the editor
- **THEN** syntax highlighting works correctly
- **AND** autocompletion works correctly
- **AND** error markers display correctly
