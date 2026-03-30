import { FirebaseOptions, getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

import {
  firebaseFunctionsRegion,
  firebasePublicConfig,
  firebaseUseAuthEmulator,
  firebaseUseFirestoreEmulator,
  firebaseUseFunctionsEmulator,
  getFirebaseConfigurationError,
  isFirebaseConfigured,
} from "./config";

let authEmulatorConnected = false;
let firestoreEmulatorConnected = false;
let functionsEmulatorConnected = false;
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
  const app = getFirebaseApp();

  if (firebaseUseAuthEmulator && !authEmulatorConnected) {
    connectAuthEmulator(getAuth(app), "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    authEmulatorConnected = true;
  }

  if (firebaseUseFirestoreEmulator && !firestoreEmulatorConnected) {
    connectFirestoreEmulator(getFirestore(app), "127.0.0.1", 8080);
    firestoreEmulatorConnected = true;
  }

  if (firebaseUseFunctionsEmulator && !functionsEmulatorConnected) {
    connectFunctionsEmulator(getFunctions(app, firebaseFunctionsRegion), "127.0.0.1", 5001);
    functionsEmulatorConnected = true;
  }
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
  if (
    typeof window === "undefined" ||
    firebaseUseAuthEmulator ||
    firebaseUseFirestoreEmulator ||
    firebaseUseFunctionsEmulator
  ) {
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
