// ============== المتغيرات العامة ==============
let currentUser = null;
let currentVideoPlaying = null;

// ============== دوال المصادقة ==============
document.addEventListener('DOMContentLoaded', () => {
    // مراقبة حالة تسجيل الدخول
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            loadUserData(user.uid);
            showMainScreen();
            loadVideos();
        } else {
            showAuthScreen();
        }
    });

    // أزرار التبويب
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
            document.getElementById(`${tab}Form`).classList.add('active');
        });
    });

    // تسجيل الدخول
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        try {
            await auth.signInWithEmailAndPassword(email, password);
        } catch (error) {
            alert('خطأ في تسجيل الدخول: ' + error.message);
        }
    });

    // إنشاء حساب
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('regUsername').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            await database.ref(`users/${userCredential.user.uid}`).set({
                uid: userCredential.user.uid,
                username: username,
                email: email,
                profilePicture: '',
                bio: '',
                followers: [],
                following: [],
                totalLikes: 0,
                createdAt: Date.now()
            });
        } catch (error) {
            alert('خطأ في التسجيل: ' + error.message);
        }
    });

    // تسجيل الخروج
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await auth.signOut();
    });

    // التنقل بين الصفحات
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.nav;
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.getElementById(`${page}Page`).classList.add('active');
            
            if (page === 'profile') {
                loadUserProfile();
            }
        });
    });

    // رفع الفيديو
    const uploadArea = document.getElementById('uploadArea');
    const videoInput = document.getElementById('videoInput');
    
    uploadArea.addEventListener('click', () => {
        videoInput.click();
    });
    
    videoInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            uploadArea.innerHTML = `
                <span class="upload-icon">✅</span>
                <p>${file.name}</p>
            `;
        }
    });
    
    document.getElementById('uploadBtn').addEventListener('click', uploadVideo);
    
    // مودال الفيديو
    document.querySelector('.close-modal').addEventListener('click', () => {
        document.getElementById('videoPlayerModal').classList.remove('active');
        const video = document.getElementById('modalVideo');
        video.pause();
    });
});

// ============== دوال تحميل البيانات ==============
async function loadUserData(uid) {
    const snapshot = await database.ref(`users/${uid}`).get();
    if (snapshot.exists()) {
        currentUser = { uid, ...snapshot.val() };
        updateProfileUI();
    }
}

function updateProfileUI() {
    if (currentUser) {
        document.getElementById('profileUsername').textContent = currentUser.username;
        document.getElementById('profileEmail').textContent = currentUser.email;
        document.getElementById('followersCount').textContent = currentUser.followers?.length || 0;
        document.getElementById('followingCount').textContent = currentUser.following?.length || 0;
    }
}

async function loadUserProfile() {
    if (!currentUser) return;
    
    // تحميل فيديوهات المستخدم
    const videosSnapshot = await database.ref('videos').orderByChild('author/uid').equalTo(currentUser.uid).get();
    const videosList = document.getElementById('userVideosList');
    videosList.innerHTML = '';
    
    let count = 0;
    if (videosSnapshot.exists()) {
        videosSnapshot.forEach(child => {
            count++;
            const video = child.val();
            const thumb = document.createElement('img');
            thumb.className = 'video-thumb';
            thumb.src = video.thumbnailUrl || 'https://via.placeholder.com/150x267';
            thumb.onclick = () => playVideo(video);
            videosList.appendChild(thumb);
        });
    }
    document.getElementById('videosCount').textContent = count;
}

async function loadVideos() {
    const container = document.getElementById('videoContainer');
    container.innerHTML = '<div class="loading-spinner">جاري تحميل الفيديوهات...</div>';
    
    const videosSnapshot = await database.ref('videos').once('value');
    container.innerHTML = '';
    
    if (!videosSnapshot.exists()) {
        container.innerHTML = '<div class="loading-spinner">لا توجد فيديوهات بعد</div>';
        return;
    }
    
    const videos = [];
    videosSnapshot.forEach(child => {
        videos.push({ id: child.key, ...child.val() });
    });
    
    // ترتيب من الأحدث للأقدم
    videos.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    
    videos.forEach(video => {
        const videoElement = createVideoElement(video);
        container.appendChild(videoElement);
    });
}

