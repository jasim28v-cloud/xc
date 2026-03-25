// إعدادات Firebase
const firebaseConfig = { databaseURL: "https://gorm-b3316-default-rtdb.firebaseio.com/" };
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

function checkAuthAndRedirect(target) {
    auth.currentUser ? window.location.href = target : window.location.href = 'login.html';
}

async function loadVideos() {
    const container = document.getElementById('app-container');
    db.ref('videos').on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        container.innerHTML = "";
        Object.keys(data).reverse().forEach(id => {
            const v = data[id];
            const section = document.createElement('div');
            section.className = 'video-section';
            section.innerHTML = `
                <div class="watermark" id="wm-${id}"><i class="fas fa-play"></i> TikToki</div>
                <video loop src="${v.url}" onclick="this.paused?this.play():this.pause()"></video>
                <div class="side-bar">
                    <div class="icon-group" onclick="likeVideo('${id}', this)"><i class="fas fa-heart"></i><span>${v.likes || 0}</span></div>
                    <div class="icon-group"><i class="fas fa-comment-dots"></i><span>0</span></div>
                    <div class="icon-group"><i class="fas fa-share"></i></div>
                </div>
                <div class="video-data"><h3>@${v.username}</h3><p>${v.description}</p></div>`;
            container.appendChild(section);
        });
        setupObserver();
    });
}

function setupObserver() {
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            const v = e.target.querySelector('video');
            const wm = e.target.querySelector('.watermark');
            if (e.isIntersecting) {
                v.play();
                wm.style.opacity = "0.7";
                setTimeout(() => wm.style.opacity = "0.2", 3000);
            } else { v.pause(); v.currentTime = 0; }
        });
    }, { threshold: 0.6 });
    document.querySelectorAll('.video-section').forEach(s => obs.observe(s));
}

auth.onAuthStateChanged(user => {
    if (user) document.getElementById('user-profile-nav').innerHTML = `<img src="${user.photoURL || 'https://via.placeholder.com/30'}" class="user-p-img">`;
    loadVideos();
});
