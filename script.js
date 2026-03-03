/**
 * Event Task Merger - Logic Script
 * @version 5.4.2
 * @updated 2026-03-03
 * @description 識別文字の修正（最強王国：準）、スリム化、バージョニング
 */
const APP_VERSION = "5.4.2";
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
    .catch(err => {
        console.error("【エラー】event.jsonの読み込みに失敗しました:", err);
    });

function initApp() {
    const bSel = document.getElementById('baseEvent');
    const oSel = document.getElementById('overlayEvent');
    
    // セレクトボックスの初期化
    rawData.forEach(e => {
        bSel.add(new Option(e.name, e.id));
        oSel.add(new Option(e.name, e.id));
    });

    // 各種コントロールへのリスナー登録
    const controls = ['baseEvent', 'overlayEvent', 'overlayShift', 'rangeStart'];
    controls.forEach(id => {
        document.getElementById(id).addEventListener('change', updateOutput);
    });
    
    updateOutput();
}

/**
 * イベント種別と日数から識別文字（漢字）を返す
 */
function getEventChar(eventId, dayIndex) {
    if (eventId === "s") return "季"; // 季節イベント
    if (eventId === "a" || eventId === "o") { // 軍備・士官系
        const d = dayIndex + 1;
        // 1,2,5,6日目は軍 / 3,4,7,8日目は士
        return (d === 1 || d === 2 || d === 5 || d === 6) ? "軍" : "士";
    }
    if (eventId === "k") return "準"; // 最強王国準備フェーズ（修正：準）
    if (eventId === "i") return "氷"; // 氷原支配者
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

    // マージロジック
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
                    row += "◎"; // 重複時は二重丸
                } else if (bV !== "－") {
                    row += (bV === "◯" || bV === "△") ? getEventChar(b.id, d) : bV;
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
        totalMax = b.days;
    }

    // --- 出力テキスト整形（スリム化Ver） ---
    let res = title + "\n";
    if(b.id === "a") res += "行商は毎日◎(SSRのみ毎日100k~120k)\n";
    
    // 日数ヘッダー（半角|で圧縮）
    res += "日数 ";
    for(let i = rStart; i <= totalMax; i++) {
        res += (i >= 10 ? i : fullDigits[i]) + (i === totalMax ? "" : "|");
    }
    res += "\n";
    
    // データ行（半角スペースと半角|で圧縮）
    Object.keys(combined).forEach(k => {
        if (k === "行商") return;
        let dataStr = combined[k].substring(rStart - 1, totalMax);
        // 全て「－」の行は表示しない
        if (dataStr.replace(/－/g, '').length) {
            res += k + " " + dataStr.split('').join('|') + "\n";
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
    const text = document.getElementById('outputText').innerText;
    navigator.clipboard.writeText(text).then(() => {
        const s = document.getElementById('toast');
        s.style.display = 'block';
        setTimeout(() => s.style.display = 'none', 1500);
    });
}
