// spatialGrid.js
export class SpatialHashGrid {
    constructor(cellSize = 20) {
        this.cellSize = cellSize;
        this.grid = new Map();
    }

    _key(x, z) {
        const cx = Math.floor(x / this.cellSize);
        const cz = Math.floor(z / this.cellSize);
        return `${cx}:${cz}`;
    }

    insert(obstacle) {
        const pos = obstacle.group ? obstacle.group.position : (obstacle.position || obstacle);
        if (!pos) return;
        const key = this._key(pos.x, pos.z);

        if (!this.grid.has(key)) {
            this.grid.set(key, []);
        }
        this.grid.get(key).push(obstacle);
    }

    remove(obstacle) {
        const pos = obstacle.group ? obstacle.group.position : (obstacle.position || obstacle);
        if (!pos) return;
        const key = this._key(pos.x, pos.z);
        const list = this.grid.get(key);
        if (list) {
            const idx = list.indexOf(obstacle);
            if (idx !== -1) list.splice(idx, 1);
        }
    }

    getNearby(x, z) {
        const cx = Math.floor(x / this.cellSize);
        const cz = Math.floor(z / this.cellSize);
        const nearby = [];

        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                const key = `${cx + dx}:${cz + dz}`;
                const list = this.grid.get(key);
                if (list) {
                    for (let i = 0; i < list.length; i++) {
                        nearby.push(list[i]);
                    }
                }
            }
        }
        return nearby;
    }
}