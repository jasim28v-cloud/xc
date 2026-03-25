let currentUser = null;
let currentUserData = null;
let currentVideoId = null;
let currentShareUrl = null;
let allUsers = {};
let allVideos = [];
let isMuted = true;
let viewingProfileUserId = null;

// ========== المصادقة ==========
function switchAuth(type) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.getElementById(type + 'Form').classList.add('active');
}

async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        document.getElementById('loginMsg').innerText = error.message;
    }
}

async function register() {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPass').value;
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await db.ref(`users/${userCredential.user.uid}`).set({
            username: name,
            email: email,
            bio: '',
            avatar: '',
            avatarUrl: '',
            followers: {},
            following: {},
            totalLikes: 0,
            createdAt: Date.now()
        });
    } catch (error) {
        document.getElementById('regMsg').innerText = error.message;
    }
}

function logout() {
    auth.signOut();
    location.reload();
}

// ========== تحميل البيانات ==========
async function loadUserData() {
    const snapshot = await db.ref(`users/${currentUser.uid}`).get();
    if (snapshot.exists()) {
        currentUserData = { uid: currentUser.uid, ...snapshot.val() };
        updateAvatarDisplay();
    }
}

function updateAvatarDisplay() {
    const avatarUrl = currentUserData?.avatarUrl;
    const avatarElements = document.querySelectorAll('.author-avatar, .profile-avatar-large, .comment-avatar, .search-avatar');
    avatarElements.forEach(el => {
        if (avatarUrl) {
            el.innerHTML = `<img src="${avatarUrl}" alt="avatar">`;
        } else {
            el.innerHTML = currentUserData?.username?.charAt(0) || '👤';
        }
    });
}

db.ref('users').on('value', (snapshot) => { allUsers = snapshot.val() || {}; });

// ========== عرض الفيديوهات مع هاشتاج ==========
function addHashtags(text) {
    if (!text) return '';
    return text.replace(/#(\w+)/g, '<span class="hashtag" onclick="searchHashtag(\'$1\')">#$1</span>');
}

function searchHashtag(tag) {
    document.getElementById('searchInput').value = tag;
    openSearch();
    searchUsers();
}

db.ref('videos').on('value', (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    allVideos = [];
    Object.keys(data).forEach(key => allVideos.push({ id: key, ...data[key] }));
    allVideos.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    renderVideos();
});

function renderVideos() {
    const container = document.getElementById('videosContainer');
    if (!container) return;
    container.innerHTML = '';
    
    if (allVideos.length === 0) {
        container.innerHTML = '<div class="loading">لا توجد فيديوهات بعد</div>';
        return;
    }
    
    allVideos.forEach(video => {
        const isLiked = video.likedBy && video.likedBy[currentUser?.uid];
        const user = allUsers[video.sender] || { username: video.senderName || 'user', avatarUrl: '', avatar: '' };
        const isFollowing = currentUserData?.following && currentUserData.following[video.sender];
        const commentsCount = video.comments ? Object.keys(video.comments).length : 0;
        const captionWithHashtags = addHashtags(video.description || '');
        
        const div = document.createElement('div');
        div.className = 'video-item';
        div.setAttribute('data-video-id', video.id);
        div.innerHTML = `
            <video loop playsinline muted data-src="${video.url}" poster="${video.thumbnail || ''}"></video>
            <div class="video-info">
                <div class="author-info">
                    <div class="author-avatar" onclick="viewProfile('${video.sender}')">${user.avatarUrl ? `<img src="${user.avatarUrl}">` : (user.avatar || user.username?.charAt(0) || '👤')}</div>
                    <div>
                        <span class="author-name" onclick="viewProfile('${video.sender}')">@${user.username}</span>
                        ${currentUser?.uid !== video.sender ? `<button class="follow-btn" onclick="toggleFollow('${video.sender}', this)">${isFollowing ? 'متابع' : 'متابعة'}</button>` : ''}
                    </div>
                </div>
                <div class="video-caption">${captionWithHashtags}</div>
                <div class="video-music"><i class="fas fa-music"></i> ${video.music || 'Original Sound'}</div>
            </div>
            <div class="side-actions">
                <button class="side-btn" onclick="toggleGlobalMute()">
                    <i class="fas ${isMuted ? 'fa-volume-mute' : 'fa-volume-up'}"></i>
                </button>
                <button class="side-btn like-btn ${isLiked ? 'active' : ''}" onclick="toggleLike('${video.id}', this)">
                    <i class="fas fa-heart"></i>
                    <span>${video.likes || 0}</span>
                </button>
                <button class="side-btn" onclick="openComments('${video.id}')">
                    <i class="fas fa-comment"></i>
                    <span>${commentsCount}</span>
                </button>
                <button class="side-btn" onclick="openShare('${video.url}')">
                    <i class="fas fa-share"></i>
                </button>
            </div>
        `;
        
        // إضافة حدث الضغط مرتين للإعجاب
        const videoEl = div.querySelector('video');
        videoEl.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            const likeBtn = div.querySelector('.like-btn');
            if (likeBtn) {
                toggleLike(video.id, likeBtn);
                showHeartAnimation(e.clientX, e.clientY);
            }
        });
        
        container.appendChild(div);
    });
    initVideoObserver();
}

