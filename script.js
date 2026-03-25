let currentUser = null;

// ========== Auth ==========
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        document.getElementById('userName').innerText = user.email.split('@')[0];
        document.getElementById('userEmail').innerText = user.email;
        loadVideos();
        loadMyVideos();
    } else {
        document.getElementById('loginPage').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
    }
});

function showTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    document.querySelectorAll('.form').forEach(f => f.classList.remove('active'));
    document.getElementById(tab + 'Form').classList.add('active');
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

function showSection(section) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(section + 'Section').classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    
    if (section === 'profile') loadMyVideos();
}

// ========== Videos ==========
async function loadVideos() {
    const container = document.getElementById('videosList');
    container.innerHTML = '<div class="loading">جاري التحميل...</div>';
    
    const snapshot = await db.ref('videos').once('value');
    container.innerHTML = '';
    
    if (!snapshot.exists()) {
        container.innerHTML = '<div class="loading">لا توجد فيديوهات</div>';
        return;
    }
    
    const videos = [];
    snapshot.forEach(child => videos.push({ id: child.key, ...child.val() }));
    videos.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
    
    videos.forEach(video => {
        const div = document.createElement('div');
        div.className = 'video-item';
        div.innerHTML = `
            <video src="${video.videoUrl}" loop muted></video>
            <div class="video-info">
                <div class="video-author">@${video.author?.username || 'user'}</div>
                <div class="video-desc">${video.description || ''}</div>
            </div>
            <div class="video-actions">
                <button onclick="likeVideo('${video.id}', this)">
                    <span>❤️</span>
                    <span>${video.likes?.length || 0}</span>
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
    } else {
        likes.push(currentUser.uid);
    }
    await ref.set(likes);
    btn.querySelector('span:last-child').innerText = likes.length;
}

async function upload() {
    const file = document.getElementById('videoFile').files[0];
    const desc = document.getElementById('videoDesc').value;
    const status = document.getElementById('uploadStatus');
    
    if (!file) {
        status.innerHTML = '❌ اختر فيديو';
        return;
    }
    
    status.innerHTML = '📤 جاري الرفع...';
    
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
            description: desc || "فيديو جديد",
            author: {
                uid: currentUser.uid,
                username: currentUser.email.split('@')[0]
            },
            likes: [],
            createdAt: Date.now()
        });
        
        status.innerHTML = '✅ تم الرفع!';
        setTimeout(() => {
            status.innerHTML = '';
            document.getElementById('videoFile').value = '';
            document.getElementById('videoDesc').value = '';
            document.querySelector('.upload-box').innerHTML = '📹 اضغط لاختيار فيديو';
            showSection('home');
            loadVideos();
        }, 1500);
        
    } catch (error) {
        status.innerHTML = '❌ فشل الرفع: ' + error.message;
    }
}

async function loadMyVideos() {
    if (!currentUser) return;
    const container = document.getElementById('myVideos');
    const snapshot = await db.ref('videos').once('value');
    let count = 0;
    container.innerHTML = '';
    
    if (snapshot.exists()) {
        snapshot.forEach(child => {
            const video = child.val();
            if (video.author && video.author.uid === currentUser.uid) {
                count++;
                const thumb = document.createElement('div');
                thumb.className = 'video-thumb';
                thumb.innerHTML = '🎬';
                thumb.onclick = () => window.open(video.videoUrl);
                container.appendChild(thumb);
            }
        });
    }
    
    if (count === 0) container.innerHTML = '<p style="text-align:center">لا توجد فيديوهات</p>';
}
