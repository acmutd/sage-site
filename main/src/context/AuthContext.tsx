import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase-config";
import { getToken } from "@/utils/auth";
import {
  onAuthStateChanged,
  User,
  setPersistence,
  browserLocalPersistence,
  signOut,
} from "firebase/auth";
import Clarity from '@microsoft/clarity';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => void;
  profilePicture: string | null;
  setProfilePicture: (url: string) => void;
  authChecking: boolean;
  setAuthChecking: (checking: boolean) => void;
  allowedYears: number;
  hasSeenChatbotTutorial: boolean;
  hasSeenPlannerTutorial: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: () => {},
  profilePicture: null,
  setProfilePicture: () => {},
  authChecking: false,
  setAuthChecking: () => {},
  allowedYears: 10,
  hasSeenChatbotTutorial: false,
  hasSeenPlannerTutorial: false,
});

const CRUD_API = import.meta.env.VITE_CRUD_API as string | undefined;

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authChecking, setAuthChecking] = useState(false);
  const [allowedYears, setAllowedYears] = useState<number>(10);
  const [hasSeenChatbotTutorial, setHasSeenChatbotTutorial] = useState(false);
  const [hasSeenPlannerTutorial, setHasSeenPlannerTutorial] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          setUser(user);
          setLoading(false);

          if (user) {
            setUser(user);
            const token = await getToken(user);

            if (import.meta.env.MODE !== "development") {
              Clarity.init(import.meta.env.VITE_CLARITY_PROJECT_ID);
            }

            // add in pfp globally to navbar
            const response = await fetch(CRUD_API as string, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: user?.uid,
                action: "getProfile",
                token,
              }),
            });
          
            if (!response.ok) {
              throw new Error("Failed to fetch user info");
            }

            const data = await response.json();
            const picType = data.profile?.["user-fields"]?.profile_picture_type;
            const photoUrl = data.profile?.["user-fields"]?.photo_url || user.photoURL || "";
            
            setProfilePicture(
              picType === 0 && photoUrl
                ? photoUrl
                : `/assets/profile_pics/${picType}.png`
            );

            setAllowedYears(data.profile?.["system-fields"]?.allowedYears ?? 10);
            setHasSeenChatbotTutorial(data.profile?.["system-fields"]?.hasSeenChatbotTutorial ?? false);
            setHasSeenPlannerTutorial(data.profile?.["system-fields"]?.hasSeenPlannerTutorial ?? false);
          
          } else {
            setUser(null);
            setProfilePicture(null);
          }

          setLoading(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error("Error setting auth persistence:", error);
        setLoading(false); // Fail-safe to prevent permanent loading
      }
    };

    initializeAuth();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      localStorage.clear();
      sessionStorage.clear();
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, profilePicture, setProfilePicture, authChecking, setAuthChecking, allowedYears, hasSeenChatbotTutorial, hasSeenPlannerTutorial, }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
