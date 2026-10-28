import { app, auth } from "@sage/firebase";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getFirestore, Firestore } from "firebase/firestore";

// The app and auth instance live in @sage/firebase, shared with SAGE Admin
const analytics: Analytics = getAnalytics(app);
const db: Firestore = getFirestore(app);

export { app, analytics, auth, db };
