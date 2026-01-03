/**
 * Type declarations for the 'gl' (headless-gl) package
 * This provides a headless WebGL context for server-side rendering
 */

declare module 'gl' {
  /**
   * STACKGL extension for destroying WebGL context
   */
  interface STACKGLDestroyContext {
    destroy(): void;
  }

  /**
   * Minimal WebGL rendering context interface
   * Includes only the methods we use for pixel extraction
   */
  interface HeadlessWebGLContext {
    readonly RGBA: number;
    readonly UNSIGNED_BYTE: number;
    
    /**
     * Read pixels from the framebuffer
     */
    readPixels(
      x: number,
      y: number,
      width: number,
      height: number,
      format: number,
      type: number,
      pixels: ArrayBufferView
    ): void;
    
    /**
     * Get a WebGL extension
     */
    getExtension(name: 'STACKGL_destroy_context'): STACKGLDestroyContext | null;
    getExtension(name: string): unknown;
  }

  interface GLOptions {
    preserveDrawingBuffer?: boolean;
  }

  /**
   * Create a headless WebGL context
   */
  function createGL(width: number, height: number, options?: GLOptions): HeadlessWebGLContext;
  
  export = createGL;
}

