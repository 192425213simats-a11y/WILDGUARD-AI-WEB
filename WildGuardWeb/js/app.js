// app.js - Main Application Coordinator, Router, and UI Event Handlers
import { initDb, getAllDetections, deleteDetection, getAllUsers, deleteUser, getPerfLogs, clearPerfLogs } from './db.js';
import { getLanguage, setLanguage, t } from './translator.js';
import { getActiveUser, login, register, loginAsGuest, clearSession, forgotPassword } from './auth.js';
import { 
    initCamera, 
    stopCamera, 
    drawMockAnimal, 
    drawBoundingBox, 
    drawTargetReticle, 
    computePerformanceMetrics, 
    logScanDetection, 
    renderResultCards,
    initVideoScan,
    MOCK_WILDLIFE,
    activeSettings
} from './scanner.js';
import { startAudioScan, uploadAudioClassification, stopAudioCapture } from './audio.js';
import { drawLineChart, drawPieChart, drawHeatmap } from './dashboard.js';
import { showToast, exportToPdf, exportToCsv } from './utils.js';

// Global variables for active media states
let currentCameraModeIsSimulated = false;

// Initialize app when DOM loads
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize DB
    try {
        await initDb();
        console.log("IndexedDB Initialized Successfully.");
    } catch (err) {
        showToast("Database Error", "Failed to initialize IndexedDB: " + err, "error");
    }

    // 2. Setup System Language & Theme settings from cache
    applyLanguage(getLanguage());
    applyTheme(localStorage.getItem('wildguard_theme') || 'Dark');

    // 3. Register routing hash-change listener
    window.addEventListener('hashchange', handleRoute);
    
    // 4. Bind UI event listeners
    bindAuthEvents();
    bindNavEvents();
    bindSettingsEvents();
    bindDashboardActionEvents();

    // 5. Run initial routing
    handleRoute();
});

// --- ROUTER SYSTEM ---
function handleRoute() {
    const activeUser = getActiveUser();
    
    if (!activeUser) {
        // Force authentication page
        window.location.hash = '';
        showSection('page-auth');
        document.getElementById('app-sidebar').classList.add('hidden');
        document.getElementById('app-main').classList.add('full-width');
        return;
    }

    // Show sidebar & enable responsive spacing
    document.getElementById('app-sidebar').classList.remove('hidden');
    document.getElementById('app-main').classList.remove('full-width');

    const hash = window.location.hash || '#dashboard';

    // Highlight current active tab
    document.querySelectorAll('.sidebar-menu a').forEach(el => el.classList.remove('active'));
    
    // Hide all viewports
    document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden'));

    // Populate user credentials in sidebar
    document.getElementById('sidebar-user-name').textContent = activeUser.fullName;
    document.getElementById('sidebar-user-role').textContent = activeUser.role === 'admin' ? t('admin_panel') : 'Explorer';

    // Show admin page only for administrators
    const adminLink = document.getElementById('nav-admin');
    if (activeUser.role === 'admin') {
        adminLink.classList.remove('hidden');
    } else {
        adminLink.classList.add('hidden');
    }

    // Clear active media streams
    stopCamera();
    stopAudioCapture();

    // Map section IDs to window route hashes
    if (hash === '#dashboard') {
        document.getElementById('nav-dashboard').classList.add('active');
        document.getElementById('page-dashboard').classList.remove('hidden');
        loadDashboardData();
    } else if (hash === '#camera-scan') {
        document.getElementById('nav-camera').classList.add('active');
        document.getElementById('page-camera-scan').classList.remove('hidden');
        setupCameraScan();
    } else if (hash === '#gallery-scan') {
        document.getElementById('nav-gallery').classList.add('active');
        document.getElementById('page-gallery-scan').classList.remove('hidden');
        setupGalleryScan();
    } else if (hash === '#video-scan') {
        document.getElementById('nav-video').classList.add('active');
        document.getElementById('page-video-scan').classList.remove('hidden');
        setupVideoScan();
    } else if (hash === '#audio-scan') {
        document.getElementById('nav-audio').classList.add('active');
        document.getElementById('page-audio-scan').classList.remove('hidden');
        setupAudioScan();
    } else if (hash === '#settings') {
        document.getElementById('nav-settings').classList.add('active');
        document.getElementById('page-settings').classList.remove('hidden');
        loadSettingsView();
    } else if (hash === '#admin' && activeUser.role === 'admin') {
        document.getElementById('nav-admin').classList.add('active');
        document.getElementById('page-admin').classList.remove('hidden');
        loadAdminData();
    } else {
        window.location.hash = '#dashboard';
    }

    // Close mobile side drawer on transition
    document.getElementById('app-sidebar').classList.remove('visible');
}

