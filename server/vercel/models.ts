// Owner: Ahmed (B). Entry point pre-bundled by Vite for the Vercel function (npm run build:api → dist/models.js).
// Vercel's function bundler doesn't understand import.meta.glob (simulated data), so the models are bundled here,
// with the check-in store of the same module graph (src/ingest/checkin.ts) to restore it from Redis.
export { planToday, receiveCheckIn, watchSummary } from '../watchSummary.ts';
export { clearCheckIn, getSavedCheckIn, saveCheckIn } from '../../src/ingest/checkin.ts';
export { MISSION_TODAY } from '../../src/ingest/checkin.ts';
