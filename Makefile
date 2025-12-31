# Floorplan DSL Project Makefile
# ===============================
# Run `make` or `make help` to see available targets

.PHONY: all help install build clean dev test langium langium-watch \
        images images-svg images-png images-annotated render mcp-server mcp-build rebuild watch \
        viewer-dev viewer-build export-json export-images export-svg export-png export-annotated

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
	@echo ""
	@echo "Examples:"
	@echo "  make images                              # Generate all images"
	@echo "  make images SCALE=20                     # Higher resolution"
	@echo "  make images-annotated                    # With all annotations"
	@echo "  make images SHOW_AREA=1 AREA_UNIT=sqm   # Show areas in sqm"
	@echo "  make render FLOORPLAN_FILE=my.floorplan  # Render custom file"

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
	yes | npm run langium:generate

langium-watch: ## Watch and regenerate Langium artifacts
	npm run langium:watch

# ===============================
# Image & Data Export
# ===============================

FLOORPLAN_FILE ?= trial/TriplexVilla.floorplan
OUTPUT_DIR ?= trial
SCALE ?= 15
SHOW_AREA ?=
SHOW_DIMS ?=
SHOW_SUMMARY ?=
AREA_UNIT ?= sqft

# Build annotation flags
ANNOTATION_FLAGS := $(if $(SHOW_AREA),--show-area) $(if $(SHOW_DIMS),--show-dims) $(if $(SHOW_SUMMARY),--show-summary)
ifneq ($(AREA_UNIT),sqft)
ANNOTATION_FLAGS += --area-unit $(AREA_UNIT)
endif

export-images: ## Generate SVG + PNG for all floors
	npx tsx scripts/generate-images.ts $(FLOORPLAN_FILE) $(OUTPUT_DIR) --all --scale $(SCALE) $(ANNOTATION_FLAGS)

export-svg: ## Generate SVG only
	npx tsx scripts/generate-images.ts $(FLOORPLAN_FILE) $(OUTPUT_DIR) --all --svg-only --scale $(SCALE) $(ANNOTATION_FLAGS)

export-png: ## Generate PNG only
	npx tsx scripts/generate-images.ts $(FLOORPLAN_FILE) $(OUTPUT_DIR) --all --png-only --scale $(SCALE) $(ANNOTATION_FLAGS)

export-annotated: ## Generate images with all annotations (area, dims, summary)
	npx tsx scripts/generate-images.ts $(FLOORPLAN_FILE) $(OUTPUT_DIR) --all --scale $(SCALE) --show-area --show-dims --show-summary --area-unit $(AREA_UNIT)

export-json: ## Export floorplan to JSON (FLOORPLAN_FILE=path OUTPUT_FILE=path)
ifdef FLOORPLAN_FILE
	npx tsx scripts/export-json.ts $(FLOORPLAN_FILE) $(OUTPUT_FILE)
else
	@echo "Usage: make export-json FLOORPLAN_FILE=path/to/file.floorplan [OUTPUT_FILE=output.json]"
endif

# Aliases for backward compatibility
images: export-images
images-svg: export-svg
images-png: export-png
images-annotated: export-annotated

# ===============================
# 3D Viewer
# ===============================

viewer-dev: ## Start the 3D viewer dev server
	npm run --workspace floorplans-viewer dev

viewer-build: ## Build the 3D viewer
	npm run --workspace floorplans-viewer build

# ===============================
# MCP Server
# ===============================

mcp-build: ## Build the MCP server package
	npm run --workspace mcp-server build

mcp-server: mcp-build ## Start the MCP server
	npm run --workspace mcp-server start

# ===============================
# Development Shortcuts
# ===============================

rebuild: clean build images ## Full rebuild and regenerate images

watch: ## Start langium watch + vite dev server
	@echo "Starting langium watch in background..."
	npm run langium:watch &
	npm run dev
