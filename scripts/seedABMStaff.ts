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
    { name: 'HAROON', role: 'staff', pin: '1001', staffCode: 'ABM001', isActive: true },
    { name: 'HASSAN', role: 'staff', pin: '1002', staffCode: 'ABM002', isActive: true },
    { name: 'Waqar', role: 'staff', pin: '1003', staffCode: 'ABM003', isActive: true },
    { name: 'SHAHBAZ', role: 'staff', pin: '1004', staffCode: 'ABM004', isActive: true },
    { name: 'WAQAS', role: 'staff', pin: '1005', staffCode: 'ABM005', isActive: true },
    { name: 'ABDULWAHAB', role: 'staff', pin: '1006', staffCode: 'ABM006', isActive: true },
    { name: 'SAHIL', role: 'staff', pin: '1007', staffCode: 'ABM007', isActive: true },
    { name: 'SAMEER', role: 'staff', pin: '1008', staffCode: 'ABM008', isActive: true },
    { name: 'CASPER', role: 'staff', pin: '1009', staffCode: 'ABM009', isActive: true },
    { name: 'SALVIC', role: 'staff', pin: '1010', staffCode: 'ABM010', isActive: true },
    { name: 'SHAHID', role: 'staff', pin: '1011', staffCode: 'ABM011', isActive: true },
    { name: 'Ankit', role: 'staff', pin: '1012', staffCode: 'ABM012', isActive: true },
    { name: 'Mustafa', role: 'staff', pin: '1013', staffCode: 'ABM013', isActive: true },
    { name: 'Arshdeep', role: 'staff', pin: '1014', staffCode: 'ABM014', isActive: true },
    { name: 'Parmood', role: 'staff', pin: '1015', staffCode: 'ABM015', isActive: true }
];

async function seed() {
    console.log("Starting staff seeding for ABM Autos...");
    const staffCol = collection(db, "staff");
    for (const s of staff) {
        await addDoc(staffCol, s);
        console.log(`Added: ${s.name} (PIN: ${s.pin}, Code: ${s.staffCode})`);
    }
    console.log("Finished seeding 15 staff members.");
    process.exit(0);
}

seed().catch((err) => {
    console.error("Seeding failed. Make sure .env.local is configured with the new Firebase project keys.");
    console.error(err);
    process.exit(1);
});
