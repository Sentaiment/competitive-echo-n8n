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

// Initialize merged data
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

// Process each input item
inputItems.forEach((item, index) => {
  const data = item.json || {};
  console.log(`Processing item ${index}:`, Object.keys(data));

  // Extract scenarios from any available source
  if (
    data.scenarios &&
    Array.isArray(data.scenarios) &&
    data.scenarios.length > 0
  ) {
    console.log(`Found ${data.scenarios.length} scenarios in item ${index}`);
    mergedData.scenarios = mergedData.scenarios.concat(data.scenarios);
  }

  if (
    data.scenario_rankings &&
    Array.isArray(data.scenario_rankings) &&
    data.scenario_rankings.length > 0
  ) {
    console.log(
      `Found ${data.scenario_rankings.length} scenario_rankings in item ${index}`
    );

    const convertedScenarios = data.scenario_rankings.map((ranking) => ({
      scenario_id: ranking.scenario_id || 0,
      title:
        ranking.scenario_title ||
        ranking.title ||
        `Scenario ${ranking.scenario_id || 0}`,
      description: ranking.scenario_description || ranking.description || "",
      top_competitors: ranking.competitors_ranked || [],
      key_findings: ranking.key_findings || [],
      sources:
        ranking.sources || ranking.analysis_details
          ? Object.values(ranking.analysis_details).flatMap(
              (detail) => detail.sources || []
            )
          : [],
    }));

    mergedData.scenarios = mergedData.scenarios.concat(convertedScenarios);
  }

  // Extract metadata
  if (data.report_metadata) {
    if (
      data.report_metadata.company &&
      data.report_metadata.company !== "Unknown Company"
    ) {
      mergedData.report_metadata.company = data.report_metadata.company;
    }
    if (data.report_metadata.total_scenarios) {
      mergedData.report_metadata.total_scenarios =
        data.report_metadata.total_scenarios;
    }
    if (data.report_metadata.competitors_analyzed) {
      mergedData.report_metadata.competitors_analyzed =
        data.report_metadata.competitors_analyzed;
    }
  }

  // Extract citations
  if (data.enhanced_citations && Array.isArray(data.enhanced_citations)) {
    mergedData.enhanced_citations = mergedData.enhanced_citations.concat(
      data.enhanced_citations
    );
  }

  if (data.data_sources_table && Array.isArray(data.data_sources_table)) {
    mergedData.data_sources_table = mergedData.data_sources_table.concat(
      data.data_sources_table
    );
  }
});

// Final validation
console.log("=== FINAL MERGED DATA ===");
console.log("Company:", mergedData.report_metadata.company);
console.log("Scenarios count:", mergedData.scenarios.length);
console.log("Citations count:", mergedData.enhanced_citations.length);

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

    // Helper functions
    const $ = (sel, root=document) => root.querySelector(sel);
    function clear(el){ if(!el) return; while(el.firstChild) el.removeChild(el.firstChild); }
    function makeEl(tag, attrs={}, txt=null){ const el=document.createElement(tag); for(const[k,v] of Object.entries(attrs)) el.setAttribute(k,v); if(txt!=null) el.textContent=txt; return el; }

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

      // Top competitors with detailed metrics
      const tb = $('#sc-top-table tbody'); clear(tb);
      (Array.isArray(sc.top_competitors)?sc.top_competitors:[]).forEach((row,i)=>{
        const tr = document.createElement('tr');
        
        // Create detailed metrics display
        let metricsHtml = '—';
        if (row.detailed_metrics && typeof row.detailed_metrics === 'object' && Object.keys(row.detailed_metrics).length > 0) {
          const metricsArray = Object.entries(row.detailed_metrics).map(([key, value]) => {
            const formattedKey = key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, str => str.toUpperCase());
            return '<span class="metric-item"><strong>' + formattedKey + ':</strong> ' + value + '</span>';
          });
          metricsHtml = '<div class="metrics-grid">' + metricsArray.join('') + '</div>';
        }
        
        tr.innerHTML =
          '<td class="rank">#'+(i+1)+'</td>'+
          '<td>'+(row.company||'—')+'</td>'+
          '<td>'+(row.score!=null?row.score:'—')+'</td>'+
          '<td class="metrics-cell">'+metricsHtml+'</td>'+
          '<td>'+(row.rationale||'—')+'</td>';
        tb.appendChild(tr);
      });

      // Key Findings
      const kf = $('#sc-keyfindings'); clear(kf);
      (Array.isArray(sc.key_findings)?sc.key_findings:[]).forEach(k=>{
        kf.appendChild(makeEl('li', {}, k));
      });

      // Scenario Sources (enhanced to show more source types)
      const srcUl = $('#sc-sources'); clear(srcUl);
      const sources = Array.isArray(sc.sources) ? sc.sources : [];
      
      // If no direct sources, try to extract from citations related to this scenario
      if (sources.length === 0 && REPORT.enhanced_citations) {
        const scenarioKeywords = (sc.title || '').toLowerCase().split(' ').slice(0, 3);
        const relatedCitations = REPORT.enhanced_citations.filter(citation => {
          const claimText = (citation.claim_text || '').toLowerCase();
          return scenarioKeywords.some(keyword => keyword.length > 3 && claimText.includes(keyword));
        }).slice(0, 5); // Limit to 5 most relevant
        
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
          
          // Add source metadata
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
        // Use direct sources
        sources.forEach(s => {
          const li = document.createElement('li');
          if (typeof s === 'string') {
            // Check if it's a URL
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
      
      // If still no sources, show a helpful message
      if (srcUl.children.length === 0) {
        const li = makeEl('li', {}, 'No specific sources available for this scenario');
        li.style.fontStyle = 'italic';
        li.style.color = '#6b7280';
        srcUl.appendChild(li);
      }
    }

    function renderConsolidatedSources(){
      const body = $('#consolidated-sources tbody'); clear(body);
      const sources = REPORT.enhanced_citations || REPORT.data_sources_table || [];
      sources.forEach((s,i)=>{
        const tr = document.createElement('tr');
        
        const title = s.claim_text || s.title || s.name || 'Source';
        const url = s.source_url || s.url || '';
        const publisher = s.source_domain || s.publisher || '';
        const published = s.publication_date || s.published || '';
        const authority = s.authority_score || s.authority || '';
        const status = s.verification_status || '';
        
        tr.innerHTML =
          '<td>'+(i+1)+'</td>'+
          '<td>'+(url ? '<a href="'+url+'" target="_blank" rel="noopener">'+title+'</a>' : title)+'</td>'+
          '<td>'+publisher+'</td>'+
          '<td>'+published+'</td>'+
          '<td>'+(authority ? '<span class="badge high-authority">'+authority+'/10</span>' : '—')+'</td>'+
          '<td>'+(status ? '<span class="badge '+(status==='verified'?'verified':'unverified')+'">'+status+'</span>' : '—')+'</td>'+
          '<td>'+(url ? '<a href="'+url+'" target="_blank" rel="noopener">Open ↗</a>' : '—')+'</td>';
        body.appendChild(tr);
      });
    }

    // Initialize
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
