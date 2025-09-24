#!/usr/bin/env node

/**
 * n8n Execution Cleanup Script - Aggressive Version
 *
 * This script deletes old n8n executions more aggressively while preserving:
 * - The most recent execution for each workflow
 * - Any currently running executions
 * - Failed executions from the last 2 hours (for debugging)
 *
 * Usage: node cleanup_old_executions_aggressive.js [--dry-run] [--keep-hours=24]
 */

const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

// Configuration
const N8N_DATA_DIR = path.join(process.env.HOME, ".n8n");
const DATABASE_PATH = path.join(N8N_DATA_DIR, "database.sqlite");
const DRY_RUN = process.argv.includes("--dry-run");
const KEEP_HOURS =
  parseInt(
    process.argv.find((arg) => arg.startsWith("--keep-hours="))?.split("=")[1]
  ) || 24;

console.log("🧹 n8n Execution Cleanup Script (Aggressive)");
console.log("===========================================");
console.log(`📁 Database: ${DATABASE_PATH}`);
console.log(
  `🔍 Mode: ${
    DRY_RUN
      ? "DRY RUN (no changes will be made)"
      : "LIVE (executions will be deleted)"
  }`
);
console.log(`📅 Keep executions newer than: ${KEEP_HOURS} hours`);
console.log("");

// Check if database exists
if (!fs.existsSync(DATABASE_PATH)) {
  console.error("❌ Error: n8n database not found at:", DATABASE_PATH);
  console.error(
    "   Make sure n8n is installed and has been run at least once."
  );
  process.exit(1);
}

// Connect to database
const db = new sqlite3.Database(DATABASE_PATH, (err) => {
  if (err) {
    console.error("❌ Error opening database:", err.message);
    process.exit(1);
  }
  console.log("✅ Connected to n8n database");
});

// Function to execute SQL queries safely
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Function to execute SQL commands (INSERT, UPDATE, DELETE)
function runCommand(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ changes: this.changes, lastID: this.lastID });
      }
    });
  });
}

