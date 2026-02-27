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
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: () => {},
  profilePicture: null,
  authChecking: false,
  setAuthChecking: () => {},
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

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
            setUser(user);
            const token = await user.getIdToken();

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
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, profilePicture, authChecking, setAuthChecking, }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
