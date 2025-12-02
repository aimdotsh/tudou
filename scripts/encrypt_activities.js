import fs from 'fs';
import CryptoJS from 'crypto-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ACTIVITIES_PATH = path.join(__dirname, '../src/static/activities.json');
const ENCRYPTED_ACTIVITIES_PATH = path.join(__dirname, '../src/static/activities_encrypted.json');

// Try to read .env for VITE_ENCRYPT_KEY
let envKey = process.env.VITE_ENCRYPT_KEY;
if (!envKey) {
    try {
        const envPath = path.join(__dirname, '../.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf-8');
            const match = envContent.match(/VITE_ENCRYPT_KEY=(.*)/);
            if (match) {
                envKey = match[1].trim();
            }
        }
    } catch (e) {
        // ignore
    }
}

const SECRET_KEY = envKey || 'tudou_default_secret_key';

if (!envKey) {
    console.warn('WARNING: VITE_ENCRYPT_KEY not found in environment or .env. Using default key. This provides minimal security.');
}

if (!fs.existsSync(ACTIVITIES_PATH)) {
    console.error('Activities file not found:', ACTIVITIES_PATH);
    process.exit(1);
}

const activities = JSON.parse(fs.readFileSync(ACTIVITIES_PATH, 'utf-8'));

const encryptedActivities = activities.map(activity => {
    const newActivity = { ...activity };
    if (newActivity.summary_polyline) {
        newActivity.summary_polyline = CryptoJS.AES.encrypt(newActivity.summary_polyline, SECRET_KEY).toString();
    }
    if (newActivity.location_country) {
        newActivity.location_country = CryptoJS.AES.encrypt(newActivity.location_country, SECRET_KEY).toString();
    }
    return newActivity;
});

fs.writeFileSync(ENCRYPTED_ACTIVITIES_PATH, JSON.stringify(encryptedActivities, null, 2));
console.log(`Encrypted activities written to ${ENCRYPTED_ACTIVITIES_PATH}`);