function showHeartAnimation(x, y) {
    const heart = document.createElement('div');
    heart.className = 'heart-animation';
    heart.innerHTML = '❤️';
    heart.style.left = x + 'px';
    heart.style.top = y + 'px';
    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 800);
}

function initVideoObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target.querySelector('video');
            if (entry.isIntersecting) {
                if (!video.src) video.src = video.dataset.src;
                video.muted = isMuted;
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        });
    }, { threshold: 0.65 });
    document.querySelectorAll('.video-item').forEach(seg => observer.observe(seg));
}

function toggleGlobalMute() {
    isMuted = !isMuted;
    document.querySelectorAll('video').forEach(v => v.muted = isMuted);
    const btns = document.querySelectorAll('.side-actions .side-btn:first-child i');
    btns.forEach(btn => btn.className = isMuted ? 'fas fa-volume-mute' : 'fas fa-volume-up');
}

// ========== الإعجاب ==========
async function toggleLike(videoId, btn) {
    if (!currentUser) return;
    const videoRef = db.ref(`videos/${videoId}`);
    const snap = await videoRef.get();
    const video = snap.val();
    let likes = video.likes || 0;
    let likedBy = video.likedBy || {};
    if (likedBy[currentUser.uid]) {
        likes--;
        delete likedBy[currentUser.uid];
    } else {
        likes++;
        likedBy[currentUser.uid] = true;
        await addNotification(video.sender, 'like', currentUser.uid);
    }
    await videoRef.update({ likes, likedBy });
    btn.classList.toggle('active');
    btn.querySelector('span').innerText = likes;
}

// ========== المتابعة ==========
async function toggleFollow(userId, btn) {
    if (!currentUser || currentUser.uid === userId) return;
    const userRef = db.ref(`users/${currentUser.uid}/following/${userId}`);
    const targetRef = db.ref(`users/${userId}/followers/${currentUser.uid}`);
    const snap = await userRef.get();
    if (snap.exists()) {
        await userRef.remove();
        await targetRef.remove();
        btn.innerText = 'متابعة';
        await addNotification(userId, 'unfollow', currentUser.uid);
    } else {
        await userRef.set(true);
        await targetRef.set(true);
        btn.innerText = 'متابع';
        await addNotification(userId, 'follow', currentUser.uid);
    }
    if (viewingProfileUserId === userId) {
        loadProfileData(userId);
    }
}

// ========== التعليقات ==========
async function openComments(videoId) {
    currentVideoId = videoId;
    const panel = document.getElementById('commentsPanel');
    const commentsRef = db.ref(`videos/${videoId}/comments`);
    const snap = await commentsRef.get();
    const comments = snap.val() || {};
    const container = document.getElementById('commentsList');
    container.innerHTML = '';
    Object.values(comments).reverse().forEach(c => {
        const user = allUsers[c.userId] || { username: c.username || 'user', avatarUrl: '' };
        container.innerHTML += `
            <div class="comment-item">
                <div class="comment-avatar">${user.avatarUrl ? `<img src="${user.avatarUrl}">` : (user.username?.charAt(0) || '👤')}</div>
                <div><div class="font-bold">@${user.username}</div><div class="text-sm">${c.text}</div></div>
            </div>
        `;
    });
    panel.classList.add('open');
}

function closeComments() { document.getElementById('commentsPanel').classList.remove('open'); }

async function addComment() {
    const input = document.getElementById('commentInput');
    if (!input.value.trim() || !currentVideoId) return;
    const commentsRef = db.ref(`videos/${currentVideoId}/comments`);
    const newComment = { userId: currentUser.uid, username: currentUserData?.username, text: input.value, timestamp: Date.now() };
    await commentsRef.push(newComment);
    const video = allVideos.find(v => v.id === currentVideoId);
    if (video && video.sender !== currentUser.uid) {
        await addNotification(video.sender, 'comment', currentUser.uid);
    }
    input.value = '';
    openComments(currentVideoId);
}

