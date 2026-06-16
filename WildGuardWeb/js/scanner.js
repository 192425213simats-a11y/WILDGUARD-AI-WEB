// scanner.js - Visual AI Edge Scanners (Camera, Gallery, Video)
import { saveDetection, savePerfLog } from './db.js';
import { t } from './translator.js';

// Wildlife database for mock Edge AI classifications with species metadata
export const MOCK_WILDLIFE = [
    { 
        name: "Bengal Tiger", 
        scientific: "Panthera tigris tigris", 
        category: "Mammal", 
        baseConf: 94.2, 
        anomaly: true, 
        type: "tiger",
        status: "Endangered",
        habitat: "Tropical forests, mangrove swamps, grasslands",
        diet: "Carnivore (Sambar deer, wild boar, gaurs)",
        distribution: "India, Bangladesh, Nepal, Bhutan",
        description: "A magnificent apex predator with dark vertical stripes on reddish-orange fur. Solitary and territorial.",
        explain: "Identified by black stripe patterns on orange/yellow fur, white facial whiskers, and muscular build matching Panthera tigris.",
        similar: ["Common Leopard (82%)", "Lion (75%)"]
    },
    { 
        name: "Asian Elephant", 
        scientific: "Elephas maximus", 
        category: "Mammal", 
        baseConf: 91.5, 
        anomaly: false, 
        type: "elephant",
        status: "Endangered",
        habitat: "Grasslands, tropical evergreen forests, dry deciduous forests",
        diet: "Herbivore (Roots, grasses, fruit, bark)",
        distribution: "Southeast Asia, India, Sri Lanka",
        description: "Large land mammal with smaller ears than African elephants. Highly social and lives in matriarchal herds.",
        explain: "Identified by large grey dome-shaped cranium, trunk structure, pillar-like legs, and fan-shaped ears matching Elephas maximus.",
        similar: ["African Bush Elephant (86%)", "Woolly Mammoth (50%)"]
    },
    { 
        name: "Common Leopard", 
        scientific: "Panthera pardus", 
        category: "Mammal", 
        baseConf: 89.8, 
        anomaly: true, 
        type: "leopard",
        status: "Vulnerable",
        habitat: "Savannas, woodlands, deserts, forests",
        diet: "Carnivore (Antelopes, monkeys, rodents)",
        distribution: "Sub-Saharan Africa, Central Asia, India",
        description: "A versatile, opportunistic hunter with rosette spots on golden fur. Known for climbing trees with heavy prey.",
        explain: "Identified by dark rosette spots grouped in circles on golden-yellow fur, elongated tail, and feline head structure.",
        similar: ["Bengal Tiger (80%)", "Jaguar (78%)", "Cheetah (72%)"]
    },
    { 
        name: "Sambar Deer", 
        scientific: "Rusa unicolor", 
        category: "Mammal", 
        baseConf: 95.1, 
        anomaly: false, 
        type: "deer",
        status: "Vulnerable",
        habitat: "Deciduous forests, hillsides, marshes",
        diet: "Herbivore (Grasses, foliage, fruit, water plants)",
        distribution: "Southern Asia, India, Cambodia",
        description: "Large deer with coarse, dark brown coat and long, three-tined antlers on males. Highly alert.",
        explain: "Identified by coarse brown fur, large rounded ears, and three-tined branching antlers (in males) matching Rusa unicolor.",
        similar: ["Spotted Deer (Axis axis) (85%)", "Elk (72%)"]
    },
    { 
        name: "Indian Peafowl", 
        scientific: "Pavo cristatus", 
        category: "Bird", 
        baseConf: 97.4, 
        anomaly: false, 
        type: "peacock",
        status: "Least Concern / Protected",
        habitat: "Dry semi-desert grasslands, scrub forests, cultivated fields",
        diet: "Omnivore (Seeds, insects, small reptiles, berries)",
        distribution: "South Asia, India, Sri Lanka",
        description: "A large and brightly colored bird, with a metallic blue head and neck, and a train of elongated tail feathers.",
        explain: "Identified by iridescent blue-green neck plumage, feather fan structure, and fan-shaped crest atop the head.",
        similar: ["Green Peafowl (84%)", "Pheasant (65%)"]
    },
    { 
        name: "Asiatic Black Bear", 
        scientific: "Ursus thibetanus", 
        category: "Mammal", 
        baseConf: 88.5, 
        anomaly: true, 
        type: "bear",
        status: "Vulnerable",
        habitat: "Himalayan forests, broadleaf forests",
        diet: "Omnivore (Acorns, berries, insects, honey, meat)",
        distribution: "Himalayas, East Asia, Russia",
        description: "Medium-sized black bear with a distinct white V-shaped chest mark. Highly arboreal.",
        explain: "Identified by shaggy black fur profile, large ears, and prominent cream-white V-shaped crescent mark on chest.",
        similar: ["Sloth Bear (80%)", "Grizzly Bear (65%)"]
    }
];

