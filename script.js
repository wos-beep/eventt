const APP_VERSION = "6.4.3";
let rawData = [];
const fullDigits = ["０","１","２","３","４","５","６","７","８","９"];

fetch('event.json').then(res => res.json()).then(data => {
    rawData = data;
    initApp();
});

function initApp() {
    const bSel = document.getElementById('baseEvent');
    const oSel = document.getElementById('overlayEvent');
    rawData.forEach(e => {
        bSel.add(new Option(e.name, e.id));
        oSel.add(new Option(e.name, e.id));
    });
    const inputs = ['baseEvent', 'overlayEvent', 'overlayShift', 'rangeStart', 'startRow', 'zenPadding'];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            if(id === 'zenPadding') document.getElementById('zenVal').innerText = document.getElementById(id).value;
            if(id === 'baseEvent') filterOverlayOptions();
            updateOutput();
        });
    });
    filterOverlayOptions();
    updateOutput();
}

function filterOverlayOptions() {
    const bValue = document.getElementById('baseEvent').value;
    const oSel = document.getElementById('overlayEvent');
    Array.from(oSel.options).forEach(opt => {
        if (!opt.value) return;
        if (opt.value === bValue) {
            opt.style.display = 'none';
            if (oSel.value === bValue) oSel.value = "";
        } else {
            opt.style.display = 'block';
        }
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

function updateOutput() {
    if (!rawData.length) return;
    const b = rawData.find(x => x.id === document.getElementById('baseEvent').value);
    const oId = document.getElementById('overlayEvent').value;
    const o = oId ? rawData.find(x => x.id === oId) : null;
    const shift = parseInt(document.getElementById('overlayShift').value) || 0;
    const rStart = parseInt(document.getElementById('rangeStart').value) || 1;
    
    const startRow = parseInt(document.getElementById('startRow').value);
    const manualZen = parseInt(document.getElementById('zenPadding').value);

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
    } else { combined = b.data; }

    const isOverLimit = totalMax >= 10;
    const sep = isOverLimit ? "" : (totalMax >= 8 ? "|" : "｜"); 
    let zenCount = isOverLimit ? Math.max(0, 14 - totalMax) : manualZen;
    const heavyPadding = "　".repeat(zenCount);

    let lines = [];
    let currentLineIdx = 1;

    // 行追加ロジック：パディング以外は何も追加しない
    const pushLine = (text) => {
        const pad = (currentLineIdx >= startRow) ? heavyPadding : "";
        lines.push(text + pad);
        currentLineIdx++;
    };

    pushLine(title);
    if(b.id === "a") pushLine("行商:毎日◎(SSR出せば100k~)");
    
    let hNums = [];
    for(let i = rStart; i <= totalMax; i++) hNums.push((isOverLimit || i >= 10) ? i : fullDigits[i]);
    pushLine("日数" + sep + hNums.join(sep));
    
    Object.keys(combined).forEach(k => {
        if (k === "行商") return;
        let dStr = (combined[k] || "").substring(rStart - 1, totalMax);
        if (dStr && dStr.replace(/－/g, '').length) {
            pushLine(k + sep + dStr.split('').join(sep));
        }
    });

    if(b.id === "a") pushLine("※7日は6日の続き(半日)");

    document.getElementById('outputText').innerText = lines.join('\n');
}

function step(id, val) {
    const el = document.getElementById(id);
    el.value = Math.max(id === 'rangeStart' ? 1 : 0, parseInt(el.value) + val);
    updateOutput();
}

function copyToClipboard() {
    const text = document.getElementById('outputText').innerText;
    navigator.clipboard.writeText(text).then(() => {
        const s = document.getElementById('toast');
        s.style.display = 'block';
        setTimeout(() => s.style.display = 'none', 1500);
    });
}
