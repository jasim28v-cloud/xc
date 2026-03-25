// ============== المتغيرات العامة ==============
let currentUser = null;
let allVideos = [];

// ============== مراقبة حالة تسجيل الدخول ==============
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

// ============== عناصر DOM ==============
// Auth tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        document.getElementById(`${tab}Form`).classList.add('active');
    });
});

// Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        errorDiv.textContent = '';
    } catch (error) {
        errorDiv.textContent = error.message;
    }
});

// Register
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const errorDiv = document.getElementById('regError');
    
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
        errorDiv.textContent = '';
    } catch (error) {
        errorDiv.textContent = error.message;
    }
});

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await auth.signOut();
});

// Navigation
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

// Upload video
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
            <p>${file.name.substring(0, 30)}</p>
        `;
    }
});

document.getElementById('uploadBtn').addEventListener('click', uploadVideo);

// Modal close
document.querySelector('.close-modal').addEventListener('click', () => {
    document.getElementById('videoPlayerModal').classList.remove('active');
    const video = document.getElementById('modalVideo');
    video.pause();
});

// ============== دوال البيانات ==============
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
    
    const videosSnapshot = await database.ref('videos').once('value');
    const videosList = document.getElementById('userVideosList');
    videosList.innerHTML = '';
    
    let count = 0;
    if (videosSnapshot.exists()) {
        videosSnapshot.forEach(child => {
            const video = child.val();
            if (video.author && video.author.uid === currentUser.uid) {
                count++;
                const thumb = document.createElement('img');
                thumb.className = 'video-thumb';
                thumb.src = video.thumbnailUrl || 'https://via.placeholder.com/150x267';
                thumb.onclick = () => playVideo(video);
                videosList.appendChild(thumb);
            }
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
    
    allVideos = [];
    videosSnapshot.forEach(child => {
        allVideos.push({ id: child.key, ...child.val() });
    });
    
    allVideos.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    
    allVideos.forEach(video => {
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
                <div class="avatar">${video.author?.username?.charAt(0) || '👤'}</div>
                <span class="username">@${video.author?.username || 'user'}</span>
            </div>
            <div class="video-description">${video.description || ''}</div>
            <div class="video-music">🎵 ${video.audioName || 'Original Sound'}</div>
        </div>
        <div class="video-actions-side">
            <button class="video-action" onclick="likeVideo('${video.id}', this)">
                <span>❤️</span>
                <span>${video.likes?.length || 0}</span>
            </button>
            <button class="video-action" onclick="shareVideo('${video.videoUrl}')">
                <span>📤</span>
                <span>مشاركة</span>
            </button>
        </div>
    `;
    
    const videoEl = div.querySelector('video');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                videoEl.play();
            } else {
                videoEl.pause();
            }
        });
    }, { threshold: 0.5 });
    observer.observe(videoEl);
    
    return div;
}

// ============== دوال التفاعل ==============
async function likeVideo(videoId, btnElement) {
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
    
    // تحديث العرض
    const likeSpan = btnElement.querySelector('span:last-child');
    likeSpan.textContent = likes.length;
    
    // تأثير بصري
    btnElement.style.transform = 'scale(1.2)';
    setTimeout(() => {
        btnElement.style.transform = 'scale(1)';
    }, 200);
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
    
    document.getElementById('modalLikeBtn').onclick = () => {
        likeVideo(video.id, document.getElementById('modalLikeBtn'));
        const newCount = (video.likes?.length || 0) + 1;
        likesCount.textContent = newCount;
    };
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
    const uploadBtn = document.getElementById('uploadBtn');
    const resultDiv = document.getElementById('uploadResult');
    
    progressDiv.style.display = 'block';
    uploadBtn.disabled = true;
    resultDiv.innerHTML = '';
    progressFill.style.width = '0%';
    
    try {
        // رفع إلى Cloudinary
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
        
        // حفظ في Firebase
        const newVideoRef = database.ref('videos').push();
        const videoData = {
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
        };
        
        await newVideoRef.set(videoData);
        
        progressDiv.style.display = 'none';
        resultDiv.innerHTML = '<div class="success-msg">✅ تم رفع الفيديو بنجاح!</div>';
        
        // تنظيف
        document.getElementById('videoInput').value = '';
        document.getElementById('videoDesc').value = '';
        document.getElementById('uploadArea').innerHTML = `
            <span class="upload-icon">📹</span>
            <p>اضغط لاختيار فيديو</p>
        `;
        
        // تحديث الفيديوهات
        loadVideos();
        
        setTimeout(() => {
            resultDiv.innerHTML = '';
        }, 3000);
        
    } catch (error) {
        resultDiv.innerHTML = `<div class="error-msg">❌ فشل الرفع: ${error.message}</div>`;
    } finally {
        uploadBtn.disabled = false;
    }
}

// ============== دوال الشاشات ==============
function showMainScreen() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('mainScreen').style.display = 'flex';
}

function showAuthScreen() {
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('mainScreen').style.display = 'none';
}

console.log('✅ TikTok Clone is ready!');