function showSection(sectionId) {
    document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(sectionId).classList.remove('hidden');
}

// --- AUTH VIEW LIFECYCLE ---
function bindAuthEvents() {
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    const resetBox = document.getElementById('forgot-reset-box');

    // Toggles Login <-> Register forms
    document.getElementById('link-to-register').onclick = (e) => {
        e.preventDefault();
        formLogin.classList.add('hidden');
        formRegister.classList.remove('hidden');
        resetBox.classList.add('hidden');
    };

    document.getElementById('link-to-login').onclick = (e) => {
        e.preventDefault();
        formRegister.classList.add('hidden');
        formLogin.classList.remove('hidden');
        resetBox.classList.add('hidden');
    };

    // Forgot Password simulation
    document.getElementById('link-forgot').onclick = async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        if (!email) {
            showToast("Required Input", "Please type your email address first to recover key.", "warning");
            return;
        }
        try {
            const key = await forgotPassword(email);
            document.getElementById('reset-code').textContent = key;
            resetBox.classList.remove('hidden');
            formLogin.classList.add('hidden');
        } catch (err) {
            showToast("Bypass Failed", err.message, "error");
        }
    };

    document.getElementById('btn-back-to-login').onclick = () => {
        resetBox.classList.add('hidden');
        formLogin.classList.remove('hidden');
    };

    // Submit Forms
    formLogin.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;
        try {
            await login(email, pass);
            showToast("Welcome Back!", "Successfully signed into active guard node.", "success");
            window.location.hash = '#dashboard';
        } catch (err) {
            showToast("Sign In Failed", err.message, "error");
        }
    };

    formRegister.onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const pass = document.getElementById('reg-password').value;
        try {
            await register(email, pass, name, 'user');
            showToast("Account Created", "Successfully registered new node operator.", "success");
            window.location.hash = '#dashboard';
        } catch (err) {
            showToast("Registration Failed", err.message, "error");
        }
    };

    // Guest Explore bypass
    document.getElementById('btn-guest-login').onclick = () => {
        loginAsGuest();
        showToast("Logged In", "Exploring edge dashboard as guest operator.", "success");
        window.location.hash = '#dashboard';
    };
}

// --- NAVIGATION BAR ---
function bindNavEvents() {
    document.getElementById('btn-logout').onclick = () => {
        clearSession();
        showToast("Signed Out", "Terminated operator credentials session.", "warning");
        window.location.hash = '';
    };

    // Mobile Hamburger
    document.getElementById('btn-sidebar-toggle').onclick = () => {
        document.getElementById('app-sidebar').classList.toggle('visible');
    };
}

