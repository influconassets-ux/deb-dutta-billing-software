import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB7K9rkor0POFJly7Powi5ZKWI5WI0HvWE",
  authDomain: "advocate-billing.firebaseapp.com",
  projectId: "advocate-billing",
  storageBucket: "advocate-billing.firebasestorage.app",
  messagingSenderId: "707336717045",
  appId: "1:707336717045:web:e6c1d37acd3d34fd50bbbc"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
