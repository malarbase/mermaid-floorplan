# Floorplan DSL Project Makefile
# ===============================
# Run `make` or `make help` to see available targets

.PHONY: all help install build clean dev test langium langium-watch \
        images images-svg images-png images-annotated render mcp-server mcp-build rebuild watch \
        viewer-dev viewer-build export-json export-images export-svg export-png export-annotated \
        export-3d export-3d-perspective export-dxf

# Default target
all: help

# Auto-generate help from ## comments
help: ## Show this help message
	@echo "Floorplan DSL - Available targets:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Variables:"
	@echo "  FLOORPLAN_FILE  Input file (default: trial/TriplexVilla.floorplan)"
	@echo "  OUTPUT_DIR      Output directory for images (default: trial)"
	@echo "  OUTPUT_FILE     Output file for JSON export (optional)"
	@echo "  SCALE           Rendering scale (default: 15)"
	@echo "  SHOW_AREA       Show room areas (default: false)"
	@echo "  SHOW_DIMS       Show dimension lines (default: false)"
	@echo "  SHOW_SUMMARY    Show floor summary panel (default: false)"
	@echo "  AREA_UNIT       Area unit: sqft or sqm (default: sqft)"
	@echo "  LENGTH_UNIT     Length unit for dimensions: ft, m, etc. (default: ft)"
	@echo ""
	@echo "3D Rendering Variables:"
	@echo "  PROJECTION      3D projection: isometric (default) or perspective"
	@echo "  CAMERA_POS      Camera position for perspective: X,Y,Z (e.g., 50,30,50)"
	@echo "  CAMERA_TARGET   Camera target for perspective: X,Y,Z (e.g., 0,0,0)"
	@echo "  FOV             Field of view in degrees (default: 50)"
	@echo "  WIDTH_3D        3D image width in pixels (default: 1200)"
	@echo "  HEIGHT_3D       3D image height in pixels (default: 900)"
	@echo ""
	@echo "Examples:"
	@echo "  make images                              # Generate all images"
	@echo "  make images SCALE=20                     # Higher resolution"
	@echo "  make images-annotated                    # With all annotations"
	@echo "  make images SHOW_AREA=1 AREA_UNIT=sqm   # Show areas in sqm"
	@echo "  make images SHOW_DIMS=1 LENGTH_UNIT=m   # Show dimensions in meters"
	@echo "  make render FLOORPLAN_FILE=my.floorplan  # Render custom file"
	@echo "  make export-3d                           # Generate 3D PNG (isometric)"
	@echo "  make export-3d-perspective CAMERA_POS=50,30,50  # 3D with custom camera"

# ===============================
# Core Targets
# ===============================

install: ## Install all dependencies
	npm install

build: langium ## Build all packages (language + mcp-server + web app)
	npm run build

