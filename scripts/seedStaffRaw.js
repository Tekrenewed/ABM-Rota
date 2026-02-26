const admin = require('firebase-admin');
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
    process.env.GOOGLE_APPLICATION_CREDENTIALS = __dirname + '/project-key.json';
    // Let's rely on gcloud default auth or use a service account if available.
    // Actually, wait, let's just initialize admin sdk and run it. The user has gcloud credentials if they deployed via CLI, maybe GOOGLE_APPLICATION_CREDENTIALS is not set but firebase tools has access to the project.
}

seed();
