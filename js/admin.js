// ============================================================
//  CampusAI — admin.js
// ============================================================

function showToast(message, type = 'success') {
    const c = document.getElementById('toastContainer');
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const t = document.createElement('div');
    t.className = `toast ${type === 'error' ? 'error' : type === 'warning' ? 'warning' : ''}`;
    t.innerHTML = `<span style="font-size:20px">${icons[type] || 'ℹ️'}</span><div><div class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div><div class="toast-msg">${message}</div></div>`;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}
function showModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function logout() { if (confirm('Sign out?')) window.location.href = 'index.html'; }
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('mobile-open'); document.getElementById('backdrop').classList.toggle('visible'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('mobile-open'); document.getElementById('backdrop').classList.remove('visible'); }

const tabTitles = { overview: 'Institutional Overview', library: 'Library Analytics', career: 'Career & Placement', mentorship: 'Mentorship Analytics', knowledge: 'Knowledge Base', users: 'User Management' };
function switchTab(name, el) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const p = document.getElementById('tab-' + name); if (p) p.classList.add('active');
    if (el) el.classList.add('active');
    document.getElementById('topbarTitle').textContent = tabTitles[name] || 'Admin';
    if (!chartInited[name]) { chartInited[name] = true; chartInit[name] && chartInit[name](); }
}

const chartInited = {};
const chartInit = {
    overview: () => {
        new Chart(document.getElementById('jrsDistChart'), {
            type: 'bar',
            data: { labels: ['0-29', '30-49', '50-59', '60-69', '70-79', '80-89', '90-100'], datasets: [{ label: 'Students', data: [12, 48, 124, 380, 712, 498, 68], backgroundColor: ['#DC2626', '#F97316', '#EAB308', '#2563EB', '#0F766E', '#7C3AED', '#059669'], borderRadius: 6 }] },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#F1F5F9' } }, x: { grid: { display: false } } } }
        });
        new Chart(document.getElementById('jrsDeptChart'), {
            type: 'bar',
            data: { labels: ['CS', 'EC', 'ME', 'IT', 'Civil', 'MBA'], datasets: [{ label: 'Avg JRS', data: [74, 65, 58, 68, 52, 61], backgroundColor: 'rgba(37,99,235,0.8)', borderRadius: 6 }] },
            options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } }, scales: { x: { max: 100, grid: { color: '#F1F5F9' } }, y: { grid: { display: false } } } }
        });
        const days = Array.from({ length: 30 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 29 + i); return d.toLocaleDateString('en', { month: 'short', day: 'numeric' }); });
        new Chart(document.getElementById('activityChart'), {
            type: 'line',
            data: {
                labels: days, datasets: [
                    { label: 'Library Logins', data: days.map(() => Math.floor(Math.random() * 200 + 100)), borderColor: '#2563EB', tension: 0.4, pointRadius: 0 },
                    { label: 'Career Views', data: days.map(() => Math.floor(Math.random() * 150 + 80)), borderColor: '#0F766E', tension: 0.4, pointRadius: 0 },
                    { label: 'Chat Queries', data: days.map(() => Math.floor(Math.random() * 80 + 30)), borderColor: '#7C3AED', tension: 0.4, pointRadius: 0 },
                ]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { grid: { color: '#F1F5F9' } }, x: { grid: { display: false }, ticks: { maxTicksLimit: 7 } } } }
        });
    },
    library: () => {
        const labels = Array.from({ length: 30 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 29 + i); return d.getDate() === 1 || i === 0 ? d.toLocaleDateString('en', { month: 'short', day: 'numeric' }) : d.getDate() + ''; });
        new Chart(document.getElementById('libTrendChart'), {
            type: 'line',
            data: {
                labels, datasets: [
                    { label: 'Issues', data: labels.map(() => Math.floor(Math.random() * 50 + 20)), borderColor: '#2563EB', backgroundColor: 'rgba(37,99,235,0.08)', tension: 0.4, fill: true, pointRadius: 0 },
                    { label: 'Returns', data: labels.map(() => Math.floor(Math.random() * 45 + 15)), borderColor: '#0F766E', tension: 0.4, pointRadius: 0 }
                ]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { grid: { color: '#F1F5F9' } }, x: { grid: { display: false }, ticks: { maxTicksLimit: 7 } } } }
        });
        new Chart(document.getElementById('libDeptChart'), {
            type: 'doughnut',
            data: { labels: ['CS', 'EC', 'ME', 'IT', 'Others'], datasets: [{ data: [42, 22, 18, 12, 6], backgroundColor: ['#2563EB', '#0F766E', '#B45309', '#7C3AED', '#94A3B8'], borderWidth: 2, borderColor: '#fff' }] },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        });
    },
    career: () => {
        new Chart(document.getElementById('placementFunnelChart'), {
            type: 'bar',
            data: { labels: ['Registered', 'Shortlisted', 'Appeared', 'Offers Received', 'Accepted'], datasets: [{ label: 'Students', data: [406, 320, 280, 198, 342], backgroundColor: ['rgba(37,99,235,0.7)', 'rgba(37,99,235,0.75)', 'rgba(37,99,235,0.8)', 'rgba(37,99,235,0.85)', 'rgba(15,118,110,0.9)'], borderRadius: 6 }] },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#F1F5F9' } }, x: { grid: { display: false } } } }
        });
        new Chart(document.getElementById('packageDistChart'), {
            type: 'doughnut',
            data: { labels: ['< 5 LPA', '5–8 LPA', '8–12 LPA', '12–20 LPA', '> 20 LPA'], datasets: [{ data: [18, 88, 124, 86, 26], backgroundColor: ['#94A3B8', '#60A5FA', '#2563EB', '#7C3AED', '#059669'], borderWidth: 2, borderColor: '#fff' }] },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        });
    },
    mentorship: () => {
        new Chart(document.getElementById('mentorFunnelChart'), {
            type: 'bar',
            data: { labels: ['Registered', 'Profile Complete', 'Active', 'Matched', 'Sessions Done'], datasets: [{ label: 'Alumni', data: [1247, 890, 624, 312, 184], backgroundColor: 'rgba(124,58,237,0.75)', borderRadius: 6 }] },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#F1F5F9' } }, x: { grid: { display: false } } } }
        });
        new Chart(document.getElementById('sessionsChart'), {
            type: 'line',
            data: { labels: ['Jan W1', 'Jan W2', 'Jan W3', 'Jan W4', 'Feb W1', 'Feb W2', 'Feb W3', 'Feb W4'], datasets: [{ label: 'Sessions', data: [42, 58, 64, 72, 80, 86, 96, 108], borderColor: '#7C3AED', backgroundColor: 'rgba(124,58,237,0.1)', tension: 0.4, fill: true, pointRadius: 5 }] },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#F1F5F9' } }, x: { grid: { display: false } } } }
        });
    }
};

