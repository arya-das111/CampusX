// ============================================================
//  CampusAI — auth.js  (Login Page Logic)
// ============================================================

let selectedRole = 'student';

function selectRole(card) {
    document.querySelectorAll('.role-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedRole = card.dataset.role;
    // Auto-fill demo credentials
    const emails = { student: 'arya.student@campusai.edu', librarian: 'lib.admin@campusai.edu', admin: 'placement@campusai.edu', alumni: 'alumni@campusai.edu' };
    document.getElementById('emailInput').value = emails[selectedRole] || '';
}

function handleLogin() {
    const email = document.getElementById('emailInput').value.trim();
    const pass = document.getElementById('passwordInput').value.trim();
    if (!email || !pass) { alert('Please enter your credentials.'); return; }
    const overlay = document.getElementById('loadingOverlay');
    const msg = document.getElementById('loadingMsg');
    overlay.style.display = 'flex';
    msg.textContent = 'Authenticating…';
    setTimeout(() => { msg.textContent = 'Loading your dashboard…'; }, 900);
    const pages = { student: 'student.html', librarian: 'librarian.html', admin: 'admin.html', alumni: 'alumni.html' };
    setTimeout(() => { window.location.href = pages[selectedRole] || 'student.html'; }, 1800);
}

function handleOAuth(provider) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = 'flex';
    document.getElementById('loadingMsg').textContent = `Connecting to ${provider}…`;
    setTimeout(() => { window.location.href = 'alumni.html'; }, 1600);
}

// Allow Enter key to submit
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('passwordInput').addEventListener('keydown', e => {
        if (e.key === 'Enter') handleLogin();
    });
});
