export class Camera {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.angle = (Math.PI * 3) / 4;
        this.scale = .2;

        this.preCosX = 1;
        this.preSinX = 0;
        this.preCosZ = 1;
        this.preSinZ = 0;
        this.visibleWalls = [];
    }

    precomputeRenderingVars() {
        let canvasAspect = (this.canvasWidth / this.canvasHeight);
        this.preCosX = Math.cos(this.angle) * this.scale / canvasAspect;
        this.preSinX = Math.sin(this.angle) * this.scale / canvasAspect;
        this.preCosZ = Math.cos(this.angle) * this.scale;
        this.preSinZ = Math.sin(this.angle) * this.scale;
    
        let xTest = this.transformPoint({x: 1, y: 0, z: 0}).x > 0;
        let zTest = this.transformPoint({x: 0, y: 0, z: 1}).x > 0;
    
        this.visibleWalls = [];
        this.visibleWalls.push(zTest ? 'x0' : 'x1');
        this.visibleWalls.push(xTest ? 'z1' : 'z0');
    }

    transformPoint(point) {
        let relativePoint = {
            x: point.x - this.x,
            y: point.y - this.y,
            z: point.z - this.z,
        };
    
        let rotatedPoint = {
            x: (relativePoint.x * this.preCosX) + (relativePoint.z * this.preSinX),
            y: relativePoint.y * this.scale,
            z: (relativePoint.z * this.preCosZ) - (relativePoint.x * this.preSinZ),
        };
    
        let transformedPoint = {
            x: rotatedPoint.x,
            y: rotatedPoint.y - (rotatedPoint.z * .5),
            z: rotatedPoint.z * .1,
        };
    
        return transformedPoint;
    }
}