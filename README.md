# TikTok Clone - موقع شبيه تيك توك

موقع ويب يشبه تيك توك يتيح رفع وعرض الفيديوهات باستخدام Cloudinary و Firebase.

## التقنيات المستخدمة
- HTML5/CSS3
- JavaScript
- Firebase Auth + Realtime Database
- Cloudinary لرفع الفيديوهات

## الإعدادات المطلوبة

### 1. Firebase
1. أنشئ مشروع على [Firebase Console](https://console.firebase.google.com/)
2. فعّل Authentication (Email/Password)
3. فعّل Realtime Database
4. انسخ إعدادات Firebase إلى `firebase-config.js`

### 2. Cloudinary
1. أنشئ حساب على [Cloudinary](https://cloudinary.com/)
2. احصل على Cloud Name من Dashboard
3. أنشئ Upload Preset (Settings > Upload > Upload Presets)
4. ضع القيم في `firebase-config.js`

## التشغيل المحلي
```bash
# استخدم أي خادم محلي مثل Live Server في VS Code
# أو استخدم Python:
python -m http.server 8000
