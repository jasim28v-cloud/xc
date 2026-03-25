let currentUser = null;
let currentVideoId = null;
let currentUserData = null;
let allUsers = {};
let allVideos = [];

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
            followers: {},
            following: {},
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
        document.getElementById('profileNameDisplay').innerText = currentUserData.username;
        document.getElementById('profileBioDisplay').innerText = currentUserData.bio || 'مرحباً! أنا على SHΔDØW';
        document.getElementById('profileAvatarDisplay').innerText = currentUserData.avatar || '👤';
        document.getElementById('editUsername').value = currentUserData.username;
        document.getElementById('editBio').value = currentUserData.bio || '';
        document.getElementById('profileFollowers').innerText = Object.keys(currentUserData.followers || {}).length;
        document.getElementById('profileFollowing').innerText = Object.keys(currentUserData.following || {}).length;
    }
}

db.ref('users').on('value', (snapshot) => { allUsers = snapshot.val() || {}; });

// ========== عرض الفيديوهات ==========
db.ref('videos').on('value', (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    allVideos = [];
    Object.keys(data).forEach(key => allVideos.push({ id: key, ...data[key] }));
    allVideos.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    document.getElementById('profileVideos').innerText = allVideos.filter(v => v.sender === currentUser?.uid).length;
    renderVideos();
});

function renderVideos() {
    const container = document.getElementById('video-stack');
    if (!container) return;
    container.innerHTML = '';
    allVideos.forEach(video => {
        const isLiked = video.likedBy && video.likedBy[currentUser?.uid];
        const user = allUsers[video.sender] || { username: video.senderName || 'user', avatar: '' };
        const isFollowing = currentUserData?.following && currentUserData.following[video.sender];
        const div = document.createElement('div');
        div.className = 'video-segment';
        div.innerHTML = `
            <video loop playsinline muted data-src="${video.url}" poster="${video.thumbnail || ''}"></video>
            <div class="video-info">
                <div class="video-author">
                    <div class="author-avatar" onclick="viewProfile('${video.sender}')">${user.avatar || user.username?.charAt(0) || '👤'}</div>
                    <div><span class="author-name" onclick="viewProfile('${video.sender}')">@${user.username || 'user'}</span>
                    ${currentUser?.uid !== video.sender ? `<button class="follow-btn" onclick="toggleFollow('${video.sender}', this)">${isFollowing ? 'متابع' : 'متابعة'}</button>` : ''}</div>
                </div>
                <div class="video-desc">${video.description || ''}</div>
                <div class="video-music"><i class="fas fa-music"></i> ${video.music || 'Original Sound'}</div>
            </div>
            <div class="side-controls">
                <div class="glass-btn" onclick="toggleMute(this)"><i class="fas fa-volume-mute"></i></div>
                <div class="glass-btn ${isLiked ? 'neon-text' : ''}" onclick="toggleLike('${video.id}', this)"><i class="fas fa-heart"></i><span class="text-xs">${video.likes || 0}</span></div>
                <div class="glass-btn" onclick="openComments('${video.id}')"><i class="fas fa-comment"></i><span class="text-xs">${Object.keys(video.comments || {}).length || 0}</span></div>
                <div class="glass-btn" onclick="shareVideo('${video.url}')"><i class="fas fa-share"></i></div>
            </div>
        `;
        container.appendChild(div);
    });
    initVideoObserver();
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
    document.querySelectorAll('.video-segment').forEach(seg => observer.observe(seg));
}

