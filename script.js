const APP_VERSION = "6.3.0";
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
            updateOutput();
        });
    });
    updateOutput();
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
    
    // 手動設定値
    const startRow = parseInt(document.getElementById('startRow').value) || 11;
    const manualZen = parseInt(document.getElementById('zenPadding').value) || 0;

    let combined = {};
    let totalMax = b.days;
    let title = b.name;

    // データ統合
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
        combined = b.data;
    }

    // --- 自動レイアウト・黄金比ロジック ---
    const isOverLimit = totalMax >= 10;
    const sep = isOverLimit ? "" : (totalMax >= 8 ? "|" : "｜"); 
    
    // 【黄金比】10日以上なら (14 - 日数) 個の全角スペース、未満ならデバッグ設定に従う
    let autoZenCount = isOverLimit ? Math.max(0, 14 - totalMax) : manualZen;
    const heavyPadding = "　".repeat(autoZenCount);

    let lines = [];
    lines.push(title);
    if(b.id === "a") lines.push("商:毎日◎(SSR出せば100k~)");
    
    let hNums = [];
    for(let i = rStart; i <= totalMax; i++) {
        let n = (isOverLimit || i >= 10) ? i : fullDigits[i];
        hNums.push(n);
    }
    lines.push("日数" + sep + hNums.join(sep));
    
    Object.keys(combined).forEach(k => {
        if (k === "行商") return;
        let dStr = combined[k].substring(rStart - 1, totalMax);
        if (dStr.replace(/－/g, '').length) {
            lines.push(k + sep + dStr.split('').join(sep));
        }
    });
    if(b.id === "a") lines.push("※7日は6日の続き(半日)");

    let finalOutput = "";
    lines.forEach((line, index) => {
        // 11行目以降にパディングを付与
        const currentPad = (index + 1 >= startRow) ? heavyPadding : "";
        finalOutput += line + currentPad + "\n";
    });

    document.getElementById('outputText').innerText = finalOutput.trim();
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