// Active Settings Cache (populated by app.js)
export const activeSettings = {
    modelType: 'YOLOv5',
    runtimeType: 'TFLite',
    cpuOnly: false,
    lowMemory: false,
    offlineMode: false
};

// --- DRAWING UTILITIES FOR Programmatic Mock Images ---
export function drawMockAnimal(canvas, animalType) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Draw background (Forest/Jungle theme)
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#102A18');
    grad.addColorStop(0.5, '#1E4620');
    grad.addColorStop(1, '#0C1C0E');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Draw some stylized jungle foliage
    ctx.fillStyle = 'rgba(74, 222, 128, 0.08)';
    for(let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(w * 0.15 * i, h * 0.9, w * 0.25, Math.PI, 0);
        ctx.fill();
    }

    // Stylized sun/moon light overlay
    const sunGrad = ctx.createRadialGradient(w * 0.8, h * 0.2, 10, w * 0.8, h * 0.2, w * 0.5);
    sunGrad.addColorStop(0, 'rgba(165, 214, 167, 0.15)');
    sunGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, w, h);

    // Draw target animal silhouette
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = 'rgba(74, 222, 128, 0.4)';
    
    if (animalType === 'tiger') {
        // Bengal Tiger layout
        ctx.fillStyle = '#E67E22'; // Tiger Orange
        ctx.beginPath();
        // Body
        ctx.ellipse(w / 2, h / 2 + 20, 80, 50, 0, 0, Math.PI * 2);
        ctx.fill();
        // Head
        ctx.beginPath();
        ctx.arc(w / 2 - 70, h / 2 - 10, 35, 0, Math.PI * 2);
        ctx.fill();
        // Tail
        ctx.strokeStyle = '#E67E22';
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(w / 2 + 70, h / 2 + 20);
        ctx.quadraticCurveTo(w / 2 + 120, h / 2 - 20, w / 2 + 100, h / 2 - 60);
        ctx.stroke();
        // Stripes
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 6;
        for (let i = -40; i <= 40; i += 20) {
            ctx.beginPath();
            ctx.moveTo(w / 2 + i, h / 2 - 25);
            ctx.lineTo(w / 2 + i, h / 2 + 10);
            ctx.stroke();
        }
    } else if (animalType === 'elephant') {
        // Indian Elephant layout
        ctx.fillStyle = '#566573'; // Elephant Grey
        ctx.beginPath();
        // Body
        ctx.ellipse(w / 2, h / 2 + 30, 95, 70, 0, 0, Math.PI * 2);
        ctx.fill();
        // Head
        ctx.beginPath();
        ctx.arc(w / 2 - 80, h / 2 + 10, 45, 0, Math.PI * 2);
        ctx.fill();
        // Trunk
        ctx.strokeStyle = '#566573';
        ctx.lineWidth = 16;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(w / 2 - 105, h / 2 + 20);
        ctx.quadraticCurveTo(w / 2 - 145, h / 2 + 60, w / 2 - 120, h / 2 + 80);
        ctx.stroke();
    } else if (animalType === 'leopard') {
        // Leopard
        ctx.fillStyle = '#D4AC0D'; // Yellow Gold
        ctx.beginPath();
        ctx.ellipse(w / 2, h / 2 + 20, 75, 42, 0, 0, Math.PI * 2);
        ctx.fill();
        // Head
        ctx.beginPath();
        ctx.arc(w / 2 - 65, h / 2 - 10, 30, 0, Math.PI * 2);
        ctx.fill();
        // Spots
        ctx.fillStyle = '#1E1E1E';
        for (let j = 0; j < 12; j++) {
            const sx = w / 2 - 50 + (j * 10) % 90;
            const sy = h / 2 + (j * 7) % 35;
            ctx.beginPath();
            ctx.arc(sx, sy, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (animalType === 'peacock') {
        // Indian Peafowl
        // Tail feathers
        ctx.fillStyle = '#117A65';
        ctx.beginPath();
        ctx.ellipse(w / 2 + 40, h / 2 + 10, 70, 60, 0.2, 0, Math.PI * 2);
        ctx.fill();
        // Body
        ctx.fillStyle = '#1F618D'; // Royal Blue
        ctx.beginPath();
        ctx.ellipse(w / 2 - 10, h / 2 + 20, 40, 25, -0.4, 0, Math.PI * 2);
        ctx.fill();
        // Neck & Head
        ctx.strokeStyle = '#1F618D';
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(w / 2 - 35, h / 2 + 10);
        ctx.quadraticCurveTo(w / 2 - 55, h / 2 - 20, w / 2 - 40, h / 2 - 40);
        ctx.stroke();
    } else if (animalType === 'bear') {
        // Bear layout
        ctx.fillStyle = '#1C1C1C';
        ctx.beginPath();
        ctx.ellipse(w / 2, h / 2 + 20, 85, 55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(w / 2 - 65, h / 2 - 10, 35, 0, Math.PI * 2);
        ctx.fill();
        // White V crescent
        ctx.strokeStyle = '#F1F1F1';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(w / 2 - 55, h / 2 + 20);
        ctx.quadraticCurveTo(w / 2 - 35, h / 2 + 40, w / 2 - 15, h / 2 + 20);
        ctx.stroke();
    } else {
        // Deer layout
        ctx.fillStyle = '#A04000'; // Brown
        // Legs
        ctx.strokeStyle = '#A04000';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(w / 2 - 30, h / 2 + 20); ctx.lineTo(w / 2 - 30, h / 2 + 80);
        ctx.moveTo(w / 2 + 30, h / 2 + 20); ctx.lineTo(w / 2 + 30, h / 2 + 80);
        ctx.stroke();
        // Body
        ctx.beginPath();
        ctx.ellipse(w / 2, h / 2 + 10, 60, 35, 0, 0, Math.PI * 2);
        ctx.fill();
        // Neck/Head
        ctx.beginPath();
        ctx.moveTo(w / 2 - 50, h / 2 + 10);
        ctx.lineTo(w / 2 - 75, h / 2 - 40);
        ctx.arc(w / 2 - 75, h / 2 - 40, 15, 0, Math.PI*2);
        ctx.fill();
        // Antlers
        ctx.strokeStyle = '#5E2F0D';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(w / 2 - 80, h / 2 - 50);
        ctx.lineTo(w / 2 - 95, h / 2 - 80);
        ctx.moveTo(w / 2 - 80, h / 2 - 50);
        ctx.lineTo(w / 2 - 70, h / 2 - 75);
        ctx.stroke();
    }

    ctx.restore();
}

// Bounding Box Drawing Overlay
export function drawBoundingBox(canvas, label, confidence, xPercent, yPercent, wPercent, hPercent, isAnomaly) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    const boxX = w * xPercent;
    const boxY = h * yPercent;
    const boxW = w * wPercent;
    const boxH = h * hPercent;

    const accentColor = isAnomaly ? '#ef4444' : '#4ade80';

    ctx.save();
    
    // Draw outer boundary glowing rect
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 8;
    ctx.shadowColor = accentColor;
    ctx.strokeRect(boxX, boxY, boxW, boxH);
    ctx.shadowBlur = 0;

    // Corner crosshairs
    ctx.fillStyle = accentColor;
    const len = 15;
    const thickness = 4;
    // Top-left
    ctx.fillRect(boxX - 2, boxY - 2, len, thickness);
    ctx.fillRect(boxX - 2, boxY - 2, thickness, len);
    // Top-right
    ctx.fillRect(boxX + boxW - len + 2, boxY - 2, len, thickness);
    ctx.fillRect(boxX + boxW - 2, boxY - 2, thickness, len);
    // Bottom-left
    ctx.fillRect(boxX - 2, boxY + boxH - thickness + 2, len, thickness);
    ctx.fillRect(boxX - 2, boxY + boxH - len + 2, thickness, len);
    // Bottom-right
    ctx.fillRect(boxX + boxW - len + 2, boxY + boxH - thickness + 2, len, thickness);
    ctx.fillRect(boxX + boxW - 2, boxY + boxH - len + 2, thickness, len);

    // Label Text Overlay
    ctx.font = 'bold 12px var(--font-outfit)';
    const text = `${label} (${(confidence * 100).toFixed(1)}%)`;
    const textWidth = ctx.measureText(text).width;
    
    ctx.fillStyle = accentColor;
    ctx.fillRect(boxX - 1.5, boxY - 22, textWidth + 16, 22);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, boxX + 8, boxY - 7);

    ctx.restore();
}

// Draw a cool target reticle
export function drawTargetReticle(canvas) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.save();
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.25)';
    ctx.lineWidth = 1.5;

    // Outer Circle
    ctx.beginPath();
    ctx.arc(cx, cy, 60, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshairs lines
    ctx.beginPath();
    ctx.moveTo(cx - 80, cy); ctx.lineTo(cx - 30, cy);
    ctx.moveTo(cx + 30, cy); ctx.lineTo(cx + 80, cy);
    ctx.moveTo(cx, cy - 80); ctx.lineTo(cx, cy - 30);
    ctx.moveTo(cx, cy + 30); ctx.lineTo(cx, cy + 80);
    ctx.stroke();

    // Lens frame corner borders
    ctx.strokeStyle = 'rgba(165, 214, 167, 0.15)';
    ctx.lineWidth = 2;
    const gap = 30;
    // Top-Left corner
    ctx.beginPath();
    ctx.moveTo(gap, gap + 20); ctx.lineTo(gap, gap); ctx.lineTo(gap + 20, gap);
    ctx.stroke();
    // Top-Right corner
    ctx.beginPath();
    ctx.moveTo(w - gap, gap + 20); ctx.lineTo(w - gap, gap); ctx.lineTo(w - gap - 20, gap);
    ctx.stroke();
    // Bottom-Left corner
    ctx.beginPath();
    ctx.moveTo(gap, h - gap - 20); ctx.lineTo(gap, h - gap); ctx.lineTo(gap + 20, h - gap);
    ctx.stroke();
    // Bottom-Right corner
    ctx.beginPath();
    ctx.moveTo(w - gap, h - gap - 20); ctx.lineTo(w - gap, h - gap); ctx.lineTo(w - gap - 20, h - gap);
    ctx.stroke();

    ctx.restore();
}

