'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  User as FirebaseUser,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { getFirebaseAuth, getFirebaseDb } from "./firebase/client";
import { apiService } from "./api-service";
import {
  firebaseUseAuthEmulator,
  getFirebaseConfigurationError,
  isFirebaseConfigured,
} from "./firebase/config";
import { mapUser } from "./firebase/firestore";
import {
  normalizeStudentProfileDetails,
  parseStudentLevel,
} from "./student-profile";
import { getPasswordResetActionSettings } from "./password-reset";
import { staffPortals } from "./staff-portals";
import type { StudentSignupInput, User } from "./types";

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<User>;
  signup: (input: StudentSignupInput) => Promise<User>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const PENDING_PROFILE_KEY = "exitpass_pending_student_profile";

type PendingStudentProfile = Omit<StudentSignupInput, "password"> & {
  uid: string;
  role: "student";
  permissions: string[];
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
};

function normalizeMatric(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

function isValidMatric(value: string) {
  return /^\d{2}\/\d{4}$/.test(normalizeMatric(value));
}

function getStudentAccessDirectoryId(value: string) {
  return normalizeMatric(value).replace("/", "");
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeHostelSelection(value: string) {
  return value.trim().toLowerCase();
}

function getPrivilegedRoleByEmail(email?: string | null): User["role"] | null {
  const normalizedEmail = normalizeEmail(email || "");

  if (normalizedEmail === staffPortals.admin.leadEmail) {
    return "super_admin";
  }

  if (normalizedEmail === staffPortals.security.leadEmail) {
    return "security";
  }

  if (normalizedEmail === staffPortals.chaplaincy.leadEmail) {
    return "chaplaincy";
  }

  return null;
}

async function getRoleFromAuth(firebaseUser: FirebaseUser): Promise<User["role"] | null> {
  const tokenResult = await firebaseUser.getIdTokenResult();
  const claimedRole = tokenResult.claims.role;

  if (typeof claimedRole === "string") {
    return claimedRole as User["role"];
  }

  return getPrivilegedRoleByEmail(firebaseUser.email);
}

function readPendingProfile(uid: string): PendingStudentProfile | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(PENDING_PROFILE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PendingStudentProfile;
    return parsed.uid === uid ? parsed : null;
  } catch {
    return null;
  }
}

function writePendingProfile(profile: PendingStudentProfile) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify(profile));
}

function clearPendingProfile(uid?: string) {
  if (typeof window === "undefined") {
    return;
  }

  const existing = window.localStorage.getItem(PENDING_PROFILE_KEY);

  if (!existing) {
    return;
  }

  if (!uid) {
    window.localStorage.removeItem(PENDING_PROFILE_KEY);
    return;
  }

  try {
    const parsed = JSON.parse(existing) as PendingStudentProfile;
    if (parsed.uid === uid) {
      window.localStorage.removeItem(PENDING_PROFILE_KEY);
    }
  } catch {
    window.localStorage.removeItem(PENDING_PROFILE_KEY);
  }
}

function buildPendingProfile(uid: string, input: StudentSignupInput): PendingStudentProfile {
  const now = new Date().toISOString();

  return {
    uid,
    name: input.name,
    email: input.email,
    matric: input.matric,
    department: input.department,
    faculty: input.faculty,
    level: input.level,
    hostel: input.hostel,
    room: input.room,
    phone: input.phone,
    guardianPhone: input.guardianPhone,
    role: "student",
    permissions: [],
    disabled: false,
    createdAt: now,
    updatedAt: now,
  };
}

function buildStudentAccessDirectoryPayload(profile: {
  uid: string;
  name: string;
  email: string;
  matric: string;
  department?: string;
  faculty?: string;
  level?: number;
  hostel?: string;
  room?: string;
}) {
  const matricNormalized = normalizeMatric(profile.matric);

  return {
    directoryId: getStudentAccessDirectoryId(matricNormalized),
    userId: profile.uid,
    role: "student" as const,
    name: profile.name,
    email: profile.email.trim().toLowerCase(),
    matric: matricNormalized,
    matricNormalized,
    department: profile.department || "",
    faculty: profile.faculty || "",
    level: profile.level ?? null,
    hostel: profile.hostel || "",
    room: profile.room || "",
  };
}

