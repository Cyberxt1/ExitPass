const firebasePublicConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseMeasurementId =
  process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined;

export const firebaseFunctionsRegion =
  process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION || "us-central1";

export const firebaseUseEmulators =
  process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === "true";

export const missingFirebaseEnvKeys = Object.entries(firebasePublicConfig)
  .filter(([, value]) => !value)
  .map(([key]) => `NEXT_PUBLIC_FIREBASE_${key.replace(/[A-Z]/g, (match) => `_${match}`).toUpperCase()}`);

export const isFirebaseConfigured = missingFirebaseEnvKeys.length === 0;

export function getFirebaseConfigurationError() {
  if (isFirebaseConfigured) {
    return null;
  }

  return `Firebase is not configured yet. Missing environment variables: ${missingFirebaseEnvKeys.join(
    ", ",
  )}`;
}

export { firebasePublicConfig };