// Generate performance logs based on runtime settings
export function computePerformanceMetrics() {
    let latency = 0;
    let ram = 0;
    let cpu = 0;
    
    // Model Type Latency Impact
    if (activeSettings.modelType === 'YOLOv5') {
        latency += Math.floor(Math.random() * 20) + 60; // 60-80ms base
        ram += Math.floor(Math.random() * 30) + 160;   // 160-190MB
        cpu += Math.floor(Math.random() * 10) + 30;    // 30-40%
    } else {
        // EfficientDet
        latency += Math.floor(Math.random() * 15) + 30; // 30-45ms base
        ram += Math.floor(Math.random() * 20) + 90;    // 90-110MB
        cpu += Math.floor(Math.random() * 8) + 18;     // 18-26%
    }

    // ONNX Runtime usually slightly faster but uses more RAM
    if (activeSettings.runtimeType === 'ONNX') {
        latency -= 5;
        ram += 40;
    }

    // CPU-Only mode increases latency & CPU draw
    if (activeSettings.cpuOnly) {
        latency += Math.floor(Math.random() * 50) + 80; // add 80-130ms latency
        cpu += Math.floor(Math.random() * 15) + 20;     // add 20-35% CPU load
    }

    // Low Memory mode reduces heap size simulation
    if (activeSettings.lowMemory) {
        ram = Math.floor(ram * 0.65);
        latency += 15; // overhead from GC collections
    }

    // Dynamic battery draw calculation
    let batteryMultiplier = 1.0;
    if (activeSettings.cpuOnly) batteryMultiplier += 0.4;
    if (activeSettings.modelType === 'YOLOv5') batteryMultiplier += 0.3;
    const batteryDraw = (0.015 * batteryMultiplier * (cpu / 20)).toFixed(4) + "% / classification";

    return {
        latency: `${latency} ms`,
        ram: `${ram} MB`,
        cpu: `${cpu.toFixed(1)}%`,
        battery: batteryDraw,
        numericLatency: latency,
        numericRam: ram,
        numericCpu: cpu,
        numericBattery: 0.015 * batteryMultiplier * (cpu / 20)
    };
}

