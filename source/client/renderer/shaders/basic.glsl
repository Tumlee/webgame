@vert
attribute vec4 aVertexPosition;
attribute vec4 aColor;

uniform vec4 uColor;
varying lowp vec4 fColor;

void main() {
    gl_Position = aVertexPosition;
    fColor = uColor * aColor;
    //fColor = uColor;
}

@frag
varying lowp vec4 fColor;
void main() {
    gl_FragColor = fColor;
}