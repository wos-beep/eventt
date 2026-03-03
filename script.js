let rawData = [];
const fullDigits = ["０","１","２","３","４","５","６","７","８","９"];

// 1. JSONデータの読み込み
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
    // 変更時に自動更新
    [bSel, oSel, document.getElementById('overlayShift'), document.getElementById('rangeStart')].forEach(el => {
        el.addEventListener('change', updateOutput);
    });
    updateOutput();
}

// イベントごとの識別文字を判定するロジック
function getEventChar(eventId, dayIndex) {
    if (eventId === "s") return "季"; // 季節イベント
    if (eventId === "a" || eventId === "o") { // 軍備・士官系
        const day = dayIndex + 1;
        if (day === 1 || day === 2 || day === 5 || day === 6) return "軍";
        if (day === 3 || day === 4 || day === 7 || day === 8) return "士";
    }
    if (eventId === "k") return "準"; // 最強王国
    if (eventId === "i") return "氷"; // 氷原支配者（必要なら1文字に調整）
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
                const bVal = (b.data[k] || "")[d] || "－";
                const oVal = (o.data[k] || "")[d - shift] || "－";
                
                // 重複時は ◎
                if (bVal !== "－" && oVal !== "－") {
                    row += "◎";
                } else if (bVal !== "－") {
                    // ベース側の文字変換
                    row += (bVal === "◯" || bVal === "△") ? getEventChar(b.id, d) : bVal;
                } else if (oVal !== "－") {
                    // 重ね合わせ側の文字変換（ズレを考慮した日数を渡す）
                    row += (oVal === "◯" || oVal === "△") ? getEventChar(o.id, d - shift) : oVal;
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

    // --- 整形出力 ---
    const displayDays = totalMax - rStart + 1;
    let res = title + "\n";
    if(b.id === "a") res += "行商は毎日◎(SSRのみ出せば毎日100k~120k貰える)\n";
    
    res += "日数　" + Array.from({length: totalMax}, (_, i) => i + 1)
        .slice(rStart - 1)
        .map(n => n.toString().split('').map(d => fullDigits[d] || d).join(''))
        .join('　') + "\n";
    
    Object.keys(combined).forEach(k => {
        if (k === "行商") return;
        let dataStr = combined[k].substring(rStart - 1, totalMax);
        if (!dataStr.replace(/－/g, '').length) return;
        res += k + "　" + dataStr.split('').join('｜') + "\n";
    });

    if(b.id === "a") res += "※7日目は6日目の続き。半日のみ";
    document.getElementById('outputText').innerText = res.trim();
}

function step(id, val) {
    const el = document.getElementById(id);
    let v = parseInt(el.value) + val;
    if (id === 'rangeStart') v = Math.min(8, Math.max(1, v));
    if (id === 'overlayShift') v = Math.max(0, v);
    el.value = v;
    updateOutput();
}

function copyToClipboard() {
    navigator.clipboard.writeText(document.getElementById('outputText').innerText).then(() => {
        const s = document.getElementById('toast');
        s.style.display = 'block';
        setTimeout(() => s.style.display = 'none', 1500);
    });
}