clean: ## Clean all build artifacts
	npm run clean
	rm -f trial/*.svg trial/*.png

dev: ## Start Vite development server
	npm run dev

test: ## Run tests
	npm run test

# ===============================
# Langium Grammar
# ===============================

langium: ## Generate Langium grammar artifacts
	echo | npm run langium:generate

langium-watch: ## Watch and regenerate Langium artifacts
	npm run langium:watch

# ===============================
# Image & Data Export
# ===============================

FLOORPLAN_FILE ?= trial/TriplexVilla.floorplan
OUTPUT_DIR ?= $(dir $(FLOORPLAN_FILE))
SCALE ?= 15
SHOW_AREA ?=
SHOW_DIMS ?=
SHOW_SUMMARY ?=
AREA_UNIT ?= sqft
LENGTH_UNIT ?= ft

# Build annotation flags
ANNOTATION_FLAGS := $(if $(SHOW_AREA),--show-area) $(if $(SHOW_DIMS),--show-dims) $(if $(SHOW_SUMMARY),--show-summary)
ifneq ($(AREA_UNIT),sqft)
ANNOTATION_FLAGS += --area-unit $(AREA_UNIT)
endif
ifneq ($(LENGTH_UNIT),ft)
ANNOTATION_FLAGS += --length-unit $(LENGTH_UNIT)
endif

export-images: ## Generate SVG + PNG for all floors and 3D views
	npx tsx scripts/generate-images.ts $(FLOORPLAN_FILE) $(OUTPUT_DIR) --all --scale $(SCALE) $(ANNOTATION_FLAGS)
	npx tsx scripts/generate-3d-images.ts $(FLOORPLAN_FILE) $(OUTPUT_DIR) --all $(3D_FLAGS)
	npx tsx scripts/generate-3d-images.ts $(FLOORPLAN_FILE) $(OUTPUT_DIR) --all $(3D_FLAGS) --projection perspective

export-svg: ## Generate SVG only
	npx tsx scripts/generate-images.ts $(FLOORPLAN_FILE) $(OUTPUT_DIR) --all --svg-only --scale $(SCALE) $(ANNOTATION_FLAGS)

export-png: ## Generate PNG only
	npx tsx scripts/generate-images.ts $(FLOORPLAN_FILE) $(OUTPUT_DIR) --all --png-only --scale $(SCALE) $(ANNOTATION_FLAGS)

export-annotated: ## Generate images with all annotations (area, dims, summary)
	npx tsx scripts/generate-images.ts $(FLOORPLAN_FILE) $(OUTPUT_DIR) --all --scale $(SCALE) --show-area --show-dims --show-summary --area-unit $(AREA_UNIT) --length-unit $(LENGTH_UNIT)

export-json: ## Export floorplan to JSON (FLOORPLAN_FILE=path OUTPUT_FILE=path)
ifdef FLOORPLAN_FILE
	npx tsx scripts/export-json.ts $(FLOORPLAN_FILE) $(OUTPUT_FILE)
else
	@echo "Usage: make export-json FLOORPLAN_FILE=path/to/file.floorplan [OUTPUT_FILE=output.json]"
endif

export-dxf: ## Export floorplan to DXF (AutoCAD format)
ifdef FLOORPLAN_FILE
	npx tsx scripts/export-dxf.ts $(FLOORPLAN_FILE) $(OUTPUT_DIR) $(DXF_FLAGS)
else
	@echo "Usage: make export-dxf FLOORPLAN_FILE=path/to/file.floorplan [OUTPUT_DIR=dir]"
	@echo "Options: DXF_FLAGS='--dimensions --no-labels --floor Name --all-in-one'"
endif

# Aliases for backward compatibility
images: export-images
images-svg: export-svg
images-png: export-png
images-annotated: export-annotated

# ===============================
# 3D Rendering
# ===============================

PROJECTION ?= isometric
CAMERA_POS ?=
CAMERA_TARGET ?=
FOV ?= 50
WIDTH_3D ?= 1200
HEIGHT_3D ?= 900

# Build 3D camera flags
3D_FLAGS := --projection $(PROJECTION) --width $(WIDTH_3D) --height $(HEIGHT_3D) --fov $(FOV)
ifneq ($(CAMERA_POS),)
3D_FLAGS += --camera-pos $(CAMERA_POS)
endif
ifneq ($(CAMERA_TARGET),)
3D_FLAGS += --camera-target $(CAMERA_TARGET)
endif

export-3d: ## Generate 3D PNG (isometric view)
	npx tsx scripts/generate-3d-images.ts $(FLOORPLAN_FILE) $(OUTPUT_DIR) --all $(3D_FLAGS)

export-3d-perspective: ## Generate 3D PNG (perspective view)
	npx tsx scripts/generate-3d-images.ts $(FLOORPLAN_FILE) $(OUTPUT_DIR) --all $(3D_FLAGS) --projection perspective

# ===============================
# 3D Viewer
# ===============================

viewer-dev: ## Start the 3D viewer dev server
	npm run --workspace floorplan-viewer dev

viewer-build: ## Build the 3D viewer
	npm run --workspace floorplan-viewer build

# ===============================
# Interactive Editor
# ===============================

editor-dev: ## Start the interactive editor dev server
	npm run --workspace floorplan-editor dev

editor-build: ## Build the interactive editor
	npm run --workspace floorplan-editor build

# ===============================
# MCP Server
# ===============================

mcp-build: ## Build the MCP server package
	npm run --workspace floorplan-mcp-server build

mcp-server: mcp-build ## Start the MCP server
	npm run --workspace floorplan-mcp-server start

# ===============================
# Development Shortcuts
# ===============================

rebuild: clean build images ## Full rebuild and regenerate images

watch: ## Start langium watch + vite dev server
	@echo "Starting langium watch in background..."
	npm run langium:watch &
	npm run dev

# ===============================
# Docker Development
# ===============================

docker-build: ## Build Docker images
	docker compose build

docker-up: ## Start all services in Docker
	docker compose up -d

docker-down: ## Stop all Docker services
	docker compose down

docker-logs: ## View Docker logs
	docker compose logs -f

docker-shell: ## Open shell in app container
	docker compose exec app sh

docker-clean: ## Remove Docker containers, volumes, and images
	docker compose down -v
	docker rmi mermaid-floorplan-app 2>/dev/null || true

docker-dev: ## Start development with Docker (interactive logs)
	docker compose up

docker-restart: ## Restart Docker services
	docker compose restart

# ===============================
# SolidStart App
# ===============================

app-dev: ## Start floorplan-app dev server (local)
	npm run --workspace floorplan-app dev

app-build: ## Build floorplan-app for production
	npm run --workspace floorplan-app build

app-start: ## Start floorplan-app production server
	npm run --workspace floorplan-app start

app-test: ## Run floorplan-app tests
	npm run --workspace floorplan-app test

# ===============================
# Mock Auth Setup
# ===============================

setup-mock-auth: ## Set up mock authentication for development
	@./scripts/setup-mock-auth.sh
