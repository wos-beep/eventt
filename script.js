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
    bSel.addEventListener('change', updateOutput);
    oSel.addEventListener('change', updateOutput);
    updateOutput();
}

function updateOutput() {
    if (!rawData.length) return;
    const b = rawData.find(x => x.id === document.getElementById('baseEvent').value);
    const oId = document.getElementById('overlayEvent').value;
    const shift = parseInt(document.getElementById('overlayShift').value) || 0;
    const rStart = parseInt(document.getElementById('rangeStart').value) || 1;
    
    let combined = {};
    let totalMax = b.days;
    let title = b.name;

    if (oId) {
        const o = rawData.find(x => x.id === oId);
        totalMax = Math.max(b.days, o.days + shift);
        title = `${b.name.substring(0,2)}+${o.name.substring(0,2)}`;
        new Set([...Object.keys(b.data), ...Object.keys(o.data)]).forEach(k => {
            let row = "";
            for (let d = 0; d < totalMax; d++) {
                const bV = (b.data[k] || "")[d] || "－";
                const oV = (o.data[k] || "")[d - shift] || "－";
                row += (bV !== "－" && oV !== "－") ? "◎" : (bV !== "－" ? bV : oV);
            }
            combined[k] = row;
        });
    } else { 
        combined = b.data; 
        totalMax = b.days; 
    }

    const displayDays = totalMax - rStart + 1;
    let res = title + "\n";
    if(b.id === "a") res += "行商は毎日◎(SSRのみ出せば毎日100k~120k貰える)\n";
    
    res += "日数　" + Array.from({length: displayDays}, (_, i) => {
        let n = i + rStart;
        return n.toString().split('').map(d => fullDigits[d] || d).join('');
    }).join('　') + "\n";
    
    Object.keys(combined).forEach(k => {
        if (k === "行商") return;
        let dataPart = combined[k].substring(rStart - 1, totalMax).split('').join('｜');
        res += k + "　" + dataPart + "\n";
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
