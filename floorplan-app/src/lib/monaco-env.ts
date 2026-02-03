/**
 * Monaco Editor Environment Configuration
 * 
 * Sets up the web worker configuration for Monaco Editor.
 * Must be imported before any Monaco usage.
 * 
 * For our floorplan DSL editor, we only need basic editor features
 * (syntax highlighting via Monarch tokenizer). We don't need:
 * - TypeScript/JavaScript language services
 * - JSON schema validation
 * - CSS/HTML language features
 * 
 * So we use a minimal worker setup that just satisfies Monaco's requirements.
 */

// Configure Monaco Environment for Vite/SolidStart
if (typeof window !== 'undefined' && !(window as any).MonacoEnvironment) {
  (window as any).MonacoEnvironment = {
    // Return a stub worker for the editor
    // Our DSL uses Monarch tokenizer (synchronous) so we don't need language workers
    getWorker(_workerId: string, _label: string) {
      // Create a minimal blob worker that just responds to messages
      const blob = new Blob(
        [
          `
          self.onmessage = function() {
            // Minimal worker - just acknowledge messages
          };
          `,
        ],
        { type: 'application/javascript' }
      );
      return new Worker(URL.createObjectURL(blob));
    },
  };
}

export {};