// Render dynamic results UI and save to database
export async function logScanDetection(wildlife, metrics) {
    const confidence = parseFloat((wildlife.baseConf / 100 + (Math.random() * 0.03 - 0.015)).toFixed(3));
    
    // Default mock lists for top predictions based on selected animal
    let topPredictions = [];
    if (confidence >= 0.80) {
        topPredictions = [
            `${wildlife.name} – ${Math.floor(confidence*100)}%`,
            `${wildlife.similar[0]}`
        ];
        if (wildlife.similar.length > 1) {
            topPredictions.push(wildlife.similar[1]);
        }
    } else {
        topPredictions = ["Unknown Species"];
    }

    const detection = {
        species: confidence >= 0.80 ? wildlife.name : "Unknown Species",
        scientific: confidence >= 0.80 ? wildlife.scientific : "",
        category: confidence >= 0.80 ? wildlife.category : "Unknown",
        confidence: confidence,
        status: confidence >= 0.80 && wildlife.anomaly ? "alert" : "normal",
        timestamp: new Date().toISOString(),
        topPredictions: topPredictions,
        explainability: confidence >= 0.80 ? wildlife.explain : "Species could not be identified accurately. Please capture a clearer image.",
        conservationStatus: wildlife.status,
        habitat: wildlife.habitat,
        diet: wildlife.diet,
        distribution: wildlife.distribution,
        description: wildlife.description,
        inferenceTimeMs: metrics.numericLatency || 45,
        boundingBoxCount: 1
    };

    // Save detection to IndexedDB
    const savedId = await saveDetection(detection);
    
    // Save performance log entry
    const perfLog = {
        modelType: activeSettings.modelType,
        runtimeType: activeSettings.runtimeType,
        latency: metrics.latency,
        ram: metrics.ram,
        cpu: metrics.cpu,
        battery: metrics.battery,
        timestamp: new Date().toISOString()
    };
    await savePerfLog(perfLog);

    return { detection: { ...detection, id: savedId }, metrics };
}

