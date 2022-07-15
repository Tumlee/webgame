import { pointOnSide } from "./lib/geometry.js";

const maxGameMapWidth = 100;
let idForCoordinate = (c,r) => r + (c * maxGameMapWidth);

function generateTileQuad(tile, camera) {
    let edges = tile.edges;
    let ty = tile.center.y;

    return [
        {x: edges.x0, y: ty, z: edges.z0},
        {x: edges.x1, y: ty, z: edges.z0},
        {x: edges.x1, y: ty, z: edges.z1},
        {x: edges.x0, y: ty, z: edges.z1},
    ].map(vert => camera.transformPoint(vert));
}

function generateWallQuad(tile, neighborId, neighborHeight, camera) {
    let edges = tile.edges;
    let ty = tile.center.y;
    let nh = neighborHeight;

    if(neighborId.startsWith('x')) {
        let x = edges[neighborId];
        let isFlipped = neighborId.endsWith('0');
        let z0 = edges.z0;
        let z1 = edges.z1;
        let y0 = isFlipped ? ty : nh;
        let y1 = isFlipped ? nh : ty;
        return [
            {x: x, y: y0, z: z0},
            {x: x, y: y0, z: z1},
            {x: x, y: y1, z: z1},
            {x: x, y: y1, z: z0},
        ].map(vert => camera.transformPoint(vert));
    }

    if(neighborId.startsWith('z')) {
        let z = edges[neighborId];
        let isFlipped = neighborId.endsWith('0');
        let x0 = edges.x0;
        let x1 = edges.x1;
        let y0 = isFlipped ? nh : ty;
        let y1 = isFlipped ? ty : nh;

        return [
            {x: x0, y: y0, z: z},
            {x: x1, y: y0, z: z},
            {x: x1, y: y1, z: z},
            {x: x0, y: y1, z: z}
        ].map(vert => camera.transformPoint(vert));
    }
}

function drawQuad(basicStep, coordinates) {
    basicStep.addElements([0,1,2,0,2,3].map(i => coordinates[i]));
}

export class GameMap {
    constructor() {
        this.tiles = {};
        this.clickableQuads = [];
    }

    setTile(c, r, h, color) {
        if(r >= maxGameMapWidth || c >= maxGameMapWidth)
            throw Error('Invalid tile coordinates');

        let tileData = {
            r,
            c,
            h,
            id: idForCoordinate(c,r),
            neighbors: {
                x0: idForCoordinate(c - 1, r),
                x1: idForCoordinate(c + 1, r),
                z0: idForCoordinate(c, r - 1),
                z1: idForCoordinate(c, r + 1),
            },
            center: {
                x: c,
                y: h * .2,
                z: r,
            },
            edges: {
                x0: c - .5,
                x1: c + .5,
                z0: r - .5,
                z1: r + .5,
            },
            color: color,
        };

        this.tiles[tileData.id] = tileData;
    }

    removeTile(c, r) {
        delete this.tiles[idForCoordinate(c, r)];
    }

    storeClickableQuad(id, subId, verts) {
        let averageZ = verts.map(vert => vert.z).reduce((a,b) => a + b);
        this.clickableQuads.push({id, subId, verts, averageZ});
    }

    draw(basicStep, camera) {
        this.clickableQuads = [];

        for(const tile of Object.values(this.tiles)) {
            let verts = generateTileQuad(tile, camera);
            let color = tile.color;

            let c1 = {r: color.r,      g: color.g,      b: color.b};
            let c2 = {r: color.r * .8, g: color.g * .8, b: color.b * .8};
            let c3 = {r: color.r * .6, g: color.g * .6, b: color.b * .6};
            let c4 = {r: color.r * .5, g: color.g * .5, b: color.b * .5};
            let c5 = {r: color.r * .4, g: color.g * .4, b: color.b * .4};

            let floorQuad = [
                [verts[0].x,  verts[0].y, verts[0].z, 1,    c1.r, c1.g, c1.b, 1],
                [verts[1].x,  verts[1].y, verts[1].z, 1,    c2.r, c2.g, c2.b, 1],
                [verts[2].x,  verts[2].y, verts[2].z, 1,    c3.r, c3.g, c3.b, 1],
                [verts[3].x,  verts[3].y, verts[3].z, 1,    c2.r, c2.g, c2.b, 1], 
            ];

            drawQuad(basicStep, floorQuad);
            this.storeClickableQuad(tile.id, 'floor', verts);
        
            for(const neighborId of camera.visibleWalls) {
                let neighborTile = this.tiles[tile.neighbors[neighborId]];
                let nh = neighborTile ? neighborTile.center.y : 0;
    
                if(tile.center.y > nh) {
                    let wq = generateWallQuad(tile, neighborId, nh, camera);
                    let wc = ['x0', 'x1'].includes(neighborId) ? c4 : c5;

                    let wallQuad = [
                        [wq[0].x,  wq[0].y, wq[0].z, 1,    wc.r, wc.g, wc.b, 1],
                        [wq[1].x,  wq[1].y, wq[1].z, 1,    wc.r, wc.g, wc.b, 1],
                        [wq[2].x,  wq[2].y, wq[2].z, 1,    wc.r, wc.g, wc.b, 1],
                        [wq[3].x,  wq[3].y, wq[3].z, 1,    wc.r, wc.g, wc.b, 1], 
                    ];

                    drawQuad(basicStep, wallQuad);
                    this.storeClickableQuad(tile.id, neighborId, wq);
                }
            }
        }
    }

    detectClick(point) {
        const pointPairs = [
            {v0: 0, v1: 1},
            {v0: 1, v1: 2},
            {v0: 2, v1: 3},
            {v0: 3, v1: 0}
        ];

        let candidates = [];

        for(const quad of this.clickableQuads) {
            let verts = quad.verts;
            if(pointPairs.every(pair => pointOnSide(verts[pair.v0], verts[pair.v1], point)))
                candidates.push(quad);
        }

        return candidates.sort((a,b) => b.averageZ - a.averageZ)[0];
    }
}