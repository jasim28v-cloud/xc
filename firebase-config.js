const firebaseConfig = {
    apiKey: "AIzaSyAxtEkrEgl0C9djPkxKKX-sENtOzPEbHB8",
    authDomain: "tope-e5350.firebaseapp.com",
    databaseURL: "https://tope-e5350-default-rtdb.firebaseio.com",
    projectId: "tope-e5350",
    storageBucket: "tope-e5350.firebasestorage.app",
    messagingSenderId: "187788115549",
    appId: "1:187788115549:web:0f3c00ff62c1ebc5ed97b4"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);

// تعريف المتغيرات العامة التي سيتم استخدامها في كل الملفات
const auth = firebase.auth();
const db = firebase.database();

// إعدادات Cloudinary للرفع
const CLOUD_NAME = 'daemk3hut';
const UPLOAD_PRESET = 'fok2_k';

console.log('✅ SHΔDØW Firebase Connected Successfully');
