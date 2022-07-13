import { newElement } from '../lib/dom-util.js';

export class Renderer {
    constructor(gameConsole) {
        // Initialize the GL context
        this.canvas = newElement('canvas', {width: 800, height: 600});
        this.glContext = this.canvas.getContext('webgl');
        this.gameConsole = gameConsole;
        this.shaderPrograms = {};
        const gl = this.glContext;

        // Only continue if WebGL is available and working
        if(gl === null) {
            this.error('Failed to initialize WebGL');
            return;
        }

        this.info('Successfully initialized WebGL context.');
    
        // Set clear color to black, fully opaque
        gl.clearColor(0.0, 0.0, 0.0, 1.0);

        // Clear the color buffer with specified clear color
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    init() {
        return new Promise((resolve, reject) => {
            this.downloadShaders().then(shaderCollection => {
                try {
                    for(const shaderId of Object.keys(shaderCollection)) {
                        let shaderCode = shaderCollection[shaderId];
                        this.processShader(shaderId, shaderCode);
                    }
                    
                    resolve();
                } catch(error) {
                    reject(error);
                }
            });
        });
    }

    render() {
        try {
            this.drawScene(this.shaderPrograms['basic'], this.initBuffers());
        } catch(error) {
            console.log({error});
            this.error(error);
        }
    }

    processShader(shaderId, shaderCode) {
        let gl = this.glContext;
        let shaderLines = shaderCode.split('\n');
        let attributes = [];
        let uniforms = [];
        let shaderTarget = null;
        let shaderLinesByType = {
            vert: [],
            frag: []
        };

        for(const line of shaderLines) {
            let tokens = line.split(' ');
            let varName = tokens[2];
            let type = tokens[1];

            if(tokens[2] != null) {
                varName = tokens[2].substring(0, tokens[2].indexOf(';'));

                if(tokens[0] == 'attribute')
                    attributes.push({name: varName, type: type});

                if(tokens[0] == 'uniform')
                    uniforms.push({name: varName, type: type});
            }

            if(line.startsWith('@vert')) {
                shaderTarget = 'vert';
            } else if(line.startsWith('@frag')) {
                shaderTarget = 'frag';
            } else {
                if(shaderTarget == null)
                    continue;

                shaderLinesByType[shaderTarget].push(line);
            }
        }

        let vertCode = shaderLinesByType.vert.join('\n');
        let fragCode = shaderLinesByType.frag.join('\n');
        let program = this.initShaderProgram(vertCode, fragCode, shaderId);
        let programInfo = {
            program: program,
            id: shaderId,
            attributes: {},
            uniforms: {},
        };

        for(const attribute of attributes) {
            programInfo.attributes[attribute.name] = {
                location: gl.getAttribLocation(program, attribute.name),
                type: attribute.type
            };
        }

        for(const uniform of uniforms) {
            programInfo.uniforms[uniform.name] = {
                location: gl.getUniformLocation(program, uniform.name),
                type: uniform.type
            };
        }

        this.shaderPrograms[shaderId] = programInfo;
        this.info('Processed shader: ' + shaderId);
    }

    loadShader(type, source, typeName, shaderId) {
        let gl = this.glContext;
        const shader = gl.createShader(type);
      
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
      
        // See if it compiled successfully
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            let errorMessage = `Error compiling shader ${shaderId}.${typeName} ` + gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw Error(errorMessage);
        }
      
        return shader;
    }

    initShaderProgram(vsSource, fsSource, shaderId) {
        let gl = this.glContext;
        const vertexShader = this.loadShader(gl.VERTEX_SHADER, vsSource, 'vert', shaderId);
        const fragmentShader = this.loadShader(gl.FRAGMENT_SHADER, fsSource, 'frag', shaderId);
      
        // Create the shader program
        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
      
        // If creating the shader program failed, alert
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            throw Error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        }
      
        return shaderProgram;
    }

    downloadShaders() {
        return fetch('/shaders').then(response => response.json());
    }

    getCanvas() {
        return this.canvas;
    }

    initBuffers() {
        let gl = this.glContext;

        // Create a buffer for the square's positions.
        const positionBuffer = gl.createBuffer();
      
        // Select the positionBuffer as the one to apply buffer
        // operations to from here out.
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      
        // Now create an array of positions for the square.
        const positions = [
           0.5,  0.5,
          -0.5,  0.5,
           0.5, -0.5,
          -0.5, -0.5,
        ];
      
        // Now pass the list of positions into WebGL to build the
        // shape. We do this by creating a Float32Array from the
        // JavaScript array, then use it to fill the current buffer.
        gl.bufferData(gl.ARRAY_BUFFER,
                      new Float32Array(positions),
                      gl.STATIC_DRAW);
      
        return {position: positionBuffer};
    }

    drawScene(programInfo, buffers) {
        let gl = this.glContext;
        gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
        gl.clearDepth(1.0);                 // Clear everything
        gl.enable(gl.DEPTH_TEST);           // Enable depth testing
        gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
      
        // Clear the canvas before we start drawing on it.
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      
        // Tell WebGL how to pull out the positions from the position
        // buffer into the vertexPosition attribute.
        {
          const numComponents = 2;  // pull out 2 values per iteration
          const type = gl.FLOAT;    // the data in the buffer is 32bit floats
          const normalize = false;  // don't normalize
          const stride = 0;         // how many bytes to get from one set of values to the next
                                    // 0 = use type and numComponents above
          const offset = 0;         // how many bytes inside the buffer to start from

        console.log({programInfo});
        console.log({buffers});

          gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
          gl.vertexAttribPointer(
              programInfo.attributes.aVertexPosition.location,
              numComponents,
              type,
              normalize,
              stride,
              offset);

          gl.enableVertexAttribArray(
              programInfo.attributes.aVertexPosition.location);
        }
      
        // Tell WebGL to use our program when drawing
        gl.useProgram(programInfo.program);        
        this.populateUniform('basic', 'uColor', [0, .5, 1, 1]);
      
        {
            const offset = 0;
            const vertexCount = 4;
            gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
        }
    }
    
    //FIXME: Find a better name for this
    populateUniform(programName, uniformName, arr) {
        const uniformFuncForType = {
            'vec2': 'uniform2fv',
            'vec3': 'uniform3fv',
            'vec4': 'uniform4fv',
        };

        let gl = this.glContext;
        let programInfo = this.shaderPrograms[programName];
        let uniformData = programInfo.uniforms[uniformName];
        let type = uniformData.type;
        let uniformFuncName = uniformFuncForType[type];

        if(uniformFuncName == null)
            throw Error(`populateUniform(): No function for type '${type}'`);

        gl[uniformFuncName](uniformData.location, new Float32Array(arr));
    }

    info(text) {
        //this.gameConsole.info(`(Renderer) ${text}`);
        this.gameConsole.info(text);
    }

    warning(text) {
        //this.gameConsole.warning(`(Renderer) ${text}`);
        this.gameConsole.warning(text);
    }

    error(text) {
        //this.gameConsole.error(`(Renderer) ${text}`);
        this.gameConsole.error(text);
    }
}