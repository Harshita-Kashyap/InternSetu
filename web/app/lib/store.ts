export type Profile = {
  education?: string;
  degree?: string;
  field?: string;
  college?: string;
  skills?: string[];
  interests?: string[];
  location?: string;
  relocate?: string;
  workMode?: string;
  domains?: string[];
};

const PROFILE_KEY = "internsetu_profile";
const SESSION_KEY = "internsetu_session";

export function loadProfile(): Profile {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveProfile(patch: Partial<Profile>) {
  try {
    localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({ ...loadProfile(), ...patch })
    );
  } catch {}
}

export function startSession(username: string) {
  try {
    localStorage.setItem(SESSION_KEY, username);
  } catch {}
}

export function getSession(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(SESSION_KEY) || "";
  } catch {
    return "";
  }
}

export function endSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}

const CONSENT_KEY = "internsetu_privacy_consent";

export function hasPrivacyConsent(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return localStorage.getItem(CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

export function acceptPrivacyConsent() {
  try {
    localStorage.setItem(CONSENT_KEY, "accepted");
  } catch {}
}

export function withdrawPrivacyConsent() {
  try {
    localStorage.removeItem(CONSENT_KEY);
  } catch {}
}
