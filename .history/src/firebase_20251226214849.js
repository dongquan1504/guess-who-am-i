// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCKBi8ZqCtx90vh-n1Dmzh0tBuLOG9pCXs",
  authDomain: "guesswhoami-4d9b8.firebaseapp.com",
  projectId: "guesswhoami-4d9b8",
  storageBucket: "guesswhoami-4d9b8.firebasestorage.app",
  messagingSenderId: "472088516090",
  appId: "1:472088516090:web:2db812f0bf65500b5cc043",
  measurementId: "G-MZNX906SP8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const db = getDatabase(app);
export const firestore = getFirestore(app);