const knowledgeDocs = [
    { name: 'Academic Calendar 2025-26', category: 'Academic Policy', size: '248 KB', uploaded: 'Sep 1, 2025', chunks: 32, status: 'indexed' },
    { name: 'Library Policy Handbook', category: 'Library', size: '512 KB', uploaded: 'Sep 5, 2025', chunks: 78, status: 'indexed' },
    { name: 'Hostel Allocation Rules 2026', category: 'Hostel & Facilities', size: '320 KB', uploaded: 'Jan 15, 2026', chunks: 45, status: 'indexed' },
    { name: 'Placement Drive Guidelines', category: 'Placement', size: '188 KB', uploaded: 'Feb 1, 2026', chunks: 28, status: 'indexed' },
    { name: 'B.Tech Syllabus — CS 2024-28', category: 'Curriculum', size: '1.2 MB', uploaded: 'Feb 10, 2026', chunks: 124, status: 'indexed' },
    { name: 'Campus Facilities Map', category: 'Hostel & Facilities', size: '4.8 MB', uploaded: 'Feb 18, 2026', chunks: null, status: 'ingesting' },
];

function renderKnowledge() {
    document.getElementById('knowledgeTbody').innerHTML = knowledgeDocs.map(d => `
    <tr>
      <td class="fw-600 text-navy">📄 ${d.name}</td>
      <td><span class="badge badge-blue">${d.category}</span></td>
      <td class="text-gray">${d.size}</td>
      <td class="text-gray">${d.uploaded}</td>
      <td class="mono" style="text-align:center">${d.chunks || '…'}</td>
      <td><span class="badge ${d.status === 'indexed' ? 'badge-teal' : 'badge-amber'}">${d.status === 'indexed' ? '✓ Indexed' : '⟳ Ingesting…'}</span></td>
      <td><div class="flex gap-2">
        <button class="btn btn-secondary btn-sm" onclick="showToast('Document details','info')">View</button>
        <button class="btn btn-danger btn-sm" onclick="showToast('Document removed from KB','warning')">Delete</button>
      </div></td>
    </tr>`).join('');
}

const usersData = [
    { name: 'Arya Das', email: 'arya@campusai.edu', role: 'Student', dept: 'Computer Science', status: 'active', lastActive: '2h ago' },
    { name: 'Kavita Patel', email: 'lib@campusai.edu', role: 'Librarian', dept: 'Central Library', status: 'active', lastActive: '30m ago' },
    { name: 'Dr. Pankaj Ojha', email: 'placement@campusai.edu', role: 'Admin', dept: 'Placement Cell', status: 'active', lastActive: '10m ago' },
    { name: 'Priya Mehta', email: 'priya@alumni.edu', role: 'Alumni', dept: 'Computer Science (2020)', status: 'active', lastActive: '1d ago' },
    { name: 'Rohan Verma', email: 'rohan@campusai.edu', role: 'Student', dept: 'Electronics', status: 'active', lastActive: '3h ago' },
    { name: 'Prof. Anita Singh', email: 'anita@campusai.edu', role: 'Faculty', dept: 'Computer Science', status: 'active', lastActive: '45m ago' },
];

function filterUsers(role, btn) {
    document.querySelectorAll('.role-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filtered = role === 'all' ? usersData : usersData.filter(u => u.role.toLowerCase() === role);
    renderUsers(filtered);
}

function renderUsers(data) {
    const roleBadge = { Student: 'badge-blue', Librarian: 'badge-teal', Admin: 'badge-red', Faculty: 'badge-purple', Alumni: 'badge-amber' };
    document.getElementById('usersTbody').innerHTML = data.map(u => `
    <tr>
      <td>
        <div class="flex items-center gap-3">
          <div class="avatar avatar-sm">${u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
          <div><div class="fw-600 text-navy">${u.name}</div><div class="text-xs text-gray">${u.email}</div></div>
        </div>
      </td>
      <td><span class="badge ${roleBadge[u.role] || 'badge-gray'}">${u.role}</span></td>
      <td class="text-gray">${u.dept}</td>
      <td><span class="badge badge-teal">Active</span></td>
      <td class="text-xs text-gray">${u.lastActive}</td>
      <td>
        <div class="flex gap-2">
          <button class="btn btn-secondary btn-sm" onclick="showToast('Edit ${u.name}','info')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="showToast('User deactivated','warning')">Disable</button>
        </div>
      </td>
    </tr>`).join('');
}

document.querySelectorAll('.modal-overlay').forEach(o => { o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); }); });

document.addEventListener('DOMContentLoaded', () => {
    chartInited.overview = true; chartInit.overview();
    renderKnowledge();
    renderUsers(usersData);
});
