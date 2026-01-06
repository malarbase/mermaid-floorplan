/**
 * 2D Overlay Manager - Handles the 2D SVG overlay rendering and interactions
 */
import type { LangiumDocument } from 'langium';
import type { Floorplan } from 'floorplans-language';
import { render as render2D, type RenderOptions } from 'floorplans-language';
import type { ViewerTheme } from 'floorplan-3d-core';
import type { JsonExport } from 'floorplan-3d-core';

export interface Overlay2DCallbacks {
    getCurrentTheme: () => ViewerTheme;
    getFloorplanData: () => JsonExport | null;
    getVisibleFloorIds: () => string[];
}

export class Overlay2DManager {
    private overlayVisible: boolean = false;
    private overlayOpacity: number = 0.60;
    private currentLangiumDoc: LangiumDocument<Floorplan> | null = null;
    
    constructor(private callbacks: Overlay2DCallbacks) {
        this.setupDrag();
    }
    
    /**
     * Setup UI control event listeners
     */
    public setupControls(): void {
        const show2dOverlayToggle = document.getElementById('show-2d-overlay') as HTMLInputElement;
        show2dOverlayToggle?.addEventListener('change', (e) => {
            this.overlayVisible = (e.target as HTMLInputElement).checked;
            this.updateVisibility();
        });
        
        const overlayOpacitySlider = document.getElementById('overlay-opacity') as HTMLInputElement;
        overlayOpacitySlider?.addEventListener('input', (e) => {
            const val = parseInt((e.target as HTMLInputElement).value);
            this.overlayOpacity = val / 100;
            this.updateOpacity();
            const valueEl = document.getElementById('overlay-opacity-value');
            if (valueEl) valueEl.textContent = `${val}%`;
        });
        
        // 2D Overlay close button
        const overlayCloseBtn = document.getElementById('overlay-2d-close');
        overlayCloseBtn?.addEventListener('click', (e) => {
            e.stopPropagation(); // Don't trigger drag
            this.overlayVisible = false;
            this.updateVisibility();
            // Update the toggle checkbox
            if (show2dOverlayToggle) {
                show2dOverlayToggle.checked = false;
            }
        });
    }
    
    /**
     * Store the Langium document for 2D rendering
     */
    public setLangiumDocument(doc: LangiumDocument<Floorplan> | null): void {
        this.currentLangiumDoc = doc;
        this.render();
    }
    
    /**
     * Get the current Langium document
     */
    public getLangiumDocument(): LangiumDocument<Floorplan> | null {
        return this.currentLangiumDoc;
    }
    
    /**
     * Update the 2D overlay visibility
     */
    public updateVisibility(): void {
        const overlay = document.getElementById('overlay-2d');
        if (overlay) {
            overlay.classList.toggle('visible', this.overlayVisible);
            // Apply opacity when becoming visible
            if (this.overlayVisible) {
                this.updateOpacity();
            }
        }
    }
    
    /**
     * Update the 2D overlay opacity
     */
    public updateOpacity(): void {
        const overlay = document.getElementById('overlay-2d');
        if (overlay) {
            overlay.style.opacity = String(this.overlayOpacity);
        }
    }
    
    /**
     * Render the 2D SVG overlay
     */
    public render(): void {
        const contentEl = document.getElementById('overlay-2d-content');
        const emptyEl = document.getElementById('overlay-2d-empty');
        
        if (!contentEl) return;
        
        const floorplanData = this.callbacks.getFloorplanData();
        
        // If no Langium document, show empty state
        if (!this.currentLangiumDoc) {
            if (emptyEl) {
                emptyEl.style.display = 'block';
                emptyEl.textContent = floorplanData ? 'JSON files don\'t support 2D overlay' : 'Load a floorplan';
            }
            // Clear any existing SVG
            const existingSvg = contentEl.querySelector('svg');
            if (existingSvg) {
                existingSvg.remove();
            }
            return;
        }
        
        // Hide empty state
        if (emptyEl) {
            emptyEl.style.display = 'none';
        }
        
        try {
            const currentTheme = this.callbacks.getCurrentTheme();
            const visibleFloorIds = this.callbacks.getVisibleFloorIds();
            
            // Render 2D SVG with only visible floors
            const renderOptions: RenderOptions = {
                visibleFloors: visibleFloorIds,
                includeStyles: true,
                theme: currentTheme === 'dark' ? { 
                    floorBackground: '#2d2d2d',
                    floorBorder: '#888',
                    wallColor: '#ccc',
                    textColor: '#eee'
                } : undefined,
            };
            
            const svg = render2D(this.currentLangiumDoc, renderOptions);
            
            // Clear existing content and add new SVG
            const existingSvg = contentEl.querySelector('svg');
            if (existingSvg) {
                existingSvg.remove();
            }
            
            // Parse and insert SVG
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
            const svgElement = svgDoc.querySelector('svg');
            
            if (svgElement) {
                // Ensure SVG scales properly
                svgElement.setAttribute('width', '100%');
                svgElement.setAttribute('height', '100%');
                svgElement.style.display = 'block';
                contentEl.appendChild(svgElement);
            }
        } catch (err) {
            console.error('Failed to render 2D overlay:', err);
            if (emptyEl) {
                emptyEl.style.display = 'block';
                emptyEl.textContent = 'Failed to render 2D';
            }
        }
    }
    
