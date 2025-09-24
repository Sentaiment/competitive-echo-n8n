// Simple HTML Generator - Complete replacement for Generate HTML Report node
// Copy this entire code into your n8n "Generate HTML Report" node

/**
 * n8n Code node (JavaScript) - FIXED VERSION
 * Generate HTML Report with proper data extraction
 * Output: items[0].json = { html, filename }
 */

console.log("=== SIMPLE HTML REPORT GENERATOR ===");

// Get all input items
const inputItems = $input.all();
console.log("Total input items:", inputItems.length);

// Extract data from the nested structure
let mergedData = null;

// Helper to score candidate payloads by richness
function scorePayload(p) {
  if (!p || typeof p !== "object") return -1;
  const scenarios = Array.isArray(p.scenarios) ? p.scenarios : [];
  const scenarioCount = scenarios.length;
  const competitorTotal = scenarios.reduce(
    (sum, sc) =>
      sum + (Array.isArray(sc.top_competitors) ? sc.top_competitors.length : 0),
    0
  );
  const citationsCount = Array.isArray(p.enhanced_citations)
    ? p.enhanced_citations.length
    : 0;
  const sourcesCount = Array.isArray(p.data_sources_table)
    ? p.data_sources_table.length
    : 0;
  // Prioritize scenarios and competitors most, then citations/sources
  return (
    scenarioCount * 1000 + competitorTotal * 10 + citationsCount + sourcesCount
  );
}

// Find the richest dataset among all inputs (including nested data arrays)
let best = { score: -1, payload: null };
inputItems.forEach((item, index) => {
  const data = item.json || {};
  console.log(`Processing item ${index}:`, Object.keys(data));

  // Consider direct data object
  const directScore = scorePayload(data);
  if (directScore > best.score) {
    best = { score: directScore, payload: data };
  }

  // Consider nested array elements under data[]
  if (Array.isArray(data.data) && data.data.length > 0) {
    console.log(`Found nested data array in item ${index}:`, data.data.length);
    data.data.forEach((child, childIdx) => {
      const childScore = scorePayload(child);
      if (childScore > best.score) {
        best = { score: childScore, payload: child };
      }
    });
  }
});

mergedData = best.payload;
if (!mergedData) {
  console.log("No rich payload found; will create placeholder.");
} else {
  console.log("Selected richest payload with score:", best.score);
  console.log("Company:", mergedData.report_metadata?.company);
  console.log("Scenarios:", mergedData.scenarios?.length || 0);
  console.log(
    "Enhanced citations:",
    mergedData.enhanced_citations?.length || 0
  );
}