// ========== المشاركة ==========
function openShare(videoUrl) {
    currentShareUrl = videoUrl;
    document.getElementById('sharePanel').classList.add('open');
}
function closeShare() { document.getElementById('sharePanel').classList.remove('open'); }
function copyLink() { 
    navigator.clipboard.writeText(currentShareUrl); 
    const toast = document.getElementById('copyToast');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
    closeShare();
}
function shareToWhatsApp() { window.open(`https://wa.me/?text=${encodeURIComponent(currentShareUrl)}`, '_blank'); closeShare(); }
function shareToTelegram() { window.open(`https://t.me/share/url?url=${encodeURIComponent(currentShareUrl)}`, '_blank'); closeShare(); }
function downloadVideo() { window.open(currentShareUrl, '_blank'); closeShare(); }

// ========== الإشعارات ==========
async function addNotification(targetUserId, type, fromUserId) {
    if (targetUserId === fromUserId) return;
    const fromUser = allUsers[fromUserId] || { username: 'user' };
    const messages = { like: 'أعجب بفيديو الخاص بك', comment: 'علق على فيديو الخاص بك', follow: 'بدأ بمتابعتك', unfollow: 'توقف عن متابعتك' };
    await db.ref(`notifications/${targetUserId}`).push({ type, fromUserId, fromUsername: fromUser.username, message: messages[type], timestamp: Date.now(), read: false });
}

async function openNotifications() {
    const panel = document.getElementById('notificationsPanel');
    const container = document.getElementById('notificationsList');
    const snapshot = await db.ref(`notifications/${currentUser.uid}`).once('value');
    const notifs = snapshot.val() || {};
    container.innerHTML = '';
    Object.values(notifs).reverse().forEach(n => {
        container.innerHTML += `<div class="notification-item"><i class="fas ${n.type === 'like' ? 'fa-heart text-red-500' : n.type === 'comment' ? 'fa-comment' : 'fa-user-plus'}"></i><div><div>${n.fromUsername}</div><div class="text-xs opacity-60">${n.message}</div></div></div>`;
        if (!n.read) db.ref(`notifications/${currentUser.uid}/${Object.keys(notifs).find(k => notifs[k] === n)}/read`).set(true);
    });
    panel.classList.add('open');
}
function closeNotifications() { document.getElementById('notificationsPanel').classList.remove('open'); }

// ========== البحث ==========
function openSearch() { document.getElementById('searchPanel').classList.add('open'); }
function closeSearch() { document.getElementById('searchPanel').classList.remove('open'); }
function searchUsers() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const resultsDiv = document.getElementById('searchResults');
    if (!query) { resultsDiv.innerHTML = ''; return; }
    const users = Object.values(allUsers).filter(u => u.username.toLowerCase().includes(query));
    resultsDiv.innerHTML = users.map(u => `<div class="search-result" onclick="viewProfile('${u.uid}')"><div class="search-avatar">${u.avatarUrl ? `<img src="${u.avatarUrl}">` : (u.username.charAt(0) || '👤')}</div><div>@${u.username}</div></div>`).join('');
}

// ========== رفع الصورة الشخصية ==========
function changeAvatar() {
    document.getElementById('avatarInput').click();
}

async function uploadAvatar(input) {
    const file = input.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
    const data = await res.json();
    const avatarUrl = data.secure_url;
    
    await db.ref(`users/${currentUser.uid}/avatarUrl`).set(avatarUrl);
    currentUserData.avatarUrl = avatarUrl;
    updateAvatarDisplay();
    if (viewingProfileUserId === currentUser.uid) loadProfileData(currentUser.uid);
}

// ========== الملف الشخصي ==========
async function viewProfile(userId) {
    if (!userId) return;
    viewingProfileUserId = userId;
    await loadProfileData(userId);
    document.getElementById('profilePanel').classList.add('open');
}