// Build standard HTML outputs for display on scan panels
export function renderResultCards(detection, metrics, resultsDiv, metricsDiv) {
    resultsDiv.classList.remove('hidden');
    metricsDiv.classList.remove('hidden');

    const isUnknown = detection.species === "Unknown Species" || detection.confidence < 0.80;
    
    if (isUnknown) {
        resultsDiv.className = 'results-card danger';
        resultsDiv.innerHTML = `
            <div class="results-header">
                <span class="title">🚨 Unknown Species</span>
                <span class="conf">${(detection.confidence * 100).toFixed(0)}%</span>
            </div>
            <p style="margin-top: 8px; font-size: 13.5px; color: var(--alert); font-weight: 700; line-height: 1.4;">
                Species could not be identified accurately. Please capture a clearer image.
            </p>
        `;
    } else {
        const isAnomaly = detection.status === 'alert';
        resultsDiv.className = isAnomaly ? 'results-card danger' : 'results-card';
        
        let predictionsHtml = '';
        if (detection.topPredictions && detection.topPredictions.length > 0) {
            predictionsHtml = `
                <div class="detail-block" style="grid-column: span 2; margin-top: 8px;">
                    <span class="lbl" style="font-weight: 700;">Top Predictions</span>
                    <ul style="list-style-type: none; padding-left: 0; margin-top: 4px; font-size: 12px; color: var(--text-primary);">
                        ${detection.topPredictions.map(p => `<li>• ${p}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        let explainHtml = '';
        if (detection.explainability) {
            explainHtml = `
                <div class="detail-block" style="grid-column: span 2; margin-top: 8px; padding: 10px; background: rgba(255,255,255,0.03); border-radius: var(--border-radius-sm); border: 1px dashed var(--border-color);">
                    <span class="lbl" style="font-weight: 700;">AI Explainability Summary</span>
                    <p style="font-size: 11.5px; color: var(--text-secondary); margin-top: 4px; line-height: 1.4;">${detection.explainability}</p>
                </div>
            `;
        }

        let speciesDbHtml = '';
        if (detection.description) {
            speciesDbHtml = `
                <div class="detail-block" style="grid-column: span 2; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-color);">
                    <span class="lbl" style="color: var(--accent); font-weight: 700;">Local Wildlife Database Info</span>
                    <p style="font-size: 11.5px; color: var(--text-muted); margin-top: 4px; line-height: 1.4;">
                        <strong>Conservation Status:</strong> ${detection.conservationStatus || 'Protected'}<br>
                        <strong>Habitat:</strong> ${detection.habitat || 'Forests'}<br>
                        <strong>Diet:</strong> ${detection.diet || 'Omnivore'}<br>
                        <strong>Distribution:</strong> ${detection.distribution || 'Global'}<br>
                        <strong>Description:</strong> ${detection.description}
                    </p>
                </div>
            `;
        }

        resultsDiv.innerHTML = `
            <div class="results-header">
                <span class="title">${isAnomaly ? '🚨 ' : '✅ '} ${detection.species}</span>
                <span class="conf">${(detection.confidence * 100).toFixed(1)}%</span>
            </div>
            <div class="species-details-grid">
                <div class="detail-block">
                    <span class="lbl">Species Name</span>
                    <span class="val">${detection.species}</span>
                </div>
                <div class="detail-block">
                    <span class="lbl">Scientific Name</span>
                    <span class="val"><i>${detection.scientific}</i></span>
                </div>
                <div class="detail-block">
                    <span class="lbl">Category</span>
                    <span class="val">${detection.category}</span>
                </div>
                <div class="detail-block">
                    <span class="lbl">Threat Status</span>
                    <span class="val" style="color: ${isAnomaly ? 'var(--alert)' : 'var(--accent)'}">${detection.status.toUpperCase()}</span>
                </div>
                ${predictionsHtml}
                ${explainHtml}
                ${speciesDbHtml}
            </div>
        `;
    }

    metricsDiv.innerHTML = `
        <h5 style="margin-bottom: 8px; font-size: 13px; color: var(--text-primary);">Edge Inference Metrics</h5>
        <div class="metrics-row">
            <span class="label">Processing Latency</span>
            <span class="value">${metrics.latency}</span>
        </div>
        <div class="metrics-row">
            <span class="label">Inference Time</span>
            <span class="value">${detection.inferenceTimeMs || metrics.numericLatency || 45} ms</span>
        </div>
        <div class="metrics-row">
            <span class="label">Bounding Box Count</span>
            <span class="value">${detection.boundingBoxCount || 1}</span>
        </div>
        <div class="metrics-row">
            <span class="label">Heap RAM Allocation</span>
            <span class="value">${metrics.ram}</span>
        </div>
        <div class="metrics-row">
            <span class="label">Simulated CPU Load</span>
            <span class="value">${metrics.cpu}</span>
        </div>
        <div class="metrics-row">
            <span class="label">Battery Draw</span>
            <span class="value">${metrics.battery}</span>
        </div>
    `;
}

// --- CAMERA INSTANCE HANDLING ---
let cameraStream = null;
let cameraLoopInterval = null;

export let lastDrawnAnimal = MOCK_WILDLIFE[0];

export function getWildlifeMetadata(speciesName) {
    const name = speciesName.toLowerCase();
    if (name.includes('tiger') || name === 'cat') {
        return MOCK_WILDLIFE[0]; // Bengal Tiger
    } else if (name.includes('elephant')) {
        return MOCK_WILDLIFE[1]; // Indian Elephant
    } else if (name.includes('leopard') || name === 'dog') {
        return MOCK_WILDLIFE[2]; // Common Leopard
    } else if (name.includes('peafowl') || name.includes('peacoc') || name === 'bird') {
        return MOCK_WILDLIFE[4]; // Indian Peafowl
    } else if (name.includes('bear')) {
        return MOCK_WILDLIFE[5]; // Asiatic Black Bear
    } else if (name.includes('deer') || name === 'sheep' || name === 'cow') {
        return MOCK_WILDLIFE[3]; // Sambar Deer
    }
    // Generic fallback for any other species detected
    return {
        name: speciesName.charAt(0).toUpperCase() + speciesName.slice(1),
        scientific: "Animalia wild",
        category: "Protected",
        baseConf: 85.0,
        anomaly: false,
        type: "deer",
        status: "Protected",
        habitat: "Forests, hills",
        diet: "Omnivore",
        distribution: "Global",
        description: "An animal species observed in local wildlife habitats.",
        explain: "Inferred via YOLOv8 bounding box classifier model.",
        similar: ["Sambar Deer (80%)"]
    };
}

export async function detectViaBackend(fileBlob) {
    if (!fileBlob) return null;
    try {
        const formData = new FormData();
        formData.append("file", fileBlob);

        // Timeout of 3 seconds
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch("http://localhost:8000/api/detect", {
            method: "POST",
            body: formData,
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.warn("Backend API not reachable. Using offline heuristics.", e);
    }
    return null;
}

export function stopCamera() {
    if (cameraLoopInterval) {
        clearInterval(cameraLoopInterval);
        cameraLoopInterval = null;
    }
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}

export async function initCamera(videoEl, canvasEl, loaderEl) {
    stopCamera();
    loaderEl.classList.remove('hidden');

    canvasEl.width = 640;
    canvasEl.height = 360;
    const ctx = canvasEl.getContext('2d');

    try {
        // Attempt true camera binding
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: 640, height: 360 },
            audio: false
        });
        videoEl.srcObject = cameraStream;
        videoEl.classList.remove('hidden');
        
        // Match canvas layout dimensions
        cameraLoopInterval = setInterval(() => {
            if (videoEl.readyState === videoEl.HAVE_ENOUGH_DATA) {
                ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
                drawTargetReticle(canvasEl);
            }
        }, 1000 / 30); // 30 FPS Render Loop
        
        loaderEl.classList.add('hidden');
        return true;
    } catch (e) {
        console.warn("Camera permissions blocked or device lacks webcam, loading responsive interactive simulator overlay...", e);
        videoEl.classList.add('hidden');
        
        // Start continuous Canvas Mock Simulator Drawing instead
        let currentSim = MOCK_WILDLIFE[Math.floor(Math.random() * MOCK_WILDLIFE.length)];
        lastDrawnAnimal = currentSim;
        let ticks = 0;
        
        cameraLoopInterval = setInterval(() => {
            ticks++;
            if (ticks % 150 === 0) { // Cycle animal every 5 seconds
                currentSim = MOCK_WILDLIFE[Math.floor(Math.random() * MOCK_WILDLIFE.length)];
                lastDrawnAnimal = currentSim;
            }
            drawMockAnimal(canvasEl, currentSim.type);
            drawTargetReticle(canvasEl);
        }, 1000 / 30);

        loaderEl.classList.add('hidden');
        return false; // Indicating simulated mode fallback
    }
}

