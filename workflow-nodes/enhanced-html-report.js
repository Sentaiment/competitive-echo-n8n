/**
 * n8n Code node (JavaScript)
 * Generate HTML Report (SCENARIOS + H2H + CITATIONS/DATA SOURCES)
 * - Accepts upstream in multiple shapes (array wrapper, nested keys, stringified JSON).
 * - Renders dynamic, client-side UI with selector, calculations, and robust source metadata.
 * - Enhanced with detailed citation data from workflow processing
 * Output: items[0].json = { html, filename }
 */

console.log("=== ENHANCED HTML REPORT GENERATOR ===");

// Get all input items to merge data from different workflow branches
const inputItems = $input.all();
console.log("Total input items:", inputItems.length);

// Initialize the target structure
let mergedData = {
  report_metadata: {
    company: "Unknown Company",
    total_scenarios: 0,
    competitors_analyzed: [],
  },
  scenarios: [],
  enhanced_citations: [],
  data_sources_table: [],
  quality_metrics: {},
};

// Process each input item to merge all available data
inputItems.forEach((item, index) => {
  const data = item.json || {};
  console.log(`\n--- Processing Item ${index} ---`);
  console.log("Available keys:", Object.keys(data));

  // Handle scenario_rankings data (from second document structure)
  if (data.scenario_rankings && Array.isArray(data.scenario_rankings)) {
    console.log("Found scenario_rankings:", data.scenario_rankings.length);

    // Convert scenario_rankings to the target scenarios format
    const convertedScenarios = data.scenario_rankings.map((ranking) => ({
      scenario_id: ranking.scenario_id || 0,
      title: ranking.scenario_title || `Scenario ${ranking.scenario_id || 0}`,
      top_competitors: ranking.competitors_ranked || [],
      key_findings: ranking.key_findings || [],
      sources: ranking.analysis_details
        ? Object.values(ranking.analysis_details).flatMap(
            (detail) => detail.sources || []
          )
        : [],
    }));

    mergedData.scenarios = mergedData.scenarios.concat(convertedScenarios);
  }

  // Handle direct scenarios data (from first document structure)
  if (data.scenarios && Array.isArray(data.scenarios)) {
    console.log("Found scenarios:", data.scenarios.length);
    mergedData.scenarios = mergedData.scenarios.concat(
      data.scenarios.map((scenario) => ({
        scenario_id: scenario.scenario_id || 0,
        title: scenario.title || `Scenario ${scenario.scenario_id || 0}`,
        top_competitors: scenario.top_competitors || [],
        key_findings: scenario.key_findings || [],
        sources: scenario.sources || [],
      }))
    );
  }

  // Handle enhanced citations data
  if (data.enhanced_citations && Array.isArray(data.enhanced_citations)) {
    console.log("Found enhanced_citations:", data.enhanced_citations.length);
    mergedData.enhanced_citations = mergedData.enhanced_citations.concat(
      data.enhanced_citations
    );
  }

  // Handle quality metrics
  if (data.quality_metrics) {
    mergedData.quality_metrics = {
      ...mergedData.quality_metrics,
      ...data.quality_metrics,
    };
  }

  // Handle other data types
  if (
    data.report_metadata &&
    mergedData.report_metadata.company === "Unknown Company"
  ) {
    mergedData.report_metadata = {
      company: data.report_metadata.company || "Unknown Company",
      total_scenarios: data.report_metadata.total_scenarios || 0,
      competitors_analyzed: data.report_metadata.competitors_analyzed || [],
    };
  }

  // Handle data sources from multiple possible locations
  if (data.data_sources_table) {
    mergedData.data_sources_table = mergedData.data_sources_table.concat(
      data.data_sources_table
    );
  }
  if (data.data_sources) {
    mergedData.data_sources_table = mergedData.data_sources_table.concat(
      data.data_sources
    );
  }
  if (data.source_citations) {
    mergedData.data_sources_table = mergedData.data_sources_table.concat(
      data.source_citations
    );
  }
});

