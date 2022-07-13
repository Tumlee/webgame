@vert
attribute vec4 aVertexPosition;

uniform vec4 uColor;
varying lowp vec4 fColor;

void main() {
    gl_Position = aVertexPosition;
    fColor = uColor;
}

@frag
varying lowp vec4 fColor;
void main() {
    gl_FragColor = fColor;
}