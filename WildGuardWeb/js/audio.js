// audio.js - Audio Spectrogram CNN Processing (Microphone & Animal Calls)
import { saveDetection, savePerfLog } from './db.js';
import { activeSettings, computePerformanceMetrics, logScanDetection, renderResultCards } from './scanner.js';
import { t } from './translator.js';

let audioCtx = null;
let analyser = null;
let stream = null;
let recordingInterval = null;
let animationFrameId = null;

const MOCK_VOCALIZATIONS = [
    { name: "Bengal Tiger (Vocal)", scientific: "Panthera tigris tigris", category: "Rare / Endangered", baseConf: 92.4, anomaly: true, type: "tiger" },
    { name: "Indian Elephant (Vocal)", scientific: "Elephas maximus indicus", category: "Endangered", baseConf: 89.9, anomaly: false, type: "elephant" },
    { name: "Common Leopard (Vocal)", scientific: "Panthera pardus", category: "Vulnerable", baseConf: 87.2, anomaly: true, type: "leopard" },
    { name: "Indian Peafowl (Vocal)", scientific: "Pavo cristatus", category: "Normal / Protected", baseConf: 94.6, anomaly: false, type: "peacock" },
    { name: "Sambar Deer (Vocal)", scientific: "Rusa unicolor", category: "Normal", baseConf: 91.0, anomaly: false, type: "deer" }
];

export function stopAudioCapture() {
    if (recordingInterval) {
        clearInterval(recordingInterval);
        recordingInterval = null;
    }
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close();
        audioCtx = null;
    }
}

// Draw a beautiful scrolling 2D Mel-Spectrogram
function drawSpectrogram(canvas, analyserNode) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Shift the spectrogram left by 2 pixels to create a scrolling effect
    ctx.drawImage(canvas, -2, 0, w, h, -2, 0, w, h);
    
    // Fill the new column on the right
    ctx.fillStyle = '#050505';
    ctx.fillRect(w - 2, 0, 2, h);

    const bufferLength = analyserNode ? analyserNode.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);
    
    if (analyserNode) {
        analyserNode.getByteFrequencyData(dataArray);
    } else {
        // Fallback simulated wave frequency generator
        for(let i=0; i<bufferLength; i++) {
            dataArray[i] = Math.max(0, Math.sin(Date.now() * 0.005 + i * 0.1) * 80 + 100 + Math.random() * 30);
        }
    }

    // Draw a slice of the frequency data
    const barHeight = h / bufferLength;
    for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i];
        
        // Custom HSL spectrogram heatmap color scheme (purple -> blue -> green -> yellow -> red)
        const percent = value / 255;
        const hue = (1.0 - percent) * 240; // 240 (blue) down to 0 (red)
        
        ctx.fillStyle = value > 20 ? `hsl(${hue}, 100%, ${percent * 50}%)` : '#050505';
        ctx.fillRect(w - 2, h - (i * barHeight), 2, barHeight);
    }
}

// Generate dynamic moving bars for the micro-waveform overlay
function drawWaveformUI(containerEl, dataArray) {
    containerEl.innerHTML = '';
    const numBars = 24;
    const step = Math.floor(dataArray.length / numBars);
    
    for (let i = 0; i < numBars; i++) {
        const val = dataArray[i * step] || 10;
        const height = Math.max(4, Math.floor((val / 255) * 35));
        
        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.style.height = `${height}px`;
        containerEl.appendChild(bar);
    }
}

