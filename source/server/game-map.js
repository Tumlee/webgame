const maxGameMapWidth = 100;
let idForCoordinate = (c,r) => r + (c * maxGameMapWidth);

export class GameMap {
    constructor() {
        this.tiles = {};
    }

    setTile(c, r, h, color) {
        if(r >= maxGameMapWidth || c >= maxGameMapWidth)
            throw Error('Invalid tile coordinates');

        let tileData = {
            r,
            c,
            h,
            id: idForCoordinate(c,r),
            color: color,
        };

        this.tiles[tileData.id] = tileData;
    }

    removeTile(c, r) {
        delete this.tiles[idForCoordinate(c, r)];
    }
}