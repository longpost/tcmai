// main.js

const API_BASE = ""; // 同域 Vercel/Next.js 就留空

let LANG = "en"; // "en" or "zh"
let ALL_SYMPTOMS = [];
let SELECTED = new Set();

// ---------- Helpers ----------
function byId(id){ return document.getElementById(id); }
function esc(s){ return String(s ?? ""); }

function labelSymptom(s){
  return LANG === "en" ? s.en : s.zh;
}

function renderSelected(){
  const box = byId("selectedBox");
  const items = [...SELECTED].map(id => ALL_SYMPTOMS.find(x => x.id === id)).filter(Boolean);

  box.innerHTML = items.length
    ? items.map(s => `• ${esc(labelSymptom(s))}`).join("\n")
    : (LANG === "en" ? "None" : "暂无");
}

function renderSymptomChips(list){
  const wrap = byId("symptomList");
  wrap.innerHTML = "";

  for (const s of list){
    const div = document.createElement("div");
    div.className = "chip" + (SELECTED.has(s.id) ? " active" : "");
    div.textContent = labelSymptom(s);
    div.onclick = () => {
      if (SELECTED.has(s.id)) SELECTED.delete(s.id);
      else SELECTED.add(s.id);
      div.classList.toggle("active");
      renderSelected();
    };
    wrap.appendChild(div);
  }
}

function renderResult(data){
  const out = [];

  // 标题
  out.push(esc(data.title || (LANG === "en" ? "Result" : "结果")));
  out.push("");

  // Pattern
  if (data.pattern) out.push(`Pattern hints: ${esc(data.pattern)}`);

  // Reasoning
  if (data.explanation) out.push(`Reasoning: ${esc(data.explanation)}`);

  // Principle / Acu / Herb
  if (data.principle) out.push(`Principle: ${esc(data.principle)}`);
  if (data.acupuncture) out.push(`Acupuncture: ${esc(data.acupuncture)}`);
  if (data.herbal) out.push(`Herbal direction: ${esc(data.herbal)}`);

  // AI notes
  if (data.aiNotes) out.push(`AI: ${esc(data.aiNotes)}`);
  if (data.aiError) out.push(`AI error: ${esc(data.aiError)}`);

  // warning
  if (data.warning) out.push(esc(data.warning));

  // eight principles
  if (data.eightPrinciples){
    out.push("");
    out.push(LANG === "en" ? "Eight Principles" : "八纲");
    out.push(
      (LANG === "en" ? "Exterior/Interior: " : "表里：") + esc(data.eightPrinciples.interiorExterior)
    );
    out.push(
      (LANG === "en" ? "Cold/Heat: " : "寒热：") + esc(data.eightPrinciples.coldHeat)
    );
    out.push(
      (LANG === "en" ? "Def/Excess: " : "虚实：") + esc(data.eightPrinciples.defExcess)
    );
    out.push(
      (LANG === "en" ? "Yin/Yang: " : "阴阳：") + esc(data.eightPrinciples.yinYang)
    );
  }

  // evidence
  if (Array.isArray(data.eightEvidence) && data.eightEvidence.length){
    out.push("");
    out.push(LANG === "en" ? "Evidence:" : "证据：");
    for (const e of data.eightEvidence){
      out.push("• " + esc(e));
    }
  }

  byId("result").textContent = out.join("\n");
}

async function fetchSymptoms(){
  const res = await fetch(`${API_BASE}/api/symptoms`);
  const data = await res.json();
  ALL_SYMPTOMS = Array.isArray(data.symptoms) ? data.symptoms : [];
  renderSymptomChips(ALL_SYMPTOMS);
}

async function analyze(){
  const payload = {
    lang: LANG,
    symptoms: [...SELECTED].map(id => ({ id })),
    // 你原来的 tongue/pulse/context 如果前端有就继续带上；这里先不乱动
  };

  byId("analyzeBtn").disabled = true;
  byId("result").textContent = (LANG === "en" ? "Analyzing..." : "分析中…");

  try{
    const res = await fetch(`${API_BASE}/api/analyze`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    renderResult(data);
  }catch(err){
    byId("result").textContent = "Error: " + (err?.message || String(err));
  }finally{
    byId("analyzeBtn").disabled = false;
  }
}

// ---------- Body map click ----------
// 规则：
// - 点到 whole 大遮罩：不会触发（CSS pointer-events: none）
// - 点到 .whole-hotspot：当作 region="whole"（会筛选“whole”类症状）
// - 点到其它 .region[data-region=...]：正常筛选
function bindBodyMap(){
  const svg = byId("bodyMap");
  if (!svg) return;

  svg.addEventListener("click", (e) => {
    const t = e.target;
    if (!t) return;

    // whole hotspot
    if (t.classList && t.classList.contains("whole-hotspot")){
      filterByRegion("whole");
      return;
    }

    // normal regions
    const region = t.getAttribute && t.getAttribute("data-region");
    if (region){
      filterByRegion(region);
    }
  });
}

function filterByRegion(region){
  const filtered = ALL_SYMPTOMS.filter(s => Array.isArray(s.regions) && s.regions.includes(region));
  renderSymptomChips(filtered);

  byId("regionHint").textContent = (LANG === "en")
    ? `Region filter: ${region}`
    : `部位筛选：${region}`;
}

// ---------- Init ----------
function bindUI(){
  byId("langSel").addEventListener("change", (e) => {
    LANG = e.target.value;
    // 语言切换后，重渲染列表/已选
    renderSymptomChips(ALL_SYMPTOMS);
    renderSelected();
    byId("regionHint").textContent = "";
    byId("result").textContent = "";
  });

  byId("clearBtn").onclick = () => {
    SELECTED.clear();
    renderSymptomChips(ALL_SYMPTOMS);
    renderSelected();
    byId("result").textContent = "";
  };

  byId("analyzeBtn").onclick = analyze;
}

(async function init(){
  bindUI();
  await fetchSymptoms();
  renderSelected();
  bindBodyMap();
})();