// --- SETTINGS CONTROLLER ---
function bindSettingsEvents() {
    // Model Selection
    document.querySelectorAll('input[name="model-type"]').forEach(radio => {
        radio.onchange = (e) => {
            activeSettings.modelType = e.target.value;
            showToast("AI Model Configured", `Switched active detection network to ${e.target.value}.`, "success");
        };
    });

    // Runtime Engine Selection
    document.querySelectorAll('input[name="runtime-type"]').forEach(radio => {
        radio.onchange = (e) => {
            activeSettings.runtimeType = e.target.value;
            showToast("Execution Backend Switched", `Inferences will process on ${e.target.value} runtime.`, "success");
        };
    });

    // Simulated settings
    document.getElementById('check-cpu-only').onchange = (e) => {
        activeSettings.cpuOnly = e.target.checked;
    };
    document.getElementById('check-low-mem').onchange = (e) => {
        activeSettings.lowMemory = e.target.checked;
    };
    document.getElementById('check-offline').onchange = (e) => {
        activeSettings.offlineMode = e.target.checked;
    };

    // General preferences Theme selection
    document.querySelectorAll('input[name="theme-mode"]').forEach(radio => {
        radio.onchange = (e) => {
            applyTheme(e.target.value);
            showToast("Theme Updated", `Switched visual theme to ${e.target.value} mode.`, "success");
        };
    });

    // General preferences Language selection
    document.querySelectorAll('input[name="display-lang"]').forEach(radio => {
        radio.onchange = (e) => {
            setLanguage(e.target.value);
            applyLanguage(e.target.value);
            showToast("Language Switched", `Default application language changed to ${e.target.value}.`, "success");
        };
    });
}

function applyTheme(theme) {
    localStorage.setItem('wildguard_theme', theme);
    if (theme === 'Light') {
        document.body.classList.add('light-theme');
        document.body.classList.remove('dark-theme');
    } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
    }
}

function applyLanguage(lang) {
    document.querySelectorAll('[data-t]').forEach(el => {
        const key = el.getAttribute('data-t');
        el.textContent = t(key);
    });
}

function loadSettingsView() {
    // Sync UI elements with variables cached
    document.querySelector(`input[name="model-type"][value="${activeSettings.modelType}"]`).checked = true;
    document.querySelector(`input[name="runtime-type"][value="${activeSettings.runtimeType}"]`).checked = true;
    document.getElementById('check-cpu-only').checked = activeSettings.cpuOnly;
    document.getElementById('check-low-mem').checked = activeSettings.lowMemory;
    document.getElementById('check-offline').checked = activeSettings.offlineMode;

    const theme = localStorage.getItem('wildguard_theme') || 'Dark';
    document.querySelector(`input[name="theme-mode"][value="${theme}"]`).checked = true;
    document.querySelector(`input[name="display-lang"][value="${getLanguage()}"]`).checked = true;
}

// --- DASHBOARD DATA & EXPORTS ---
function bindDashboardActionEvents() {
    document.getElementById('btn-quick-scan').onclick = () => {
        window.location.hash = '#camera-scan';
    };

    document.getElementById('btn-export-pdf').onclick = async () => {
        const detections = await getAllDetections();
        exportToPdf(detections);
    };

    document.getElementById('btn-export-csv').onclick = async () => {
        const detections = await getAllDetections();
        exportToCsv(detections);
    };
}

async function loadDashboardData() {
    const detections = await getAllDetections();
    
    // Update numerical stat counters
    document.getElementById('stats-total-detections').textContent = detections.length;
    document.getElementById('stats-alerts-triggered').textContent = detections.filter(d => d.status === 'alert').length;

    // Render Canvas Charts
    drawLineChart(document.getElementById('canvas-line-chart'), detections);
    drawPieChart(document.getElementById('canvas-pie-chart'), detections);
    drawHeatmap(document.getElementById('canvas-heatmap'), detections);

    // Load History list rows
    const tbody = document.getElementById('table-history-body');
    tbody.innerHTML = '';

    if (detections.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-table">No detections recorded yet. Perform a scan to log data.</td></tr>`;
        return;
    }

    // Sort detections by timestamp descending
    detections.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

    detections.forEach(det => {
        const tr = document.createElement('tr');
        const timeStr = new Date(det.timestamp).toLocaleTimeString();
        const dateStr = new Date(det.timestamp).toLocaleDateString();

        tr.innerHTML = `
            <td><strong>${dateStr}</strong> <span style="color:var(--text-muted);">${timeStr}</span></td>
            <td>${det.species}</td>
            <td><i>${det.scientific}</i></td>
            <td>${det.category || 'Normal'}</td>
            <td>${(det.confidence * 100).toFixed(1)}%</td>
            <td><span class="status-badge ${det.status === 'alert' ? 'alert' : 'normal'}">${det.status}</span></td>
            <td><button class="btn-action-delete" data-id="${det.id}">🗑️</button></td>
        `;

        tr.querySelector('.btn-action-delete').onclick = async (e) => {
            const id = e.target.getAttribute('data-id');
            if(confirm("Confirm deletion of this edge log record?")) {
                await deleteDetection(id);
                showToast("Log Cleared", "Deleted classification record from local database.", "warning");
                loadDashboardData();
            }
        };

        tbody.appendChild(tr);
    });
}

