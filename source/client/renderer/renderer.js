import { newElement } from '../lib/dom-util.js';

//Create an 'attribute' class.
export var gl = null;

class Buffer {
    constructor(drawType) {
        this.id = gl.createBuffer();
        this.drawType = drawType ?? gl.DYNAMIC_DRAW;
    }

    bind() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.id);
    }

    bufferData(data) {     
        this.bind();          
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), this.drawType);
    }
}

function getAttributeLength(attributeData) {
    const sizeTable = {
        'float': 1,
        'vec2': 2,
        'vec3': 3,
        'vec4': 4,
    };

    let size = sizeTable[attributeData.type];

    if(size == null)
        throw Error(`getAttributeLength(): Unknown attribute type '${attributeData.type}'`);

    return size;
}

class RenderingStep {
    constructor(programInfo, drawArrayType) {
        this.buffer = new Buffer();
        this.programInfo = programInfo;
        this.elements = [];
        this.pendingUniforms = {};
        this.drawArrayType = drawArrayType ?? gl.TRIANGLES;
    }

    addElement(element) {
        if(element.length != this.programInfo.totalAttributeLength)
            throw Error(`Expected element length ${this.programInfo.totalAttributeLength}, got ${element.length}`);

        this.elements.push(element);
    }

    addElements(elements) {
        for(const element of elements)
            this.addElement(element);
    }

    bufferElements() {
        this.buffer.bufferData(this.elements.flat());
    }

    execute() {
        this.bufferElements();
        gl.useProgram(this.programInfo.program);
        this.enableAttributes();

        for(const uniformName of Object.keys(this.pendingUniforms))
            this.populateUniform(uniformName, this.pendingUniforms[uniformName]);

        gl.drawArrays(this.drawArrayType, 0, this.elements.length);
        
        this.elements = [];
        this.pendingUniforms = {};
    }

    enableAttributes() {
        //Enable the attributes.
        this.buffer.bind();
        let offset = 0;

        for(const attribute of Object.values(this.programInfo.attributes).sort((a,b) => a.location - b.location)) {
            let location = attribute.location;
            let attributeLength = getAttributeLength(attribute);

            gl.vertexAttribPointer(
                location,
                attributeLength,
                gl.FLOAT,
                false,  //Don't normalize.
                this.programInfo.totalAttributeLength * 4,  //Use totalAttributeLength for stride,
                offset * 4
            );

            gl.enableVertexAttribArray(location);
            offset += attributeLength;
        }
    }

    populateUniform(uniformName, data) {
        const uniformFuncForType = {
            'vec2': 'uniform2fv',
            'vec3': 'uniform3fv',
            'vec4': 'uniform4fv',
        };

        let uniformData = this.programInfo.uniforms[uniformName];
        let type = uniformData.type;
        let uniformFuncName = uniformFuncForType[type];

        if(uniformFuncName == null)
            throw Error(`populateUniform(): No function for type '${type}'`);

        gl[uniformFuncName](uniformData.location, new Float32Array(data));
    }

}

export class Renderer {
    constructor(gameConsole, width, height) {
        // Initialize the GL context
        this.canvas = newElement('canvas', {width: 800, height: 600});
        gl = this.canvas.getContext('webgl');
        this.gameConsole = gameConsole;
        this.shaderPrograms = {};
        this.renderingSteps = [];

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
            this.drawScene();
        } catch(error) {
            console.log({error});
            this.error(error);
        }
    }

    processShader(shaderId, shaderCode) {
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

        programInfo.totalAttributeLength = this.getTotalAttributeLength(programInfo);

        this.shaderPrograms[shaderId] = programInfo;
        this.info('Processed shader: ' + shaderId);
    }

    loadShader(type, source, typeName, shaderId) {
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

    getTotalAttributeLength(programInfo) {
        return Object.values(programInfo.attributes)
            .map(attr => getAttributeLength(attr))
            .reduce((a,b) => a + b);
    }

    drawScene() {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
        gl.clearDepth(0.0);                 // Clear everything
        gl.enable(gl.DEPTH_TEST);           // Enable depth testing
        gl.depthFunc(gl.GREATER);            // Near things obscure far things
      
        // Clear the canvas before we start drawing on it.
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        for(const step of this.renderingSteps) {
            step.execute();
        }
    }

    addRenderingStep(programName) {
        let newStep = new RenderingStep(this.shaderPrograms[programName]);
        this.renderingSteps.push(newStep);
        return newStep;
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