let isMuted = true;
function toggleMute(btn) {
    isMuted = !isMuted;
    document.querySelectorAll('video').forEach(v => v.muted = isMuted);
    btn.querySelector('i').className = isMuted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
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
    btn.classList.toggle('neon-text');
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
    if (currentUserData) {
        if (currentUserData.following) currentUserData.following[userId] = !currentUserData.following[userId];
        else currentUserData.following = { [userId]: true };
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
        const user = allUsers[c.userId] || { username: c.username || 'user', avatar: '' };
        container.innerHTML += `
            <div class="comment-item">
                <div class="comment-avatar">${user.avatar || user.username?.charAt(0) || '👤'}</div>
                <div class="comment-content"><div class="comment-username">@${user.username}</div><div class="comment-text">${c.text}</div><div class="comment-time">${new Date(c.timestamp).toLocaleString()}</div></div>
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
    await addNotification(allVideos.find(v => v.id === currentVideoId)?.sender, 'comment', currentUser.uid);
    input.value = '';
    openComments(currentVideoId);
}

// ========== الإشعارات ==========
async function addNotification(targetUserId, type, fromUserId) {
    if (targetUserId === fromUserId) return;
    const fromUser = allUsers[fromUserId] || { username: 'user' };
    const messages = { like: 'أعجب بفيديو الخاص بك', comment: 'علق على فيديو الخاص بك', follow: 'بدأ بمتابعتك', unfollow: 'توقف عن متابعتك' };
    await db.ref(`notifications/${targetUserId}`).push({ type, fromUserId, fromUsername: fromUser.username, message: messages[type], timestamp: Date.now(), read: false });
}

db.ref(`notifications/${currentUser?.uid}`).on('value', (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    const unread = Object.values(data).filter(n => !n.read).length;
    const notifBtn = document.querySelector('.fa-bell');
    if (notifBtn && unread > 0) notifBtn.classList.add('neon-text');
});

async function openNotifications() {
    const panel = document.getElementById('notificationsPanel');
    const container = document.getElementById('notificationsList');
    const snapshot = await db.ref(`notifications/${currentUser.uid}`).once('value');
    const notifs = snapshot.val() || {};
    container.innerHTML = '';
    Object.values(notifs).reverse().forEach(n => {
        container.innerHTML += `<div class="notification-item"><i class="fas ${n.type === 'like' ? 'fa-heart text-red-500' : n.type === 'comment' ? 'fa-comment text-green-500' : 'fa-user-plus text-blue-500'}"></i><div><div>${n.fromUsername}</div><div class="text-xs opacity-60">${n.message}</div></div></div>`;
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
    const videosDiv = document.getElementById('searchVideosResults');
    if (!query) { resultsDiv.innerHTML = ''; videosDiv.innerHTML = ''; return; }
    const users = Object.values(allUsers).filter(u => u.username.toLowerCase().includes(query));
    const videos = allVideos.filter(v => v.description?.toLowerCase().includes(query) || allUsers[v.sender]?.username?.toLowerCase().includes(query));
    resultsDiv.innerHTML = users.map(u => `<div class="search-result" onclick="viewProfile('${u.uid}')"><div class="w-10 h-10 rounded-full bg-gradient-to-r from-[#fe2c55] to-[#ff6b6b] flex items-center justify-center">${u.avatar || u.username.charAt(0)}</div><div>@${u.username}</div></div>`).join('');
    videosDiv.innerHTML = videos.map(v => `<div class="search-result" onclick="playVideo('${v.url}')"><i class="fas fa-video"></i><div>${v.description || 'فيديو'}</div></div>`).join('');
}

function playVideo(url) { window.open(url, '_blank'); }

// ========== الملف الشخصي ==========
function openProfile() {
    document.getElementById('profilePanel').style.display = 'block';
    loadProfileVideos();
    loadUserData();
}
function closeProfile() { document.getElementById('profilePanel').style.display = 'none'; }
function openEditProfile() { document.getElementById('editProfilePanel').classList.add('open'); closeProfile(); }
function closeEditProfile() { document.getElementById('editProfilePanel').classList.remove('open'); }

async function saveProfile() {
    const newUsername = document.getElementById('editUsername').value;
    const newBio = document.getElementById('editBio').value;
    await db.ref(`users/${currentUser.uid}`).update({ username: newUsername, bio: newBio });
    currentUserData.username = newUsername;
    currentUserData.bio = newBio;
    closeEditProfile();
    loadUserData();
    renderVideos();
}

function changeAvatar() { alert('سيتم إضافة رفع الصور قريباً'); }

function viewProfile(userId) {
    if (userId === currentUser?.uid) openProfile();
    else window.location.href = `?profile=${userId}`;
}

async function loadProfileVideos() {
    const container = document.getElementById('profileVideosList');
    const userVideos = allVideos.filter(v => v.sender === currentUser?.uid);
    container.innerHTML = userVideos.map(v => `<div class="aspect-[9/16] bg-gray-800 rounded-lg flex items-center justify-center cursor-pointer" onclick="playVideo('${v.url}')"><i class="fas fa-play text-2xl"></i></div>`).join('');
    document.getElementById('profileVideos').innerText = userVideos.length;
}

// ========== رفع الفيديو ==========
const widget = cloudinary.createUploadWidget({ cloudName: CLOUD_NAME, uploadPreset: UPLOAD_PRESET, sources: ['local'], clientAllowedFormats: ["mp4", "mov", "webm"] }, (err, result) => {
    if (!err && result.event === "success") {
        const desc = prompt('وصف الفيديو:') || '';
        const music = prompt('اسم الصوت:') || 'Original Sound';
        db.ref('videos/').push({ url: result.info.secure_url, thumbnail: result.info.secure_url.replace('.mp4', '.jpg'), description: desc, music: music, sender: currentUser.uid, senderName: currentUserData?.username, likes: 0, likedBy: {}, comments: {}, timestamp: Date.now() });
        alert('✅ تم رفع الفيديو بنجاح!');
    }
});
document.getElementById("upload-trigger").onclick = () => widget.open();

function shareVideo(url) { navigator.share ? navigator.share({ url }) : navigator.clipboard.writeText(url) && alert('تم نسخ الرابط'); }

function switchTab(tab) {
    document.querySelectorAll('.nav-item').forEach(t => t.classList.remove('active'));
    event.target.closest('.nav-item').classList.add('active');
    if (tab === 'search') openSearch();
    if (tab === 'notifications') openNotifications();
    if (tab === 'home') { closeSearch(); closeNotifications(); closeProfile(); }
}

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

db.ref('presence').on('value', (s) => { document.getElementById('live-visitors') && (document.getElementById('live-visitors').innerText = s.numChildren()); });