// --- HARDWARE LIVE CAMERA VIEW ---
async function setupCameraScan() {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-feed-canvas');
    const loader = document.getElementById('camera-loader');
    const results = document.getElementById('camera-results');
    const metrics = document.getElementById('camera-metrics');

    results.classList.add('hidden');
    metrics.classList.add('hidden');

    currentCameraModeIsSimulated = !(await initCamera(video, canvas, loader));

    // Capture Frame classification
    document.getElementById('btn-camera-capture').onclick = async () => {
        loader.classList.remove('hidden');
        
        setTimeout(async () => {
            loader.classList.add('hidden');
            
            // Extract active frame animal
            let targetAnimal = MOCK_WILDLIFE[Math.floor(Math.random() * MOCK_WILDLIFE.length)];
            
            // Draw static image overlay matching bounding box
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0,0, canvas.width, canvas.height);
            
            // Ensure video feeds stop drawing
            stopCamera();
            
            drawMockAnimal(canvas, targetAnimal.type);
            drawBoundingBox(canvas, targetAnimal.name, targetAnimal.baseConf/100, 0.25, 0.2, 0.5, 0.6, targetAnimal.anomaly);

            const speedMetrics = computePerformanceMetrics();
            const logResults = await logScanDetection(targetAnimal, speedMetrics);
            renderResultCards(logResults.detection, logResults.metrics, results, metrics);
            
            showToast("Classification Success", `Detected ${targetAnimal.name} at ${(logResults.detection.confidence * 100).toFixed(1)}% confidence`, targetAnimal.anomaly ? "error" : "success");
        }, 600);
    };

    // Shuffler mode updates canvas
    document.getElementById('btn-camera-shuffle').onclick = () => {
        if (!currentCameraModeIsSimulated) {
            showToast("Feature Unavailable", "Mock shuffle only applies when real camera permissions are disabled.", "warning");
            return;
        }
        // Force re-draw and run detections
        const targetAnimal = MOCK_WILDLIFE[Math.floor(Math.random() * MOCK_WILDLIFE.length)];
        drawMockAnimal(canvas, targetAnimal.type);
        drawTargetReticle(canvas);
        showToast("Mock Feed Shuffled", `Generating synthetic overlay for: ${targetAnimal.name}`, "success");
    };
}

