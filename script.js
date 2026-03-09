const APP_VERSION = "6.8.7";
let rawData = [];
const fullDigits = ["０","１","２","３","４","５","６","７","８","９"];

function isWindows() { return navigator.platform.indexOf('Win') > -1; }

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
        const vEl = document.getElementById('jsVersion');
        if (vEl) {
            vEl.innerText = `script.js v${APP_VERSION}`;
            vEl.style.cssText = 'font-size:12px; margin-left:8px; color:#888; font-weight:normal;';
        }
    } catch(e) { console.warn("Version display failed", e); }
}

function initApp() {
    // Windows版なら手動調整パネルを非表示にする
    const manualPanel = document.querySelector('details');
    if (manualPanel && isWindows()) {
        manualPanel.style.display = 'none';
    }

    const ids = ['baseEvent', 'overlayEvent', 'overlayShift', 'rangeStart', 'startRow', 'zenPadding', 'usePadding'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (id === 'baseEvent' || id === 'overlayEvent') {
            if(id === 'overlayEvent') {
                el.innerHTML = '<option value="">なし</option>';
            }
            rawData.forEach(e => { 
                if(id === 'baseEvent' || e.id !== "") {
                    el.add(new Option(e.name, e.id));
                }
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
    if (eventId === "k") return "準";
    if (eventId === "i") return "氷";
    if (eventId === "a") return "同";
    if (eventId === "s") return "季";
    if (eventId === "o") {
        return (Math.floor(dayIndex / 2) % 2 === 0) ? "軍" : "士";
    }
    return "◯";
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
    }

    const displayedDays = totalMax - rStart + 1;
    let sep = (displayedDays <= 6) ? "｜" : (displayedDays <= 8 ? "|" : "");
    
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

    if(b.id === "k") tempLines.push("⚠7日は6日の続き(半日)");

    const out = document.getElementById('outputText');

    if (isWindows()) {
        const LIMIT_PT = 32.0; 
        
        let formattedLines = tempLines.map((line, index) => {
            if (index === tempLines.length - 1) return line.trim();
            
            let currentText = line.trim();
            let currentWidth = 0;
            
            for (let i = 0; i < currentText.length; i++) {
                const char = currentText[i];
                if (char === '|') currentWidth += 0.5;
                else if (char.match(/[ -~]|[\uFF61-\uFF9F]/)) currentWidth += 1.0;
                else currentWidth += 2.0;
            }

            let padding = "";
            let workWidth = currentWidth;
            
            // 30pt付近まで全角で埋める
            while (workWidth <= 29.5) { 
                padding += "　";
                workWidth += 2.0;
            }
            
            // 残りを半角で調整し、LIMIT_PT(32.0)に極限まで近づける
            while (workWidth <= 31.0) {
                padding += " ";
                workWidth += 1.0;
            }

            return currentText + padding;
        });

        const rawResult = formattedLines.join('');
        
        if (out) {
            out.style.setProperty('font-family', '"BIZ UDGothic", "MS Gothic", monospace', 'important');
            out.style.setProperty('white-space', 'pre', 'important');
            out.style.setProperty('font-variant-numeric', 'tabular-nums', 'important');
            out.style.setProperty('letter-spacing', '0px', 'important');
            out.style.setProperty('padding', '12px', 'important');
            out.style.setProperty('display', 'inline-block', 'important');
            
            const previewText = formattedLines.join('\n')
                                .replace(/　/g, '〼')
                                .replace(/ /g, '·');
            out.textContent = previewText;
            out.style.width = "auto"; 
            out.style.color = "#88ff88";
        }
        return rawResult;

    } else {
        // Android/他
        if (out) {
            out.style.setProperty('white-space', 'pre', 'important');
            out.style.color = "#00ff00";
        }
        let finalZenCount = 0;
        if (isManualEnabled) {
            finalZenCount = parseInt(document.getElementById('zenPadding')?.value || 0);
        } else {
            if (displayedDays <= 6) finalZenCount = 2;
            else if (displayedDays === 7) finalZenCount = 5; 
            else if (displayedDays === 8) finalZenCount = 4; 
            else if (displayedDays >= 9 && displayedDays <= 13) finalZenCount = 14 - displayedDays;
        }
        const heavyPadding = finalZenCount > 0 ? "　".repeat(finalZenCount) : "";
        const finalStartRow = isManualEnabled ? parseInt(document.getElementById('startRow')?.value || 11) : 11;
        
        let lines = tempLines.map((text, index) => {
            const rowNum = index + 1;
            if (rowNum >= finalStartRow && index < tempLines.length - 1) return text.trim() + heavyPadding;
            return text.trim();
        });
        const resultText = lines.join('\n');
        if (out) out.textContent = resultText.replace(/　/g, '〼').replace(/ /g, '·');
        return resultText;
    }
}

function updateOutput() { generateFinalText(); }

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
