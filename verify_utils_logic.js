
// Mock siteMetadata
const siteMetadata = {
    mapOffset: {
        distance: 100, // km
        bearing: 45,   // degrees
    }
};

const R2D = 180 / Math.PI;
const D2R = Math.PI / 180;

// Mercator projection helpers (Copied from utils.ts)
const mercatorY = (lat) => {
    if (lat > 89.9) lat = 89.9;
    if (lat < -89.9) lat = -89.9;
    return Math.log(Math.tan(Math.PI / 4 + (lat * D2R) / 2));
};

const inverseMercatorY = (y) => {
    return (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * R2D;
};

const mercatorX = (lon) => {
    return lon * D2R;
};

const inverseMercatorX = (x) => {
    return x * R2D;
};

const getMercatorOffset = (centerLat) => {
    const { distance, bearing } = siteMetadata.mapOffset;

    const R = 6371;
    const d = distance; // km
    const brng = bearing * D2R;
    const lat1 = centerLat * D2R;
    const lon1 = 0;

    const lat2 = Math.asin(
        Math.sin(lat1) * Math.cos(d / R) +
        Math.cos(lat1) * Math.sin(d / R) * Math.cos(brng)
    );
    const lon2 =
        lon1 +
        Math.atan2(
            Math.sin(brng) * Math.sin(d / R) * Math.cos(lat1),
            Math.cos(d / R) - Math.sin(lat1) * Math.sin(lat2)
        );

    const lat2Deg = lat2 * R2D;
    const lon2Deg = lon2 * R2D;

    const mx1 = mercatorX(0);
    const my1 = mercatorY(centerLat);
    const mx2 = mercatorX(lon2Deg);
    const my2 = mercatorY(lat2Deg);

    return {
        dx: mx2 - mx1,
        dy: my2 - my1,
    };
};

const applyOffset = (points) => {
    if (points.length === 0) return [];

    const centerLat = points[0][1];
    const { dx, dy } = getMercatorOffset(centerLat);

    return points.map((coord) => {
        const mx = mercatorX(coord[0]);
        const my = mercatorY(coord[1]);
        return [inverseMercatorX(mx + dx), inverseMercatorY(my + dy)];
    });
};

// Test
const square = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]; // 1x1 degree square at equator
const shifted = applyOffset(square);

console.log("Original Width:", mercatorX(square[1][0]) - mercatorX(square[0][0]));
console.log("Original Height:", mercatorY(square[2][1]) - mercatorY(square[0][1]));

console.log("Shifted Width:", mercatorX(shifted[1][0]) - mercatorX(shifted[0][0]));
console.log("Shifted Height:", mercatorY(shifted[2][1]) - mercatorY(shifted[0][1]));

const w0 = mercatorX(square[1][0]) - mercatorX(square[0][0]);
const h0 = mercatorY(square[2][1]) - mercatorY(square[0][1]);
const w1 = mercatorX(shifted[1][0]) - mercatorX(shifted[0][0]);
const h1 = mercatorY(shifted[2][1]) - mercatorY(shifted[0][1]);

if (Math.abs((h1 / w1) - (h0 / w0)) < 0.0001) {
    console.log("SUCCESS: Aspect ratio preserved.");
} else {
    console.log("FAILURE: Aspect ratio changed.");
}
