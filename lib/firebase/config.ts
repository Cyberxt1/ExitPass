const env = (import.meta as ImportMeta & {
  env: Record<string, string | undefined>;
}).env;

function readBooleanEnv(...keys: string[]) {
  return keys.some((key) => env[key] === "true");
}

const firebasePublicConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY || env.VITE_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID || env.VITE_FIREBASE_APP_ID,
};

export const firebaseMeasurementId =
  env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || env.VITE_FIREBASE_MEASUREMENT_ID || undefined;

export const firebaseFunctionsRegion =
  env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION ||
  env.VITE_FIREBASE_FUNCTIONS_REGION ||
  "us-central1";

export const firebaseUseEmulators = readBooleanEnv(
  "NEXT_PUBLIC_FIREBASE_USE_EMULATORS",
  "VITE_FIREBASE_USE_EMULATORS",
);

export const firebaseUseAuthEmulator =
  firebaseUseEmulators ||
  readBooleanEnv("NEXT_PUBLIC_FIREBASE_USE_AUTH_EMULATOR", "VITE_FIREBASE_USE_AUTH_EMULATOR");

export const firebaseUseFirestoreEmulator =
  firebaseUseEmulators ||
  readBooleanEnv(
    "NEXT_PUBLIC_FIREBASE_USE_FIRESTORE_EMULATOR",
    "VITE_FIREBASE_USE_FIRESTORE_EMULATOR",
  );

export const firebaseUseFunctionsEmulator =
  firebaseUseEmulators ||
  readBooleanEnv(
    "NEXT_PUBLIC_FIREBASE_USE_FUNCTIONS_EMULATOR",
    "VITE_FIREBASE_USE_FUNCTIONS_EMULATOR",
  );

export const missingFirebaseEnvKeys = Object.entries(firebasePublicConfig)
  .filter(([, value]) => !value)
  .map(([key]) => `NEXT_PUBLIC_FIREBASE_${key.replace(/[A-Z]/g, (match) => `_${match}`).toUpperCase()}`);

export const isFirebaseConfigured = missingFirebaseEnvKeys.length === 0;

export function getFirebaseConfigurationError() {
  if (isFirebaseConfigured) {
    return null;
  }

  return `Firebase is not configured yet. Missing environment variables: ${missingFirebaseEnvKeys
    .map((key) => `${key} or ${key.replace("NEXT_PUBLIC_", "VITE_")}`)
    .join(", ")}`;
}

export { firebasePublicConfig };
