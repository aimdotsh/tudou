
const R2D = 180 / Math.PI;
const D2R = Math.PI / 180;

function mercatorY(lat) {
    if (lat > 89.9) lat = 89.9;
    if (lat < -89.9) lat = -89.9;
    return Math.log(Math.tan(Math.PI / 4 + lat * D2R / 2));
}

// Current logic: linear shift
function applyOffsetLinear(points, latOffset, lonOffset) {
    return points.map(p => [p[0] + lonOffset, p[1] + latOffset]);
}

// Test data: 1x1 degree square at equator
const square = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]; // [lon, lat]

// Offset to lat 60
const latOffset = 60;
const lonOffset = 0;

const shifted = applyOffsetLinear(square, latOffset, lonOffset);

console.log("Original:");
const h0 = mercatorY(square[2][1]) - mercatorY(square[0][1]);
const w0 = square[1][0] - square[0][0]; // lon diff is proportional to x diff
console.log(`Height (Mercator): ${h0.toFixed(4)}, Width: ${w0.toFixed(4)}, Ratio: ${(h0 / w0).toFixed(4)}`);

console.log("\nShifted (Linear):");
const h1 = mercatorY(shifted[2][1]) - mercatorY(shifted[0][1]);
const w1 = shifted[1][0] - shifted[0][0];
console.log(`Height (Mercator): ${h1.toFixed(4)}, Width: ${w1.toFixed(4)}, Ratio: ${(h1 / w1).toFixed(4)}`);

console.log("\nConclusion:");
if (Math.abs((h1 / w1) - (h0 / w0)) > 0.1) {
    console.log("Deformation detected!");
} else {
    console.log("No significant deformation.");
}
