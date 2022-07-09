export class Renderer {
    constructor(canvasElement) {
        // Initialize the GL context
        this.glContext = canvasElement.getContext('webgl');
        const gl = this.glContext;

        // Only continue if WebGL is available and working
        if(gl === null) {
            console.log('Failed to initialize WebGL');
            return;
        }
    
        // Set clear color to black, fully opaque
        gl.clearColor(0.0, 0.0, 0.0, 1.0);

        // Clear the color buffer with specified clear color
        gl.clear(gl.COLOR_BUFFER_BIT);
    }
}