// If no data found, create a placeholder
if (!mergedData) {
  console.log("⚠️ NO DATA FOUND - Creating placeholder");
  mergedData = {
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
}

// ENHANCED: Extract company name from report data if not found
let targetCompany = mergedData.report_metadata?.company || "Unknown Company";

// Try to get company name from workflow context as fallback
try {
  if (
    typeof $workflow !== "undefined" &&
    $workflow.context &&
    $workflow.context.target_company
  ) {
    targetCompany = $workflow.context.target_company;
    console.log("Found company from workflow context:", targetCompany);
  }
} catch (e) {
  console.log("Could not access workflow context:", e.message);
}

// ENHANCED: Extract company name from report data if still unknown
if (targetCompany === "Unknown Company") {
  console.log("🔍 Searching for company name in report data...");

  // Look through all input items for company information
  for (let i = 0; i < inputItems.length; i++) {
    const item = inputItems[i].json || {};

    // Check various possible company name fields
    const possibleCompanyNames = [
      item.report_metadata?.company,
      item.company,
      item.brand_name,
      item.name,
      item.entity_name,
      item.brand,
    ].filter(Boolean);

    if (possibleCompanyNames.length > 0) {
      targetCompany = possibleCompanyNames[0];
      console.log("✅ Found company in report data:", targetCompany);
      break;
    }

    // Check nested data structures
    if (item.data && Array.isArray(item.data)) {
      for (const dataItem of item.data) {
        const nestedCompany =
          dataItem?.report_metadata?.company || dataItem?.company;
        if (nestedCompany && nestedCompany !== "Unknown Company") {
          targetCompany = nestedCompany;
          console.log("✅ Found company in nested data:", targetCompany);
          break;
        }
      }
    }

    if (targetCompany !== "Unknown Company") break;
  }

  // Final fallback: extract from scenarios if still unknown
  if (targetCompany === "Unknown Company") {
    console.log("🔍 Searching scenarios for company name...");
    for (let i = 0; i < inputItems.length; i++) {
      const item = inputItems[i].json || {};
      if (
        item.scenarios &&
        Array.isArray(item.scenarios) &&
        item.scenarios.length > 0
      ) {
        const firstScenario = item.scenarios[0];
        if (
          firstScenario.top_competitors &&
          Array.isArray(firstScenario.top_competitors) &&
          firstScenario.top_competitors.length > 0
        ) {
          const topCompany = firstScenario.top_competitors[0].company;
          if (topCompany) {
            targetCompany = topCompany;
            console.log("✅ Found company from top competitor:", targetCompany);
            break;
          }
        }
      }
    }
  }
}

// Update company name if we found it
if (targetCompany !== "Unknown Company") {
  mergedData.report_metadata = mergedData.report_metadata || {};
  mergedData.report_metadata.company = targetCompany;
}

// Final validation
console.log("=== FINAL MERGED DATA ===");
console.log("Company:", mergedData.report_metadata?.company);
console.log("Scenarios count:", mergedData.scenarios?.length || 0);
console.log("Citations count:", mergedData.enhanced_citations?.length || 0);
console.log("Data sources count:", mergedData.data_sources_table?.length || 0);

// Ensure we have the required structure
if (!mergedData.report_metadata) {
  mergedData.report_metadata = {
    company: "Unknown Company",
    total_scenarios: 0,
    competitors_analyzed: [],
  };
}

if (!mergedData.scenarios) {
  mergedData.scenarios = [];
}

if (!mergedData.enhanced_citations) {
  mergedData.enhanced_citations = [];
}

if (!mergedData.data_sources_table) {
  mergedData.data_sources_table = [];
}

// Update total scenarios count
mergedData.report_metadata.total_scenarios = mergedData.scenarios.length;

// If still no scenarios, create a placeholder
if (mergedData.scenarios.length === 0) {
  console.log("⚠️ NO SCENARIOS FOUND - Creating placeholder");
  mergedData.scenarios = [
    {
      scenario_id: 1,
      title: "No scenarios available",
      description: "No scenario data was found in the input",
      top_competitors: [],
      key_findings: ["No data available"],
      sources: [],
    },
  ];
}

// Generate filename
const company = mergedData.report_metadata.company
  .toLowerCase()
  .replace(/[^a-z0-9]/g, "-");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const filename = `competitive-report-${company}-${timestamp}.html`;

// Generate HTML (using the existing template from your current generator)
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Competitive Report — ${mergedData.report_metadata.company}</title>
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
  table{width:100%;border-collapse:collapse;min-width:1000px}
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
  .badge.url-valid{background:#dcfce7;color:#166534;border-color:#bbf7d0}
  .badge.url-invalid{background:#fee2e2;color:#991b1b;border-color:#fecaca}
  .badge.url-unknown{background:#fef3c7;color:#92400e;border-color:#fde68a}
  .note{font-size:12px;color:#6b7280}
  .pill{display:inline-block;padding:2px 6px;border:1px solid #e5e7eb;border-radius:999px;font-size:11px;color:#374151;background:#f8fafc}
  .nowrap{white-space:nowrap}
  .citation-meta{font-size:11px;color:#6b7280;margin-top:4px}
  .authority-bar{width:100%;height:3px;background:#e5e7eb;border-radius:2px;overflow:hidden;margin-top:2px}
  .authority-fill{height:100%;background:linear-gradient(90deg,#ef4444 0%,#f59e0b 50%,#10b981 100%);border-radius:2px}
  .metrics-cell{max-width:250px}
  .metrics-grid{display:flex;flex-direction:column;gap:2px}
  .metric-item{font-size:11px;color:#374151;white-space:nowrap}
  .target-company-row{background:#f0f9ff;border-left:4px solid #0ea5e9;position:relative}
  .target-company-row:hover{background:#e0f2fe}
  .target-company-badge{position:absolute;top:4px;right:8px;background:#0ea5e9;color:white;font-size:10px;padding:2px 6px;border-radius:4px;font-weight:600}
  .target-company-cell{font-weight:600;color:#0c4a6e}
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
      Company ${mergedData.report_metadata.company} • Scenarios ${
  mergedData.scenarios.length
} • Citations ${
  mergedData.enhanced_citations.length
} • Generated ${new Date().toISOString()}
    </div>

    <!-- Evidence Summary -->
    ${
      mergedData.report_metadata.evidence_summary
        ? `
    <div class="evidence-summary" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <h3 style="margin: 0 0 12px; font-size: 14px; color: #374151;">Evidence Quality Summary</h3>
      <div style="display: flex; gap: 16px; flex-wrap: wrap; align-items: center;">
        <span class="badge badge-info">${
          mergedData.report_metadata.evidence_summary.total_citations || 0
        } Total Citations</span>
        <span class="badge badge-success">${
          mergedData.report_metadata.evidence_summary.verified_citations || 0
        } Verified</span>
        <span class="badge badge-warning">${
          mergedData.report_metadata.evidence_summary
            .high_authority_citations || 0
        } High Authority</span>
        <span class="badge badge-primary">${
          mergedData.report_metadata.evidence_summary.unique_domains || 0
        } Unique Domains</span>
      </div>
      ${
        mergedData.report_metadata.top_publishers &&
        mergedData.report_metadata.top_publishers.length > 0
          ? `
        <div style="margin-top: 12px;">
          <strong style="font-size: 12px; color: #6b7280;">Top Publishers:</strong>
          <div style="margin-top: 4px; display: flex; gap: 8px; flex-wrap: wrap;">
            ${mergedData.report_metadata.top_publishers
              .map(
                (p) => `
              <span class="badge badge-secondary" title="${p.citation_count} citations">${p.domain} (${p.citation_count})</span>
            `
              )
              .join("")}
          </div>
        </div>
      `
          : ""
      }
    </div>
    `
        : ""
    }

    <!-- Strategic Summary -->
    <section class="card" aria-labelledby="summary-h1">
      <h1 id="summary-h1">Strategic Summary</h1>
      <p class="lede">KPIs computed from scenario outcomes for <strong>${
        mergedData.report_metadata.company
      }</strong>.</p>
      <div class="kpiRow">
        <div class="kpiBig" role="group" aria-label="Win Rate"><div class="big" id="kpi-winrate">—</div><div class="sub">Win Rate</div></div>
        <div class="kpiBig" role="group" aria-label="Average Position"><div class="big" id="kpi-avgpos">—</div><div class="sub">Average Position</div></div>
        <div class="kpiBig" role="group" aria-label="Scenarios Analyzed"><div class="big" id="kpi-scenarios">${
          mergedData.scenarios.length
        }</div><div class="sub">Scenarios</div></div>
        <div class="kpiBig" role="group" aria-label="High Authority Citations"><div class="big" id="kpi-citations">${
          mergedData.enhanced_citations.length
        }</div><div class="sub">High Authority Citations</div></div>
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
        mergedData.scenarios.length
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
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
          <h3 id="sc-title" style="margin:0;font-size:16px">—</h3>
          <span id="sc-id" class="badge">ID —</span>
        </div>

        <!-- Competitor Rankings Table (moved to top) -->
        <div class="table-wrap" style="margin-bottom:20px">
          <table id="sc-top-table" aria-label="Top Competitors">
            <thead>
              <tr><th>Rank</th><th>Company</th><th>Score</th><th>Detailed Metrics</th><th>Reasoning</th></tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>

        <!-- Key Findings and Sources (moved below table) -->
        <div class="grid2">
          <div>
            <h4 style="margin:0 0 8px">Key Findings</h4>
            <ul id="sc-keyfindings" class="list"></ul>
          </div>
          <div>
            <h4 style="margin:0 0 8px">Scenario Sources</h4>
            <ul id="sc-sources" class="list"></ul>
          </div>
        </div>
      </div>
    </section>

    <!-- Evidence & Citations -->
    <section class="card" aria-labelledby="h2-evidence">
      <h2 id="h2-evidence">Evidence & Citations</h2>
      <div class="note" style="margin-bottom:8px">
        Consolidated list from data sources. 
        Includes ${
          mergedData.enhanced_citations.length
        } detailed citations with authority scores and verification status.
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
              <th>Link</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </section>
  </div>

  <script>
    // Data from server
    const REPORT = ${JSON.stringify(mergedData)};
    console.log('REPORT data received:', REPORT);
    console.log('Scenarios count:', REPORT.scenarios?.length || 0);
    console.log('Company:', REPORT.report_metadata?.company);

    // Helper functions
    const $ = (sel, root=document) => root.querySelector(sel);
    function clear(el){ if(!el) return; while(el.firstChild) el.removeChild(el.firstChild); }
    function makeEl(tag, attrs={}, txt=null){ const el=document.createElement(tag); for(const[k,v] of Object.entries(attrs)) el.setAttribute(k,v); if(txt!=null) el.textContent=txt; return el; }

    // Simple company name normalization
    function normCompanyBase(name){
      if (!name) return '';
      return name.toString()
        .normalize('NFKC')
        .toLowerCase()
        .trim()
        .replace(/^the\\s+/, '')
        .replace(/&/g,'and')
        .replace(/[^a-z0-9\\s]/g,'')
        .replace(/\\s+/g,' ')
        .trim();
    }

    // Simple company grouping - no hardcoded names
    function findCompanyGroup(companyName, existingGroups = new Map()){
      const normalized = normCompanyBase(companyName);
      
      // Extract meaningful words (excluding common suffixes)
      const meaningfulWords = normalized
        .replace(/\\b(hotels?|resorts?|casino|group|holdings?|inc\\.?|llc|ltd\\.?|co\\.?|corp\\.?|company|strip|las vegas)\\b/g, '')
        .trim()
        .split(/\\s+/)
        .filter(word => word.length > 2);
      
      if (meaningfulWords.length === 0) {
        return normalized;
      }
      
      // Look for existing groups that share meaningful words
      for (const [groupKey, groupData] of existingGroups.entries()) {
        const groupWords = groupData.meaningfulWords || [];
        
        // Check for common meaningful words
        const commonWords = meaningfulWords.filter(word =>
          groupWords.some(gWord => {
            if (word === gWord) return true; // Exact match
            // For longer words, allow substring match
            if (word.length >= 4 && gWord.length >= 4) {
              return word.includes(gWord) || gWord.includes(word);
            }
            return false;
          })
        );
        
        if (commonWords.length > 0) {
          return groupKey;
        }
      }
      
      // If no suitable group found, create a new group key
      return meaningfulWords.sort((a, b) => b.length - a.length)[0] || normalized;
    }

    function computeH2H(scenariosArr){
      console.log('computeH2H called with:', scenariosArr);
      const map = new Map();
      const groupMap = new Map();
      
      (scenariosArr||[]).forEach((sc, scIndex)=>{
        console.log('Processing scenario', scIndex, ':', sc.title);
        const tc = Array.isArray(sc.top_competitors) ? sc.top_competitors : [];
        console.log('Top competitors for scenario', scIndex, ':', tc.length);
        tc.forEach((row, idx)=>{
          const display = (row && row.company) ? row.company : 'Unknown';
          const normalizedDisplay = normCompanyBase(display);
          
          // Determine the group key for this company
          const groupKey = findCompanyGroup(display, groupMap);
          
          // Initialize group data if new
          if (!groupMap.has(groupKey)) {
            groupMap.set(groupKey, {
              name: display,
              meaningfulWords: findCompanyGroup(display).split(/\\s+/).filter(word => word.length > 2),
              allNames: new Set(),
              scenarios: 0,
              wins: 0,
              posTotal: 0
            });
          }
          const groupData = groupMap.get(groupKey);
          
          // Update the best display name
          if (display.length < groupData.name.length) groupData.name = display;
          groupData.allNames.add(display);
          
          groupData.scenarios += 1;
          if (idx === 0) groupData.wins += 1;
          groupData.posTotal += (idx + 1);
        });
      });
      
      // Convert map to array and calculate averages
      const results = Array.from(groupMap.values()).map(r => ({
        name: r.name,
        allNames: Array.from(r.allNames).sort(),
        scenarios: r.scenarios,
        wins: r.wins,
        avgPos: r.scenarios > 0 ? r.posTotal / r.scenarios : 0,
        winRate: r.scenarios > 0 ? r.wins / r.scenarios : 0
      }));
      
      return results.sort((a,b)=>b.winRate-a.winRate || a.avgPos-b.avgPos);
    }

    function renderH2H(){
      const body = $('#h2h-table tbody'); 
      clear(body);
      const h2h = computeH2H(REPORT.scenarios);
      
      // Get target company for highlighting
      const targetRaw = (REPORT.report_metadata && REPORT.report_metadata.company) || '';
      const targetGroupKey = findCompanyGroup(targetRaw);
      
      h2h.forEach((r,i)=>{
        const tr = document.createElement('tr');
        const isTargetCompany = findCompanyGroup(r.name) === targetGroupKey;
        
        if (isTargetCompany) {
          tr.className = 'target-company-row';
          const nameDisplay = r.name + (r.allNames && r.allNames.length > 1 ? 
            \` <span style="font-size:11px;color:#6b7280;">(includes: \${r.allNames.slice(1).join(', ')}</span>\` : '');
          tr.innerHTML =
            '<td class="rank">#'+(i+1)+'</td>'+
            '<td class="target-company-cell">'+nameDisplay+' <span class="target-company-badge">TARGET</span></td>'+
            '<td>'+r.wins+'</td>'+
            '<td>'+r.scenarios+'</td>'+
            '<td>'+r.avgPos.toFixed(2)+'</td>'+
            '<td>'+Math.round(r.winRate*100)+'%</td>';
        } else {
          const nameDisplay = r.name + (r.allNames && r.allNames.length > 1 ? 
            \` <span style="font-size:11px;color:#6b7280;">(includes: \${r.allNames.slice(1).join(', ')}</span>\` : '');
          tr.innerHTML =
            '<td class="rank">#'+(i+1)+'</td>'+
            '<td>'+nameDisplay+'</td>'+
            '<td>'+r.wins+'</td>'+
            '<td>'+r.scenarios+'</td>'+
            '<td>'+r.avgPos.toFixed(2)+'</td>'+
            '<td>'+Math.round(r.winRate*100)+'%</td>';
        }
        body.appendChild(tr);
      });

      // KPIs for the target company
      const norm = (s)=> (s||'').toString().normalize('NFKC').trim().toLowerCase().replace(/\\s+/g,' ');
      const stripThe = (s)=> s.replace(/^the\\s+/,'');
      const targetRaw2 = (REPORT.report_metadata && REPORT.report_metadata.company) || '';
      const target = normCompanyBase(targetRaw2) || norm(targetRaw2);
      console.log('Looking for target company:', target);
      console.log('Available companies in h2h:', h2h.map(h => h.name));
      let rec = h2h.find(x => normCompanyBase(x.name) === target)
        || h2h.find(x => normCompanyBase(x.name).includes(target))
        || h2h.find(x => stripThe(norm(x.name)) === stripThe(target))
        || h2h.find(x => stripThe(norm(x.name)).includes(stripThe(target)))
        || null;
      if (!rec && h2h.length > 0) rec = h2h[0];
      console.log('Found target company record:', rec);
      $('#kpi-winrate').textContent = rec ? (Math.round(rec.winRate*100)+'%') : '—';
      $('#kpi-avgpos').textContent = rec ? rec.avgPos.toFixed(2) : '—';
    }

    function populateScenarioSelector(){
      const sel = $('#scenario-select'); 
      clear(sel);
      (REPORT.scenarios||[]).forEach((sc, idx)=>{
        const label = sc.title || ('Scenario '+(idx+1));
        const opt = makeEl('option', { value:String(idx) }, label);
        sel.appendChild(opt);
      });
    }

    function renderScenario(idx){
      const sc = (REPORT.scenarios||[])[idx]; 
      if(!sc) return;
      $('#sc-title').textContent = sc.title || ('Scenario '+(idx+1));
      $('#sc-id').textContent = 'ID ' + (sc.scenario_id!=null ? sc.scenario_id : '—');

      // Top competitors with detailed metrics
      const tb = $('#sc-top-table tbody'); 
      clear(tb);
      
      // Get target company for highlighting
      const targetRaw = (REPORT.report_metadata && REPORT.report_metadata.company) || '';
      const targetGroupKey = findCompanyGroup(targetRaw);
      
      (Array.isArray(sc.top_competitors)?sc.top_competitors:[]).forEach((row,i)=>{
        const tr = document.createElement('tr');
        
        // Check if this company matches the target using the same grouping logic
        const companyName = row.company || '';
        const isTargetCompany = findCompanyGroup(companyName) === targetGroupKey;
        
        // Create detailed metrics display
        let metricsHtml = '—';
        if (row.detailed_metrics && typeof row.detailed_metrics === 'object' && Object.keys(row.detailed_metrics).length > 0) {
          const metricsArray = Object.entries(row.detailed_metrics).map(([key, value]) => {
            const formattedKey = key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, str => str.toUpperCase());
            return '<span class="metric-item"><strong>' + formattedKey + ':</strong> ' + value + '</span>';
          });
          metricsHtml = '<div class="metrics-grid">' + metricsArray.join('') + '</div>';
        }
        
        if (isTargetCompany) {
          tr.className = 'target-company-row';
        }
        
        tr.innerHTML =
          '<td class="rank">'+(i+1)+'</td>'+
          '<td '+(isTargetCompany ? 'class="target-company-cell"' : '')+'>'+companyName+(isTargetCompany ? ' <span class="target-company-badge">TARGET</span>' : '')+'</td>'+
          '<td>'+(row.score!=null?row.score:'—')+'</td>'+
          '<td class="metrics-cell">'+metricsHtml+'</td>'+
          '<td>'+(row.rationale||'—')+'</td>';
        tb.appendChild(tr);
      });

      // Key Findings
      const kf = $('#sc-keyfindings'); 
      clear(kf);
      (Array.isArray(sc.key_findings)?sc.key_findings:[]).forEach(k=>{
        kf.appendChild(makeEl('li', {}, k));
      });

      // Scenario Sources
      const srcUl = $('#sc-sources'); 
      clear(srcUl);
      const sources = Array.isArray(sc.sources) ? sc.sources : [];
      
      if (sources.length === 0 && REPORT.enhanced_citations) {
        const scenarioKeywords = (sc.title || '').toLowerCase().split(' ').slice(0, 3);
        const relatedCitations = REPORT.enhanced_citations.filter(citation => {
          const claimText = (citation.claim_text || '').toLowerCase();
          return scenarioKeywords.some(keyword => keyword.length > 3 && claimText.includes(keyword));
        }).slice(0, 5);
        
        relatedCitations.forEach(citation => {
          const li = document.createElement('li');
          const title = citation.claim_text || citation.title || 'Source';
          const url = citation.source_url || citation.url || '';
          
          if (url) {
            const a = makeEl('a', {href: url, target: '_blank', rel: 'noopener'}, 
              title.length > 80 ? title.substring(0, 80) + '...' : title);
            li.appendChild(a);
          } else {
            li.textContent = title.length > 80 ? title.substring(0, 80) + '...' : title;
          }
          
          const metaDiv = document.createElement('div');
          metaDiv.className = 'citation-meta';
          const metaItems = [];
          if (citation.source_domain) metaItems.push('Source: ' + citation.source_domain);
          if (citation.authority_score) metaItems.push('Authority: ' + citation.authority_score + '/10');
          if (metaItems.length > 0) {
            metaDiv.textContent = metaItems.join(' • ');
            li.appendChild(metaDiv);
          }
          
          srcUl.appendChild(li);
        });
      } else {
        sources.forEach(s => {
          const li = document.createElement('li');
          if (typeof s === 'string') {
            if (s.startsWith('http')) {
              const a = makeEl('a', {href: s, target: '_blank', rel: 'noopener'}, s);
              li.appendChild(a);
            } else {
              li.textContent = s;
            }
          } else if (typeof s === 'object' && s.url) {
            const a = makeEl('a', {href: s.url, target: '_blank', rel: 'noopener'}, s.title || s.url);
            li.appendChild(a);
          } else {
            li.textContent = typeof s === 'object' ? (s.title || s.name || 'Source') : s;
          }
          srcUl.appendChild(li);
        });
      }
      
      if (srcUl.children.length === 0) {
        const li = makeEl('li', {}, 'No specific sources available for this scenario');
        li.style.fontStyle = 'italic';
        li.style.color = '#6b7280';
        srcUl.appendChild(li);
      }
    }

    function renderConsolidatedSources(){
      const body = $('#consolidated-sources tbody'); 
      clear(body);
      const merged = []
        .concat(Array.isArray(REPORT.enhanced_citations)?REPORT.enhanced_citations:[])
        .concat(Array.isArray(REPORT.data_sources_table)?REPORT.data_sources_table:[]);
      const byKey = new Map();
      const domainFrom = (u)=>{ try{ return new URL(u).hostname.replace(/^www\\./i,'').toLowerCase(); }catch{ return ''; } };
      merged.forEach(s=>{
        const title = s.claim_text || s.title || s.name || '';
        const url = s.source_url || s.url || '';
        const key = (title+'__'+url).toLowerCase();
        if(!byKey.has(key)) byKey.set(key, s);
      });
      const list = Array.from(byKey.values()).sort((a,b)=>{
        const aAuth = Number(a.authority_score || a.authority || 0);
        const bAuth = Number(b.authority_score || b.authority || 0);
        if (bAuth !== aAuth) return bAuth - aAuth;
        const aDate = Date.parse(a.publication_date || a.published || '') || 0;
        const bDate = Date.parse(b.publication_date || b.published || '') || 0;
        return bDate - aDate;
      });

      list.forEach((s,i)=>{
        const tr = document.createElement('tr');
        const title = s.claim_text || s.title || s.name || 'Source';
        const url = s.source_url || s.url || '';
        const publisher = s.source_domain || s.publisher || domainFrom(url) || '';
        const published = s.publication_date || s.published || '';
        const authority = s.authority_score || s.authority || '';
        const status = s.verification_status || '';
        tr.innerHTML =
          '<td>'+(i+1)+'</td>'+
          '<td>'+(url ? '<a href="'+url+'" target="_blank" rel="noopener">'+title+'</a>' : title)+'</td>'+
          '<td>'+(publisher||'—')+'</td>'+
          '<td>'+published+'</td>'+
          '<td>'+(authority ? '<span class="badge high-authority">'+authority+'/10</span>' : '—')+'</td>'+
          '<td>'+(status ? (status==='verified' ? 'verified' : '—') : '—')+'</td>'+
          '<td>'+(url ? '<a href="'+url+'" target="_blank" rel="noopener">Open ↗</a>' : '—')+'</td>';
        body.appendChild(tr);
      });
    }

    // Initialize
    (function init(){
      try {
        renderH2H();
        populateScenarioSelector();
        renderScenario(0);
        renderConsolidatedSources();
        document.getElementById('scenario-select').addEventListener('change', (e)=>{
          const idx = parseInt(e.target.value,10) || 0;
          renderScenario(idx);
          document.getElementById('scenario-block').scrollIntoView({behavior:'smooth', block:'start'});
        });
      } catch (error) {
        console.error('Error initializing report:', error);
      }
    })();
  </script>
</body>
</html>`;

console.log("=== HTML GENERATION COMPLETE ===");
console.log("HTML length:", html.length);
console.log("Filename:", filename);

return [
  {
    json: {
      html: html,
      filename: filename,
    },
  },
];