async function loadProfileData(userId) {
    const userSnap = await db.ref(`users/${userId}`).get();
    const user = userSnap.val();
    if (!user) return;
    
    const avatarDisplay = document.getElementById('profileAvatarDisplay');
    if (user.avatarUrl) {
        avatarDisplay.innerHTML = `<img src="${user.avatarUrl}">`;
    } else {
        avatarDisplay.innerHTML = user.username?.charAt(0) || '👤';
    }
    
    document.getElementById('profileNameDisplay').innerText = user.username;
    document.getElementById('profileBioDisplay').innerText = user.bio || '';
    document.getElementById('profileFollowing').innerText = Object.keys(user.following || {}).length;
    document.getElementById('profileFollowers').innerText = Object.keys(user.followers || {}).length;
    
    const userVideos = allVideos.filter(v => v.sender === userId);
    const totalLikes = userVideos.reduce((sum, v) => sum + (v.likes || 0), 0);
    document.getElementById('profileLikes').innerText = totalLikes;
    
    const container = document.getElementById('profileVideosList');
    container.innerHTML = userVideos.map(v => `<div class="video-thumb" onclick="playVideo('${v.url}')"><i class="fas fa-play"></i></div>`).join('');
    
    const actionsDiv = document.getElementById('profileActions');
    if (userId === currentUser?.uid) {
        actionsDiv.innerHTML = `<button class="edit-profile-btn" onclick="openEditProfile()">تعديل الملف</button><button class="logout-btn" onclick="logout()">تسجيل خروج</button>`;
    } else {
        const isFollowing = currentUserData?.following && currentUserData.following[userId];
        actionsDiv.innerHTML = `<button class="follow-btn" style="padding:10px 30px" onclick="toggleFollow('${userId}', this)">${isFollowing ? 'متابع' : 'متابعة'}</button>`;
    }
}

function openProfile(userId) { viewProfile(userId); }
function closeProfile() { 
    document.getElementById('profilePanel').classList.remove('open');
    viewingProfileUserId = null;
}
function openEditProfile() { 
    const editAvatar = document.getElementById('editAvatarDisplay');
    if (currentUserData?.avatarUrl) {
        editAvatar.innerHTML = `<img src="${currentUserData.avatarUrl}">`;
    } else {
        editAvatar.innerHTML = currentUserData?.username?.charAt(0) || '👤';
    }
    document.getElementById('editUsername').value = currentUserData?.username || '';
    document.getElementById('editBio').value = currentUserData?.bio || '';
    document.getElementById('editProfilePanel').classList.add('open');
}
function closeEditProfile() { document.getElementById('editProfilePanel').classList.remove('open'); }

async function saveProfile() {
    const newUsername = document.getElementById('editUsername').value;
    const newBio = document.getElementById('editBio').value;
    await db.ref(`users/${currentUser.uid}`).update({ username: newUsername, bio: newBio });
    currentUserData.username = newUsername;
    currentUserData.bio = newBio;
    closeEditProfile();
    if (viewingProfileUserId === currentUser.uid) loadProfileData(currentUser.uid);
    renderVideos();
}

function playVideo(url) { window.open(url, '_blank'); }

// ========== رفع الفيديو ==========
const widget = cloudinary.createUploadWidget({ 
    cloudName: CLOUD_NAME, 
    uploadPreset: UPLOAD_PRESET, 
    sources: ['local'], 
    clientAllowedFormats: ["mp4", "mov", "webm"] 
}, (err, result) => {
    if (!err && result.event === "success") {
        const desc = prompt('وصف الفيديو (استخدم # للهاشتاق):') || '';
        const music = prompt('اسم الصوت:') || 'Original Sound';
        db.ref('videos/').push({ 
            url: result.info.secure_url, 
            thumbnail: result.info.secure_url.replace('.mp4', '.jpg'), 
            description: desc, 
            music: music, 
            sender: currentUser.uid, 
            senderName: currentUserData?.username, 
            likes: 0, 
            likedBy: {}, 
            comments: {}, 
            timestamp: Date.now() 
        });
        alert('✅ تم رفع الفيديو بنجاح!');
    }
});
function openUpload() { widget.open(); }

function switchTab(tab) {
    document.querySelectorAll('.nav-item').forEach(t => t.classList.remove('active'));
    if (event.target.closest('.nav-item')) event.target.closest('.nav-item').classList.add('active');
    if (tab === 'search') openSearch();
    if (tab === 'notifications') openNotifications();
    if (tab === 'home') { closeSearch(); closeNotifications(); closeProfile(); }
}

// ========== مراقبة المستخدم ==========
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        await loadUserData();
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        const presenceRef = db.ref('presence/' + user.uid);
        presenceRef.set(true);
        presenceRef.onDisconnect().remove();
    } else {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
    }
});

console.log('✅ TikTok Clone Ultra Plus Ready');
