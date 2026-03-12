import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let app: App;
let db: Firestore;

function getFirebaseAdmin() {
    if (!app) {
        const existing = getApps();
        if (existing.length > 0) {
            app = existing[0];
        } else {
            const projectId = process.env.FIREBASE_PROJECT_ID;
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
            const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

            if (!projectId) {
                throw new Error("Missing FIREBASE_PROJECT_ID env var");
            }

            // If service account creds are provided, use them; otherwise fall back
            // to Application Default Credentials (useful in GCP-hosted environments).
            if (clientEmail && privateKey) {
                app = initializeApp({
                    credential: cert({ projectId, clientEmail, privateKey }),
                });
            } else {
                app = initializeApp({ projectId });
            }
        }
    }

    if (!db) {
        db = getFirestore(app);
    }

    return { app, db };
}

export { getFirebaseAdmin };
