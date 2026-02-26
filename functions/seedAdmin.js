const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// To run this securely, we'll assume the CLI is logged in. 
// Firebase Admin SDK can use Google Application Default Credentials
// If not, we run it and see.

initializeApp();

const db = getFirestore();

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
    const staffCol = db.collection("staff");
    for (const s of staff) {
        await staffCol.doc(s.staffCode).set(s);
        console.log(`Added ${s.name}`);
    }
    console.log("Finished seeding staff!");
}

seed().catch(console.error);
