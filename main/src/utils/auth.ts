import { User } from "firebase/auth";

export async function getToken(user: User, forceRefresh = false): Promise<string> {
    try {
      return await user.getIdToken(forceRefresh);
    } catch {
      return await user.getIdToken(true); // If getting the token failed, try forcing a refresh once
    }
}