function getReadableAuthError(error: unknown, fallback: string) {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : "";

  switch (code) {
    case "auth/email-already-in-use":
      return "That email is already in use.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/weak-password":
      return "Choose a stronger password.";
    case "auth/invalid-credential":
      return "Invalid email or password.";
    case "auth/user-not-found":
      return "No account was found for that email.";
    case "auth/wrong-password":
      return "Invalid email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/operation-not-allowed":
      return "Email/password sign-up is not enabled in Firebase Authentication.";
    case "auth/configuration-not-found":
      return "Firebase Authentication is not configured correctly for this project.";
    case "auth/network-request-failed":
      return firebaseUseAuthEmulator
        ? "Firebase Auth emulator is enabled locally, but the auth request failed. Start the Firebase emulators or disable the auth emulator in .env.local."
        : "Network error. Check your connection and try again.";
    case "permission-denied":
    case "firestore/permission-denied":
      return "Profile setup was blocked by Firestore rules. Deploy the latest rules and try again.";
    case "invalid-argument":
      return "Student ID must be in the format 12/3456.";
    case "failed-precondition":
    case "firestore/failed-precondition":
      return "Firestore is not fully ready for profile creation yet. Check project setup and try again.";
    case "unavailable":
    case "firestore/unavailable":
      return "Firebase is temporarily unavailable. Try again in a moment.";
    default:
      return fallback;
  }
}

