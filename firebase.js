// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Add your web app's Firebase configuration
// IMPORTANT: Replace the placeholder values below with your actual Firebase project configuration.
// You can find this in your Firebase project settings.
const firebaseConfig = {
  apiKey: "AIzaSyC7mHz3q5nhMszNiPffM-ws8Se9PZM892w",
  authDomain: "civic-reporter-310d8.firebaseapp.com",
  projectId: "civic-reporter-310d8",
  storageBucket: "civic-reporter-310d8.firebasestorage.app",
  messagingSenderId: "676919605060",
  appId: "1:676919605060:web:1782b5cfc01fa8a14c4911",
  measurementId: "G-YB1YK6M27Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

// Export the services for use in your application
export { auth, db };

