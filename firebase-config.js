// ⚠️ IMPORTANT: استبدل هذه القيم بالقيم الحقيقية من Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyB3cX5X7X9X1X2X3X4X5X6X7X8X9X0X",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://fokx-c135a-default-rtdb.firebaseio.com/",
    projectId: "fokx-c135a",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const database = firebase.database();

// إعدادات Cloudinary
const CLOUDINARY_CLOUD_NAME = 'dk5kas1gc';
const CLOUDINARY_UPLOAD_PRESET = 'tiktok_upload'; // أنشئ هذا من لوحة تحكم Cloudinary

console.log('✅ Firebase initialized');
