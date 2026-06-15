// dashboard.js - Custom 2D Canvas charts, stats, and density heatmaps
import { getAllDetections } from './db.js';

// Draw line chart (Detections over Time)
export function drawLineChart(canvas, detections) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.parentElement.clientWidth || 400;
    const height = canvas.height = canvas.parentElement.clientHeight || 200;

    ctx.clearRect(0, 0, width, height);

    // Group detections by day (last 7 days)
    const days = [];
    const counts = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        days.push(dateStr);

        // Count detections on this day
        const count = detections.filter(det => {
            const detDate = new Date(det.timestamp);
            return detDate.toDateString() === d.toDateString();
        }).length;
        counts.push(count);
    }

    const padding = 35;
    const chartW = width - padding * 2;
    const chartH = height - padding * 2;

    // Grid lines
    ctx.strokeStyle = 'rgba(165, 214, 167, 0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding + (chartH * i) / 4;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }

    // X-Axis Labels
    ctx.fillStyle = 'var(--text-secondary)';
    ctx.font = '10px var(--font-inter)';
    ctx.textAlign = 'center';
    const xStep = chartW / 6;
    for (let i = 0; i < 7; i++) {
        const x = padding + i * xStep;
        ctx.fillText(days[i], x, height - padding + 15);
    }

    // Plot Points and Draw Line
    const maxVal = Math.max(...counts, 4); // minimum ceiling of 4 for visual grid
    const points = counts.map((count, i) => {
        const x = padding + i * xStep;
        const y = padding + chartH - (count / maxVal) * chartH;
        return { x, y, count };
    });

    // Draw Gradient Area below Line
    const grad = ctx.createLinearGradient(0, padding, 0, height - padding);
    grad.addColorStop(0, 'rgba(74, 222, 128, 0.25)');
    grad.addColorStop(1, 'rgba(74, 222, 128, 0.00)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(points[0].x, height - padding);
    points.forEach(pt => ctx.lineTo(pt.x, pt.y));
    ctx.lineTo(points[points.length - 1].x, height - padding);
    ctx.closePath();
    ctx.fill();

    // Draw Smooth Line
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(74, 222, 128, 0.4)';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        // Curve to make it look premium
        const cpX = (points[i - 1].x + points[i].x) / 2;
        ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, cpX, (points[i - 1].y + points[i].y) / 2);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw Circles & Tooltips
    points.forEach(pt => {
        ctx.fillStyle = '#1b5e20';
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (pt.count > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px var(--font-outfit)';
            ctx.textAlign = 'center';
            ctx.fillText(pt.count, pt.x, pt.y - 10);
        }
    });
}

// Draw species doughnut percentage breakdown
export function drawPieChart(canvas, detections) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.parentElement.clientWidth || 300;
    const height = canvas.height = canvas.parentElement.clientHeight || 200;

    ctx.clearRect(0, 0, width, height);

    if (detections.length === 0) {
        ctx.fillStyle = 'var(--text-muted)';
        ctx.font = 'italic 12px var(--font-inter)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No detections registered yet', width / 2, height / 2);
        return;
    }

    // Group counts
    const speciesMap = {};
    detections.forEach(det => {
        // Strip out vocal annotations for chart categories
        const baseName = det.species.replace(' (Vocal)', '');
        speciesMap[baseName] = (speciesMap[baseName] || 0) + 1;
    });

    const data = Object.keys(speciesMap).map(name => ({
        name,
        count: speciesMap[name]
    })).sort((a,b) => b.count - a.count);

    const colors = ['#2e7d32', '#1b5e20', '#4ade80', '#e67e22', '#566573'];
    
    // Calculate total angles
    const total = detections.length;
    let startAngle = -Math.PI / 2;
    const centerX = width * 0.35;
    const centerY = height * 0.5;
    const radius = Math.min(centerX, centerY) * 0.75;

    data.forEach((slice, idx) => {
        const sliceAngle = (slice.count / total) * Math.PI * 2;
        const color = colors[idx % colors.length];

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
        ctx.closePath();
        ctx.fill();

        // Inner cut out to create a doughnut chart
        ctx.fillStyle = 'var(--bg-card)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.55, 0, Math.PI * 2);
        ctx.fill();

        startAngle += sliceAngle;
    });

    // Draw Legends right side
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '11px var(--font-inter)';

    data.forEach((slice, idx) => {
        const color = colors[idx % colors.length];
        const lx = width * 0.65;
        const ly = centerY - (data.length * 10) + idx * 22;
        const percent = ((slice.count / total) * 100).toFixed(1);

        ctx.fillStyle = color;
        ctx.fillRect(lx, ly - 5, 12, 12);

        ctx.fillStyle = 'var(--text-primary)';
        ctx.fillText(`${slice.name} (${percent}%)`, lx + 18, ly + 2);
    });
}

// Render dynamic map grid with hot coordinate spots
export function drawHeatmap(canvas, detections) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.parentElement.clientWidth || 800;
    const height = canvas.height = canvas.parentElement.clientHeight || 300;

    ctx.clearRect(0, 0, width, height);

    // Map background texture simulation
    ctx.fillStyle = '#050907';
    ctx.fillRect(0, 0, width, height);

    // Draw tactical GIS coordinate grids
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    // Topographical green lines
    ctx.strokeStyle = 'rgba(46, 125, 50, 0.1)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.5);
    ctx.quadraticCurveTo(width * 0.2, height * 0.2, width * 0.5, height * 0.4);
    ctx.quadraticCurveTo(width * 0.8, height * 0.7, width, height * 0.3);
    ctx.stroke();

    // Map borders & coordinates labels
    ctx.fillStyle = 'rgba(74, 222, 128, 0.25)';
    ctx.font = '9px monospace';
    ctx.fillText("N 25.0483°", 12, 20);
    ctx.fillText("E 77.4939°", 12, 32);
    ctx.fillText("RANGE B-4 WILDLIFE PRESERVE", width - 180, 20);

    if (detections.length === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.font = 'italic 12px var(--font-inter)';
        ctx.textAlign = 'center';
        ctx.fillText("Awaiting Edge Hotspot Inputs...", width / 2, height / 2);
        return;
    }

    // Plot Heat spots based on detections
    detections.forEach((det, idx) => {
        // Deterministic pseudo-random placement based on ID/timestamp to keep points static
        const idNum = det.id || idx;
        const seedX = Math.sin(idNum * 453.3) * 0.5 + 0.5;
        const seedY = Math.cos(idNum * 928.1) * 0.5 + 0.5;
        
        const hx = 50 + seedX * (width - 100);
        const hy = 50 + seedY * (height - 100);

        const radius = det.status === 'alert' ? 45 : 30;
        const colorInner = det.status === 'alert' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(74, 222, 128, 0.3)';
        const colorOuter = det.status === 'alert' ? 'rgba(239, 68, 68, 0)' : 'rgba(74, 222, 128, 0)';

        // Draw radial glowing spot
        const grad = ctx.createRadialGradient(hx, hy, 2, hx, hy, radius);
        grad.addColorStop(0, colorInner);
        grad.addColorStop(0.5, colorInner.replace('0.4', '0.15').replace('0.3', '0.1'));
        grad.addColorStop(1, colorOuter);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(hx, hy, radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw center pulse circle
        ctx.fillStyle = det.status === 'alert' ? '#ef4444' : '#4ade80';
        ctx.beginPath();
        ctx.arc(hx, hy, 4, 0, Math.PI * 2);
        ctx.fill();

        // Label details hover-style
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '8px monospace';
        ctx.fillText(`${det.species.split(' ')[0]}`, hx + 8, hy + 3);
    });
}
