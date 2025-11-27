
const R2D = 180 / Math.PI;
const D2R = Math.PI / 180;

function mercatorY(lat) {
    if (lat > 89.9) lat = 89.9;
    if (lat < -89.9) lat = -89.9;
    return Math.log(Math.tan(Math.PI / 4 + lat * D2R / 2));
}

function inverseMercatorY(y) {
    return (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * R2D;
}

function mercatorX(lon) {
    return lon * D2R;
}

function inverseMercatorX(x) {
    return x * R2D;
}

// Fix logic: Mercator shift
function applyOffsetMercator(points, latOffsetDeg, lonOffsetDeg) {
    // Calculate offset in Mercator units based on a reference point (e.g. center or start)
    // Here we just use the offset directly if we knew it in meters, but we are given degrees.
    // If we want to simulate "moving to lat 60", we calculate the shift in Mercator Y.

    // Let's say we want to move the center from (0.5, 0.5) to (0.5, 60.5).
    // Center Y old: mercatorY(0.5)
    // Center Y new: mercatorY(60.5)
    // dy = mercatorY(60.5) - mercatorY(0.5)

    const centerLat = points[0][1]; // simplified
    const targetLat = centerLat + latOffsetDeg;

    const dy = mercatorY(targetLat) - mercatorY(centerLat);
    const dx = mercatorX(lonOffsetDeg); // linear for X

    return points.map(p => {
        const mx = mercatorX(p[0]);
        const my = mercatorY(p[1]);
        return [
            inverseMercatorX(mx + dx),
            inverseMercatorY(my + dy)
        ];
    });
}

// Test data: 1x1 degree square at equator
const square = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]; // [lon, lat]

// Offset to lat 60
const latOffset = 60;
const lonOffset = 0;

const shifted = applyOffsetMercator(square, latOffset, lonOffset);

console.log("Original:");
const h0 = mercatorY(square[2][1]) - mercatorY(square[0][1]);
const w0 = mercatorX(square[1][0]) - mercatorX(square[0][0]);
console.log(`Height: ${h0.toFixed(4)}, Width: ${w0.toFixed(4)}, Ratio: ${(h0 / w0).toFixed(4)}`);

console.log("\nShifted (Mercator):");
const h1 = mercatorY(shifted[2][1]) - mercatorY(shifted[0][1]);
const w1 = mercatorX(shifted[1][0]) - mercatorX(shifted[0][0]);
console.log(`Height: ${h1.toFixed(4)}, Width: ${w1.toFixed(4)}, Ratio: ${(h1 / w1).toFixed(4)}`);

console.log("\nNew Latitudes:");
console.log(`Bottom: ${shifted[0][1].toFixed(4)}, Top: ${shifted[2][1].toFixed(4)}, Diff: ${(shifted[2][1] - shifted[0][1]).toFixed(4)}`);
