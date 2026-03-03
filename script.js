/**
 * Event Task Merger - Logic Script
 * @version 6.0.1
 * @updated 2026-03-03
 * @description 11行目以降にのみ強力なパディングを適用し、後半の横滑りを防止
 */
const APP_VERSION = "6.0.1";

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

    // --- レイアウト構成ロジック (v6.0.1) ---
    const isSlim = totalMax >= 8;
    const sep = isSlim ? "|" : "｜"; 
    
    // 手動成功例に基づくパディング（全角スペース + 不可視文字）
    // 日数が10日の時は自爆を防ぐため少し控えめに調整
    const heavyPadding = (totalMax >= 10) ? "　\u2800\u2800" : "　　　\u2800\u2800\u2800";

    let lines = [];
    lines.push(title);
    if(b.id === "a") lines.push("商:毎日◎(SSR出せば100k~)");
    
    // 日数ヘッダー
    let hNums = [];
    for(let i = rStart; i <= totalMax; i++) hNums.push(i >= 10 ? i : fullDigits[i]);
    lines.push("日数" + sep + hNums.join(sep));
    
    // データ行の構築
    Object.keys(combined).forEach(k => {
        if (k === "行商") return;
        let dStr = combined[k].substring(rStart - 1, totalMax);
        if (dStr.replace(/－/g, '').length) {
            lines.push(k + sep + dStr.split('').join(sep));
        }
    });
    
    if(b.id === "a") lines.push("※7日は6日の続き(半日)");

    // --- 行数に応じた最終加工 ---
    let finalOutput = "";
    lines.forEach((line, index) => {
        // indexは0から始まるため、11行目は index 10
        // 手動検証の結果に基づき、10行目(index 9)まではそのまま、11行目からパディング
        if (index >= 10) {
            finalOutput += line + heavyPadding + "\n";
        } else {
            finalOutput += line + "\n";
        }
    });

    document.getElementById('outputText').innerText = finalOutput.trim();
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
