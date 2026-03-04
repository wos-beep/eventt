const APP_VERSION = "6.6.7";
let rawData = [];
const fullDigits = ["０","１","２","３","４","５","６","７","８","９"];

const eventChars = {
    "a": "同", 
    "s": "季", 
    "o": "士"  
};

fetch('event.json').then(res => res.json()).then(data => {
    rawData = data;
    initApp();
    displayVersion();
    updateOutput();
}).catch(err => console.error("Data Load Error:", err));

function getAlignedDayNum(i) {
    if (i <= 9) return fullDigits[i];
    return i.toString(); 
}

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
            rawData.forEach(e => { if(id === 'baseEvent' || e.id !== "") el.add(new Option(e.name, e.id)); });
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
    const char = eventChars[eventId];
    return char || "◯";
}

function generateFinalText() {
    const bEl = document.getElementById('baseEvent');
    if (!bEl || !rawData.length) return "";
    const b = rawData.find(x => x.id === bEl.value);
    if (!b) return "";

    const oId = document.getElementById('overlayEvent')?.value || "";
    const o = oId ? rawData.find(x => x.id === oId) : null;
    const shift = parseInt(document.getElementById('overlayShift')?.value || 0);
    const rStart = parseInt(document.getElementById('rangeStart')?.value || 1);
    const isManualEnabled = document.getElementById('usePadding')?.checked || false;
    
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
                    row += (bV === "◯" || bV === "△") ? getEventChar(b.id, d) : bV;
                } else if (oV !== "－") {
                    row += (oV === "◯" || oV === "△") ? getEventChar(o.id, d - shift) : oV;
                } else row += "－";
            }
            combined[k] = row;
        });
    } else { 
        combined = JSON.parse(JSON.stringify(b.data)); 
        if (eventChars[b.id]) {
            Object.keys(combined).forEach(k => {
                let newRow = "";
                for (let d = 0; d < combined[k].length; d++) {
                    const v = combined[k][d];
                    newRow += (v === "◯" || v === "△") ? eventChars[b.id] : v;
                }
                combined[k] = newRow;
            });
        }
    }

    const displayedDays = totalMax - rStart + 1;
    let sep = (displayedDays <= 6) ? "｜" : (displayedDays <= 8 ? "|" : "");
    
    let finalZenCount = 0;
    if (isManualEnabled) {
        finalZenCount = parseInt(document.getElementById('zenPadding')?.value || 0);
    } else {
        if (displayedDays <= 6) finalZenCount = 2;
        else if (displayedDays === 7) finalZenCount = 5; 
        else if (displayedDays === 8) finalZenCount = 4; 
        else if (displayedDays >= 9 && displayedDays <= 13) finalZenCount = 14 - displayedDays;
        else finalZenCount = 0;
    }

    const heavyPadding = finalZenCount > 0 ? "　".repeat(finalZenCount) : "";
    let tempLines = [];

    tempLines.push(title);
    let hNums = [];
    for(let i = rStart; i <= totalMax; i++) hNums.push(getAlignedDayNum(i));
    tempLines.push("日数" + sep + hNums.join(sep));
    
    Object.keys(combined).forEach(k => {
        let dStr = (combined[k] || "").substring(rStart - 1, totalMax);
        if (dStr && dStr.replace(/－/g, '').trim().length > 0) {
            tempLines.push(k + sep + dStr.split('').join(sep));
        }
    });

    if(b.id === "a") tempLines.push("⚠7日は6日の続き(半日)");

    // --- パディング付与 & 改行コード統一処理 ---
    const finalStartRow = isManualEnabled ? parseInt(document.getElementById('startRow')?.value || 11) : 11;
    let lines = tempLines.map((text, index) => {
        const rowNum = index + 1;
        // 最終行にはパディングを付けない
        if (rowNum >= finalStartRow && index < tempLines.length - 1) {
            return text.trim() + heavyPadding;
        }
        return text.trim();
    });

    // OS判定を廃止し、常に \n (LF) を使用
    return lines.join('\n'); 
}

function updateOutput() {
    const out = document.getElementById('outputText');
    if(out) {
        // innerText による自動整形を避けるため textContent を使用
        out.textContent = generateFinalText();
    }
}

function step(id, val) {
    const el = document.getElementById(id);
    if(el) {
        el.value = Math.max(id === 'rangeStart' ? 1 : 0, parseInt(el.value) + val);
        updateOutput();
    }
}

async function copyToClipboard() {
    const text = generateFinalText();
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
