const admin = require('firebase-admin');

/**
 * Initialize Firebase Admin SDK using environment variables.
 * If credentials are not set (placeholder values), Firebase is disabled
 * and image uploads are silently skipped.
 */
let bucket = null;
let firebaseEnabled = false;

function isConfigured() {
    const pid = process.env.FIREBASE_PROJECT_ID || '';
    const key = process.env.FIREBASE_PRIVATE_KEY || '';
    return pid && pid !== 'your-project-id' && key && !key.includes('...');
}

function initFirebase() {
    if (!isConfigured()) return;
    if (admin.apps.length > 0) { bucket = admin.storage().bucket(); return; }
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY
                    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
                    : undefined,
            }),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        });
        bucket = admin.storage().bucket();
        firebaseEnabled = true;
        console.log('✅  Firebase Storage ready');
    } catch (err) {
        console.warn('⚠️  Firebase init skipped:', err.message);
    }
}

// Initialize on module load
initFirebase();

/**
 * Upload a file buffer to Firebase Storage.
 * Returns empty string if Firebase is not configured.
 */
async function uploadToFirebase(buffer, filename, mimetype) {
    if (!firebaseEnabled || !bucket) {
        console.warn('⚠️  Firebase not configured – image upload skipped.');
        return '';
    }
    const file = bucket.file(`green-spaces/${Date.now()}_${filename}`);
    await file.save(buffer, { metadata: { contentType: mimetype } });
    await file.makePublic();
    return file.publicUrl();
}

module.exports = { uploadToFirebase };
