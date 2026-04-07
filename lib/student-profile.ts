export const FACULTY_DEPARTMENTS = {
  FOS: [
    "Biochemistry",
    "Biology",
    "Chemistry",
    "Computer Science",
    "Mathematics",
    "Microbiology",
    "Physics",
    "Statistics",
  ],
  FBMS: [
    "Anatomy",
    "Medical Laboratory Science",
    "Nursing Science",
    "Physiology",
    "Public Health",
  ],
  FBSS: [
    "Accounting",
    "Business Administration",
    "Economics",
    "International Relations",
    "Mass Communication",
    "Political Science",
    "Sociology",
  ],
  FOE: [
    "Chemical Engineering",
    "Civil Engineering",
    "Computer Engineering",
    "Electrical and Electronics Engineering",
    "Mechanical Engineering",
    "Mechatronics Engineering",
  ],
  FOA: [
    "English and Literary Studies",
    "Fine Arts",
    "History and International Studies",
    "Music",
    "Philosophy",
    "Theatre Arts",
  ],
  FOL: ["Law"],
} as const;

export type FacultyCode = keyof typeof FACULTY_DEPARTMENTS;

export const FACULTY_OPTIONS: Array<{ value: FacultyCode; label: string }> = [
  { value: "FOS", label: "FOS" },
  { value: "FBMS", label: "FBMS" },
  { value: "FBSS", label: "FBSS" },
  { value: "FOE", label: "FOE" },
  { value: "FOA", label: "FOA" },
  { value: "FOL", label: "FOL" },
];

export const LEVEL_OPTIONS = [100, 200, 300, 400, 500] as const;

export type StudentLevel = (typeof LEVEL_OPTIONS)[number];

const ROOM_PATTERN = /^[A-L](?:[1-9]|1\d|2[0-5])$/;

export const ROOM_FORMAT_HINT = "Use a room code from A1 to L25, like A21 or D1.";

export function normalizeFaculty(value: string) {
  return value.trim().toUpperCase();
}

export function isFacultyCode(value: string): value is FacultyCode {
  return normalizeFaculty(value) in FACULTY_DEPARTMENTS;
}

export function getDepartmentsForFaculty(faculty?: string | null): string[] {
  const normalizedFaculty = normalizeFaculty(faculty || "");

  return isFacultyCode(normalizedFaculty)
    ? Array.from(FACULTY_DEPARTMENTS[normalizedFaculty])
    : [];
}

export function normalizeDepartment(value: string) {
  return value.trim();
}

export function isValidDepartmentForFaculty(faculty: string, department: string) {
  const normalizedDepartment = normalizeDepartment(department);

  return getDepartmentsForFaculty(faculty).includes(normalizedDepartment);
}

export function normalizeRoom(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

export function isValidRoom(value: string) {
  return ROOM_PATTERN.test(normalizeRoom(value));
}

export function parseStudentLevel(value: number | string | null | undefined): StudentLevel | null {
  if (typeof value === "number") {
    return LEVEL_OPTIONS.includes(value as StudentLevel) ? (value as StudentLevel) : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (!/^\d+$/.test(trimmedValue)) {
    return null;
  }

  const parsedLevel = Number(trimmedValue);
  return LEVEL_OPTIONS.includes(parsedLevel as StudentLevel)
    ? (parsedLevel as StudentLevel)
    : null;
}

export function normalizeStudentProfileDetails(input: {
  faculty: string;
  department: string;
  level: number | string;
  room: string;
}) {
  const faculty = normalizeFaculty(input.faculty);

  if (!isFacultyCode(faculty)) {
    throw new Error("Select a valid faculty.");
  }

  const department = normalizeDepartment(input.department);

  if (!department) {
    throw new Error("Select a department.");
  }

  if (!isValidDepartmentForFaculty(faculty, department)) {
    throw new Error("Select a department that matches the chosen faculty.");
  }

  const level = parseStudentLevel(input.level);

  if (!level) {
    throw new Error("Select a valid level between 100 and 500.");
  }

  const room = normalizeRoom(input.room);

  if (!isValidRoom(room)) {
    throw new Error("Room number must be a letter A to L followed by a number from 1 to 25.");
  }

  return {
    faculty,
    department,
    level,
    room,
  };
}
