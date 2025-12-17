
const CryptoJS = require('crypto-js');
const polyline = require('@mapbox/polyline');

const PRIVACY_KEY = 'tudou_run_map_privacy_key';

// Sample from activities_py4567.json
const encryptedPolyline = "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";

try {
    console.log("Attempting decryption...");

    // Decrypt
    const bytes = CryptoJS.AES.decrypt(encryptedPolyline, PRIVACY_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    if (decrypted) {
        console.log("Decryption successful!");
        console.log("First 50 chars:", decrypted.substring(0, 50));

        // Decode Polyline
        try {
            const decoded = polyline.decode(decrypted);
            console.log("Polyline decode successful. Points:", decoded.length);
        } catch (err) {
            console.error("Polyline decode failed:", err.message);
        }
    } else {
        console.error("Decryption failed (empty string). Wrong Key?");
    }
} catch (e) {
    console.error("Decryption error:", e.message);
}
