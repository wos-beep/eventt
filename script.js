const APP_VERSION = "6.6.3";
let rawData = [];
// 日数表示用の配列
const fullDigits = ["０","１","２","３","４","５","６","７","８","９"];

// イベントごとの識別文字定義（検閲回避のため全角漢字へ）
const eventChars = {
    "a": "同", // 同盟大作戦（大→同へ変更）
    "s": "季", // 季節
    "o": "士"  // 士官計画
};

fetch('event.json').then(res => res.json()).then(data => {
    rawData = data;
    initApp();
    displayVersion();
    updateOutput();
}).catch(err => console.error("Data Load Error:", err));

// --- ユーティリティ関数 ---

// 日数表示の黄金比（1-9は全角、10-は半角2文字）
function getAlignedDayNum(i) {
    if (i <= 9) return fullDigits[i];
    return i.toString(); // 10以降は半角2文字
}

// OS判定（Windowsのみ特殊改行を使用するため）
function isWindows() {
    return navigator.platform.indexOf('Win') > -1;
}

// --- メインロジック ---

function displayVersion() {
    try {
        const title = document.querySelector('h3');
        if (title) {
            let vEl = document.getElementById('versionDisplay');
            if (!vEl) {
                vEl = document.createElement('span');
                vEl.id = 'versionDisplay';
                vEl.style.cssText = 'font-size:12px; margin-left:10px; color:#888; font-weight:normal;';
                title.appendChild(vEl);
            }
            vEl.innerText = `v${APP_VERSION}`;
        }
    } catch(e) { console.warn("Version display failed", e); }
}

function initApp() {
    const ids = ['baseEvent', 'overlayEvent', 'overlayShift', 'rangeStart', 'startRow', 'zenPadding', 'usePadding'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (id === 'baseEvent' || id === 'overlayEvent') {
            rawData.forEach(e => { if(id === 'baseEvent' || e.id !== "") el.add(new Option(e.name, e.id)); });
        }
        el.addEventListener('input', () => {
            if(id === 'zenPadding') {
                const zVal = document.getElementById('zenVal');
                if(zVal) zVal.innerText = el.value;
            }
            if(id === 'baseEvent') filterOverlayOptions();
            updateOutput();
        });
    });
    filterOverlayOptions();
}

function filterOverlayOptions() {
    const bEl = document.getElementById('baseEvent');
    const oSel = document.getElementById('overlayEvent');
    if(!bEl || !oSel) return;
    const bValue = bEl.value;
    Array.from(oSel.options).forEach(opt => {
        if (!opt.value) return;
        opt.style.display = (opt.value === bValue) ? 'none' : 'block';
    });
}

// イベント文字取得（アライン崩れ防止のため全角文字へ）
function getEventChar(eventId, dayIndex) {
    const char = eventChars[eventId];
    if (char) return char;
    // 割り当てがない場合は◯（スパム検閲回避のため連続に注意）
    return "◯";
}

