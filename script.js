/**
 * Event Task Merger - Logic Script
 * @version 5.9.9
 * @updated 2026-03-03
 * @description 1行固定長(パディング)方式により、9日間表示等の横滑り・落下を完全防止
 */
const APP_VERSION = "5.9.9";

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

    // --- レイアウト構成ロジック (v5.9.9) ---
    const isSlim = totalMax >= 8;
    const sep = isSlim ? "|" : "｜"; 
    
    /**
     * 行末を不可視文字で埋めて固定長にする関数
     * 17:17の画像(9日間)を基準に、自爆しない限界の幅(21文字分)を狙います
     */
    const targetWidth = 21; 
    const padChar = "\u2800"; // 不可視文字

    function applyPadding(text) {
        // 現在の文字列の長さ(全角・半角混在)を取得。不足分をパディング。
        // ※厳密な幅計算は困難なため、文字数ベースで制御
        const currentLen = text.length;
        const diff = targetWidth - currentLen;
        return text + (diff > 0 ? padChar.repeat(diff) : padChar);
    }

    let res = title + "\n";
    if(b.id === "a") res += applyPadding("商:毎日◎(SSR出せば100k~)") + "\n";
    
    // 日数ヘッダー
    let hNums = [];
    for(let i = rStart; i <= totalMax; i++) hNums.push(i >= 10 ? i : fullDigits[i]);
    res += applyPadding("日数" + sep + hNums.join(sep)) + "\n";
    
    // データ行
    Object.keys(combined).forEach(k => {
        if (k === "行商") return;
        let dStr = combined[k].substring(rStart - 1, totalMax);
        if (dStr.replace(/－/g, '').length) {
            // スペースを入れず密着させ、行末だけパディングで埋める
            const line = k + sep + dStr.split('').join(sep);
            res += applyPadding(line) + "\n";
        }
    });

    if(b.id === "a") res += applyPadding("※7日は6日の続き(半日)");
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