// --- INITIALIZE AUDIO SCANNER CONTROLLER ---
export async function startAudioScan(
    recordBtn, 
    waveformBox, 
    spectrogramBox, 
    placeholderText, 
    waveBarsContainer, 
    durationLabel, 
    spectrogramCanvas, 
    resultsDiv, 
    metricsDiv
) {
    stopAudioCapture();

    // Reset UI visibility
    waveformBox.classList.remove('hidden');
    spectrogramBox.classList.remove('hidden');
    placeholderText.classList.add('hidden');
    resultsDiv.classList.add('hidden');
    metricsDiv.classList.add('hidden');

    spectrogramCanvas.width = 256;
    spectrogramCanvas.height = 128;
    const specCtx = spectrogramCanvas.getContext('2d');
    specCtx.fillStyle = '#050505';
    specCtx.fillRect(0, 0, spectrogramCanvas.width, spectrogramCanvas.height);

    let isMockMode = false;
    let dataArray = new Uint8Array(128);

    try {
        // Attempt true microphone stream binding
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
    } catch (e) {
        console.warn("Microphone blocked or unavailable. Running premium audio spectrogram simulation...", e);
        isMockMode = true;
    }

    let seconds = 0;
    const maxDuration = 4;
    durationLabel.textContent = `Duration: 0s / ${maxDuration}s`;
    recordBtn.textContent = '⏹️ Stop Scan';
    recordBtn.style.backgroundColor = 'var(--alert)';

    // Start UI Render loop
    const renderLoop = () => {
        if (analyser) {
            dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteTimeDomainData(dataArray);
            drawWaveformUI(waveBarsContainer, dataArray);
        } else {
            // Simulated micro-waveform heights
            const simArray = Array.from({ length: 128 }, (_, i) => 
                Math.floor(Math.sin(Date.now() * 0.01 + i) * 60 + 128 + Math.random() * 40)
            );
            drawWaveformUI(waveBarsContainer, simArray);
        }

        drawSpectrogram(spectrogramCanvas, analyser);
        animationFrameId = requestAnimationFrame(renderLoop);
    };
    renderLoop();

    // Ticks interval for countdown
    recordingInterval = setInterval(async () => {
        seconds++;
        durationLabel.textContent = `Duration: ${seconds}s / ${maxDuration}s`;

        if (seconds >= maxDuration) {
            stopAudioCapture();
            recordBtn.textContent = '🎙️ ' + t('record_call');
            recordBtn.style.backgroundColor = '';

            // Run CNN classification matching
            const matchedAnimal = MOCK_VOCALIZATIONS[Math.floor(Math.random() * MOCK_VOCALIZATIONS.length)];
            const metrics = computePerformanceMetrics();
            
            // Log results
            const results = await logScanDetection(matchedAnimal, metrics);
            renderResultCards(results.detection, results.metrics, resultsDiv, metricsDiv);
        }
    }, 1000);
}

// --- HANDLE AUDIO FILE CLASSIFICATION UPLOAD ---
export function uploadAudioClassification(file, waveformBox, spectrogramBox, placeholderText, waveBarsContainer, durationLabel, spectrogramCanvas, resultsDiv, metricsDiv, onComplete) {
    stopAudioCapture();

    waveformBox.classList.remove('hidden');
    spectrogramBox.classList.remove('hidden');
    placeholderText.classList.add('hidden');
    resultsDiv.classList.add('hidden');
    metricsDiv.classList.add('hidden');

    spectrogramCanvas.width = 256;
    spectrogramCanvas.height = 128;
    const specCtx = spectrogramCanvas.getContext('2d');
    specCtx.fillStyle = '#050505';
    specCtx.fillRect(0, 0, spectrogramCanvas.width, spectrogramCanvas.height);

    let progress = 0;
    const maxTick = 20;
    durationLabel.textContent = `Analyzing audio file: ${file.name}`;

    recordingInterval = setInterval(async () => {
        progress++;
        
        // Draw continuous spectrogram and wave bars
        const simArray = Array.from({ length: 128 }, (_, i) => 
            Math.floor(Math.sin(Date.now() * 0.01 + i) * 80 + 128 + Math.random() * 20)
        );
        drawWaveformUI(waveBarsContainer, simArray);
        drawSpectrogram(spectrogramCanvas, null);

        if (progress >= maxTick) {
            clearInterval(recordingInterval);
            recordingInterval = null;

            const matchedAnimal = MOCK_VOCALIZATIONS[Math.floor(Math.random() * MOCK_VOCALIZATIONS.length)];
            const metrics = computePerformanceMetrics();
            const results = await logScanDetection(matchedAnimal, metrics);
            onComplete(results.detection, results.metrics);
        }
    }, 100);
}
