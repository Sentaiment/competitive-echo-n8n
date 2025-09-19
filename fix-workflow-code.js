#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Updating workflow with proper analysis_details extraction...');

try {
  // Read the workflow
  const workflowPath = './workflows/Competitive Echo 9-18.json';
  const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
  
  // Find and update the HTML Report Generator node
  const htmlNode = workflow.nodes.find(node => node.name === 'Generate HTML Report');
  if (htmlNode && htmlNode.parameters && htmlNode.parameters.jsCode) {
    console.log('📝 Found HTML Report Generator node, updating...');
    
    // Replace the problematic part with our fixed logic
    let jsCode = htmlNode.parameters.jsCode;
    
    // Replace the old scenario_rankings mapping with our fixed version
    const oldPattern = /top_competitors: ranking\.competitors_ranked \|\| \[\],/g;
    const newPattern = `top_competitors: (() => {
        if (ranking.competitors_ranked && ranking.competitors_ranked.length > 0) {
          return ranking.competitors_ranked.map((comp) => {
            const companyName = comp.company || comp.name || comp;
            let detailedMetrics = {};
            let enhancedRationale = comp.rationale || comp.reasoning || comp.explanation || comp.notes || "";
            if (ranking.analysis_details && ranking.analysis_details[companyName]) {
              const analysisDetail = ranking.analysis_details[companyName];
              if (analysisDetail.metrics && typeof analysisDetail.metrics === 'object') {
                detailedMetrics = { ...analysisDetail.metrics };
              }
              const summaryText = analysisDetail.summary || "";
              const highlightsText = (analysisDetail.highlights || []).join("; ");
              if (summaryText || highlightsText) {
                enhancedRationale = [summaryText, highlightsText, enhancedRationale].filter(text => text && text.length > 0).join(" | ");
              }
            }
            return { company: companyName, score: comp.score || comp.rating || comp.value || null, rationale: enhancedRationale, rank: comp.rank || comp.position || null, detailed_metrics: detailedMetrics, ...comp };
          });
        }
        if (ranking.analysis_details && typeof ranking.analysis_details === 'object') {
          const competitors = Object.entries(ranking.analysis_details).map(([companyName, analysisDetail], index) => {
            let overallScore = null; let detailedMetrics = {};
            if (analysisDetail.metrics && typeof analysisDetail.metrics === 'object') {
              detailedMetrics = { ...analysisDetail.metrics };
              const metricValues = Object.values(analysisDetail.metrics).filter(val => typeof val === 'number');
              if (metricValues.length > 0) { overallScore = (metricValues.reduce((sum, val) => sum + val, 0) / metricValues.length).toFixed(1); }
            }
            const summaryText = analysisDetail.summary || "";
            const highlightsText = (analysisDetail.highlights || []).join("; ");
            const rationale = [summaryText, highlightsText].filter(text => text && text.length > 0).join(" | ");
            return { company: companyName, score: overallScore, rationale: rationale, rank: index + 1, detailed_metrics: detailedMetrics };
          });
          competitors.sort((a, b) => { const scoreA = parseFloat(a.score) || 0; const scoreB = parseFloat(b.score) || 0; return scoreB - scoreA; });
          competitors.forEach((comp, index) => { comp.rank = index + 1; });
          return competitors;
        }
        return [];
      })(),`;
    
    if (jsCode.includes('top_competitors: ranking.competitors_ranked || [],')) {
      jsCode = jsCode.replace(oldPattern, newPattern);
      console.log('✅ Updated scenario_rankings processing');
    }
    
    // Also update the table header to include Detailed Metrics
    const oldTableHeader = '<tr><th>Rank</th><th>Company</th><th>Score</th><th>Reasoning</th></tr>';
    const newTableHeader = '<tr><th>Rank</th><th>Company</th><th>Score</th><th>Detailed Metrics</th><th>Reasoning</th></tr>';
    
    if (jsCode.includes(oldTableHeader)) {
      jsCode = jsCode.replace(oldTableHeader, newTableHeader);
      console.log('✅ Updated table header');
    }
    
    // Update the table rendering to include detailed metrics
    const oldTableRender = /tr\.innerHTML =\s*'<td class="rank">#'\+\(i\+1\)\+'<\/td>'\+\s*'<td>'\+\(row\.company\|\|'—'\)\+'<\/td>'\+\s*'<td>'\+\(row\.score!=null\?row\.score:'—'\)\+'<\/td>'\+\s*'<td>'\+\(row\.rationale\|\|'—'\)\+'<\/td>';/g;
    const newTableRender = `tr.innerHTML =
          '<td class="rank">#'+(i+1)+'</td>'+
          '<td>'+(row.company||'—')+'</td>'+
          '<td>'+(row.score!=null?row.score:'—')+'</td>'+
          '<td class="metrics-cell">'+(row.detailed_metrics && typeof row.detailed_metrics === 'object' && Object.keys(row.detailed_metrics).length > 0 ? '<div class="metrics-grid">' + Object.entries(row.detailed_metrics).map(([key, value]) => '<span class="metric-item"><strong>' + key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, str => str.toUpperCase()) + ':</strong> ' + value + '</span>').join('') + '</div>' : '—')+'</td>'+
          '<td>'+(row.rationale||'—')+'</td>';`;
    
    if (jsCode.match(oldTableRender)) {
      jsCode = jsCode.replace(oldTableRender, newTableRender);
      console.log('✅ Updated table rendering');
    }
    
    // Add CSS for metrics display
    const cssInsertPoint = '.authority-fill{height:100%;background:linear-gradient(90deg,#ef4444 0%,#f59e0b 50%,#10b981 100%);border-radius:2px}';
    const newCSS = cssInsertPoint + '\\n  .metrics-cell{max-width:250px}\\n  .metrics-grid{display:flex;flex-direction:column;gap:2px}\\n  .metric-item{font-size:11px;color:#374151;white-space:nowrap}';
    
    if (jsCode.includes(cssInsertPoint) && !jsCode.includes('.metrics-cell')) {
      jsCode = jsCode.replace(cssInsertPoint, newCSS);
      console.log('✅ Added metrics CSS');
    }
    
    // Update table min-width
    if (jsCode.includes('min-width:840px')) {
      jsCode = jsCode.replace('min-width:840px', 'min-width:1000px');
      console.log('✅ Updated table min-width');
    }
    
    // Update the node with fixed code
    htmlNode.parameters.jsCode = jsCode;
  }
  
  // Find and update the Data Formatter node  
  const dataNode = workflow.nodes.find(node => node.name === 'Data Format for HTML');
  if (dataNode && dataNode.parameters && dataNode.parameters.jsCode) {
    console.log('📝 Found Data Formatter node, updating...');
    
    let jsCode = dataNode.parameters.jsCode;
    
    // Replace the old scenario processing with our fixed version
    const oldScenarioPattern = /top_competitors: ranking\.competitors_ranked \|\| \[\],/g;
    const newScenarioPattern = `top_competitors: (() => {
        if (ranking.competitors_ranked && ranking.competitors_ranked.length > 0) {
          return ranking.competitors_ranked.map((comp) => {
            const companyName = comp.company || comp.name || comp;
            let detailedMetrics = {};
            let enhancedRationale = comp.rationale || comp.reasoning || comp.explanation || comp.notes || "";
            if (ranking.analysis_details && ranking.analysis_details[companyName]) {
              const analysisDetail = ranking.analysis_details[companyName];
              if (analysisDetail.metrics && typeof analysisDetail.metrics === 'object') {
                detailedMetrics = { ...analysisDetail.metrics };
              }
              const summaryText = analysisDetail.summary || "";
              const highlightsText = (analysisDetail.highlights || []).join("; ");
              if (summaryText || highlightsText) {
                enhancedRationale = [summaryText, highlightsText, enhancedRationale].filter(text => text && text.length > 0).join(" | ");
              }
            }
            return { company: companyName, score: comp.score || comp.rating || comp.value || null, rationale: enhancedRationale, rank: comp.rank || comp.position || null, detailed_metrics: detailedMetrics, ...comp };
          });
        }
        if (ranking.analysis_details && typeof ranking.analysis_details === 'object') {
          const competitors = Object.entries(ranking.analysis_details).map(([companyName, analysisDetail], index) => {
            let overallScore = null; let detailedMetrics = {};
            if (analysisDetail.metrics && typeof analysisDetail.metrics === 'object') {
              detailedMetrics = { ...analysisDetail.metrics };
              const metricValues = Object.values(analysisDetail.metrics).filter(val => typeof val === 'number');
              if (metricValues.length > 0) { overallScore = (metricValues.reduce((sum, val) => sum + val, 0) / metricValues.length).toFixed(1); }
            }
            const summaryText = analysisDetail.summary || "";
            const highlightsText = (analysisDetail.highlights || []).join("; ");
            const rationale = [summaryText, highlightsText].filter(text => text && text.length > 0).join(" | ");
            return { company: companyName, score: overallScore, rationale: rationale, rank: index + 1, detailed_metrics: detailedMetrics };
          });
          competitors.sort((a, b) => { const scoreA = parseFloat(a.score) || 0; const scoreB = parseFloat(b.score) || 0; return scoreB - scoreA; });
          competitors.forEach((comp, index) => { comp.rank = index + 1; });
          return competitors;
        }
        return [];
      })(),`;
    
    if (jsCode.includes('top_competitors: ranking.competitors_ranked || [],')) {
      jsCode = jsCode.replace(oldScenarioPattern, newScenarioPattern);
      console.log('✅ Updated Data Formatter scenario processing');
    }
    
    dataNode.parameters.jsCode = jsCode;
  }
  
  // Save the updated workflow
  fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2));
  console.log('✅ Workflow updated with analysis_details extraction logic!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
