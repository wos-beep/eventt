const APP_VERSION = "6.6.2";
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
    if (eventId === "s") return "季";
    if (eventId === "a" || eventId === "o") {
        const d = dayIndex + 1;
        return (d === 1 || d === 2 || d === 5 || d === 6) ? "軍" : "士";
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
                    row += (b.id === "a" && (bV === "◯" || bV === "△")) ? "大" : 
                           (bV === "◯" || bV === "△") ? getEventChar(b.id, d) : bV;
                } else if (oV !== "－") {
                    row += (oV === "◯" || oV === "△") ? getEventChar(o.id, d - shift) : oV;
                } else row += "－";
            }
            combined[k] = row;
        });
    } else { 
        combined = JSON.parse(JSON.stringify(b.data)); 
    }

    // --- セパレータとパディングの決定 ---
    let sep = "｜"; // デフォルト全角
    let finalStartRow = 11;
    let finalZenCount = 0;

    if (totalMax >= 9) {
        sep = "|"; // 9日以上は半角に切り替え
    }

    if (isManualEnabled) {
        finalStartRow = parseInt(document.getElementById('startRow')?.value || 1);
        finalZenCount = parseInt(document.getElementById('zenPadding')?.value || 0);
    } else {
        // 自動レイアウトロジック
        if (totalMax <= 6) {
            finalZenCount = 2;
        } else if (totalMax >= 9 && totalMax <= 13) {
            finalZenCount = 14 - totalMax; // 法則適用 (9日:5, 10日:4...)
        } else {
            finalZenCount = 0; // 7, 8日 および 14日以上
        }
    }

    const heavyPadding = finalZenCount > 0 ? "　".repeat(finalZenCount) : "";
    let lines = [];
    let currentLineCount = 1;

    const addLine = (text) => {
        const base = text.toString().trim();
        if (base === "") return;
        const pad = (currentLineCount >= finalStartRow) ? heavyPadding : "";
        lines.push(base + pad);
        currentLineCount++;
    };

    addLine(title);
    let hNums = [];
    for(let i = rStart; i <= totalMax; i++) {
        // セパレータが半角の場合は、日数も半角数字に寄せたほうが幅が揃いやすい
        const num = (totalMax >= 9 || i >= 10) ? i : fullDigits[i];
        hNums.push(num);
    }
    addLine("日数" + sep + hNums.join(sep));
    
    Object.keys(combined).forEach(k => {
        let dStr = (combined[k] || "").substring(rStart - 1, totalMax);
        if (dStr && dStr.replace(/－/g, '').trim().length > 0) {
            addLine(k + sep + dStr.split('').join(sep));
        }
    });

    if(b.id === "a") addLine("※7日は6日の続き(半日)");

    return lines.join('\n');
}

function updateOutput() {
    const out = document.getElementById('outputText');
    if(out) out.innerText = generateFinalText();
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
