const APP_VERSION = "6.5.9";
let rawData = [];
const fullDigits = ["０","１","２","３","４","５","６","７","８","９"];

fetch('event.json').then(res => res.json()).then(data => {
    rawData = data;
    initApp();
    displayVersion();
    updateOutput();
}).catch(err => console.error("Data Load Error:", err));

function displayVersion() {
    try {
        const title = document.querySelector('h3');
        if (title) {
            let vEl = document.getElementById('versionDisplay');
            if (!vEl) {
                vEl = document.createElement('span');
                vEl.id = 'versionDisplay';
                vEl.style.cssText = 'font-size:12px; margin-left:10px; color:#888; font-weight:normal;';
                title.appendChild(vEl);
            }
            vEl.innerText = `v${APP_VERSION}`;
        }
    } catch(e) { console.warn("Version display failed", e); }
}

function initApp() {
    const ids = ['baseEvent', 'overlayEvent', 'overlayShift', 'rangeStart', 'startRow', 'zenPadding', 'usePadding'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (id === 'baseEvent' || id === 'overlayEvent') {
            rawData.forEach(e => { 
                if(id === 'baseEvent' || e.id !== "") el.add(new Option(e.name, e.id)); 
            });
        }
        el.addEventListener('input', () => {
            if(id === 'zenPadding') {
                const zVal = document.getElementById('zenVal');
                if(zVal) zVal.innerText = el.value;
            }
            if(id === 'baseEvent') filterOverlayOptions();
            updateOutput();
        });
    });
    filterOverlayOptions();
}

function filterOverlayOptions() {
    const bEl = document.getElementById('baseEvent');
    const oSel = document.getElementById('overlayEvent');
    if(!bEl || !oSel) return;
    const bValue = bEl.value;
    Array.from(oSel.options).forEach(opt => {
        if (!opt.value) return;
        opt.style.display = (opt.value === bValue) ? 'none' : 'block';
    });
}

function getEventChar(eventId, dayIndex) {
    if (eventId === "s") return "季";
    if (eventId === "a" || eventId === "o") {
        const d = dayIndex + 1;
        return (d === 1 || d === 2 || d === 5 || d === 6) ? "軍" : "士";
    }
    return "◯";
}

function isWindows() {
    if (navigator.userAgentData && navigator.userAgentData.platform) {
        return navigator.userAgentData.platform.includes("Windows");
    }
    return navigator.userAgent.includes("Windows");
}

function generateFinalText(forceLF = false) {
    const bEl = document.getElementById('baseEvent');
    if (!bEl || !rawData.length) return "";
    const b = rawData.find(x => x.id === bEl.value);
    if (!b) return "";

    const isWin = !forceLF && isWindows();
    // Windows判定時のみゼロ幅スペースをガードとして使用
    const guard = isWin ? "\u200B" : "";
    const nl = isWin ? "\r\n" : "\n";

    const oIdEl = document.getElementById('overlayEvent');
    const oId = oIdEl ? oIdEl.value : "";
    const o = oId ? rawData.find(x => x.id === oId) : null;
    const shift = (document.getElementById('overlayShift')) ? parseInt(document.getElementById('overlayShift').value) || 0 : 0;
    const rStart = (document.getElementById('rangeStart')) ? parseInt(document.getElementById('rangeStart').value) || 1 : 1;
    const isPaddingEnabled = (document.getElementById('usePadding')) ? document.getElementById('usePadding').checked : false;
    const startRowSetting = (document.getElementById('startRow')) ? parseInt(document.getElementById('startRow').value) : 1;
    const zenCount = (document.getElementById('zenPadding')) ? parseInt(document.getElementById('zenPadding').value) : 0;

    let combined = {};
    let totalMax = b.days;
    let title = b.name;

    if (o) {
        totalMax = Math.max(b.days, o.days + shift);
        title = `${b.name.split('with')[0]}＋${o.name.substring(0,4)}`;
        const allKeys = new Set([...Object.keys(b.data), ...Object.keys(o.data)]);
        allKeys.forEach(k => {
            let row = "";
            for (let d = 0; d < totalMax; d++) {
                const bV = (b.data[k] || "")[d] || "－";
                const oV = (o.data[k] || "")[d - shift] || "－";
                if (bV !== "－" && oV !== "－") row += "◎"; 
                else if (bV !== "－") {
                    row += (b.id === "a" && (bV === "◯" || bV === "△")) ? "大" : 
                           (bV === "◯" || bV === "△") ? getEventChar(b.id, d) : bV;
                } else if (oV !== "－") {
                    row += (oV === "◯" || oV === "△") ? getEventChar(o.id, d - shift) : oV;
                } else row += "－";
            }
            combined[k] = row;
        });
    } else { combined = JSON.parse(JSON.stringify(b.data)); }

    const isOverLimit = totalMax >= 10;
    const sep = isOverLimit ? "" : (totalMax >= 8 ? "|" : "｜"); 
    const heavyPadding = (isPaddingEnabled && zenCount > 0) ? "　".repeat(zenCount) : "";

    let lines = [];
    let currentRowNum = 1;
    const addLine = (text) => {
        if (!text) return;
        const base = text.toString().trim();
        if (base === "") return;
        const pad = (isPaddingEnabled && currentRowNum >= startRowSetting) ? heavyPadding : "";
        // 行末にガード文字を結合
        lines.push(base + pad + guard);
        currentRowNum++;
    };

    addLine(title);
    let hNums = [];
    for(let i = rStart; i <= totalMax; i++) hNums.push((isOverLimit || i >= 10) ? i : fullDigits[i]);
    addLine("日数" + sep + hNums.join(sep));
    
    Object.keys(combined).forEach(k => {
        let dStr = (combined[k] || "").substring(rStart - 1, totalMax);
        if (dStr && dStr.replace(/－/g, '').trim().length > 0) {
            addLine(k + sep + dStr.split('').join(sep));
        }
    });
    if(b.id === "a") addLine("※7日は6日の続き(半日)");

    return lines.join(nl);
}

function updateOutput() {
    const displayText = generateFinalText(true);
    const out = document.getElementById('outputText');
    if(out) out.innerText = displayText;
}

function step(id, val) {
    const el = document.getElementById(id);
    if(el) {
        el.value = Math.max(id === 'rangeStart' ? 1 : 0, parseInt(el.value) + val);
        updateOutput();
    }
}

async function copyToClipboard() {
    const text = generateFinalText(false);
    if (!text) return;
    try {
        await navigator.clipboard.writeText(text);
        const s = document.getElementById('toast');
        if(s) {
            s.style.display = 'block';
            setTimeout(() => s.style.display = 'none', 1500);
        }
    } catch (err) { console.error('Copy failed', err); }
}