// --- PHOTO GALLERY UPLOADS ---
function setupGalleryScan() {
    const canvas = document.getElementById('gallery-canvas');
    const loader = document.getElementById('gallery-loader');
    const fileInput = document.getElementById('gallery-file-input');
    const fileInfo = document.getElementById('gallery-file-info');
    const results = document.getElementById('gallery-results');
    const metrics = document.getElementById('gallery-metrics');

    results.classList.add('hidden');
    metrics.classList.add('hidden');
    
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    
    // Draw initial mock forest canvas scenery
    ctx.fillStyle = '#0f1712';
    ctx.fillRect(0,0, canvas.width, canvas.height);
    drawTargetReticle(canvas);

    // Random album selector
    document.getElementById('btn-gallery-select').onclick = () => {
        loader.classList.remove('hidden');
        results.classList.add('hidden');
        metrics.classList.add('hidden');

        setTimeout(async () => {
            loader.classList.add('hidden');
            const target = MOCK_WILDLIFE[Math.floor(Math.random() * MOCK_WILDLIFE.length)];
            fileInfo.textContent = `Random Album File: simulated_${target.type}_shot.jpg`;

            ctx.clearRect(0,0, canvas.width, canvas.height);
            drawMockAnimal(canvas, target.type);
            drawBoundingBox(canvas, target.name, target.baseConf/100, 0.25, 0.2, 0.5, 0.6, target.anomaly);

            const speedMetrics = computePerformanceMetrics();
            const logResults = await logScanDetection(target, speedMetrics);
            renderResultCards(logResults.detection, logResults.metrics, results, metrics);
            
            showToast("Album Image Analyzed", `Species classification matching complete.`, "success");
        }, 500);
    };

    // Custom File Select triggers hidden input click
    document.getElementById('btn-gallery-upload').onclick = () => {
        fileInput.click();
    };

    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        fileInfo.textContent = `File Selected: ${file.name}`;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                drawTargetReticle(canvas);
                showToast("File Loaded", "Custom photo loaded. Tap Run Classification.", "success");
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    // Run Custom Classification Click
    document.getElementById('btn-gallery-detect').onclick = () => {
        loader.classList.remove('hidden');
        
        setTimeout(async () => {
            loader.classList.add('hidden');
            const target = MOCK_WILDLIFE[Math.floor(Math.random() * MOCK_WILDLIFE.length)];
            
            drawBoundingBox(canvas, target.name, target.baseConf/100, 0.3, 0.25, 0.4, 0.5, target.anomaly);

            const speedMetrics = computePerformanceMetrics();
            const logResults = await logScanDetection(target, speedMetrics);
            renderResultCards(logResults.detection, logResults.metrics, results, metrics);
        }, 600);
    };
}

// --- VIDEO SCANNER PIPELINE ---
function setupVideoScan() {
    const canvas = document.getElementById('video-canvas');
    const loader = document.getElementById('video-loader');
    const fileInput = document.getElementById('video-file-input');
    const fileInfo = document.getElementById('video-file-info');
    const results = document.getElementById('video-results');
    const metrics = document.getElementById('video-metrics');
    const progressContainer = document.querySelector('.video-progress-bar-container');
    const progressBar = document.getElementById('video-progress-bar');
    const frameCounter = document.getElementById('video-frame-count');

    results.classList.add('hidden');
    metrics.classList.add('hidden');
    progressContainer.style.display = 'none';

    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#060a08';
    ctx.fillRect(0,0, canvas.width, canvas.height);
    drawTargetReticle(canvas);

    document.getElementById('btn-video-upload').onclick = () => {
        fileInput.click();
    };

    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            fileInfo.textContent = `File Selected: ${file.name}`;
            showToast("Video Uploaded", "Custom video file mounted for Edge parsing.", "success");
        }
    };

    // Deconstruct video frame parsing simulation
    document.getElementById('btn-video-analyze').onclick = () => {
        results.classList.add('hidden');
        metrics.classList.add('hidden');

        initVideoScan(canvas, progressBar, progressContainer, loader, frameCounter, (detection, speedMetrics) => {
            renderResultCards(detection, speedMetrics, results, metrics);
            showToast("Video Processing Success", `Analyzed MP4 clip. Detected ${detection.species}`, detection.status === 'alert' ? 'error' : 'success');
        });
    };
}

