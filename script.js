const APP_VERSION = "6.4.9";
let rawData = [];
const fullDigits = ["０","１","２","３","４","５","６","７","８","９"];

fetch('event.json').then(res => res.json()).then(data => {
    rawData = data;
    initApp();
});

function initApp() {
    const ids = ['baseEvent', 'overlayEvent', 'overlayShift', 'rangeStart', 'startRow', 'zenPadding', 'usePadding'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (id === 'baseEvent' || id === 'overlayEvent') {
            rawData.forEach(e => { if(id === 'baseEvent' || e.id !== "") el.add(new Option(e.name, e.id)); });
        }
        el.addEventListener('input', () => {
            if(id === 'zenPadding') document.getElementById('zenVal').innerText = document.getElementById('zenPadding').value;
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
        opt.style.display = (opt.value === bValue) ? 'none' : 'block';
        if (oSel.value === bValue) oSel.value = "";
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
    
    const isPaddingEnabled = document.getElementById('usePadding').checked;
    const startRowSetting = parseInt(document.getElementById('startRow').value);
    const zenCount = parseInt(document.getElementById('zenPadding').value);

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

    const isOverLimit = totalMax >= 10;
    const sep = isOverLimit ? "" : (totalMax >= 8 ? "|" : "｜"); 
    const heavyPadding = isPaddingEnabled ? "　".repeat(zenCount) : "";

    let lines = [];
    let currentRowNum = 1;

    // 行追加用の純粋な関数
    const addLine = (text) => {
        if (!text) return;
        const trimmed = text.trim();
        if (trimmed === "") return;

        const pad = (isPaddingEnabled && currentRowNum >= startRowSetting) ? heavyPadding : "";
        lines.push(trimmed + pad);
        currentRowNum++;
    };

    // 1. タイトル
    addLine(title);
    
    // 2. 日数行
    let hNums = [];
    for(let i = rStart; i <= totalMax; i++) hNums.push((isOverLimit || i >= 10) ? i : fullDigits[i]);
    addLine("日数" + sep + hNums.join(sep));
    
    // 3. データ行（行商含む）
    Object.keys(combined).forEach(k => {
        let dStr = (combined[k] || "").substring(rStart - 1, totalMax);
        // 有効なデータ（－以外）がある場合のみ
        if (dStr && dStr.replace(/－/g, '').trim().length > 0) {
            addLine(k + sep + dStr.split('').join(sep));
        }
    });

    // 4. 注釈
    if(b.id === "a") addLine("※7日は6日の続き(半日)");

    // 最終結合：空要素を完全に除外し、余計な改行コードの発生を抑止
    const finalResult = lines.filter(line => line.length > 0).join('\n');
    document.getElementById('outputText').innerText = finalResult;
}

function step(id, val) {
    const el = document.getElementById(id);
    el.value = Math.max(id === 'rangeStart' ? 1 : 0, parseInt(el.value) + val);
    updateOutput();
}

function copyToClipboard() {
    const text = document.getElementById('outputText').innerText;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        const s = document.getElementById('toast');
        s.style.display = 'block';
        setTimeout(() => s.style.display = 'none', 1500);
    });
}
