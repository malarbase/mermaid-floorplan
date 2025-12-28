# Floorplan DSL Project Makefile
# ===============================
# Run `make` or `make help` to see available targets

.PHONY: all help install build clean dev test langium langium-watch \
        images images-svg images-png render mcp-server mcp-build rebuild watch

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
	@echo "  OUTPUT_DIR      Output directory (default: trial)"
	@echo "  SCALE           Rendering scale (default: 15)"
	@echo ""
	@echo "Examples:"
	@echo "  make images                    # Generate all images"
	@echo "  make images SCALE=20           # Higher resolution"
	@echo "  make render FILE=my.floorplan  # Render custom file"

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
	npm run langium:generate

langium-watch: ## Watch and regenerate Langium artifacts
	npm run langium:watch

# ===============================
# Image Generation
# ===============================

FLOORPLAN_FILE ?= trial/TriplexVilla.floorplan
OUTPUT_DIR ?= trial
SCALE ?= 15

images: ## Generate SVG + PNG for all floors
	npx tsx scripts/generate-images.ts $(FLOORPLAN_FILE) $(OUTPUT_DIR) --all --scale $(SCALE)

images-svg: ## Generate SVG only
	npx tsx scripts/generate-images.ts $(FLOORPLAN_FILE) $(OUTPUT_DIR) --all --svg-only --scale $(SCALE)

images-png: ## Generate PNG only
	npx tsx scripts/generate-images.ts $(FLOORPLAN_FILE) $(OUTPUT_DIR) --all --png-only --scale $(SCALE)

render: ## Render custom file (FILE=path OUT=dir)
ifdef FILE
	npx tsx scripts/generate-images.ts $(FILE) $(or $(OUT),.) --all --scale $(SCALE)
else
	@echo "Usage: make render FILE=path/to/file.floorplan [OUT=output/dir] [SCALE=15]"
endif

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
