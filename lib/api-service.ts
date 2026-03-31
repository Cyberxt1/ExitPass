import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  where,
} from "firebase/firestore";
import { deleteApp, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from "firebase/auth";

import { getFirebaseAuth, getFirebaseDb } from "./firebase/client";
import {
  firebasePublicConfig,
  getFirebaseConfigurationError,
  isFirebaseConfigured,
} from "./firebase/config";
import {
  mapAnnouncement,
  mapHostel,
  mapNotification,
  mapPass,
  mapPassRequest,
  mapPassVerificationResult,
  mapScanLog,
  mapStaffInvite,
  mapUser,
  requestToPassRecord,
  sortByCreatedAtDesc,
  toIsoString,
} from "./firebase/firestore";
import type {
  AnalyticsSummary,
  Announcement,
  CreateAdminInput,
  CreateStaffInviteInput,
  CreatedAdminResult,
  Notification,
  Pass,
  PassRequest,
  PassVerificationResult,
  RegisterStaffInput,
  ScanLog,
  StudentAccessLookup,
  StudentSignupInput,
  SubmitPassRequestInput,
  User,
} from "./types";
import { staffPortals } from "./staff-portals";

function assertFirebaseReady() {
  const configurationError = getFirebaseConfigurationError();

  if (configurationError) {
    throw new Error(configurationError);
  }
}

function normalizeEmail(value: string) {
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

async function getCurrentSignedInProfile() {
  const authUser = getFirebaseAuth().currentUser;

  if (!authUser) {
    throw new Error("You need to sign in again before using this action.");
  }

  const snapshot = await getDoc(doc(getFirebaseDb(), "users", authUser.uid));
  const tokenResult = await authUser.getIdTokenResult();
  const tokenRole =
    typeof tokenResult.claims.role === "string"
      ? (tokenResult.claims.role as User["role"])
      : getPrivilegedRoleByEmail(authUser.email) || "student";

  if (!snapshot.exists()) {
    return {
      id: authUser.uid,
      name: authUser.displayName || authUser.email?.split("@")[0] || "User",
      email: authUser.email || "",
      matric: "",
      role: tokenRole,
      photo: authUser.photoURL || undefined,
      permissions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } satisfies User;
  }

  const profile = mapUser(snapshot.id, snapshot.data());

  if (tokenRole !== "student" && profile.role === "student") {
    return {
      ...profile,
      role: tokenRole,
    };
  }

  return profile;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeMatric(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

function isValidMatric(value: string) {
  return /^\d{2}\/\d{4}$/.test(normalizeMatric(value));
}

function getStudentAccessDirectoryId(value: string) {
  return normalizeMatric(value).replace("/", "");
}

function generateTemporaryPassword() {
  return `ExitPass!${Math.random().toString(16).slice(2, 10)}`;
}

function getDefaultPermissionsForRole(role: CreateAdminInput["role"]) {
  if (role === "super_admin") {
    return ["approve_passes", "manage_students", "manage_admins", "view_analytics", "manage_hostels"];
  }

  if (role === "hall_admin") {
    return ["approve_passes", "manage_students", "view_analytics"];
  }

  if (role === "chaplaincy") {
    return ["approve_passes", "send_updates", "manage_staff"];
  }

  return ["scan_passes", "view_history", "manage_staff"];
}

async function createAuthUserWithoutSwitchingSession(name: string, email: string, password: string) {
  const appName = `exitpass-managed-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const secondaryApp = initializeApp(firebasePublicConfig, appName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const credentials = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await updateProfile(credentials.user, { displayName: name });
    return credentials.user.uid;
  } finally {
    await signOut(secondaryAuth).catch(() => undefined);
    await deleteApp(secondaryApp).catch(() => undefined);
  }
}

export const apiService = {
  async lookupStudentAccess(matric: string) {
    const normalizedMatric = normalizeMatric(matric);

    if (!normalizedMatric) {
      throw new Error("Student ID is required.");
    }

    if (!isValidMatric(normalizedMatric)) {
      throw new Error("Student ID must be in the format 12/3456.");
    }

    const snapshot = await getDoc(
      doc(getFirebaseDb(), "studentAccessDirectory", getStudentAccessDirectoryId(normalizedMatric)),
    );

    if (!snapshot.exists()) {
      return {
        exists: false,
        user: null,
      } satisfies StudentAccessLookup;
    }

    const data = snapshot.data();

    return {
      exists: true,
      user: {
        id: typeof data.userId === "string" ? data.userId : normalizedMatric,
        name: typeof data.name === "string" ? data.name : "Student",
        email: typeof data.email === "string" ? data.email : "",
        matric: typeof data.matric === "string" ? data.matric : normalizedMatric,
        department: typeof data.department === "string" ? data.department : "",
        faculty: typeof data.faculty === "string" ? data.faculty : "",
        level: typeof data.level === "string" ? data.level : "",
        hostel: typeof data.hostel === "string" ? data.hostel : "",
        room: typeof data.room === "string" ? data.room : "",
      },
    } satisfies StudentAccessLookup;
  },

  async createStudentAccessAccount(input: StudentSignupInput) {
    const actor = await getCurrentSignedInProfile();
    const normalizedMatric = normalizeMatric(input.matric);
    const normalizedEmail = normalizeEmail(input.email);

    if (!isValidMatric(normalizedMatric)) {
      throw new Error("Student ID must be in the format 12/3456.");
    }

    if (actor.role !== "super_admin") {
      throw new Error("Only the super admin can create student accounts from this screen.");
    }

    const existingStudentSnapshot = await getDocs(
      query(collection(getFirebaseDb(), "users"), where("matric", "==", normalizedMatric), limit(1)),
    );

    if (!existingStudentSnapshot.empty) {
      throw new Error("A student account already exists for that ID.");
    }

    const uid = await createAuthUserWithoutSwitchingSession(
      input.name.trim(),
      normalizedEmail,
      input.password,
    );

    const userRef = doc(getFirebaseDb(), "users", uid);
    await setDoc(userRef, {
      name: input.name.trim(),
      email: normalizedEmail,
      matric: normalizedMatric,
      matricNormalized: normalizedMatric,
      role: "student",
      department: input.department.trim(),
      faculty: input.faculty.trim(),
      level: input.level.trim(),
      hostel: input.hostel.trim(),
      room: input.room.trim(),
      phone: input.phone.trim(),
      guardianPhone: input.guardianPhone.trim(),
      permissions: [],
      disabled: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(getFirebaseDb(), "studentAccessDirectory", getStudentAccessDirectoryId(normalizedMatric)), {
      directoryId: getStudentAccessDirectoryId(normalizedMatric),
      userId: uid,
      role: "student",
      name: input.name.trim(),
      email: normalizedEmail,
      matric: normalizedMatric,
      matricNormalized: normalizedMatric,
      department: input.department.trim(),
      faculty: input.faculty.trim(),
      level: input.level.trim(),
      hostel: input.hostel.trim(),
      room: input.room.trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const snapshot = await getDoc(userRef);
    return mapUser(snapshot.id, snapshot.data() || {});
  },

  async submitPassRequest(
    request: Omit<SubmitPassRequestInput, "studentId"> & { studentId: string },
  ) {
    const student = await getCurrentSignedInProfile();

    if (student.role !== "student" || student.id !== request.studentId) {
      throw new Error("Only a signed-in student can submit a pass request.");
    }

    const requestRef = await addDoc(collection(getFirebaseDb(), "passRequests"), {
      studentId: request.studentId,
      studentSnapshot: {
        id: student.id,
        name: student.name,
        email: student.email,
        matric: student.matric,
        role: student.role,
        hostel: student.hostel || "",
        room: student.room || "",
        department: student.department || "",
        faculty: student.faculty || "",
        level: student.level || "",
        phone: student.phone || "",
        guardianPhone: student.guardianPhone || "",
        photo: student.photo || "",
      },
      type: request.type,
      destination: request.destination,
      reason: request.reason,
      departureDate: Timestamp.fromDate(new Date(request.departureDate)),
      expectedReturnDate: Timestamp.fromDate(new Date(request.expectedReturnDate)),
      status: "chaplaincy_required",
      currentStage: "chaplaincy",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: request.studentId,
    });

    const createdRequest = await getDoc(requestRef);
    return mapPassRequest(createdRequest.id, createdRequest.data() || {});
  },

  async getPassRequests(studentId?: string) {
    assertFirebaseReady();

    const requestsRef = collection(getFirebaseDb(), "passRequests");
    const constraints = studentId ? [where("studentId", "==", studentId)] : [];
    const snapshot = await getDocs(query(requestsRef, ...constraints));

    return sortByCreatedAtDesc(
      snapshot.docs.map((item) => mapPassRequest(item.id, item.data())),
    );
  },

  async getPendingRequests(currentUser?: User | null) {
    const requests = await this.getPassRequests();

    if (!currentUser) {
      return requests.filter((request) =>
        ["pending", "chaplaincy_required"].includes(request.status),
      );
    }

    if (currentUser.role === "chaplaincy") {
      return requests.filter(
        (request) =>
          request.status === "chaplaincy_required" ||
          (request.status === "pending" && !request.chaplainApproval),
      );
    }

    if (currentUser.role === "hall_admin") {
      return requests.filter((request) => {
        if (request.status !== "pending" || !request.chaplainApproval) {
          return false;
        }

        if (!currentUser.hostel) {
          return true;
        }

        return request.student?.hostel?.toLowerCase() === currentUser.hostel.toLowerCase();
      });
    }

    if (currentUser.role === "super_admin") {
      return requests.filter((request) =>
        ["pending", "chaplaincy_required"].includes(request.status),
      );
    }

    return [];
  },

  async approvePassRequest(requestId: string) {
    const actor = await getCurrentSignedInProfile();
    const requestRef = doc(getFirebaseDb(), "passRequests", requestId);
    const requestSnapshot = await getDoc(requestRef);

    if (!requestSnapshot.exists()) {
      throw new Error("Pass request not found.");
    }

    const requestRecord = mapPassRequest(requestSnapshot.id, requestSnapshot.data());
    const batch = writeBatch(getFirebaseDb());

    if (
      (requestRecord.currentStage === "chaplaincy" || requestRecord.status === "chaplaincy_required") &&
      (actor.role === "chaplaincy" || actor.role === "super_admin")
    ) {
      batch.update(requestRef, {
        status: "pending",
        currentStage: "hall_admin",
        chaplainApproval: {
          approvedBy: actor.id,
          approverRole: actor.role,
          approvedAt: serverTimestamp(),
          status: "approved",
        },
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } else if (
      requestRecord.currentStage === "hall_admin" &&
      (actor.role === "hall_admin" || actor.role === "super_admin")
    ) {
      if (
        actor.role === "hall_admin" &&
        actor.hostel &&
        requestRecord.student?.hostel &&
        actor.hostel.toLowerCase() !== requestRecord.student.hostel.toLowerCase()
      ) {
        throw new Error("You can only approve requests from students in your hostel.");
      }

      batch.update(requestRef, {
        status: "approved",
        currentStage: "completed",
        approvedAt: serverTimestamp(),
        hallAdminApproval: {
          approvedBy: actor.id,
          approverRole: actor.role,
          approvedAt: serverTimestamp(),
          status: "approved",
        },
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(getFirebaseDb(), "passes", requestId), {
        requestId,
        studentId: requestRecord.studentId,
        studentSnapshot: requestSnapshot.data()?.studentSnapshot,
        type: requestRecord.type,
        destination: requestRecord.destination,
        reason: requestRecord.reason,
        departureDate: Timestamp.fromDate(new Date(requestRecord.departureDate)),
        expectedReturnDate: Timestamp.fromDate(new Date(requestRecord.expectedReturnDate)),
        status: "approved",
        currentStage: "completed",
        qrCode: `PASS_${requestId}_${Math.random().toString(16).slice(2, 14)}`,
        hallAdminApproval: {
          approvedBy: actor.id,
          approverRole: actor.role,
          approvedAt: serverTimestamp(),
          status: "approved",
        },
        chaplainApproval: requestSnapshot.data()?.chaplainApproval || null,
        createdAt: requestSnapshot.data()?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } else {
      throw new Error("You do not have access to approve this request at its current stage.");
    }

    const updatedRequest = await getDoc(requestRef);
    return mapPassRequest(updatedRequest.id, updatedRequest.data() || {});
  },

  async rejectPassRequest(requestId: string, reason: string) {
    const actor = await getCurrentSignedInProfile();
    const requestRef = doc(getFirebaseDb(), "passRequests", requestId);
    const requestSnapshot = await getDoc(requestRef);

    if (!requestSnapshot.exists()) {
      throw new Error("Pass request not found.");
    }

    const requestRecord = mapPassRequest(requestSnapshot.id, requestSnapshot.data());
    const stage = requestRecord.currentStage || "chaplaincy";

    if (
      stage === "chaplaincy" &&
      actor.role !== "chaplaincy" &&
      actor.role !== "super_admin"
    ) {
      throw new Error("Only chapel can deny this request at this stage.");
    }

    if (stage === "hall_admin" && actor.role !== "hall_admin" && actor.role !== "super_admin") {
      throw new Error("Only a hall admin can deny this request at this stage.");
    }

    if (
      actor.role === "hall_admin" &&
      actor.hostel &&
      requestRecord.student?.hostel &&
      actor.hostel.toLowerCase() !== requestRecord.student.hostel.toLowerCase()
    ) {
      throw new Error("You can only manage requests from students in your hostel.");
    }

    await updateDoc(requestRef, {
      status: "rejected",
      currentStage: "completed",
      rejectionReason: reason,
      updatedAt: serverTimestamp(),
      ...(stage === "chaplaincy"
        ? {
            chaplainApproval: {
              approvedBy: actor.id,
              approverRole: actor.role,
              approvedAt: serverTimestamp(),
              status: "rejected",
              reason,
            },
          }
        : {
            hallAdminApproval: {
              approvedBy: actor.id,
              approverRole: actor.role,
              approvedAt: serverTimestamp(),
              status: "rejected",
              reason,
            },
          }),
    });

    const updatedRequest = await getDoc(requestRef);
    return mapPassRequest(updatedRequest.id, updatedRequest.data() || {});
  },

  async getStudentPasses(studentId: string) {
    assertFirebaseReady();

    const [passesSnapshot, requestsSnapshot] = await Promise.all([
      getDocs(query(collection(getFirebaseDb(), "passes"), where("studentId", "==", studentId))),
      getDocs(
        query(collection(getFirebaseDb(), "passRequests"), where("studentId", "==", studentId)),
      ),
    ]);

    const passes = passesSnapshot.docs.map((item) => mapPass(item.id, item.data()));
    const requests = requestsSnapshot.docs.map((item) =>
      requestToPassRecord(mapPassRequest(item.id, item.data())),
    );

    const byRequestId = new Map<string, Pass>();

    for (const pass of passes) {
      if (pass.requestId) {
        byRequestId.set(pass.requestId, pass);
      }
    }

    const combined = [
      ...passes,
      ...requests.filter((request) => !byRequestId.has(request.requestId || request.id)),
    ];

    return sortByCreatedAtDesc(combined);
  },

  async getActiveStudentPasses(studentId: string) {
    const passes = await this.getStudentPasses(studentId);
    const now = Date.now();

    return passes.filter((pass) => {
      if (pass.status !== "approved") {
        return false;
      }

      const departure = new Date(pass.departureDate).getTime();
      const expectedReturn = new Date(pass.expectedReturnDate).getTime();

      return departure <= now && expectedReturn >= now;
    });
  },

  async getAllPasses() {
    assertFirebaseReady();

    const snapshot = await getDocs(collection(getFirebaseDb(), "passes"));
    return sortByCreatedAtDesc(snapshot.docs.map((item) => mapPass(item.id, item.data())));
  },

  async getAllStudents() {
    assertFirebaseReady();

    const snapshot = await getDocs(
      query(collection(getFirebaseDb(), "users"), where("role", "==", "student")),
    );

    return snapshot.docs.map((item) => mapUser(item.id, item.data()));
  },

  async getAllUsers() {
    assertFirebaseReady();

    const snapshot = await getDocs(collection(getFirebaseDb(), "users"));
    return sortByCreatedAtDesc(snapshot.docs.map((item) => mapUser(item.id, item.data())));
  },

  async getStudentDetails(studentId: string) {
    assertFirebaseReady();

    const [studentSnapshot, requestSnapshot, passesSnapshot] = await Promise.all([
      getDoc(doc(getFirebaseDb(), "users", studentId)),
      getDocs(query(collection(getFirebaseDb(), "passRequests"), where("studentId", "==", studentId))),
      getDocs(query(collection(getFirebaseDb(), "passes"), where("studentId", "==", studentId))),
    ]);

    if (!studentSnapshot.exists()) {
      return null;
    }

    const student = mapUser(studentSnapshot.id, studentSnapshot.data());
    const passHistory = passesSnapshot.docs.map((item) => mapPass(item.id, item.data()));

    return {
      ...student,
      totalRequests: requestSnapshot.size,
      approvedPasses: passHistory.filter((pass) => pass.status === "approved").length,
      passHistory: sortByCreatedAtDesc(passHistory),
    };
  },

  async getAdmins() {
    assertFirebaseReady();

    const snapshot = await getDocs(
      query(
        collection(getFirebaseDb(), "users"),
        where("role", "in", ["hall_admin", "chaplaincy", "security", "super_admin"]),
      ),
    );

    return snapshot.docs
      .map((item) => mapUser(item.id, item.data()))
      .filter(
        (item) =>
          !item.disabled &&
          item.approvalStatus !== "pending" &&
          item.approvalStatus !== "rejected",
      );
  },

  async getPendingStaffApprovals() {
    assertFirebaseReady();

    const snapshot = await getDocs(
      query(
        collection(getFirebaseDb(), "users"),
        where("role", "in", ["hall_admin", "chaplaincy", "security"]),
      ),
    );

    return sortByCreatedAtDesc(
      snapshot.docs
        .map((item) => mapUser(item.id, item.data()))
        .filter((item) => item.approvalStatus === "pending"),
    );
  },

  async getHostels() {
    assertFirebaseReady();

    const snapshot = await getDocs(collection(getFirebaseDb(), "hostels"));
    return [...snapshot.docs.map((item) => mapHostel(item.id, item.data()))].sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  },

  async createHostel(name: string) {
    const actor = await getCurrentSignedInProfile();

    if (actor.role !== "super_admin") {
      throw new Error("Only the main admin can create hostels.");
    }

    const slug = slugify(name);

    if (!slug) {
      throw new Error("Hostel name is required.");
    }

    const hostelRef = doc(getFirebaseDb(), "hostels", slug);
    await setDoc(hostelRef, {
      name: name.trim(),
      slug,
      createdBy: actor.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: false });

    const snapshot = await getDoc(hostelRef);
    return mapHostel(snapshot.id, snapshot.data() || {});
  },

  async getStaffInvites() {
    assertFirebaseReady();

    const snapshot = await getDocs(collection(getFirebaseDb(), "staffInvites"));
    return sortByCreatedAtDesc(
      snapshot.docs.map((item) => mapStaffInvite(item.id, item.data())),
    );
  },

  async createStaffInvite(input: CreateStaffInviteInput) {
    const actor = await getCurrentSignedInProfile();
    const normalizedEmail = normalizeEmail(input.email);

    if (!normalizedEmail) {
      throw new Error("Invite email is required.");
    }

    if (
      (actor.role === "chaplaincy" && input.role !== "chaplaincy") ||
      (actor.role === "security" && input.role !== "security") ||
      (actor.role !== "super_admin" && actor.role !== "chaplaincy" && actor.role !== "security")
    ) {
      throw new Error("You cannot create an invite for that role.");
    }

    if (input.role === "hall_admin" && !input.hostelId) {
      throw new Error("Hall admin invites must be tied to a hostel.");
    }

    const duplicateSnapshot = await getDocs(
      query(collection(getFirebaseDb(), "staffInvites"), where("email", "==", normalizedEmail)),
    );

    const existingPendingInvite = duplicateSnapshot.docs.find(
      (item) => item.data().status === "pending",
    );

    if (existingPendingInvite) {
      throw new Error("There is already an active invite for this email.");
    }

    let hostelName = "";

    if (input.hostelId) {
      const hostelSnapshot = await getDoc(doc(getFirebaseDb(), "hostels", input.hostelId));

      if (!hostelSnapshot.exists()) {
        throw new Error("Selected hostel was not found.");
      }

      hostelName = String(hostelSnapshot.data().name || "");
    }

    const inviteRef = await addDoc(collection(getFirebaseDb(), "staffInvites"), {
      email: normalizedEmail,
      name: input.name?.trim() || "",
      role: input.role,
      hostel: hostelName,
      hostelId: input.hostelId || "",
      status: "pending",
      createdBy: actor.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(getFirebaseDb(), "staffInviteDirectory", normalizedEmail), {
      email: normalizedEmail,
      role: input.role,
      name: input.name?.trim() || "",
      hostel: hostelName,
      hostelId: input.hostelId || "",
      status: "pending",
      updatedAt: serverTimestamp(),
    });

    const inviteSnapshot = await getDoc(inviteRef);
    return mapStaffInvite(inviteSnapshot.id, inviteSnapshot.data() || {});
  },

  async getStaffInviteDetails(token: string) {
    assertFirebaseReady();

    const snapshot = await getDoc(doc(getFirebaseDb(), "staffInvites", token));

    if (!snapshot.exists()) {
      return null;
    }

    const invite = mapStaffInvite(snapshot.id, snapshot.data());
    return invite.status === "pending" ? invite : null;
  },

  async registerStaffAccount(input: RegisterStaffInput) {
    const normalizedEmail = normalizeEmail(input.email);
    const name = input.name.trim();
    const password = input.password;
    const directRole = input.directRole;
    const token = input.token?.trim();

    if (!name || !normalizedEmail || password.length < 8) {
      throw new Error("Valid name, email, and password are required.");
    }

    let role: Exclude<User["role"], "student" | "super_admin"> | undefined = directRole;
    let hostel = "";
    let hostelId = "";
    let approvalStatus: User["approvalStatus"] = "pending";

    if (token) {
      const invite = await this.getStaffInviteDetails(token);

      if (!invite) {
        throw new Error("This invite is invalid, expired, or already used.");
      }

      if (invite.email !== normalizedEmail) {
        throw new Error("Use the invited email address to complete this signup.");
      }

      role = invite.role;
      hostel = invite.hostel || "";
      hostelId = invite.hostelId || "";
      approvalStatus = "approved";
    }

    if (!role) {
      throw new Error("Choose a valid staff portal to create this account.");
    }

    const credentials = await createUserWithEmailAndPassword(
      getFirebaseAuth(),
      normalizedEmail,
      password,
    );

    await updateProfile(credentials.user, { displayName: name });

    const userRef = doc(getFirebaseDb(), "users", credentials.user.uid);
    await setDoc(userRef, {
      name,
      email: normalizedEmail,
      matric: `${role.toUpperCase().replace(/_/g, "-")}-${Date.now().toString().slice(-6)}`,
      role,
      hostel,
      permissions: getDefaultPermissionsForRole(role),
      disabled: false,
      approvalStatus,
      ...(approvalStatus === "approved"
        ? {
            approvalReviewedAt: serverTimestamp(),
          }
        : {}),
      ...(token ? { inviteToken: token } : {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (token) {
      await updateDoc(doc(getFirebaseDb(), "staffInvites", token), {
        status: "claimed",
        claimedBy: credentials.user.uid,
        claimedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await setDoc(
        doc(getFirebaseDb(), "staffInviteDirectory", normalizedEmail),
        {
          email: normalizedEmail,
          role,
          name,
          hostel,
          hostelId,
          status: "claimed",
          claimedBy: credentials.user.uid,
          claimedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      if (role === "hall_admin" && hostelId) {
        await updateDoc(doc(getFirebaseDb(), "hostels", hostelId), {
          hallAdminEmail: normalizedEmail,
          updatedAt: serverTimestamp(),
        });
      }
    }

    const snapshot = await getDoc(userRef);
    return mapUser(snapshot.id, snapshot.data() || {});
  },

  async addAdmin(adminData: CreateAdminInput) {
    const actor = await getCurrentSignedInProfile();

    if (actor.role !== "super_admin") {
      throw new Error("Only the main admin can create staff accounts.");
    }

    const normalizedEmail = normalizeEmail(adminData.email);
    const name = adminData.name.trim();
    const temporaryPassword = generateTemporaryPassword();
    const uid = await createAuthUserWithoutSwitchingSession(name, normalizedEmail, temporaryPassword);

    const userRef = doc(getFirebaseDb(), "users", uid);
    await setDoc(userRef, {
      name,
      email: normalizedEmail,
      matric: `${adminData.role.toUpperCase().replace(/_/g, "-")}-${Date.now().toString().slice(-6)}`,
      role: adminData.role,
      hostel: adminData.hostel?.trim() || "",
      permissions: adminData.permissions?.length ? adminData.permissions : getDefaultPermissionsForRole(adminData.role),
      disabled: false,
      approvalStatus: "approved",
      approvalReviewedBy: actor.id,
      approvalReviewedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const snapshot = await getDoc(userRef);

    return {
      user: mapUser(snapshot.id, snapshot.data() || {}),
      temporaryPassword,
    } satisfies CreatedAdminResult;
  },

  async removeAdmin(adminId: string) {
    const actor = await getCurrentSignedInProfile();

    if (actor.role !== "super_admin") {
      throw new Error("Only the main admin can remove staff members.");
    }

    await updateDoc(doc(getFirebaseDb(), "users", adminId), {
      disabled: true,
      updatedAt: serverTimestamp(),
    });

    return true;
  },

  async updateAdmin(adminId: string, data: Partial<User>) {
    const actor = await getCurrentSignedInProfile();

    if (actor.role !== "super_admin") {
      throw new Error("Only the main admin can update staff accounts.");
    }

    const allowedUpdates: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };

    for (const key of ["name", "hostel", "photo", "disabled"]) {
      if (key in data) {
        allowedUpdates[key] = data[key as keyof User];
      }
    }

    if (Array.isArray(data.permissions)) {
      allowedUpdates.permissions = data.permissions;
    }

    await updateDoc(doc(getFirebaseDb(), "users", adminId), allowedUpdates);
    const snapshot = await getDoc(doc(getFirebaseDb(), "users", adminId));
    return mapUser(snapshot.id, snapshot.data() || {});
  },

  async approveStaffAccount(userId: string) {
    const actor = await getCurrentSignedInProfile();

    if (actor.role !== "super_admin") {
      throw new Error("Only the super admin can approve staff accounts.");
    }

    await updateDoc(doc(getFirebaseDb(), "users", userId), {
      approvalStatus: "approved",
      approvalReviewedBy: actor.id,
      approvalReviewedAt: serverTimestamp(),
      rejectionReason: "",
      disabled: false,
      updatedAt: serverTimestamp(),
    });

    const snapshot = await getDoc(doc(getFirebaseDb(), "users", userId));
    return mapUser(snapshot.id, snapshot.data() || {});
  },

  async rejectStaffAccount(userId: string, reason: string) {
    const actor = await getCurrentSignedInProfile();

    if (actor.role !== "super_admin") {
      throw new Error("Only the super admin can reject staff accounts.");
    }

    await updateDoc(doc(getFirebaseDb(), "users", userId), {
      approvalStatus: "rejected",
      approvalReviewedBy: actor.id,
      approvalReviewedAt: serverTimestamp(),
      rejectionReason: reason.trim(),
      disabled: true,
      updatedAt: serverTimestamp(),
    });

    const snapshot = await getDoc(doc(getFirebaseDb(), "users", userId));
    return mapUser(snapshot.id, snapshot.data() || {});
  },

  async deleteUserAccount(userId: string) {
    const actor = await getCurrentSignedInProfile();

    if (actor.role !== "super_admin") {
      throw new Error("Only the super admin can disable users.");
    }

    await updateDoc(doc(getFirebaseDb(), "users", userId), {
      disabled: true,
      updatedAt: serverTimestamp(),
    });

    return true;
  },

  async sendUserPasswordReset(email: string) {
    await sendPasswordResetEmail(getFirebaseAuth(), normalizeEmail(email));
    return true;
  },

  async sendAnnouncement(title: string, message: string, recipientRole?: User["role"]) {
    const actor = await getCurrentSignedInProfile();

    if (!["hall_admin", "chaplaincy", "super_admin"].includes(actor.role)) {
      throw new Error("You do not have permission to send announcements.");
    }

    const announcementRef = await addDoc(collection(getFirebaseDb(), "announcements"), {
      title: title.trim(),
      message: message.trim(),
      ...(recipientRole ? { recipientRole } : {}),
      createdBy: actor.id,
      createdAt: serverTimestamp(),
    });

    const snapshot = await getDoc(announcementRef);
    return mapAnnouncement(snapshot.id, snapshot.data() || {});
  },

  async getAnnouncements(role?: User["role"]) {
    assertFirebaseReady();

    const snapshot = await getDocs(collection(getFirebaseDb(), "announcements"));
    const announcements = snapshot.docs.map((item) => mapAnnouncement(item.id, item.data()));

    return sortByCreatedAtDesc(
      announcements.filter(
        (announcement) => !announcement.recipientRole || !role || announcement.recipientRole === role,
      ),
    );
  },

  async sendNotification(userId: string, title: string, message: string) {
    const actor = await getCurrentSignedInProfile();

    if (!["hall_admin", "chaplaincy", "security", "super_admin"].includes(actor.role)) {
      throw new Error("You do not have permission to send notifications.");
    }

    const notificationRef = await addDoc(collection(getFirebaseDb(), "notifications"), {
      userId,
      type: "info",
      title: title.trim(),
      message: message.trim(),
      read: false,
      createdAt: serverTimestamp(),
    });

    const snapshot = await getDoc(notificationRef);
    return mapNotification(snapshot.id, snapshot.data() || {});
  },

  async getUserNotifications(userId: string) {
    assertFirebaseReady();

    const snapshot = await getDocs(
      query(collection(getFirebaseDb(), "notifications"), where("userId", "==", userId)),
    );

    return sortByCreatedAtDesc(
      snapshot.docs.map((item) => mapNotification(item.id, item.data())),
    );
  },

  async getAnalytics() {
    const [studentsSnapshot, requestsSnapshot, passesSnapshot, scansSnapshot] = await Promise.all([
      getDocs(query(collection(getFirebaseDb(), "users"), where("role", "==", "student"))),
      getDocs(collection(getFirebaseDb(), "passRequests")),
      getDocs(collection(getFirebaseDb(), "passes")),
      getDocs(collection(getFirebaseDb(), "scans")),
    ]);

    const requests = requestsSnapshot.docs.map((item) => mapPassRequest(item.id, item.data()));
    const passes = passesSnapshot.docs.map((item) => mapPass(item.id, item.data()));
    const now = Date.now();
    const dayBuckets = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      return {
        day: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        start: date.getTime(),
        end: date.getTime() + 24 * 60 * 60 * 1000,
      };
    });

    return {
      totalStudents: studentsSnapshot.size,
      totalRequests: requests.length,
      approvedCount: requests.filter((request) => request.status === "approved").length,
      pendingCount: requests.filter((request) =>
        ["pending", "chaplaincy_required"].includes(request.status),
      ).length,
      rejectedCount: requests.filter((request) => request.status === "rejected").length,
      passesScanned: scansSnapshot.size,
      activePassesCount: passes.filter((pass) => {
        if (pass.status !== "approved") {
          return false;
        }

        const departure = new Date(pass.departureDate).getTime();
        const expectedReturn = new Date(pass.expectedReturnDate).getTime();
        return departure <= now && expectedReturn >= now;
      }).length,
      trend: dayBuckets.map((bucket) => {
        const dailyRequests = requests.filter((request) => {
          const createdAt = new Date(request.createdAt).getTime();
          return createdAt >= bucket.start && createdAt < bucket.end;
        });

        return {
          day: bucket.day,
          requests: dailyRequests.length,
          approved: dailyRequests.filter((request) => request.status === "approved").length,
          rejected: dailyRequests.filter((request) => request.status === "rejected").length,
        };
      }),
    } satisfies AnalyticsSummary;
  },

  async verifyQRCode(qrCode: string) {
    const normalizedQrCode = qrCode.trim();
    const snapshot = await getDocs(
      query(collection(getFirebaseDb(), "passes"), where("qrCode", "==", normalizedQrCode), limit(1)),
    );

    if (snapshot.empty) {
      return {
        pass: null,
        isValid: false,
        message: "QR code not found or invalid.",
      };
    }

    const pass = mapPass(snapshot.docs[0].id, snapshot.docs[0].data());
    const now = Date.now();
    const departure = new Date(pass.departureDate).getTime();
    const expectedReturn = new Date(pass.expectedReturnDate).getTime();
    const isValid =
      pass.status === "approved" && departure <= now && expectedReturn >= now;

    return mapPassVerificationResult({
      pass,
      isValid,
      message: isValid ? "Pass verified successfully." : "Pass is not currently active.",
    });
  },

  async scanEntry(qrCode: string, location = "Main Gate") {
    return this.logScan(qrCode, location);
  },

  async logScan(qrCode: string, location: string) {
    const verification = await this.verifyQRCode(qrCode);
    const scanRef = await addDoc(collection(getFirebaseDb(), "scans"), {
      qrCode: qrCode.trim(),
      passId: verification.pass?.id || "",
      studentId: verification.pass?.studentId || "",
      location: location.trim() || "Main Gate",
      status: verification.isValid ? "success" : "failed",
      timestamp: serverTimestamp(),
    });

    const snapshot = await getDoc(scanRef);
    return mapScanLog(snapshot.id, snapshot.data() || {});
  },

  async getScanHistory(resultLimit = 50) {
    assertFirebaseReady();

    const snapshot = await getDocs(
      query(collection(getFirebaseDb(), "scans"), orderBy("timestamp", "desc"), limit(resultLimit)),
    );

    return snapshot.docs.map((item) => mapScanLog(item.id, item.data()));
  },

  isConfigured() {
    return isFirebaseConfigured;
  },

  configurationError() {
    return getFirebaseConfigurationError();
  },

  async validateStudentSignupEmail(email: string) {
    const normalizedEmail = normalizeEmail(email);

    if (
      normalizedEmail === staffPortals.admin.leadEmail ||
      normalizedEmail === staffPortals.security.leadEmail ||
      normalizedEmail === staffPortals.chaplaincy.leadEmail
    ) {
      return {
        allowed: false,
        message: "That email is reserved for staff setup. Use the staff portal instead.",
      };
    }

    const snapshot = await getDoc(doc(getFirebaseDb(), "staffInviteDirectory", normalizedEmail));
    const hasPendingInvite = snapshot.exists() && snapshot.data().status === "pending";

    return hasPendingInvite
      ? {
          allowed: false,
          message: "That email already has a staff invite. Use the matching staff portal instead.",
        }
      : {
          allowed: true,
        };
  },

  async syncStudentAccessDirectory(students?: User[]) {
    const nextStudents = students || (await this.getAllStudents());

    if (!nextStudents.length) {
      return 0;
    }

    const db = getFirebaseDb();
    let syncedCount = 0;

    for (let index = 0; index < nextStudents.length; index += 400) {
      const batch = writeBatch(db);
      const chunk = nextStudents.slice(index, index + 400);

      for (const student of chunk) {
        const normalizedMatric = normalizeMatric(student.matric);

        if (!normalizedMatric) {
          continue;
        }

        batch.set(doc(db, "studentAccessDirectory", getStudentAccessDirectoryId(normalizedMatric)), {
          directoryId: getStudentAccessDirectoryId(normalizedMatric),
          userId: student.id,
          role: "student",
          name: student.name,
          email: student.email.trim().toLowerCase(),
          matric: student.matric,
          matricNormalized: normalizedMatric,
          department: student.department || "",
          faculty: student.faculty || "",
          level: student.level || "",
          hostel: student.hostel || "",
          room: student.room || "",
          createdAt: student.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        syncedCount += 1;
      }

      await batch.commit();
    }

    return syncedCount;
  },
};
