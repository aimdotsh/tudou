
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

const mercatorX = (lon) => {
    return lon * D2R;
};

// The modified getMercatorOffset function (simulated)
const getMercatorOffset = (centerLat) => {
    // FIXED_OFFSET_LAT logic simulation
    const FIXED_OFFSET_LAT = 35.0;
    // Use FIXED_OFFSET_LAT instead of centerLat
    const latToUse = FIXED_OFFSET_LAT;

    const { distance, bearing } = siteMetadata.mapOffset;

    const R = 6371;
    const d = distance; // km
    const brng = bearing * D2R;
    const lat1 = latToUse * D2R;
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
    const my1 = mercatorY(latToUse);
    const mx2 = mercatorX(lon2Deg);
    const my2 = mercatorY(lat2Deg);

    return {
        dx: mx2 - mx1,
        dy: my2 - my1,
    };
};

// Test with different center latitudes
const offset1 = getMercatorOffset(30.0);
const offset2 = getMercatorOffset(40.0);

console.log("Offset 1 (Lat 30):", offset1);
console.log("Offset 2 (Lat 40):", offset2);

if (Math.abs(offset1.dx - offset2.dx) < 0.0000001 && Math.abs(offset1.dy - offset2.dy) < 0.0000001) {
    console.log("SUCCESS: Offsets are identical.");
} else {
    console.log("FAILURE: Offsets differ.");
}