async function writeStudentProfile(profile: PendingStudentProfile) {
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  const normalizedMatric = normalizeMatric(profile.matric);
  const normalizedProfile = normalizeStudentProfileDetails({
    faculty: profile.faculty,
    department: profile.department,
    level: profile.level,
    room: profile.room,
  });

  if (!isValidMatric(normalizedMatric)) {
    throw new Error("Student ID must be in the format 12/3456.");
  }

  batch.set(doc(db, "users", profile.uid), {
    name: profile.name,
    nameChangeCount: 0,
    email: profile.email,
    matric: normalizedMatric,
    matricNormalized: normalizedMatric,
    role: "student",
    department: normalizedProfile.department,
    faculty: normalizedProfile.faculty,
    level: normalizedProfile.level,
    hostel: profile.hostel,
    room: normalizedProfile.room,
    phone: profile.phone,
    guardianPhone: profile.guardianPhone,
    permissions: [],
    disabled: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, "studentAccessDirectory", getStudentAccessDirectoryId(normalizedMatric)), {
    ...buildStudentAccessDirectoryPayload(profile),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}

async function syncStudentAccessDirectoryForPrivilegedUser(profile: User) {
  if (!["hall_admin", "chaplaincy", "security", "super_admin"].includes(profile.role)) {
    return;
  }

  const db = getFirebaseDb();
  const snapshot = await getDocs(query(collection(db, "users"), where("role", "==", "student")));

  if (snapshot.empty) {
    return;
  }

  const students = snapshot.docs.map((item) => ({
    id: item.id,
    data: item.data(),
  }));

  for (let index = 0; index < students.length; index += 400) {
    const batch = writeBatch(db);
    const chunk = students.slice(index, index + 400);

    for (const student of chunk) {
      const matric =
        typeof student.data.matric === "string" ? normalizeMatric(student.data.matric) : "";
      const level = parseStudentLevel(student.data.level as string | number | null | undefined);

      if (!matric || level === null) {
        continue;
      }

      batch.set(doc(db, "studentAccessDirectory", getStudentAccessDirectoryId(matric)), {
        ...buildStudentAccessDirectoryPayload({
          uid: student.id,
          name: typeof student.data.name === "string" ? student.data.name : "Student",
          email: typeof student.data.email === "string" ? student.data.email : "",
          matric,
          department:
            typeof student.data.department === "string" ? student.data.department : "",
          faculty: typeof student.data.faculty === "string" ? student.data.faculty : "",
          level,
          hostel: typeof student.data.hostel === "string" ? student.data.hostel : "",
          room: typeof student.data.room === "string" ? student.data.room : "",
        }),
        createdAt: student.data.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  }
}

async function syncStaffInviteDirectoryForPrivilegedUser(profile: User) {
  if (!["hall_admin", "chaplaincy", "security", "super_admin"].includes(profile.role)) {
    return;
  }

  const db = getFirebaseDb();
  const snapshot = await getDocs(collection(db, "staffInvites"));

  if (snapshot.empty) {
    return;
  }

  for (let index = 0; index < snapshot.docs.length; index += 400) {
    const batch = writeBatch(db);
    const chunk = snapshot.docs.slice(index, index + 400);

    for (const invite of chunk) {
      const data = invite.data();
      const email = typeof data.email === "string" ? normalizeEmail(data.email) : "";

      if (!email) {
        continue;
      }

      batch.set(doc(db, "staffInviteDirectory", email), {
        email,
        role: typeof data.role === "string" ? data.role : "hall_admin",
        name: typeof data.name === "string" ? data.name : "",
        hostel: typeof data.hostel === "string" ? data.hostel : "",
        hostelId: typeof data.hostelId === "string" ? data.hostelId : "",
        status: typeof data.status === "string" ? data.status : "pending",
        claimedBy: typeof data.claimedBy === "string" ? data.claimedBy : "",
        claimedAt: data.claimedAt || null,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  }
}

async function validateStudentSignupEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);

  if (
    normalizedEmail === staffPortals.admin.leadEmail ||
    normalizedEmail === staffPortals.security.leadEmail ||
    normalizedEmail === staffPortals.chaplaincy.leadEmail
  ) {
    throw new Error("That email is reserved for staff setup. Use the staff portal instead.");
  }

  const inviteSnapshot = await getDoc(doc(getFirebaseDb(), "staffInviteDirectory", normalizedEmail));
  const hasPendingInvite = inviteSnapshot.exists() && inviteSnapshot.data().status === "pending";

  if (hasPendingInvite) {
    throw new Error("That email already has a staff invite. Use the matching staff portal instead.");
  }
}

async function resolveStudentHostelName(hostelValue: string) {
  const normalizedHostel = normalizeHostelSelection(hostelValue);

  if (!normalizedHostel) {
    throw new Error("Select your hostel to continue.");
  }

  const directSnapshot = await getDoc(doc(getFirebaseDb(), "hostels", hostelValue.trim()));

  if (directSnapshot.exists()) {
    const directName = directSnapshot.data().name;
    return typeof directName === "string" && directName.trim() ? directName.trim() : hostelValue.trim();
  }

  const hostelsSnapshot = await getDocs(collection(getFirebaseDb(), "hostels"));
  const match = hostelsSnapshot.docs.find((item) => {
    const data = item.data();
    const hostelName = typeof data.name === "string" ? normalizeHostelSelection(data.name) : "";

    return hostelName === normalizedHostel || normalizeHostelSelection(item.id) === normalizedHostel;
  });

  if (!match) {
    throw new Error("Select a hostel created by the super admin.");
  }

  const matchName = match.data().name;
  return typeof matchName === "string" && matchName.trim() ? matchName.trim() : match.id;
}

async function loadPendingFallback(firebaseUser: FirebaseUser): Promise<User | null> {
  const pendingProfile = readPendingProfile(firebaseUser.uid);

  if (!pendingProfile) {
    return null;
  }

  try {
    await writeStudentProfile(pendingProfile);
    clearPendingProfile(firebaseUser.uid);
    const syncedSnapshot = await getDoc(doc(getFirebaseDb(), "users", firebaseUser.uid));

    if (syncedSnapshot.exists()) {
      return mapUser(syncedSnapshot.id, syncedSnapshot.data());
    }
  } catch (error) {
    console.error("Pending student profile sync failed", error);
  }

  return {
    id: firebaseUser.uid,
    name: pendingProfile.name,
    email: pendingProfile.email,
    matric: pendingProfile.matric,
    role: "student",
    department: pendingProfile.department,
    faculty: pendingProfile.faculty,
    level: pendingProfile.level,
    hostel: pendingProfile.hostel,
    room: pendingProfile.room,
    phone: pendingProfile.phone,
    guardianPhone: pendingProfile.guardianPhone,
    photo: firebaseUser.photoURL || undefined,
    permissions: [],
    disabled: false,
    createdAt: pendingProfile.createdAt,
    updatedAt: pendingProfile.updatedAt,
  };
}

async function loadUserProfile(firebaseUser: FirebaseUser): Promise<User> {
  const tokenRole = await getRoleFromAuth(firebaseUser);
  let snapshot;

  try {
    snapshot = await getDoc(doc(getFirebaseDb(), "users", firebaseUser.uid));
  } catch (error) {
    const pendingFallback = await loadPendingFallback(firebaseUser);

    if (pendingFallback) {
      return pendingFallback;
    }

    throw error;
  }

  if (!snapshot.exists()) {
    const pendingFallback = await loadPendingFallback(firebaseUser);

    if (pendingFallback) {
      return pendingFallback;
    }

    if ((tokenRole || "student") === "student") {
      await signOut(getFirebaseAuth());
      throw new Error(
        "Your student profile is incomplete. Please create the account again or contact support.",
      );
    }

    return {
      id: firebaseUser.uid,
      name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
      email: firebaseUser.email || "",
      matric: "",
      role: tokenRole || "student",
      photo: firebaseUser.photoURL || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const profile = mapUser(snapshot.id, snapshot.data());
  const resolvedProfile =
    tokenRole && tokenRole !== profile.role
      ? {
          ...profile,
          role: tokenRole,
        }
      : profile;

  if (resolvedProfile.role !== "student" && resolvedProfile.approvalStatus === "rejected") {
    await signOut(getFirebaseAuth());
    throw new Error(
      resolvedProfile.rejectionReason
        ? `Your staff account request was rejected: ${resolvedProfile.rejectionReason}`
        : "Your staff account request was rejected. Contact the super admin.",
    );
  }

  if (resolvedProfile.disabled) {
    await signOut(getFirebaseAuth());
    throw new Error("This account has been disabled. Contact the platform administrator.");
  }

  return resolvedProfile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = async () => {
    if (!firebaseUser || !isFirebaseConfigured) {
      return null;
    }

    const profile = await loadUserProfile(firebaseUser);
    setUser(profile);
    return profile;
  };

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setError(getFirebaseConfigurationError());
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (nextFirebaseUser) => {
      setFirebaseUser(nextFirebaseUser);

      if (!nextFirebaseUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const profile = await loadUserProfile(nextFirebaseUser);
        setUser(profile);
        setError(null);
        void syncStudentAccessDirectoryForPrivilegedUser(profile).catch((syncError) => {
          console.error("Student access directory sync failed", syncError);
        });
        void syncStaffInviteDirectoryForPrivilegedUser(profile).catch((syncError) => {
          console.error("Staff invite directory sync failed", syncError);
        });
      } catch (nextError) {
        console.error("Failed to load user profile", nextError);
        setError(nextError instanceof Error ? nextError.message : "Failed to load user profile.");
      } finally {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      firebaseUser,
      isLoading,
      error,
      login: async (email: string, password: string) => {
        if (!isFirebaseConfigured) {
          throw new Error(getFirebaseConfigurationError() || "Firebase is not configured.");
        }

        setIsLoading(true);
        setError(null);

        try {
          const normalizedEmail = email.trim().toLowerCase();
          const credentials = await signInWithEmailAndPassword(
            getFirebaseAuth(),
            normalizedEmail,
            password,
          );
          await credentials.user.getIdToken(true);
          const profile = await loadUserProfile(credentials.user);
          setFirebaseUser(credentials.user);
          setUser(profile);
          void syncStudentAccessDirectoryForPrivilegedUser(profile).catch((syncError) => {
            console.error("Student access directory sync failed", syncError);
          });
          void syncStaffInviteDirectoryForPrivilegedUser(profile).catch((syncError) => {
            console.error("Staff invite directory sync failed", syncError);
          });
          return profile;
        } catch (nextError) {
          const message = getReadableAuthError(nextError, "Unable to sign in.");
          setError(message);
          throw new Error(message);
        } finally {
          setIsLoading(false);
        }
      },
      signup: async (input: StudentSignupInput) => {
        if (!isFirebaseConfigured) {
          throw new Error(getFirebaseConfigurationError() || "Firebase is not configured.");
        }

        setIsLoading(true);
        setError(null);

        try {
          const normalizedEmail = normalizeEmail(input.email);

          await apiService.registerStudentAccount({
            ...input,
            email: normalizedEmail,
          });

          const credentials = await signInWithEmailAndPassword(
            getFirebaseAuth(),
            normalizedEmail,
            input.password,
          );
          await credentials.user.getIdToken(true);

          const profile = await loadUserProfile(credentials.user);
          setFirebaseUser(credentials.user);
          setUser(profile);
          return profile;
        } catch (nextError) {
          const fallbackAllowed =
            nextError instanceof Error &&
            nextError.message.includes("Deploy the latest Firebase Functions");

          if (fallbackAllowed) {
            try {
              const normalizedEmail = input.email.trim().toLowerCase();
              const normalizedMatric = normalizeMatric(input.matric);
              const normalizedProfile = normalizeStudentProfileDetails({
                faculty: input.faculty,
                department: input.department,
                level: input.level,
                room: input.room,
              });
              const hostelName = await resolveStudentHostelName(input.hostel);

              if (!isValidMatric(normalizedMatric)) {
                throw new Error("Student ID must be in the format 12/3456.");
              }

              await validateStudentSignupEmail(normalizedEmail);

              const credentials = await createUserWithEmailAndPassword(
                getFirebaseAuth(),
                normalizedEmail,
                input.password,
              );

              await updateProfile(credentials.user, {
                displayName: input.name,
              });

              const pendingProfile = buildPendingProfile(credentials.user.uid, {
                ...input,
                department: normalizedProfile.department,
                faculty: normalizedProfile.faculty,
                hostel: hostelName,
                level: normalizedProfile.level,
                matric: normalizedMatric,
                room: normalizedProfile.room,
              });
              pendingProfile.email = normalizedEmail;
              writePendingProfile(pendingProfile);
              await credentials.user.getIdToken(true);
              await writeStudentProfile(pendingProfile);
              clearPendingProfile(credentials.user.uid);

              const profile = await loadUserProfile(credentials.user);
              setFirebaseUser(credentials.user);
              setUser(profile);
              return profile;
            } catch (fallbackError) {
              const authUser = getFirebaseAuth().currentUser;

              if (authUser) {
                await deleteUser(authUser).catch(() => signOut(getFirebaseAuth()).catch(() => undefined));
              }

              const message = getReadableAuthError(
                fallbackError,
                "Unable to create your account.",
              );
              setError(message);
              throw new Error(message);
            }
          }

          const message = getReadableAuthError(nextError, "Unable to create your account.");
          setError(message);
          throw new Error(message);
        } finally {
          setIsLoading(false);
        }
      },
      resetPassword: async (email: string) => {
        if (!isFirebaseConfigured) {
          throw new Error(getFirebaseConfigurationError() || "Firebase is not configured.");
        }

        try {
          await sendPasswordResetEmail(
            getFirebaseAuth(),
            email.trim().toLowerCase(),
            getPasswordResetActionSettings(),
          );
        } catch (nextError) {
          throw new Error(getReadableAuthError(nextError, "Unable to send reset email."));
        }
      },
      logout: async () => {
        if (!isFirebaseConfigured) {
          setUser(null);
          setFirebaseUser(null);
          return;
        }

        await signOut(getFirebaseAuth());
        setUser(null);
        setFirebaseUser(null);
      },
      refreshUser,
    }),
    [error, firebaseUser, isLoading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
