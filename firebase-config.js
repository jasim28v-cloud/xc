// Firebase Configuration (حساب amre-3fae9)
const firebaseConfig = {
    apiKey: "AIzaSyCFTMtaIp9ld3UKmscT8MBxfCKh5_-fOcM",
    authDomain: "amre-3fae9.firebaseapp.com",
    databaseURL: "https://amre-3fae9-default-rtdb.firebaseio.com",
    projectId: "amre-3fae9",
    storageBucket: "amre-3fae9.firebasestorage.app",
    messagingSenderId: "573470407576",
    appId: "1:573470407576:web:3a24d023cbb10d6ce309ed"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
const storage = firebase.storage();

// Cloudinary Configuration (حساب do33_x)
const CLOUD_NAME = 'da457cqma';
const UPLOAD_PRESET = 'do33_x'; // استخدمت الاسم do33_x بناءً على طلبك

console.log('✅ Firebase configuration loaded');
