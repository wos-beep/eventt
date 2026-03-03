/**
 * Event Task Merger - Logic Script
 * @version 5.6.0
 * @updated 2026-03-03
 * @description 動的グリッド(7日/8日切替)、識別文字(軍/士/季/準/氷)、ファイル分離対応
 */
const APP_VERSION = "5.6.0";
console.log(`%c 📋 Event Task Merger v${APP_VERSION} 起動中... `, "background: #bb86fc; color: #000; font-weight: bold;");

let rawData = [];
const fullDigits = ["０","１","２","３","４","５","６","７","８","９"];

// 1. JSONデータの読み込み
fetch('event.json')
    .then(response => response.json())
    .then(data => {
        rawData = data;
        initApp();
    })
    .catch(err => console.error("【エラー】event.json読み込み失敗:", err));

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
 * イベント識別文字の取得
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

    // マージ処理
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
                else if (bV !== "－") row += (bV === "◯" || bV === "△") ? getEventChar(b.id, d) : bV;
                else if (oV !== "－") row += (oV === "◯" || oV === "△") ? getEventChar(o.id, d - shift) : oV;
                else row += "－";
            }
            combined[k] = row;
        });
    } else {
        combined = b.data;
        totalMax = b.days;
    }

    // --- 動的レイアウト判定 ---
    // 8日以上の場合はスリム化（半角|）、7日以内はリッチ表示（全角｜）
    const isSlim = totalMax >= 8;
    const sep = isSlim ? "|" : "｜";
    const headGap = isSlim ? " " : "　"; // 項目名あとの隙間

    let res = title + "\n";
    if(b.id === "a") res += "行商は毎日◎(SSRのみ毎日100k~120k)\n";
    
    // 日数ヘッダー
    res += "日数" + headGap;
    const headerNums = [];
    for(let i = rStart; i <= totalMax; i++) {
        headerNums.push(i >= 10 ? i : fullDigits[i]);
    }
    res += headerNums.join(sep) + "\n";
    
    // データ行
    Object.keys(combined).forEach(k => {
        if (k === "行商") return;
        let dataStr = combined[k].substring(rStart - 1, totalMax);
        if (dataStr.replace(/－/g, '').length) {
            // 項目名(k) + 隙間 + データ(区切り文字結合)
            res += k + headGap + dataStr.split('').join(sep) + "\n";
        }
    });

    if(b.id === "a") res += "※7日目は6日目の続き。半日のみ";
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
