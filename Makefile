# Floorplan DSL Project — Makefile Compatibility Shim
# ===================================================
# DEPRECATED: This Makefile is a compatibility shim during the migration to mise.
# Please use `mise run <task>` instead. Run `mise tasks` to see all available tasks.
# ===================================================

$(warning Makefile is deprecated. Use 'mise run <task>' instead. See 'mise tasks'.)

.PHONY: all help install build clean dev test langium langium-watch \
        images images-svg images-png images-annotated render mcp-server mcp-build rebuild watch \
        viewer-dev viewer-build export-json export-images export-svg export-png export-annotated \
        export-3d export-3d-perspective export-dxf \
        editor-dev editor-build \
        app-dev app-build app-start app-test \
        docker-build docker-up docker-down docker-logs docker-shell docker-clean docker-dev \
        docker-restart docker-reset-deps docker-convex-deploy docker-convex-backfill \
        docker-convex-admin-key \
        admin-setup admin-dev admin-test admin-reset admin-help \
        setup-mock-auth \
        admin-cli admin-config admin-setup-domain admin-sync-env admin-deploy-check

# Default target
all: help

help: ## Show this help message
	@echo "Floorplan DSL - Available targets (DEPRECATED: use 'mise tasks' instead):"
	@echo ""
	@mise run help

# ===============================
# Core Targets
# ===============================

install: ## Install all dependencies
	mise run core:install

build: ## Build all packages
	mise run core:build

clean: ## Clean all build artifacts
	mise run core:clean

dev: ## Start Vite development server
	mise run core:dev

test: ## Run tests
	mise run core:test

langium: ## Generate Langium grammar artifacts
	mise run core:langium

langium-watch: ## Watch and regenerate Langium artifacts
	mise run core:langium-watch

# ===============================
# Image & Data Export
# ===============================

export-images: ## Generate SVG + PNG for all floors and 3D views
	mise run export:images

export-svg: ## Generate SVG only
	mise run export:svg

export-png: ## Generate PNG only
	mise run export:png

export-annotated: ## Generate images with all annotations
	mise run export:annotated

export-json: ## Export floorplan to JSON
	mise run export:json

export-dxf: ## Export floorplan to DXF
	mise run export:dxf

# Aliases for backward compatibility
images: export-images
images-svg: export-svg
images-png: export-png
images-annotated: export-annotated

# ===============================
# 3D Rendering
# ===============================

export-3d: ## Generate 3D PNG (isometric view)
	mise run 3d:export

export-3d-perspective: ## Generate 3D PNG (perspective view)
	mise run 3d:perspective

# ===============================
# 3D Viewer
# ===============================

viewer-dev: ## Start the 3D viewer dev server
	mise run ws:viewer-dev

viewer-build: ## Build the 3D viewer
	mise run ws:viewer-build

# ===============================
# Interactive Editor
# ===============================

editor-dev: ## Start the interactive editor dev server
	mise run ws:editor-dev

editor-build: ## Build the interactive editor
	mise run ws:editor-build

# ===============================
# MCP Server
# ===============================

mcp-build: ## Build the MCP server package
	mise run ws:mcp-build

mcp-server: ## Start the MCP server
	mise run ws:mcp-server

# ===============================
# Development Shortcuts
# ===============================

rebuild: ## Full rebuild and regenerate images
	mise run util:rebuild

watch: ## Start langium watch + vite dev server
	mise run util:watch

# ===============================
# Docker Development
# ===============================

docker-build: ## Build Docker images
	mise run docker:build

docker-up: ## Start all services in Docker
	mise run docker:up

docker-down: ## Stop all Docker services
	mise run docker:down

docker-logs: ## View Docker logs
	mise run docker:logs

docker-shell: ## Open shell in app container
	mise run docker:shell

docker-clean: ## Remove Docker containers, volumes, and images
	mise run docker:clean

docker-dev: ## Start development with Docker (interactive logs)
	mise run docker:dev

docker-restart: ## Restart Docker services
	mise run docker:restart

docker-reset-deps: ## Reset Docker node_modules volumes
	mise run docker:reset-deps

docker-convex-deploy: ## Deploy Convex functions to self-hosted backend
	mise run docker:convex-deploy

docker-convex-backfill: ## Run Convex backfill mutations
	mise run docker:convex-backfill

docker-convex-admin-key: ## Print the Convex admin key
	mise run docker:convex-admin-key

# ===============================
# SolidStart App
# ===============================

app-dev: ## Start floorplan-app dev server (local)
	mise run ws:app-dev

app-build: ## Build floorplan-app for production
	mise run ws:app-build

app-start: ## Start floorplan-app production server
	mise run ws:app-start

app-test: ## Run floorplan-app tests
	mise run ws:app-test

# ===============================
# Mock Auth Setup
# ===============================

setup-mock-auth: ## Set up mock authentication for development
	mise run util:setup-mock-auth

# ===============================
# Admin Panel Testing
# ===============================

admin-setup: ## Configure admin testing environment
	mise run admin:setup

admin-dev: ## Start app with admin user pre-configured
	mise run admin:dev

admin-test: ## Run Playwright E2E tests for admin panel
	mise run admin:test

admin-reset: ## Reset admin state
	mise run admin:reset

admin-help: ## Show admin testing help
	mise run admin:help

# ===============================
# Admin CLI
# ===============================

admin-cli: ## Run admin CLI (pass args via ADMIN_ARGS)
	mise run admin:cli

admin-config: ## Show current configuration
	mise run admin:config

admin-setup-domain: ## Interactive domain setup
	mise run admin:setup-domain

admin-sync-env: ## Sync env vars to Convex
	mise run admin:sync-env

admin-deploy-check: ## Pre-deploy checklist
	mise run admin:deploy-check