function createVideoElement(video) {
    const div = document.createElement('div');
    div.className = 'video-item';
    div.innerHTML = `
        <video src="${video.videoUrl}" poster="${video.thumbnailUrl || ''}" loop muted></video>
        <div class="video-overlay">
            <div class="video-author">
                <div class="avatar">👤</div>
                <span class="username">@${video.author?.username || 'user'}</span>
            </div>
            <div class="video-description">${video.description || ''}</div>
            <div class="video-music">🎵 ${video.audioName || 'Original Sound'}</div>
        </div>
        <div class="video-actions-side">
            <button class="video-action" onclick="likeVideo('${video.id}')">
                <span>❤️</span>
                <span>${video.likes?.length || 0}</span>
            </button>
            <button class="video-action" onclick="openComments('${video.id}')">
                <span>💬</span>
                <span>${video.comments?.length || 0}</span>
            </button>
            <button class="video-action" onclick="shareVideo('${video.videoUrl}')">
                <span>📤</span>
                <span>مشاركة</span>
            </button>
        </div>
    `;
    
    // تشغيل/إيقاف الفيديو عند التمرير
    const videoEl = div.querySelector('video');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                videoEl.play();
                currentVideoPlaying = videoEl;
            } else {
                videoEl.pause();
            }
        });
    }, { threshold: 0.5 });
    observer.observe(videoEl);
    
    return div;
}

// ============== دوال التفاعل ==============
async function likeVideo(videoId) {
    if (!currentUser) return;
    
    const videoRef = database.ref(`videos/${videoId}/likes`);
    const snapshot = await videoRef.get();
    let likes = snapshot.val() || [];
    
    if (likes.includes(currentUser.uid)) {
        likes = likes.filter(id => id !== currentUser.uid);
    } else {
        likes.push(currentUser.uid);
    }
    
    await videoRef.set(likes);
    loadVideos(); // تحديث العرض
}

async function uploadVideo() {
    const videoFile = document.getElementById('videoInput').files[0];
    const description = document.getElementById('videoDesc').value;
    
    if (!videoFile) {
        alert('الرجاء اختيار فيديو');
        return;
    }
    
    const progressDiv = document.getElementById('uploadProgress');
    const progressFill = progressDiv.querySelector('.progress-fill');
    progressDiv.style.display = 'block';
    
    try {
        // رفع الفيديو إلى Cloudinary
        const formData = new FormData();
        formData.append('file', videoFile);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('resource_type', 'video');
        
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`);
        
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const percent = (e.loaded / e.total) * 100;
                progressFill.style.width = `${percent}%`;
            }
        };
        
        const response = await new Promise((resolve, reject) => {
            xhr.onload = () => resolve(xhr);
            xhr.onerror = () => reject(xhr);
            xhr.send(formData);
        });
        
        const result = JSON.parse(response.responseText);
        
        // حفظ البيانات في Firebase
        const newVideoRef = database.ref('videos').push();
        await newVideoRef.set({
            id: newVideoRef.key,
            videoUrl: result.secure_url,
            thumbnailUrl: result.secure_url.replace('.mp4', '.jpg'),
            description: description,
            author: {
                uid: currentUser.uid,
                username: currentUser.username,
                profilePicture: ''
            },
            likes: [],
            comments: [],
            views: 0,
            audioName: 'Original Sound',
            createdAt: Date.now(),
            isPrivate: false
        });
        
        progressDiv.style.display = 'none';
        alert('تم رفع الفيديو بنجاح!');
        
        // تنظيف النموذج
        document.getElementById('videoInput').value = '';
        document.getElementById('videoDesc').value = '';
        document.getElementById('uploadArea').innerHTML = `
            <span class="upload-icon">📹</span>
            <p>اضغط لاختيار فيديو</p>
        `;
        
        // العودة للصفحة الرئيسية
        document.querySelector('[data-nav="home"]').click();
        loadVideos();
        
    } catch (error) {
        alert('فشل الرفع: ' + error.message);
        progressDiv.style.display = 'none';
    }
}

function playVideo(video) {
    const modal = document.getElementById('videoPlayerModal');
    const videoEl = document.getElementById('modalVideo');
    const username = document.getElementById('modalUsername');
    const desc = document.getElementById('modalDesc');
    const likesCount = document.getElementById('modalLikes');
    
    videoEl.src = video.videoUrl;
    username.textContent = `@${video.author?.username || 'user'}`;
    desc.textContent = video.description || '';
    likesCount.textContent = video.likes?.length || 0;
    
    modal.classList.add('active');
    
    // تحديث بيانات الإعجاب عند فتح المودال
    document.getElementById('modalLikeBtn').onclick = () => {
        likeVideo(video.id);
        // تحديث العرض
        const newCount = (video.likes?.length || 0) + 1;
        likesCount.textContent = newCount;
    };
}

function openComments(videoId) {
    // يمكن إضافة نافذة تعليقات هنا
    alert('ميزة التعليقات قيد التطوير');
}

function shareVideo(url) {
    if (navigator.share) {
        navigator.share({
            title: 'شاهد هذا الفيديو',
            url: url
        });
    } else {
        navigator.clipboard.writeText(url);
        alert('تم نسخ الرابط');
    }
}

function showMainScreen() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('mainScreen').style.display = 'flex';
}

function showAuthScreen() {
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('mainScreen').style.display = 'none';
}
