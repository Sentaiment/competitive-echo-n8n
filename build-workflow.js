#!/usr/bin/env node

/**
 * Workflow Builder - Builds n8n workflow from individual node files
 *
 * This script:
 * 1. Reads individual node files from workflow-nodes/
 * 2. Builds a complete n8n workflow JSON
 * 3. Outputs to workflows/ directory
 * 4. Handles file watching for live updates
 */

const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");

// Configuration
const CONFIG = {
  nodesDir: "./workflow-nodes",
  workflowsDir: "./workflows",
  outputFile: "Competitive Echo.json",
  watchMode: process.argv.includes("--watch"),
};

// Ensure directories exist
function ensureDirectories() {
  [CONFIG.nodesDir, CONFIG.workflowsDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Read and parse a node file
function readNodeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const nodeData = JSON.parse(content);
    return nodeData;
  } catch (error) {
    console.error(`Error reading node file ${filePath}:`, error.message);
    return null;
  }
}

// Get all node files from the nodes directory
function getAllNodeFiles() {
  if (!fs.existsSync(CONFIG.nodesDir)) {
    return [];
  }

  return fs
    .readdirSync(CONFIG.nodesDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => path.join(CONFIG.nodesDir, file));
}

// Build the complete workflow
function buildWorkflow() {
  console.log("🔨 Building workflow...");

  const nodeFiles = getAllNodeFiles();

  if (nodeFiles.length === 0) {
    console.log("⚠️  No node files found in", CONFIG.nodesDir);
    return;
  }

  console.log(`📁 Found ${nodeFiles.length} node files`);

  // Read all nodes
  const nodes = [];
  const connections = [];

  nodeFiles.forEach((filePath) => {
    const nodeData = readNodeFile(filePath);
    if (nodeData) {
      if (nodeData.node) {
        nodes.push(nodeData.node);
      }
      if (nodeData.connections) {
        connections.push(...nodeData.connections);
      }
    }
  });

  // Build workflow structure
  const workflow = {
    name: "Competitive Echo",
    nodes: nodes,
    connections: buildConnections(connections),
    active: false,
    settings: {
      executionOrder: "v1",
    },
    versionId: generateVersionId(),
    meta: {
      templateCredsSetupCompleted: true,
      instanceId: generateInstanceId(),
    },
    id: generateWorkflowId(),
    tags: [],
  };

  // Write workflow file
  const outputPath = path.join(CONFIG.workflowsDir, CONFIG.outputFile);
  fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2));

  console.log(`✅ Workflow built successfully: ${outputPath}`);
  console.log(`📊 ${nodes.length} nodes, ${connections.length} connections`);
}

// Build connections object from array
function buildConnections(connectionArray) {
  const connections = {};

  connectionArray.forEach((conn) => {
    if (!connections[conn.source]) {
      connections[conn.source] = { main: [] };
    }

    connections[conn.source].main.push([
      {
        node: conn.target,
        type: "main",
        index: 0,
      },
    ]);
  });

  return connections;
}

// Generate unique IDs
function generateVersionId() {
  return Math.random().toString(36).substr(2, 9);
}

function generateInstanceId() {
  return Math.random().toString(36).substr(2, 64);
}

function generateWorkflowId() {
  return Math.random().toString(36).substr(2, 9);
}

// Watch for file changes
function startWatching() {
  console.log("👀 Watching for changes...");

  const watcher = chokidar.watch(CONFIG.nodesDir, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
  });

  watcher.on("change", (filePath) => {
    console.log(`📝 File changed: ${filePath}`);
    buildWorkflow();
  });

  watcher.on("add", (filePath) => {
    console.log(`➕ File added: ${filePath}`);
    buildWorkflow();
  });

  watcher.on("unlink", (filePath) => {
    console.log(`🗑️  File removed: ${filePath}`);
    buildWorkflow();
  });

  console.log("✨ Ready! Edit node files in", CONFIG.nodesDir);
}

// Main execution
function main() {
  ensureDirectories();
  buildWorkflow();

  if (CONFIG.watchMode) {
    startWatching();
  } else {
    console.log("💡 Use --watch flag to enable live updates");
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { buildWorkflow, CONFIG };