console.log("\n=== REMOVING DUPLICATES ===");
console.log("Scenarios before deduplication:", mergedData.scenarios.length);
console.log(
  "Enhanced citations before deduplication:",
  mergedData.enhanced_citations.length
);

// Remove duplicates, keeping the scenario with the most complete data
const uniqueScenarios = [];
const scenarioGroups = new Map();

// Group scenarios by ID
mergedData.scenarios.forEach((scenario) => {
  const id = scenario.scenario_id;
  if (!scenarioGroups.has(id)) {
    scenarioGroups.set(id, []);
  }
  scenarioGroups.get(id).push(scenario);
});

// For each group, keep the scenario with the most data
scenarioGroups.forEach((scenarios, id) => {
  if (scenarios.length === 1) {
    uniqueScenarios.push(scenarios[0]);
  } else {
    // Find the scenario with the most complete data
    const bestScenario = scenarios.reduce((best, current) => {
      const bestScore =
        (best.top_competitors?.length || 0) + (best.sources?.length || 0);
      const currentScore =
        (current.top_competitors?.length || 0) + (current.sources?.length || 0);
      return currentScore > bestScore ? current : best;
    });
    uniqueScenarios.push(bestScenario);
  }
});

// Sort by scenario_id to maintain order
uniqueScenarios.sort((a, b) => a.scenario_id - b.scenario_id);

// Update the final data
mergedData.scenarios = uniqueScenarios;
mergedData.report_metadata.total_scenarios = uniqueScenarios.length;
mergedData.report_metadata.competitors_analyzed = [
  ...new Set(
    uniqueScenarios.flatMap((s) => s.top_competitors.map((c) => c.company || c))
  ),
];

// Remove duplicate data sources
mergedData.data_sources_table = [...new Set(mergedData.data_sources_table)];

// Remove duplicate enhanced citations and merge with data_sources_table
const uniqueCitations = [];
const citationMap = new Map();
mergedData.enhanced_citations.forEach((citation) => {
  const key = `${citation.claim_text}_${citation.source_url}`;
  if (!citationMap.has(key)) {
    citationMap.set(key, citation);
    uniqueCitations.push(citation);

    // Convert enhanced citation to data source format for the table
    if (citation.source_url || citation.source_domain) {
      const dataSource = {
        title: citation.claim_text || "No claim text",
        url: citation.source_url || "",
        publisher: citation.source_domain || citation.publisher || "",
        published: citation.publication_date || "",
        reliability: citation.confidence_level || "",
        authority: citation.authority_score || "",
        author: citation.author || "",
        notes: citation.supporting_evidence || "",
        // Enhanced citation metadata
        claim_category: citation.claim_category || "",
        claim_impact_score: citation.claim_impact_score || "",
        source_type: citation.source_type || "",
        verification_status: citation.verification_status || "",
        source_origin: citation.source_origin || "",
        real_time_indicators: citation.real_time_indicators || [],
        influence_weight: citation.influence_weight || 0,
      };
      mergedData.data_sources_table.push(dataSource);
    }
  }
});
mergedData.enhanced_citations = uniqueCitations;

console.log("\n=== FINAL RESULTS ===");
console.log(
  "Total scenarios after deduplication:",
  mergedData.scenarios.length
);
console.log(
  "Competitors found:",
  mergedData.report_metadata.competitors_analyzed.length
);
console.log("Unique enhanced citations:", mergedData.enhanced_citations.length);
console.log(
  "Total data sources (including citations):",
  mergedData.data_sources_table.length
);

// Use the merged data as the report object
const report = mergedData;

/* ----------------------- Utilities (server-side) ----------------------- */

function escHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeJsonForScript(obj) {
  // Prevent </script> breakouts and odd chars breaking <script> tag
  return JSON.stringify(obj)
    .replace(/</g, "\\u003C")
    .replace(/>/g, "\\u003E")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function tryParse(x) {
  if (typeof x === "string") {
    try {
      return JSON.parse(x);
    } catch {
      return x;
    }
  }
  return x;
}

function isReportObject(o) {
  return o && typeof o === "object" && Array.isArray(o.scenarios);
}

/**
 * Accepts:
 * - the report object directly
 * - [ reportObject ]
 * - { data|payload|body|result|report: reportObject or [reportObject] }
 * - stringified variants of any of the above
 */
function extractReportFromAny(raw) {
  let cand = tryParse(raw);
  if (isReportObject(cand)) return cand;

  if (Array.isArray(cand)) {
    if (cand.length === 1 && isReportObject(cand[0])) return cand[0];
    const found = cand.find(isReportObject);
    if (found) return found;
  }

  const keys = ["data", "payload", "body", "result", "report"];
  for (const k of keys) {
    if (cand && typeof cand === "object" && k in cand) {
      const sub = tryParse(cand[k]);
      if (isReportObject(sub)) return sub;
      if (Array.isArray(sub)) {
        if (sub.length === 1 && isReportObject(sub[0])) return sub[0];
        const found = sub.find(isReportObject);
        if (found) return found;
      }
    }
  }

  if (typeof cand === "string") {
    const again = tryParse(cand);
    if (isReportObject(again)) return again;
    if (Array.isArray(again)) {
      if (again.length === 1 && isReportObject(again[0])) return again[0];
      const found = again.find(isReportObject);
      if (found) return found;
    }
  }

  if (cand && typeof cand === "object") {
    const vals = Object.values(cand).map(tryParse);
    for (const v of vals) {
      if (isReportObject(v)) return v;
      if (Array.isArray(v)) {
        if (v.length === 1 && isReportObject(v[0])) return v[0];
        const found = v.find(isReportObject);
        if (found) return found;
      }
    }
  }

  let snapshot = "";
  try {
    snapshot = JSON.stringify(cand, null, 2);
  } catch {}
  const err = new Error(
    "Could not find report object with .scenarios[] in input"
  );
  err.snapshot = snapshot.slice(0, 1000);
  throw err;
}

/* ----------------------- Get Input ----------------------- */

if (!items || !items[0] || items[0].json == null) {
  throw new Error("No input at items[0].json");
}

// Use our merged data as the report, but also try to extract from input for compatibility
let finalReport = report;
try {
  const extractedReport = extractReportFromAny(items[0].json);
  // Merge extracted report with our enhanced data
  if (extractedReport && isReportObject(extractedReport)) {
    finalReport = {
      ...extractedReport,
      ...report,
      // Preserve original scenarios if they exist and are different
      scenarios:
        report.scenarios.length > 0
          ? report.scenarios
          : extractedReport.scenarios,
      // Always use our enhanced data sources
      data_sources_table: report.data_sources_table,
      enhanced_citations: report.enhanced_citations,
    };
  }
} catch (e) {
  console.log(
    "Could not extract report from input, using merged data:",
    e.message
  );
}

const reportToUse = finalReport;

/* ----------------------- Derived/Core ----------------------- */

const meta = reportToUse.report_metadata || {};
const company = meta.company || "Unknown Company";
const scenarios = Array.isArray(reportToUse.scenarios)
  ? reportToUse.scenarios
  : [];
const dataSourcesTable = Array.isArray(reportToUse.data_sources_table)
  ? reportToUse.data_sources_table
  : [];
const enhancedCitations = Array.isArray(reportToUse.enhanced_citations)
  ? reportToUse.enhanced_citations
  : [];
const generatedAt = new Date().toISOString();

// Calculate citation metrics
const totalCitations = enhancedCitations.length;
const highAuthorityCitations = enhancedCitations.filter(
  (c) => (c.authority_score || 0) >= 8
).length;
const verifiedCitations = enhancedCitations.filter(
  (c) => c.verification_status === "verified"
).length;
const realTimeSources = enhancedCitations.filter(
  (c) => c.source_origin === "real_time_search"
).length;

console.log("Report summary:");
console.log("- Company:", company);
console.log("- Scenarios:", scenarios.length);
console.log("- Enhanced Citations:", totalCitations);
console.log("- High Authority Citations:", highAuthorityCitations);
console.log("- Data Sources:", dataSourcesTable.length);

/* ----------------------- HTML ----------------------- */

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Competitive Report — ${escHtml(company)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root { --paper:#fff; --ink:#111827; --muted:#6b7280; --line:#e6e8f0; --accent:#5b6bff; }
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:#f6f7fb;color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial}
  a{color:#2947ff;text-decoration:none}
  .wrap{max-width:1200px;margin:0 auto;padding:24px 16px 64px}
  .meta{color:var(--muted);font-size:12px;margin-bottom:8px}
  .card{background:var(--paper);border:1px solid var(--line);border-radius:16px;padding:18px;margin:14px 0;box-shadow:0 1px 0 rgba(16,24,40,.02)}
  h1{font-size:22px;margin:0 0 8px} h2{font-size:18px;margin:0 0 10px}
  .lede{color:#374151;margin:4px 0 16px}
  .kpiRow{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
  .kpiBig{background:#f8fafc;border:1px solid var(--line);border-radius:14px;padding:16px}
  .kpiBig .big{font-size:32px;font-weight:700}
  .kpiBig .sub{color:#6b7280;margin-top:6px}
  .table-wrap{overflow:auto;border-radius:12px;border:1px solid var(--line)}
  table{width:100%;border-collapse:collapse;min-width:840px}
  th,td{text-align:left;padding:12px 10px;border-bottom:1px solid var(--line);vertical-align:top}
  th{font-weight:600;color:#374151;background:#fbfbfe;position:sticky;top:0}
  .rank{font-weight:700}
  .foot.small{font-size:12px;margin-top:8px;color:#6b7280}
  .grid2{display:grid;grid-template-columns:2fr 1fr;gap:12px}
  .list{margin:0;padding-left:18px}
  .muted{color:#6b7280}
  select, .select{padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:#fff}
  .section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
  .badge{display:inline-block;padding:2px 8px;border-radius:999px;background:#eef2ff;color:#3730a3;font-size:12px;border:1px solid #e5e7eb}
  .badge.high-authority{background:#dcfce7;color:#166534;border-color:#bbf7d0}
  .badge.medium-authority{background:#fef3c7;color:#92400e;border-color:#fde68a}
  .badge.low-authority{background:#fee2e2;color:#991b1b;border-color:#fecaca}
  .badge.verified{background:#dcfce7;color:#166534;border-color:#bbf7d0}
  .badge.unverified{background:#f3f4f6;color:#374151;border-color:#d1d5db}
  .badge.real-time{background:#dbeafe;color:#1e40af;border-color:#93c5fd}
  .badge.training-data{background:#e9d5ff;color:#7c3aed;border-color:#c4b5fd}
  .note{font-size:12px;color:#6b7280}
  .pill{display:inline-block;padding:2px 6px;border:1px solid #e5e7eb;border-radius:999px;font-size:11px;color:#374151;background:#f8fafc}
  .nowrap{white-space:nowrap}
  .citation-meta{font-size:11px;color:#6b7280;margin-top:4px}
  .authority-bar{width:100%;height:3px;background:#e5e7eb;border-radius:2px;overflow:hidden;margin-top:2px}
  .authority-fill{height:100%;background:linear-gradient(90deg,#ef4444 0%,#f59e0b 50%,#10b981 100%);border-radius:2px}
  @media (max-width:1000px){
    .kpiRow{grid-template-columns:repeat(2,minmax(0,1fr))}
    .grid2{grid-template-columns:1fr}
    table{min-width:720px}
  }
  @media print{
    html,body{background:#fff}
    .wrap{max-width:none;padding:0}
    .card{box-shadow:none;border:0;border-radius:0;padding:0;margin:0 0 12px 0}
    select{display:none}
  }
</style>
</head>
<body>
  <div class="wrap">
    <div class="meta">
      Company ${escHtml(company)} • Scenarios ${
  scenarios.length
} • Citations ${totalCitations} • Generated ${escHtml(generatedAt)}
    </div>

    <!-- Strategic Summary -->
    <section class="card" aria-labelledby="summary-h1">
      <h1 id="summary-h1">Strategic Summary</h1>
      <p class="lede">KPIs computed from scenario outcomes for <strong>${escHtml(
        company
      )}</strong>.</p>
      <div class="kpiRow">
        <div class="kpiBig" role="group" aria-label="Win Rate"><div class="big" id="kpi-winrate">—</div><div class="sub">Win Rate</div></div>
        <div class="kpiBig" role="group" aria-label="Average Position"><div class="big" id="kpi-avgpos">—</div><div class="sub">Average Position</div></div>
        <div class="kpiBig" role="group" aria-label="Scenarios Analyzed"><div class="big" id="kpi-scenarios">${
          scenarios.length
        }</div><div class="sub">Scenarios</div></div>
        <div class="kpiBig" role="group" aria-label="High Authority Citations"><div class="big" id="kpi-citations">${highAuthorityCitations}</div><div class="sub">High Authority Citations</div></div>
      </div>
    </section>

    <!-- Head-to-Head Aggregate -->
    <section class="card" aria-labelledby="h2-h2h">
      <h2 id="h2-h2h">Head-to-Head (All Scenarios)</h2>
      <div class="table-wrap">
        <table aria-describedby="h2-h2h" id="h2h-table">
          <thead>
            <tr>
              <th>Rank</th><th>Company</th><th>Wins</th><th>Scenarios</th>
              <th>Avg Position</th><th>Win Rate</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
      <div class="foot small">Derived from ${
        scenarios.length
      } scenario(s).</div>
    </section>

    <!-- Scenario Details with Selector -->
    <section class="card" aria-labelledby="h2-scenarios">
      <div class="section-head">
        <h2 id="h2-scenarios">Scenario Details</h2>
        <label class="muted">Scenario:
          <select id="scenario-select" class="select" aria-label="Select Scenario"></select>
        </label>
      </div>

      <div id="scenario-block">
        <div class="grid2" style="margin-bottom:10px">
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <h3 id="sc-title" style="margin:0;font-size:16px">—</h3>
              <span id="sc-id" class="badge">ID —</span>
            </div>
            <ul id="sc-keyfindings" class="list"></ul>
          </div>
          <div>
            <h4 style="margin:0 0 6px">Scenario Sources</h4>
            <ul id="sc-sources" class="list"></ul>
          </div>
        </div>

        <div class="table-wrap">
          <table id="sc-top-table" aria-label="Top Competitors">
            <thead>
              <tr><th>Rank</th><th>Company</th><th>Score</th><th>Reasoning</th></tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Evidence & Citations -->
    <section class="card" aria-labelledby="h2-evidence">
      <h2 id="h2-evidence">Evidence & Citations</h2>
      <div class="note" style="margin-bottom:8px">
        Consolidated list from <code>data_sources_table</code> and enhanced citations. 
        ${
          totalCitations > 0
            ? `Includes ${totalCitations} detailed citations with authority scores, verification status, and source metadata.`
            : ""
        }
        ${
          highAuthorityCitations > 0
            ? ` ${highAuthorityCitations} high-authority citations (≥8/10).`
            : ""
        }
      </div>
      <div class="table-wrap" style="margin-top:12px">
        <table aria-label="Consolidated Sources" id="consolidated-sources">
          <thead>
            <tr>
              <th>#</th>
              <th>Title/Claim</th>
              <th>Publisher/Domain</th>
              <th>Published</th>
              <th class="nowrap">Authority</th>
              <th class="nowrap">Status</th>
              <th>Origin</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
      <div class="foot small">
        ${
          totalCitations > 0
            ? `Enhanced citations include detailed metadata: authority scores, verification status, source origin, and supporting evidence. `
            : ""
        }
        Scenario-level sources appear under each scenario above.
      </div>
    </section>
  </div>

  <script>
    // -------------------- Data from server --------------------
    const REPORT = ${safeJsonForScript(reportToUse)};

    // -------------------- Client-side helpers --------------------
    const $ = (sel, root=document) => root.querySelector(sel);
    function clear(el){ if(!el) return; while(el.firstChild) el.removeChild(el.firstChild); }
    function makeEl(tag, attrs={}, txt=null){ const el=document.createElement(tag); for(const[k,v] of Object.entries(attrs)) el.setAttribute(k,v); if(txt!=null) el.textContent=txt; return el; }

    // Enhanced source normalization with citation metadata
    function normalizeSource(s) {
      const out = {
        title: '', url: '', publisher: '', published: '',
        reliability: '', authority: '', author: '', notes: '', raw: s,
        // Enhanced citation fields
        claim_category: '', claim_impact_score: '', source_type: '',
        verification_status: '', source_origin: '', real_time_indicators: [],
        influence_weight: 0
      };
      if (!s) return out;

      if (typeof s === 'string') {
        const urlMatch = /https?:\\/\\/[^\\s)]+/i.exec(s);
        out.url = urlMatch ? urlMatch[0] : '';
        if (out.url) {
          const parts = s.split(out.url);
          const left = parts[0].trim();
          const right = (parts[1] || '').trim();
          out.title = left || right || s;
        } else {
          out.title = s;
        }
        return out;
      }

      if (typeof s === 'object') {
        // Standard fields
        out.title = s.title || s.name || s.source || s.label || '';
        out.url = s.url || s.link || '';
        out.publisher = s.publisher || s.outlet || s.domain || '';
        out.published = s.published || s.date || s.published_at || '';
        out.reliability = s.reliability != null ? String(s.reliability) : (s.reliability_score != null ? String(s.reliability_score) : '');
        out.authority = s.authority != null ? String(s.authority) : (s.authority_score != null ? String(s.authority_score) : '');
        out.author = s.author || s.byline || '';
        out.notes = s.notes || s.note || '';
        
        // Enhanced citation fields
        out.claim_category = s.claim_category || '';
        out.claim_impact_score = s.claim_impact_score || '';
        out.source_type = s.source_type || '';
        out.verification_status = s.verification_status || '';
        out.source_origin = s.source_origin || '';
        out.real_time_indicators = s.real_time_indicators || [];
        out.influence_weight = s.influence_weight || 0;
        
        // Fallbacks
        if (!out.title && out.url) {
          try { out.title = new URL(out.url).hostname; } catch {}
        }
        if (!out.publisher && out.url) {
          try { out.publisher = new URL(out.url).hostname.replace(/^www\\./,''); } catch {}
        }
        return out;
      }

      return out;
    }

    function computeH2H(scenariosArr){
      const map = new Map();
      (scenariosArr||[]).forEach(sc=>{
        const tc = Array.isArray(sc.top_competitors) ? sc.top_competitors : [];
        tc.forEach((row, idx)=>{
          const name = (row && row.company) ? row.company : 'Unknown';
          if(!map.has(name)) map.set(name, {name, scenarios:0, wins:0, posTotal:0});
          const r = map.get(name);
          r.scenarios += 1;
          r.posTotal += (idx+1);
          if(idx===0) r.wins += 1;
        });
      });
      const arr = Array.from(map.values()).map(r=>({
        name:r.name,
        scenarios:r.scenarios,
        wins:r.wins,
        avgPos:r.posTotal/r.scenarios,
        winRate:r.wins/r.scenarios
      }));
      arr.sort((a,b)=>{
        if(b.wins!==a.wins) return b.wins-a.wins;
        if(a.avgPos!==b.avgPos) return a.avgPos-b.avgPos;
        return a.name.localeCompare(b.name);
      });
      return arr;
    }

    function renderH2H(){
      const body = $('#h2h-table tbody'); clear(body);
      const h2h = computeH2H(REPORT.scenarios);
      h2h.forEach((r,i)=>{
        const tr = document.createElement('tr');
        tr.innerHTML =
          '<td class="rank">#'+(i+1)+'</td>'+
          '<td>'+r.name+'</td>'+
          '<td>'+r.wins+'</td>'+
          '<td>'+r.scenarios+'</td>'+
          '<td>'+r.avgPos.toFixed(2)+'</td>'+
          '<td>'+Math.round(r.winRate*100)+'%</td>';
        body.appendChild(tr);
      });

      // KPIs for the target company
      const target = REPORT.report_metadata && REPORT.report_metadata.company || '';
      const rec = h2h.find(x=>x.name===target) || null;
      $('#kpi-winrate').textContent = rec ? (Math.round(rec.winRate*100)+'%') : '—';
      $('#kpi-avgpos').textContent = rec ? rec.avgPos.toFixed(2) : '—';
    }

    function populateScenarioSelector(){
      const sel = $('#scenario-select'); clear(sel);
      (REPORT.scenarios||[]).forEach((sc, idx)=>{
        const label = sc.title || ('Scenario '+(idx+1));
        const opt = makeEl('option', { value:String(idx) }, label);
        sel.appendChild(opt);
      });
    }

    function renderScenario(idx){
      const sc = (REPORT.scenarios||[])[idx]; if(!sc) return;
      $('#sc-title').textContent = sc.title || ('Scenario '+(idx+1));
      $('#sc-id').textContent = 'ID ' + (sc.scenario_id!=null ? sc.scenario_id : '—');

      const kf = $('#sc-keyfindings'); clear(kf);
      (Array.isArray(sc.key_findings)?sc.key_findings:[]).forEach(k=>{
        kf.appendChild(makeEl('li', {}, k));
      });

      // Scenario Sources
      const srcUl = $('#sc-sources'); clear(srcUl);
      (Array.isArray(sc.sources)?sc.sources:[]).forEach(s=>{
        const norm = normalizeSource(s);
        const li = document.createElement('li');

        if (norm.url) {
          const a = makeEl('a', {href:norm.url, target:'_blank', rel:'noopener'}, norm.title || norm.url);
          li.appendChild(a);
        } else {
          li.appendChild(document.createTextNode(norm.title || (typeof s === 'string' ? s : '—')));
        }

        const chips = [];
        if (norm.publisher) chips.push('Publisher: '+norm.publisher);
        if (norm.published) chips.push('Published: '+norm.published);
        if (norm.authority) chips.push('Authority: '+norm.authority);
        if (norm.verification_status) chips.push('Status: '+norm.verification_status);
        if (chips.length){
          const metaSpan = document.createElement('div');
          metaSpan.className = 'note';
          metaSpan.textContent = chips.join(' • ');
          li.appendChild(metaSpan);
        }

        srcUl.appendChild(li);
      });

      // Top competitors
      const tb = $('#sc-top-table tbody'); clear(tb);
      (Array.isArray(sc.top_competitors)?sc.top_competitors:[]).forEach((row,i)=>{
        const tr = document.createElement('tr');
        tr.innerHTML =
          '<td class="rank">#'+(i+1)+'</td>'+
          '<td>'+(row.company||'—')+'</td>'+
          '<td>'+(row.score!=null?row.score:'—')+'</td>'+
          '<td>'+(row.rationale||'—')+'</td>';
        tb.appendChild(tr);
      });
    }

    // Enhanced consolidated sources renderer
    function renderConsolidatedSources(){
      const body = $('#consolidated-sources tbody'); clear(body);
      const rows = (REPORT.data_sources_table||[]).map(normalizeSource);
      rows.forEach((r,i)=>{
        const tr = document.createElement('tr');

        // Index
        const tdIdx = makeEl('td', {}, String(i+1));
        
        // Title/Claim with enhanced info
        const tdTitle = document.createElement('td');
        const titleText = r.title || (typeof r.raw === 'string' ? r.raw : '—');
        if (r.url) {
          const a = makeEl('a', { href:r.url, target:'_blank', rel:'noopener' }, titleText);
          tdTitle.appendChild(a);
        } else {
          tdTitle.textContent = titleText;
        }
        
        // Add enhanced citation metadata if available
        if (r.claim_category || r.claim_impact_score) {
          const metaDiv = document.createElement('div');
          metaDiv.className = 'citation-meta';
          const metaItems = [];
          if (r.claim_category) metaItems.push('Category: ' + r.claim_category);
          if (r.claim_impact_score) metaItems.push('Impact: ' + r.claim_impact_score + '/10');
          if (r.influence_weight) metaItems.push('Weight: ' + r.influence_weight.toFixed(2));
          metaDiv.textContent = metaItems.join(' • ');
          tdTitle.appendChild(metaDiv);
        }

        // Publisher/Domain
        const tdPublisher = makeEl('td', {}, r.publisher || '—');
        
        // Published date
        const tdPublished = makeEl('td', {}, r.published || '—');
        
        // Authority with visual indicator
        const tdAuthority = document.createElement('td');
        if (r.authority) {
          const authNum = parseFloat(r.authority);
          const authSpan = document.createElement('span');
          authSpan.textContent = r.authority + '/10';
          
          // Authority badge
          if (authNum >= 8) {
            authSpan.className = 'badge high-authority';
          } else if (authNum >= 5) {
            authSpan.className = 'badge medium-authority';
          } else {
            authSpan.className = 'badge low-authority';
          }
          
          tdAuthority.appendChild(authSpan);
          
          // Authority bar
          const barDiv = document.createElement('div');
          barDiv.className = 'authority-bar';
          const fillDiv = document.createElement('div');
          fillDiv.className = 'authority-fill';
          fillDiv.style.width = (authNum / 10 * 100) + '%';
          barDiv.appendChild(fillDiv);
          tdAuthority.appendChild(barDiv);
        } else {
          tdAuthority.textContent = '—';
        }
        
        // Verification status
        const tdStatus = document.createElement('td');
        if (r.verification_status) {
          const statusSpan = document.createElement('span');
          statusSpan.textContent = r.verification_status;
          statusSpan.className = r.verification_status === 'verified' ? 'badge verified' : 'badge unverified';
          tdStatus.appendChild(statusSpan);
        } else {
          tdStatus.textContent = '—';
        }
        
        // Source origin
        const tdOrigin = document.createElement('td');
        if (r.source_origin) {
          const originSpan = document.createElement('span');
          originSpan.textContent = r.source_origin;
          if (r.source_origin === 'real_time_search') {
            originSpan.className = 'badge real-time';
          } else if (r.source_origin === 'training_data') {
            originSpan.className = 'badge training-data';
          } else {
            originSpan.className = 'badge';
          }
          tdOrigin.appendChild(originSpan);
        } else {
          tdOrigin.textContent = '—';
        }

        // Link
        const tdView = document.createElement('td');
        if (r.url) {
          tdView.appendChild(makeEl('a', { href:r.url, target:'_blank', rel:'noopener' }, 'Open ↗'));
        } else {
          tdView.textContent = '—';
        }

        tr.appendChild(tdIdx);
        tr.appendChild(tdTitle);
        tr.appendChild(tdPublisher);
        tr.appendChild(tdPublished);
        tr.appendChild(tdAuthority);
        tr.appendChild(tdStatus);
        tr.appendChild(tdOrigin);
        tr.appendChild(tdView);
        body.appendChild(tr);
      });
    }

    // -------------------- Init --------------------
    (function init(){
      renderH2H();
      populateScenarioSelector();
      renderScenario(0);
      renderConsolidatedSources();
      document.getElementById('scenario-select').addEventListener('change', (e)=>{
        const idx = parseInt(e.target.value,10) || 0;
        renderScenario(idx);
        document.getElementById('scenario-block').scrollIntoView({behavior:'smooth', block:'start'});
      });
    })();
  </script>
</body>
</html>`;

/* ----------------------- Return file ----------------------- */

const fileNameSafeCompany = company
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");
const filename = `competitive-report-${
  fileNameSafeCompany || "company"
}-${new Date().toISOString().replace(/[:.]/g, "-")}.html`;

return [{ json: { html, filename } }];
