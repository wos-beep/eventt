/**
 * Event Task Merger - Logic Script
 * @version 5.7.0
 * @updated 2026-03-03
 * @description 8日以上は区切り無し密着、ベース由来「大」判定、バグ修正
 */
const APP_VERSION = "5.7.0";
console.log(`%c 📋 Event Task Merger v${APP_VERSION} 起動中... `, "background: #bb86fc; color: #000; font-weight: bold;");

let rawData = [];
const fullDigits = ["０","１","２","３","４","５","６","７","８","９"];

fetch('event.json')
    .then(response => response.json())
    .then(data => {
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

/**
 * 各イベント固有の文字を返す
 */
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
                
                if (bV !== "－" && oV !== "－") {
                    row += "◎"; 
                } else if (bV !== "－") {
                    // 同盟大作戦(a)がベースかつ軍備等とマージ中なら「大」
                    row += (b.id === "a" && (bV === "◯" || bV === "△")) ? "大" : 
                           (bV === "◯" || bV === "△") ? getEventChar(b.id, d) : bV;
                } else if (oV !== "－") {
                    row += (oV === "◯" || oV === "△") ? getEventChar(o.id, d - shift) : oV;
                } else {
                    row += "－";
                }
            }
            combined[k] = row;
        });
    } else {
        combined = b.data;
    }

    // --- 密着レイアウト判定 ---
    const isNoSep = totalMax >= 8; // 8日以上は区切りなし
    const sep = isNoSep ? "" : "｜";
    const headGap = isNoSep ? " " : "　"; 

    let res = title + "\n";
    if(b.id === "a") res += "商:毎日◎(SSRのみ毎日100k~120k)\n";
    
    // 日数ヘッダー（密着時は半角数字にしないとズレる可能性があるため、一旦全角で検証）
    res += "日数" + headGap;
    let headRow = [];
    for(let i = rStart; i <= totalMax; i++) {
        headRow.push(i >= 10 ? i : fullDigits[i]);
    }
    res += headRow.join(sep) + "\n";
    
    // データ行
    Object.keys(combined).forEach(k => {
        if (k === "行商") return;
        let dataStr = combined[k].substring(rStart - 1, totalMax);
        if (dataStr.replace(/－/g, '').length) {
            res += k + headGap + dataStr.split('').join(sep) + "\n";
        }
    });

    if(b.id === "a") res += "※7日は6日の続き(半日)";
    document.getElementById('outputText').innerText = res.trim();
}

function step(id, val) {
    const el = document.getElementById(id);
    el.value = Math.max(0, parseInt(el.value) + val);
    updateOutput();
}

function copyToClipboard() {
    navigator.clipboard.writeText(document.getElementById('outputText').innerText).then(() => {
        const s = document.getElementById('toast');
        s.style.display = 'block';
        setTimeout(() => s.style.display = 'none', 1500);
    });
}