async function cleanupExecutions() {
  try {
    console.log("🔍 Analyzing current executions...\n");

    // Get all executions with their details
    const executions = await runQuery(`
            SELECT 
                e.id,
                e.workflowId,
                e.finished,
                e.stoppedAt,
                e.startedAt,
                e.mode,
                e.status,
                w.name as workflow_name
            FROM execution_entity e
            LEFT JOIN workflow_entity w ON e.workflowId = w.id
            ORDER BY e.startedAt DESC
        `);

    console.log(`📊 Found ${executions.length} total executions`);

    // Group executions by workflow
    const executionsByWorkflow = {};
    executions.forEach((exec) => {
      if (!executionsByWorkflow[exec.workflowId]) {
        executionsByWorkflow[exec.workflowId] = [];
      }
      executionsByWorkflow[exec.workflowId].push(exec);
    });

    console.log(
      `📋 Found ${Object.keys(executionsByWorkflow).length} unique workflows\n`
    );

    // Calculate cutoff time
    const cutoffTime = Date.now() - KEEP_HOURS * 60 * 60 * 1000;

    let totalToDelete = 0;
    let totalToKeep = 0;

    // Process each workflow
    for (const [workflowId, workflowExecutions] of Object.entries(
      executionsByWorkflow
    )) {
      const workflowName = workflowExecutions[0]?.workflow_name || "Unknown";
      console.log(
        `🔄 Processing workflow: ${workflowName} (${workflowExecutions.length} executions)`
      );

      // Sort by start time (newest first)
      workflowExecutions.sort(
        (a, b) => new Date(b.startedAt) - new Date(a.startedAt)
      );

      // Always keep the most recent execution
      const mostRecent = workflowExecutions[0];
      console.log(
        `   ✅ Keeping most recent: ${mostRecent.id} (${mostRecent.status})`
      );

      // Keep currently running executions
      const runningExecutions = workflowExecutions.filter(
        (exec) => exec.status === "running" || exec.status === "new"
      );

      if (runningExecutions.length > 0) {
        console.log(
          `   ✅ Keeping ${runningExecutions.length} running executions`
        );
      }

      // Keep recent failed executions (last 2 hours) for debugging
      const recentFailed = workflowExecutions.filter(
        (exec) =>
          exec.status === "error" &&
          new Date(exec.startedAt).getTime() > Date.now() - 2 * 60 * 60 * 1000
      );

      if (recentFailed.length > 0) {
        console.log(
          `   ✅ Keeping ${recentFailed.length} recent failed executions (for debugging)`
        );
      }

      // Determine which executions to delete
      const executionsToDelete = workflowExecutions.filter((exec) => {
        // Don't delete the most recent
        if (exec.id === mostRecent.id) return false;

        // Don't delete running executions
        if (exec.status === "running" || exec.status === "new") return false;

        // Don't delete recent failed executions (last 2 hours)
        if (
          exec.status === "error" &&
          new Date(exec.startedAt).getTime() > Date.now() - 2 * 60 * 60 * 1000
        ) {
          return false;
        }

        // Don't delete executions newer than cutoff time
        if (new Date(exec.startedAt).getTime() > cutoffTime) return false;

        return true;
      });

      console.log(
        `   🗑️  Marked ${executionsToDelete.length} executions for deletion`
      );
      totalToDelete += executionsToDelete.length;
      totalToKeep += workflowExecutions.length - executionsToDelete.length;

      // Show details of what will be deleted
      if (executionsToDelete.length > 0) {
        console.log(`   📋 Executions to delete:`);
        executionsToDelete.slice(0, 10).forEach((exec) => {
          // Show first 10
          const age = Math.floor(
            (Date.now() - new Date(exec.startedAt).getTime()) / (1000 * 60 * 60)
          );
          console.log(`      - ${exec.id} (${exec.status}, ${age} hours old)`);
        });
        if (executionsToDelete.length > 10) {
          console.log(`      ... and ${executionsToDelete.length - 10} more`);
        }
      }
      console.log("");
    }

    console.log("📊 Summary:");
    console.log(`   ✅ Will keep: ${totalToKeep} executions`);
    console.log(`   🗑️  Will delete: ${totalToDelete} executions`);
    console.log("");

    if (totalToDelete === 0) {
      console.log("🎉 No executions need to be deleted!");
      return;
    }

    if (DRY_RUN) {
      console.log("🔍 DRY RUN: No changes were made");
      console.log("   Run without --dry-run to actually delete executions");
      return;
    }

    // Confirm deletion
    console.log("⚠️  WARNING: This will permanently delete old executions!");
    console.log("   This action cannot be undone.");
    console.log("");

    console.log("🗑️  Deleting old executions...");

    // Delete executions in batches to avoid overwhelming the database
    const batchSize = 100;
    let deletedCount = 0;

    for (const [workflowId, workflowExecutions] of Object.entries(
      executionsByWorkflow
    )) {
      const executionsToDelete = workflowExecutions.filter((exec) => {
        if (exec.id === workflowExecutions[0].id) return false; // Keep most recent
        if (exec.status === "running" || exec.status === "new") return false; // Keep running
        if (
          exec.status === "error" &&
          new Date(exec.startedAt).getTime() > Date.now() - 2 * 60 * 60 * 1000
        )
          return false; // Keep recent failed
        if (new Date(exec.startedAt).getTime() > cutoffTime) return false; // Keep recent
        return true;
      });

      // Delete in batches
      for (let i = 0; i < executionsToDelete.length; i += batchSize) {
        const batch = executionsToDelete.slice(i, i + batchSize);
        const ids = batch.map((exec) => exec.id);

        const result = await runCommand(
          `DELETE FROM execution_entity WHERE id IN (${ids
            .map(() => "?")
            .join(",")})`,
          ids
        );

        deletedCount += result.changes;
        console.log(`   ✅ Deleted batch: ${result.changes} executions`);
      }
    }

    console.log("");
    console.log(`🎉 Cleanup completed!`);
    console.log(`   ✅ Kept: ${totalToKeep} executions`);
    console.log(`   🗑️  Deleted: ${deletedCount} executions`);
    console.log(`   💾 Database size reduced`);
  } catch (error) {
    console.error("❌ Error during cleanup:", error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run the cleanup
cleanupExecutions().catch(console.error);
