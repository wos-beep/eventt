const APP_VERSION = "6.1.0";
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

    // すべての入力項目にイベントリスナーを設定
    const inputs = ['baseEvent', 'overlayEvent', 'overlayShift', 'rangeStart', 'startRow', 'zenPadding', 'invPadding'];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            // スライダーの値を横の数字に反映
            if(id === 'zenPadding') document.getElementById('zenVal').innerText = document.getElementById(id).value;
            if(id === 'invPadding') document.getElementById('invVal').innerText = document.getElementById(id).value;
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
    
    // デバッグ用パネルの値を取得
    const startRow = parseInt(document.getElementById('startRow').value) || 11;
    const zenCount = parseInt(document.getElementById('zenPadding').value) || 0;
    const invCount = parseInt(document.getElementById('invPadding').value) || 0;
    const heavyPadding = "　".repeat(zenCount) + "\u2800".repeat(invCount);

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

    const isSlim = totalMax >= 8;
    const sep = isSlim ? "|" : "｜"; 

    let lines = [];
    lines.push(title);
    if(b.id === "a") lines.push("商:毎日◎(SSR出せば100k~)");
    
    let hNums = [];
    for(let i = rStart; i <= totalMax; i++) hNums.push(i >= 10 ? i : fullDigits[i]);
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
        // デバッグ設定に基づき、指定行以降にのみパディングを付与
        if (index + 1 >= startRow) {
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
