let currentUser = null;

auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        document.getElementById('profileName').innerText = user.email.split('@')[0];
        document.getElementById('profileEmail').innerText = user.email;
        loadVideos();
        loadMyVideos();
    } else {
        document.getElementById('loginPage').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
    }
});

function switchAuth(type) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.getElementById(type + 'Form').classList.add('active');
}

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        await auth.signInWithEmailAndPassword(email, password);
        document.getElementById('loginMsg').innerText = '';
    } catch (error) {
        document.getElementById('loginMsg').innerText = error.message;
    }
}

async function register() {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPass').value;
    try {
        const user = await auth.createUserWithEmailAndPassword(email, password);
        await db.ref(`users/${user.user.uid}`).set({
            username: name,
            email: email,
            createdAt: Date.now()
        });
        document.getElementById('regMsg').innerText = '';
    } catch (error) {
        document.getElementById('regMsg').innerText = error.message;
    }
}

function logout() {
    auth.signOut();
}

function switchTab(tab) {
    document.querySelectorAll('.nav-item').forEach(t => t.classList.remove('active'));
    if (event.target.closest('.nav-item')) {
        event.target.closest('.nav-item').classList.add('active');
    }
    
    document.getElementById('videosContainer').style.display = tab === 'home' ? 'block' : 'none';
    document.getElementById('uploadPanel').style.display = tab === 'upload' ? 'block' : 'none';
    document.getElementById('profilePanel').style.display = tab === 'profile' ? 'block' : 'none';
    
    if (tab === 'profile') loadMyVideos();
}

async function loadVideos() {
    const container = document.getElementById('videosContainer');
    container.innerHTML = '<div class="loading">🎬 جاري تحميل الفيديوهات...</div>';
    
    const snapshot = await db.ref('videos').once('value');
    container.innerHTML = '';
    
    if (!snapshot.exists()) {
        container.innerHTML = '<div class="loading">✨ لا توجد فيديوهات بعد<br>كن أول من يرفع فيديو!</div>';
        return;
    }
    
    const videos = [];
    snapshot.forEach(child => videos.push({ id: child.key, ...child.val() }));
    videos.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
    
    videos.forEach(video => {
        const div = document.createElement('div');
        div.className = 'video-card';
        div.innerHTML = `
            <video src="${video.videoUrl}" loop muted></video>
            <div class="video-overlay">
                <div class="video-author">
                    <div class="author-avatar">${video.author?.username?.charAt(0) || '👤'}</div>
                    <span class="author-name">@${video.author?.username || 'user'}</span>
                </div>
                <div class="video-caption">${video.description || '🎵 فيديو رائع'}</div>
                <div class="video-music">🎵 ${video.audioName || 'Original Sound'}</div>
            </div>
            <div class="video-side-actions">
                <button class="side-action" onclick="likeVideo('${video.id}', this)">
                    <span>❤️</span>
                    <span>${video.likes?.length || 0}</span>
                </button>
                <button class="side-action" onclick="shareVideo('${video.videoUrl}')">
                    <span>📤</span>
                    <span>مشاركة</span>
                </button>
            </div>
        `;
        
        const videoEl = div.querySelector('video');
        new IntersectionObserver((entries) => {
            entries.forEach(e => e.isIntersecting ? videoEl.play() : videoEl.pause());
        }, { threshold: 0.5 }).observe(videoEl);
        
        container.appendChild(div);
    });
}

async function likeVideo(videoId, btn) {
    if (!currentUser) return;
    const ref = db.ref(`videos/${videoId}/likes`);
    const snap = await ref.get();
    let likes = snap.val() || [];
    
    if (likes.includes(currentUser.uid)) {
        likes = likes.filter(id => id !== currentUser.uid);
        btn.querySelector('span:last-child').innerText = likes.length;
    } else {
        likes.push(currentUser.uid);
        await ref.set(likes);
        btn.querySelector('span:last-child').innerText = likes.length;
    }
    await ref.set(likes);
}

function shareVideo(url) {
    if (navigator.share) {
        navigator.share({ title: 'شاهد هذا الفيديو', url: url });
    } else {
        navigator.clipboard.writeText(url);
        alert('✅ تم نسخ الرابط');
    }
}

async function uploadVideo() {
    const file = document.getElementById('videoFile').files[0];
    const desc = document.getElementById('videoDesc').value;
    const status = document.getElementById('uploadStatus');
    
    if (!file) {
        status.innerHTML = '❌ الرجاء اختيار فيديو';
        status.style.color = '#ff6b6b';
        return;
    }
    
    status.innerHTML = '📤 جاري رفع الفيديو...';
    status.style.color = '#fe2c55';
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('resource_type', 'video');
    
    try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        
        await db.ref('videos').push({
            videoUrl: data.secure_url,
            description: desc || "🎬 فيديو جديد",
            author: {
                uid: currentUser.uid,
                username: currentUser.email.split('@')[0]
            },
            likes: [],
            createdAt: Date.now()
        });
        
        status.innerHTML = '✅ تم رفع الفيديو بنجاح!';
        status.style.color = '#4caf50';
        
        setTimeout(() => {
            document.getElementById('videoFile').value = '';
            document.getElementById('videoDesc').value = '';
            document.querySelector('.upload-area').innerHTML = `
                <div class="upload-icon-big">📹</div>
                <p>اضغط لاختيار فيديو</p>
                <span class="upload-hint">MP4, MOV, يصل إلى 100MB</span>
            `;
            status.innerHTML = '';
            switchTab('home');
            loadVideos();
        }, 2000);
        
    } catch (error) {
        status.innerHTML = '❌ فشل الرفع: ' + error.message;
        status.style.color = '#ff6b6b';
    }
}

async function loadMyVideos() {
    if (!currentUser) return;
    const container = document.getElementById('myVideosList');
    const snapshot = await db.ref('videos').once('value');
    let count = 0;
    container.innerHTML = '';
    
    if (snapshot.exists()) {
        snapshot.forEach(child => {
            const video = child.val();
            if (video.author && video.author.uid === currentUser.uid) {
                count++;
                const thumb = document.createElement('div');
                thumb.className = 'my-video-thumb';
                thumb.innerHTML = '🎬';
                thumb.onclick = () => window.open(video.videoUrl);
                container.appendChild(thumb);
            }
        });
    }
    
    document.getElementById('videosCount').innerText = count;
    if (count === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:rgba(255,255,255,0.5)">📹 لا توجد فيديوهات بعد<br>اضغط على + لرفع فيديو</div>';
    }
}
