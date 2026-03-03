/**
 * Event Task Merger - Logic Script
 * @version 5.9.8
 * @updated 2026-03-03
 * @description 不可視文字(\u2800)による強制改行制御、8日以上半角|、大判定修正済み
 */
const APP_VERSION = "5.9.8";

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
    ['baseEvent', 'overlayEvent', 'overlayShift', 'rangeStart'].forEach(id => {
        document.getElementById(id).addEventListener('change', updateOutput);
    });
    updateOutput();
}

function getEventChar(eventId, dayIndex) {
    if (eventId === "s") return "季"; 
    if (eventId === "a" || eventId === "o") {
        const d = dayIndex + 1;
        return (d === 1 || d === 2 || d === 5 || d === 6) ? "軍" : "士";
    }
    if (eventId === "k") return "準"; 
    if (eventId === "i") return "氷"; 
    return "◯";
}

function updateOutput() {
    if (!rawData.length) return;
    const b = rawData.find(x => x.id === document.getElementById('baseEvent').value);
    const oId = document.getElementById('overlayEvent').value;
    const o = oId ? rawData.find(x => x.id === oId) : null;
    const shift = parseInt(document.getElementById('overlayShift').value) || 0;
    const rStart = parseInt(document.getElementById('rangeStart').value) || 1;
    
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
        combined = b.data;
    }

    // --- レイアウト構成 (v5.9.8: スペース完全排除版) ---
    const isSlim = totalMax >= 8;
    // 【重要】前後にスペースを一切入れない純粋なセパレーター
    const sep = isSlim ? "|" : "｜"; 
    
    // 行末の壁（不可視文字）を6個に設定
    const rowSuffix = "\u2800\u2800\u2800\u2800\u2800\u2800"; 

    let res = title + "\n";
    if(b.id === "a") res += "商:毎日◎(SSR出せば100k~)\n";
    
    // 日数ヘッダー (密着)
    let hNums = [];
    for(let i = rStart; i <= totalMax; i++) hNums.push(i >= 10 ? i : fullDigits[i]);
    res += "日数" + sep + hNums.join(sep) + rowSuffix + "\n";
    
    // データ行
    Object.keys(combined).forEach(k => {
        if (k === "行商") return;
        let dStr = combined[k].substring(rStart - 1, totalMax);
        if (dStr.replace(/－/g, '').length) {
            // 変数を使わず、項目名kとsepを直接+で繋いでスペースを排除
            const formattedData = dStr.split('').join(sep);
            res += k + sep + formattedData + rowSuffix + "\n";
        }
    });

    if(b.id === "a") res += "※7日は6日の続き(半日)" + rowSuffix;
    
    document.getElementById('outputText').innerText = res.trim();
}

function step(id, val) {
    const el = document.getElementById(id);
    el.value = Math.max(0, parseInt(el.value) + val);
    updateOutput();
}

function copyToClipboard() {
    const text = document.getElementById('outputText').innerText;
    navigator.clipboard.writeText(text).then(() => {
        const s = document.getElementById('toast');
        if (s) {
            s.style.display = 'block';
            setTimeout(() => s.style.display = 'none', 1500);
        }
    });
}
