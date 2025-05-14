import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { encrypt } from '../src/utils/crypto.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const inputPath = path.join(__dirname, '../src/static/activities.json');
const outputPath = path.join(__dirname, '../public/data/activities.json');

const activities = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

const encryptedActivities = activities.map(activity => ({
  ...activity,
  location_country: activity.location_country ? encrypt(activity.location_country) : undefined
}));

fs.writeFileSync(outputPath, JSON.stringify(encryptedActivities));
console.log('Successfully encrypted activities data');