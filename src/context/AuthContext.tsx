import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase-config";
import {
  onAuthStateChanged,
  User,
  setPersistence,
  browserLocalPersistence,
  signOut,
} from "firebase/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => void;
  profilePicture: string | null;
  authChecking: boolean;
  setAuthChecking: (checking: boolean) => void;
  allowedYears: number;
}

const loadClarity = (projectId: string) => {
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${projectId}`;
  document.head.appendChild(script);
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: () => {},
  profilePicture: null,
  authChecking: false,
  setAuthChecking: () => {},
  allowedYears: 10,
});

const CRUD_API = import.meta.env.VITE_CRUD_API as string | undefined;

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profilePicture, setProfilePicture] = useState(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authChecking, setAuthChecking] = useState(false);
  const [allowedYears, setAllowedYears] = useState<number>(10);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          setUser(user);
          setLoading(false);
          
          if (user) {
            setUser(user);
            const token = await user.getIdToken();

            if (import.meta.env.MODE !== "development") {
              loadClarity(import.meta.env.VITE_CLARITY_PROJECT_ID);
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
            setProfilePicture(
              data.photo_url || `/assets/profile_pics/${data.profile_picture_type}.png`
            );
            setAllowedYears(data.profile?.["system-fields"]?.allowedYears ?? 10);
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
    <AuthContext.Provider value={{ user, loading, logout, profilePicture, authChecking, setAuthChecking, allowedYears, }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
