import { initializeApp, FirebaseApp } from "firebase/app";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDk2JpGIYhijysYTA3ZF0FIkRHFknGuXK0",
  authDomain: "sage-gcp-backend.firebaseapp.com",
  projectId: "sage-gcp-backend",
  storageBucket: "sage-gcp-backend.firebasestorage.app",
  messagingSenderId: "41867293286",
  appId: "1:41867293286:web:7c0206ed96ff77d44533a7",
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);
const analytics: Analytics = getAnalytics(app);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

export { app, analytics, auth, db };