// --- AUDIO MICROPHONE / SPECTROGRAM ---
function setupAudioScan() {
    const recordBtn = document.getElementById('btn-audio-record');
    const uploadBtn = document.getElementById('btn-audio-upload');
    const waveformBox = document.getElementById('audio-visualizer-wave');
    const spectrogramBox = document.getElementById('audio-spectrogram-box');
    const placeholder = document.getElementById('audio-placeholder-text');
    const waveBars = document.getElementById('audio-waves');
    const durationLbl = document.getElementById('audio-duration-label');
    const specCanvas = document.getElementById('audio-spectrogram-canvas');
    const results = document.getElementById('audio-results');
    
    // Create performance metrics panel if it doesn't exist for audio scan
    let metrics = document.getElementById('audio-metrics');
    if (!metrics) {
        metrics = document.createElement('div');
        metrics.id = 'audio-metrics';
        metrics.className = 'metrics-card hidden';
        document.querySelector('#page-audio-scan .controls-panel').appendChild(metrics);
    }

    results.classList.add('hidden');
    metrics.classList.add('hidden');
    waveformBox.classList.add('hidden');
    spectrogramBox.classList.add('hidden');
    placeholder.classList.remove('hidden');

    recordBtn.onclick = () => {
        if (recordBtn.textContent.includes('Stop')) {
            stopAudioCapture();
            recordBtn.textContent = '🎙️ ' + t('record_call');
            recordBtn.style.backgroundColor = '';
            showToast("Recording Cancelled", "Real-time sound classification cancelled.", "warning");
        } else {
            startAudioScan(
                recordBtn, 
                waveformBox, 
                spectrogramBox, 
                placeholder, 
                waveBars, 
                durationLbl, 
                specCanvas, 
                results, 
                metrics
            );
        }
    };

    // Simulated file analyzer
    uploadBtn.onclick = () => {
        const fileSelector = document.createElement('input');
        fileSelector.type = 'file';
        fileSelector.accept = 'audio/*';
        
        fileSelector.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            uploadAudioClassification(
                file, 
                waveformBox, 
                spectrogramBox, 
                placeholder, 
                waveBars, 
                durationLbl, 
                specCanvas, 
                results, 
                metrics,
                (detection, speedMetrics) => {
                    renderResultCards(detection, speedMetrics, results, metrics);
                    showToast("Audio Classification Complete", `Detected vocal profile: ${detection.species}`, detection.status === 'alert' ? 'error' : 'success');
                }
            );
        };
        fileSelector.click();
    };
}

// --- ADMIN SYSTEM PANEL ---
async function loadAdminData() {
    // Load Operator Users
    const users = await getAllUsers();
    const usersBody = document.getElementById('table-users-body');
    usersBody.innerHTML = '';

    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${user.fullName}</strong></td>
            <td>${user.email}</td>
            <td><span style="font-weight:600; text-transform:uppercase; color: ${user.role === 'admin' ? 'var(--accent)' : 'var(--text-secondary)'};">${user.role}</span></td>
            <td><button class="btn-action-delete" data-email="${user.email}" ${user.email === 'admin@wildguard.ai' ? 'disabled style="opacity:0.3;cursor:not-allowed;"' : ''}>🗑️</button></td>
        `;

        const btnDel = tr.querySelector('.btn-action-delete');
        if (user.email !== 'admin@wildguard.ai') {
            btnDel.onclick = async (e) => {
                const email = e.target.getAttribute('data-email');
                if (confirm(`Confirm deletion of operator credentials for user: ${email}?`)) {
                    await deleteUser(email);
                    showToast("User Deleted", "Credential access removed from this local node.", "warning");
                    loadAdminData();
                }
            };
        }

        usersBody.appendChild(tr);
    });

    // Load Performance statistics table
    const logs = await getPerfLogs();
    const logsBody = document.getElementById('table-perf-logs-body');
    logsBody.innerHTML = '';

    if (logs.length === 0) {
        logsBody.innerHTML = `<tr><td colspan="7" class="empty-table">No Edge hardware performance logs logged yet.</td></tr>`;
    } else {
        // Sort descending
        logs.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

        logs.forEach(log => {
            const timeStr = new Date(log.timestamp).toLocaleTimeString();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${timeStr}</td>
                <td><strong>${log.modelType}</strong></td>
                <td>${log.runtimeType}</td>
                <td>${log.latency}</td>
                <td>${log.ram}</td>
                <td>${log.cpu}</td>
                <td><span style="font-size:11px;color:var(--text-muted);">${log.battery}</span></td>
            `;
            logsBody.appendChild(tr);
        });
    }

    document.getElementById('btn-clear-perf-logs').onclick = async () => {
        if (confirm("Confirm clearing all cached device execution logs?")) {
            await clearPerfLogs();
            showToast("Logs Cleared", "System performance telemetry history wiped clean.", "success");
            loadAdminData();
        }
    };
}