    /**
     * Setup drag and resize functionality for the 2D overlay
     */
    private setupDrag(): void {
        const overlay = document.getElementById('overlay-2d');
        const header = document.getElementById('overlay-2d-header');
        const resizeHandle = document.getElementById('overlay-2d-resize');
        
        if (!overlay || !header) return;
        
        // ===== DRAG FUNCTIONALITY =====
        let isDragging = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let dragStartLeft = 0;
        let dragStartBottom = 0;
        
        const onDragStart = (e: MouseEvent) => {
            isDragging = true;
            overlay.classList.add('dragging');
            
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            
            const rect = overlay.getBoundingClientRect();
            dragStartLeft = rect.left;
            dragStartBottom = window.innerHeight - rect.bottom;
            
            e.preventDefault();
        };
        
        const onDragMove = (e: MouseEvent) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - dragStartX;
            const deltaY = e.clientY - dragStartY;
            
            let newLeft = dragStartLeft + deltaX;
            let newBottom = dragStartBottom - deltaY;
            
            const rect = overlay.getBoundingClientRect();
            const maxLeft = window.innerWidth - rect.width - 10;
            const maxBottom = window.innerHeight - rect.height - 10;
            
            newLeft = Math.max(10, Math.min(newLeft, maxLeft));
            newBottom = Math.max(10, Math.min(newBottom, maxBottom));
            
            overlay.style.left = `${newLeft}px`;
            overlay.style.bottom = `${newBottom}px`;
            overlay.style.right = 'auto';
            overlay.style.top = 'auto';
        };
        
        const onDragEnd = () => {
            if (isDragging) {
                isDragging = false;
                overlay.classList.remove('dragging');
            }
        };
        
        header.addEventListener('mousedown', onDragStart);
        
        // ===== RESIZE FUNCTIONALITY =====
        let isResizing = false;
        let resizeStartX = 0;
        let resizeStartY = 0;
        let resizeStartWidth = 0;
        let resizeStartHeight = 0;
        let resizeStartBottom = 0;
        
        const onResizeStart = (e: MouseEvent) => {
            isResizing = true;
            overlay.classList.add('dragging');
            
            resizeStartX = e.clientX;
            resizeStartY = e.clientY;
            resizeStartWidth = overlay.offsetWidth;
            resizeStartHeight = overlay.offsetHeight;
            
            // Get current bottom position
            const rect = overlay.getBoundingClientRect();
            resizeStartBottom = window.innerHeight - rect.bottom;
            
            e.preventDefault();
            e.stopPropagation();
        };
        
        const onResizeMove = (e: MouseEvent) => {
            if (!isResizing) return;
            
            const deltaX = e.clientX - resizeStartX;
            const deltaY = e.clientY - resizeStartY;
            
            // Calculate new size (resize from bottom-right corner)
            let newWidth = resizeStartWidth + deltaX;
            let newHeight = resizeStartHeight + deltaY;
            
            // Constrain to min/max sizes
            newWidth = Math.max(200, Math.min(newWidth, window.innerWidth - 20));
            newHeight = Math.max(150, Math.min(newHeight, window.innerHeight - 20));
            
            // Adjust bottom position so the bottom edge follows the mouse
            // deltaY positive = mouse moved down = bottom should decrease
            let newBottom = resizeStartBottom - deltaY;
            newBottom = Math.max(10, newBottom);
            
            overlay.style.width = `${newWidth}px`;
            overlay.style.height = `${newHeight}px`;
            overlay.style.bottom = `${newBottom}px`;
        };
        
        const onResizeEnd = () => {
            if (isResizing) {
                isResizing = false;
                overlay.classList.remove('dragging');
            }
        };
        
        resizeHandle?.addEventListener('mousedown', onResizeStart);
        
        // ===== SHARED MOUSE/TOUCH HANDLERS =====
        document.addEventListener('mousemove', (e) => {
            onDragMove(e);
            onResizeMove(e);
        });
        
        document.addEventListener('mouseup', () => {
            onDragEnd();
            onResizeEnd();
        });
        
        // Touch events for drag
        header.addEventListener('touchstart', (e: TouchEvent) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                onDragStart({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => e.preventDefault() } as MouseEvent);
            }
        }, { passive: false });
        
        // Touch events for resize
        resizeHandle?.addEventListener('touchstart', (e: TouchEvent) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                onResizeStart({ 
                    clientX: touch.clientX, 
                    clientY: touch.clientY, 
                    preventDefault: () => e.preventDefault(),
                    stopPropagation: () => e.stopPropagation()
                } as MouseEvent);
            }
        }, { passive: false });
        
        document.addEventListener('touchmove', (e: TouchEvent) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                if (isDragging) {
                    onDragMove({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
                }
                if (isResizing) {
                    onResizeMove({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
                }
            }
        }, { passive: true });
        
        document.addEventListener('touchend', () => {
            onDragEnd();
            onResizeEnd();
        });
    }
}

