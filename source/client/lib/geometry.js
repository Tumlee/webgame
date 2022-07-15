export function pointOnSide(v0, v1, pt) {
    return (pt.x - v0.x) * (v1.y - v0.y) > (pt.y - v0.y) * (v1.x - v0.x);
}