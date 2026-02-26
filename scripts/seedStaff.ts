import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const staff = [
    { name: 'Alice Smith', role: 'manager', pin: '1111', staffCode: 'RTW101', isActive: true },
    { name: 'Bob Johnson', role: 'kitchen', pin: '2222', staffCode: 'RTW102', isActive: true },
    { name: 'Charlie Brown', role: 'counter', pin: '3333', staffCode: 'RTW103', isActive: true },
    { name: 'David Lee', role: 'driver', pin: '4444', staffCode: 'RTW104', isActive: true },
    { name: 'Emma Watson', role: 'kitchen', pin: '5555', staffCode: 'RTW105', isActive: true },
    { name: 'Fiona Gallagher', role: 'counter', pin: '6666', staffCode: 'RTW106', isActive: true },
    { name: 'George Clooney', role: 'driver', pin: '7777', staffCode: 'RTW107', isActive: true },
    { name: 'Hannah Montana', role: 'kitchen', pin: '8888', staffCode: 'RTW108', isActive: true }
];

async function seed() {
    const staffCol = collection(db, "staff");
    for (const s of staff) {
        await addDoc(staffCol, s);
        console.log(`Added \${s.name}`);
    }
    console.log("Finished seeding staff.");
    process.exit(0);
}

seed().catch(console.error);
