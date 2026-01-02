import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase-config";
import {
  onAuthStateChanged,
  User,
  setPersistence,
  browserLocalPersistence,
  signOut,
} from "firebase/auth";
import Cookies from "js-cookie";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => void;
  profilePicture: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: () => {},
  profilePicture: null,
});

const CRUD_API = import.meta.env.VITE_CRUD_API as string | undefined;

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profilePicture, setProfilePicture] = useState(null);
  const [loading, setLoading] = useState<boolean>(true);

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
            Cookies.set("authToken", token, { expires: 7 });
          } else {
            setUser(null);
            setProfilePicture(null);
            Cookies.remove("authToken");
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
      localStorage.removeItem("chatbot_conversation");
      Cookies.remove("authToken");
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, profilePicture }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
