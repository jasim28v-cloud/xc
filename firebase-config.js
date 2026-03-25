// إعدادات Firebase - استبدل هذه بالقيم الخاصة بك من Firebase Console
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    databaseURL: "https://fokx-c135a-default-rtdb.firebaseio.com/",
    projectId: "fokx-c135a",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);

// مراجع الخدمات
const auth = firebase.auth();
const database = firebase.database();

// إعدادات Cloudinary
const CLOUDINARY_CLOUD_NAME = 'dk5kas1gc';
const CLOUDINARY_UPLOAD_PRESET = 'tiktok_upload'; // أنشئ هذا من لوحة تحكم Cloudinary