function generateFinalText() {
    const bEl = document.getElementById('baseEvent');
    if (!bEl || !rawData.length) return "";
    const b = rawData.find(x => x.id === bEl.value);
    if (!b) return "";

    const oId = document.getElementById('overlayEvent')?.value || "";
    const o = oId ? rawData.find(x => x.id === oId) : null;
    const shift = parseInt(document.getElementById('overlayShift')?.value || 0);
    const rStart = parseInt(document.getElementById('rangeStart')?.value || 1);
    const isManualEnabled = document.getElementById('usePadding')?.checked || false;
    
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
                    // ダイヤ行などで「◯」が連続しないよう、イベント文字を優先
                    row += (bV === "◯" || bV === "△") ? getEventChar(b.id, d) : bV;
                } else if (oV !== "－") {
                    row += (oV === "◯" || oV === "△") ? getEventChar(o.id, d - shift) : oV;
                } else row += "－";
            }
            combined[k] = row;
        });
    } else { 
        combined = JSON.parse(JSON.stringify(b.data)); 
        // 単体表示の時も、◯を適切なイベント文字に変換
        if (eventChars[b.id]) {
            Object.keys(combined).forEach(k => {
                let newRow = "";
                for (let d = 0; d < combined[k].length; d++) {
                    const v = combined[k][d];
                    newRow += (v === "◯" || v === "△") ? eventChars[b.id] : v;
                }
                combined[k] = newRow;
            });
        }
    }

    // --- セパレータとパディングの決定（v6.6.3 統合版） ---
    let sep = "｜"; // デフォルト全角
    let finalStartRow = 11; // デフォルト11行目（タイトル＋日数行を除く）
    let finalZenCount = 0;

    // ロジック1：セパレータの廃止（9日以上は一律なし）
    if (totalMax >= 9) {
        sep = ""; // トータル幅節約のためセパレータを廃止
    }

    // ロジック2：自動パディング（壁）の黄金比
    if (isManualEnabled) {
        // 手動モードON：ユーザー指定値を採用
        finalStartRow = parseInt(document.getElementById('startRow')?.value || 1);
        finalZenCount = parseInt(document.getElementById('zenPadding')?.value || 0);
    } else {
        // 手動モードOFF：日数に応じた自動判定
        if (totalMax <= 6) {
            finalZenCount = 2; // 6日以下:2
        } else if (totalMax >= 9 && totalMax <= 13) {
            // 9日以上:14-日数の法則（セパレータなしで幅を稼ぐ前提）
            finalZenCount = 14 - totalMax; // 10日なら壁4個
        } else {
            finalZenCount = 0; // 7, 8日 および 14日以上
        }
    }

    const heavyPadding = finalZenCount > 0 ? "　".repeat(finalZenCount) : "";
    let lines = [];
    let currentLineCount = 1; // 1行目からカウント

    const addLine = (text) => {
        const base = text.toString().trim();
        if (base === "") return;
        // 現在の行数が「パディング開始行」以降であれば全角スペースを付与
        const pad = (currentLineCount >= finalStartRow) ? heavyPadding : "";
        lines.push(base + pad);
        currentLineCount++;
    };

    // 1行目：タイトル
    addLine(title);
    
    // 2行目：日数行（デグレを修正。黄金比アライン）
    let hNums = [];
    for(let i = rStart; i <= totalMax; i++) {
        hNums.push(getAlignedDayNum(i)); // 1-9は全角、10-は半角2文字
    }
    // セパレータが「なし」の場合は、日数行も詰めて出力
    addLine("日数" + sep + hNums.join(sep));
    
    // 3行目以降：各項目
    Object.keys(combined).forEach(k => {
        let dStr = (combined[k] || "").substring(rStart - 1, totalMax);
        if (dStr && dStr.replace(/－/g, '').trim().length > 0) {
            // 文字列を配列に分割してjoinすることで、セパレータ（ sep が "" ならなし）を挟む
            addLine(k + sep + dStr.split('').join(sep));
        }
    });

    if(b.id === "a") addLine("※7日は6日の続き(半日)");

    // Windows向けのみ改行コードを変更（分岐を戻す）
    const lineBreak = isWindows() ? '\r\n' : '\n';
    return lines.join(lineBreak);
}

function updateOutput() {
    const out = document.getElementById('outputText');
    if(out) out.innerText = generateFinalText();
}

function step(id, val) {
    const el = document.getElementById(id);
    if(el) {
        el.value = Math.max(id === 'rangeStart' ? 1 : 0, parseInt(el.value) + val);
        updateOutput();
    }
}

async function copyToClipboard() {
    const text = generateFinalText();
    if (!text) return;
    try {
        await navigator.clipboard.writeText(text);
        const s = document.getElementById('toast');
        if(s) {
            s.style.display = 'block';
            setTimeout(() => s.style.display = 'none', 1500);
        }
    } catch (err) { console.error('Copy failed', err); }
}
