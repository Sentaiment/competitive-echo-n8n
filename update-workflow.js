#!/usr/bin/env node

/**
 * Update Workflow Script - Updates the n8n workflow with fixed HTML generator code
 */

const fs = require('fs');
const path = require('path');

// Read the fixed HTML generator code
const htmlGeneratorPath = './nodes/enhanced_html_report_generator.js';
const workflowPath = './workflows/Competitive Echo 9-18.json';

console.log('🔧 Updating workflow with fixed HTML generator...');

try {
  // Read the fixed HTML generator code
  const htmlGeneratorCode = fs.readFileSync(htmlGeneratorPath, 'utf8');
  
  // Read the workflow JSON
  const workflowContent = fs.readFileSync(workflowPath, 'utf8');
  const workflow = JSON.parse(workflowContent);
  
  // Find the "Generate HTML Report" node
  const htmlReportNode = workflow.nodes.find(node => node.name === 'Generate HTML Report');
  
  if (htmlReportNode) {
    console.log('📝 Found "Generate HTML Report" node, updating code...');
    
    // Update the jsCode with our fixed version
    htmlReportNode.parameters.jsCode = htmlGeneratorCode;
    
    // Write back the updated workflow
    fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2));
    
    console.log('✅ Workflow updated successfully!');
    console.log('🚀 The "Generate HTML Report" node now uses the fixed code that extracts from analysis_details');
    
  } else {
    console.log('❌ Could not find "Generate HTML Report" node in workflow');
  }
  
} catch (error) {
  console.error('❌ Error updating workflow:', error.message);
}
