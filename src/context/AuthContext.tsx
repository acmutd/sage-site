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

const AuthContext = createContext<{ user: User | null; logout: () => void }>({
  user: null,
  logout: () => {},
});

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Ensure authentication persistence
        await setPersistence(auth, browserLocalPersistence);

        // Listen for authentication state changes
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
            setUser(user);
            const token = await user.getIdToken();
            Cookies.set("authToken", token, { expires: 7 }); // Store auth token for 7 days
          } else {
            setUser(null);
            Cookies.remove("authToken"); // Clear cookies on logout
          }
        });

        return unsubscribe;
      } catch (error) {
        console.error("Error setting auth persistence:", error);
      }
    };

    initializeAuth();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      Cookies.remove("authToken");
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
