import { FirebaseOptions, getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

import {
  firebaseFunctionsRegion,
  firebasePublicConfig,
  firebaseUseEmulators,
  getFirebaseConfigurationError,
  isFirebaseConfigured,
} from "./config";

let emulatorsConnected = false;
let analyticsPromise: Promise<ReturnType<typeof getAnalytics> | null> | null = null;

function assertConfigured() {
  const configurationError = getFirebaseConfigurationError();

  if (configurationError) {
    throw new Error(configurationError);
  }
}

export function getFirebaseApp() {
  assertConfigured();

  if (!getApps().length) {
    return initializeApp(firebasePublicConfig as FirebaseOptions);
  }

  return getApp();
}

function connectLocalEmulators() {
  if (emulatorsConnected || !firebaseUseEmulators) {
    return;
  }

  const app = getFirebaseApp();
  connectAuthEmulator(getAuth(app), "http://127.0.0.1:9099", {
    disableWarnings: true,
  });
  connectFirestoreEmulator(getFirestore(app), "127.0.0.1", 8080);
  connectFunctionsEmulator(getFunctions(app, firebaseFunctionsRegion), "127.0.0.1", 5001);
  emulatorsConnected = true;
}

export function getFirebaseAuth() {
  const auth = getAuth(getFirebaseApp());
  connectLocalEmulators();
  return auth;
}

export function getFirebaseDb() {
  const db = getFirestore(getFirebaseApp());
  connectLocalEmulators();
  return db;
}

export function getFirebaseFunctions() {
  const functions = getFunctions(getFirebaseApp(), firebaseFunctionsRegion);
  connectLocalEmulators();
  return functions;
}

export async function getFirebaseAnalytics() {
  if (typeof window === "undefined" || firebaseUseEmulators) {
    return null;
  }

  if (!analyticsPromise) {
    analyticsPromise = isSupported().then((supported) => {
      if (!supported) {
        return null;
      }

      return getAnalytics(getFirebaseApp());
    });
  }

  return analyticsPromise;
}

export function canUseFirebase() {
  return isFirebaseConfigured;
}