// --- VIDEO SCANNER INSTANCE HANDLING ---
export function initVideoScan(canvasEl, progressEl, progressContainer, loaderEl, fileCountEl, onComplete) {
    canvasEl.width = 640;
    canvasEl.height = 360;
    const ctx = canvasEl.getContext('2d');
    
    // Reset views
    progressContainer.style.display = 'block';
    progressEl.style.width = '0%';
    loaderEl.classList.remove('hidden');

    let currentFrame = 0;
    const totalFrames = 25;
    const randomWildlife = MOCK_WILDLIFE[Math.floor(Math.random() * MOCK_WILDLIFE.length)];
    lastDrawnAnimal = randomWildlife;

    const interval = setInterval(async () => {
        currentFrame++;
        const percent = (currentFrame / totalFrames) * 100;
        progressEl.style.width = `${percent}%`;
        fileCountEl.textContent = `Analyzing Frame ${currentFrame}/${totalFrames}`;

        // Draw animated scanning line overlay on canvas
        drawMockAnimal(canvasEl, randomWildlife.type);
        drawTargetReticle(canvasEl);
        
        // Draw green scanline bar sweeping top to bottom
        const scanLineY = (canvasEl.height * (currentFrame / totalFrames));
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#4ade80';
        ctx.beginPath();
        ctx.moveTo(0, scanLineY);
        ctx.lineTo(canvasEl.width, scanLineY);
        ctx.stroke();
        ctx.shadowBlur = 0;

        if (currentFrame >= totalFrames) {
            clearInterval(interval);
            loaderEl.classList.add('hidden');
            progressContainer.style.display = 'none';

            // Complete Scan Draw bounding box
            drawMockAnimal(canvasEl, randomWildlife.type);
            drawBoundingBox(canvasEl, randomWildlife.name, randomWildlife.baseConf/100, 0.3, 0.25, 0.45, 0.55, randomWildlife.anomaly);
            
            const metrics = computePerformanceMetrics();
            const logResults = await logScanDetection(randomWildlife, metrics);
            onComplete(logResults.detection, logResults.metrics);
        }
    }, 120);
}
