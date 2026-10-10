import AsyncStorage from "@react-native-async-storage/async-storage";

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

export async function loadProfile(): Promise<Profile> {
  try {
    return JSON.parse((await AsyncStorage.getItem(PROFILE_KEY)) || "{}");
  } catch {
    return {};
  }
}
export async function saveProfile(patch: Partial<Profile>) {
  const cur = await loadProfile();
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify({ ...cur, ...patch }));
}
export const startSession = (u: string) => AsyncStorage.setItem(SESSION_KEY, u);
export const getSession = async () => (await AsyncStorage.getItem(SESSION_KEY)) || "";
export const endSession = () => AsyncStorage.removeItem(SESSION_KEY);
