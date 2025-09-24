// Slack Notification Node
// Posts workflow completion status and URL to a Slack channel

console.log("=== SLACK NOTIFICATION NODE ===");

const inputData = $input.all();

// Configuration - UPDATE THESE VALUES FOR YOUR SLACK SETUP
const SLACK_CONFIG = {
  webhookUrl: process.env.SLACK_WEBHOOK_URL || "https://hooks.slack.com/services/YOUR_WEBHOOK_URL_HERE",
  channel: "#competitive-analysis",
  username: "Competitive Echo Bot",
  iconEmoji: ":chart_with_upwards_trend:",
};

// Process the input data to extract relevant information
function extractWorkflowData(data) {
  const results = {
    totalScenarios: 0,
    successfulScenarios: 0,
    failedScenarios: 0,
    errors: [],
    completionTime: new Date().toISOString(),
    companyName: null,
    companyDomain: null,
    workflowUrl: "http://localhost:5678/workflow/123",
  };

  console.log("=== DEBUGGING INPUT DATA ===");
  console.log("Total input items:", data.length);

  // Try workflow context for target company first
  try {
    if (
      typeof $workflow !== "undefined" &&
      $workflow.context &&
      $workflow.context.target_company
    ) {
      const ctxCompany = String($workflow.context.target_company).trim();
      if (ctxCompany && ctxCompany !== "Unknown Company") {
        results.companyName = ctxCompany;
      }
    }
  } catch (e) {
    console.log("Workflow context not available:", e.message);
  }

  // Debug: Log first few items to understand structure
  data.slice(0, 3).forEach((item, index) => {
    console.log(`Item ${index}:`, JSON.stringify(item, null, 2));
  });

  // Extract company information from various possible sources
  // Priority order: report_metadata.company > company > other fields
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const itemData = item.json || {};

    // PRIMARY: Look for company name in report_metadata.company first (most reliable)
    if (
      !results.companyName &&
      itemData.report_metadata &&
      itemData.report_metadata.company
    ) {
      const companyName = itemData.report_metadata.company;
      if (
        companyName &&
        companyName !== "Unknown Company" &&
        companyName.trim() !== ""
      ) {
        results.companyName = companyName.trim();
        console.log(
          "✅ Found company name in report_metadata.company:",
          results.companyName
        );
      }
    }

    // SECONDARY: Look for company name in other common fields
    if (!results.companyName) {
      const possibleCompanyNames = [
        itemData.company,
        itemData.brand_name,
        itemData.name,
        itemData.entity_name,
        itemData.brand,
        itemData.target_company,
        itemData.company_name,
      ].filter(
        (name) => name && name !== "Unknown Company" && name.trim() !== ""
      );

      if (possibleCompanyNames.length > 0) {
        results.companyName = possibleCompanyNames[0].trim();
        console.log(
          "✅ Found company name in secondary fields:",
          results.companyName
        );
      }
    }

    // Look for domain in various fields
    if (!results.companyDomain) {
      results.companyDomain =
        itemData.domain ||
        itemData.brand_url ||
        itemData.url ||
        itemData.website ||
        null;
    }

    // If we found both, we can break early
    if (results.companyName && results.companyDomain) {
      break;
    }

    // Check nested merge shape: itemData.data is an array of payloads
    if (!results.companyName && Array.isArray(itemData.data)) {
      for (const entry of itemData.data) {
        // Check report_metadata.company first in nested data
        if (entry && entry.report_metadata && entry.report_metadata.company) {
          const companyName = entry.report_metadata.company;
          if (
            companyName &&
            companyName !== "Unknown Company" &&
            companyName.trim() !== ""
          ) {
            results.companyName = companyName.trim();
            console.log(
              "✅ Found company name in nested report_metadata.company:",
              results.companyName
            );
            break;
          }
        }
        // Fallback to other company fields in nested data
        if (!results.companyName) {
          const nestedCompany =
            entry.company ||
            entry.brand_name ||
            entry.name ||
            entry.entity_name;
          if (
            nestedCompany &&
            nestedCompany !== "Unknown Company" &&
            nestedCompany.trim() !== ""
          ) {
            results.companyName = nestedCompany.trim();
            console.log(
              "✅ Found company name in nested data:",
              results.companyName
            );
            break;
          }
        }
      }
    }

    // Check formatted report shape: scenarios/top_competitors (as a weak fallback)
    if (
      !results.companyName &&
      Array.isArray(itemData.scenarios) &&
      itemData.scenarios.length > 0
    ) {
      const firstScenario = itemData.scenarios[0];
      if (
        firstScenario &&
        Array.isArray(firstScenario.top_competitors) &&
        firstScenario.top_competitors.length > 0
      ) {
        const topCompany = firstScenario.top_competitors[0].company;
        if (
          topCompany &&
          topCompany !== "Unknown Company" &&
          topCompany.trim() !== ""
        ) {
          results.companyName = topCompany.trim();
          console.log(
            "✅ Found company name in scenarios:",
            results.companyName
          );
        }
      }
    }
  }

  // Final fallback: scan entire dataset for any company name if still missing
  if (!results.companyName) {
    console.log(
      "🔍 Final fallback: scanning entire dataset for company name..."
    );
    for (let i = 0; i < data.length; i++) {
      const itemData = data[i].json || {};

      // Try report_metadata.company first
      if (itemData.report_metadata && itemData.report_metadata.company) {
        const companyName = itemData.report_metadata.company;
        if (
          companyName &&
          companyName !== "Unknown Company" &&
          companyName.trim() !== ""
        ) {
          results.companyName = companyName.trim();
          console.log(
            "✅ Found company name in final fallback (report_metadata):",
            results.companyName
          );
          break;
        }
      }

      // Try other company fields
      const fallbackFields = [
        itemData.company,
        itemData.brand_name,
        itemData.name,
        itemData.entity_name,
        itemData.brand,
        itemData.target_company,
        itemData.company_name,
      ].filter(
        (name) => name && name !== "Unknown Company" && name.trim() !== ""
      );

      if (fallbackFields.length > 0) {
        results.companyName = fallbackFields[0].trim();
        console.log(
          "✅ Found company name in final fallback (other fields):",
          results.companyName
        );
        break;
      }
    }
  }

  // Clean up domain if it exists
  if (results.companyDomain) {
    results.companyDomain = results.companyDomain
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0];
  }

  // Count scenarios and errors - look for various patterns
  data.forEach((item, index) => {
    const itemData = item.json || {};

    // Count total scenarios - look for various scenario indicators
    if (
      itemData.scenario_title ||
      itemData.scenario_id ||
      itemData.scenario ||
      itemData.analysis_type ||
      itemData.table_name === "Executive Summary" ||
      itemData.table_name === "Entity Analysis" ||
      itemData.table_name === "Ai Insights" ||
      itemData.table_name === "Comprehensive Sentiment"
    ) {
      results.totalScenarios++;
    }

    // Check for errors
    if (itemData.error || itemData.errorMessage || itemData.error_message) {
      results.failedScenarios++;
      results.errors.push({
        item: index + 1,
        error:
          itemData.error?.errorMessage ||
          itemData.errorMessage ||
          itemData.error_message ||
          "Unknown error",
        httpCode: itemData.error?.httpCode || itemData.httpCode || "Unknown",
      });
    } else if (
      itemData.scenario_title ||
      itemData.scenario_id ||
      itemData.scenario ||
      itemData.analysis_type ||
      itemData.table_name === "Executive Summary" ||
      itemData.table_name === "Entity Analysis" ||
      itemData.table_name === "Ai Insights" ||
      itemData.table_name === "Comprehensive Sentiment"
    ) {
      results.successfulScenarios++;
    }
  });

  // If no scenarios found, count total items as a fallback
  if (results.totalScenarios === 0) {
    results.totalScenarios = data.length;
    results.successfulScenarios = data.length - results.failedScenarios;
  }

  console.log("=== EXTRACTION RESULTS ===");
  console.log("Company Name:", results.companyName);
  console.log("Company Domain:", results.companyDomain);
  console.log("Total Scenarios:", results.totalScenarios);
  console.log("Successful Scenarios:", results.successfulScenarios);
  console.log("Failed Scenarios:", results.failedScenarios);

  return results;
}

// Create Slack message
function createSlackMessage(workflowData) {
  // Get the Vercel URL from the workflow data
  let vercelUrl = "URL not available";

  // Look for deployment URL in the input data
  const inputData = $input.all();
  for (let i = 0; i < inputData.length; i++) {
    const item = inputData[i];
    const itemData = item.json || {};

    // Look for various URL fields that might contain the Vercel deployment URL
    if (
      itemData.deploymentUrl ||
      itemData.pageUrl ||
      itemData.url ||
      itemData.deployment_url
    ) {
      vercelUrl =
        itemData.deploymentUrl ||
        itemData.pageUrl ||
        itemData.url ||
        itemData.deployment_url;
      break;
    }
  }

  // Create simple message with just company and URL
  const companyName = workflowData.companyName
    ? String(workflowData.companyName).trim()
    : "Unknown Company";

  console.log("🏢 Final company name for Slack message:", companyName);

  const message = {
    channel: SLACK_CONFIG.channel,
    username: SLACK_CONFIG.username,
    icon_emoji: SLACK_CONFIG.iconEmoji,
    text: `📊 Competitive Analysis Report Ready — ${companyName}`,
    attachments: [
      {
        color: "good",
        fields: [
          {
            title: "Company",
            value: companyName,
            short: true,
          },
          {
            title: "Report URL",
            value: `<${vercelUrl}|View Report>`,
            short: true,
          },
        ],
      },
    ],
  };

  return message;
}

// Main processing
console.log(`Processing ${inputData.length} items for Slack notification`);

const workflowData = extractWorkflowData(inputData);
console.log("Workflow data extracted:", {
  companyName: workflowData.companyName,
  companyDomain: workflowData.companyDomain,
  totalScenarios: workflowData.totalScenarios,
  successfulScenarios: workflowData.successfulScenarios,
  failedScenarios: workflowData.failedScenarios,
  errorCount: workflowData.errors.length,
});

const slackMessage = createSlackMessage(workflowData);

// Create the output for the HTTP Request node
const slackPayload = {
  json: {
    // This will be used by the HTTP Request node to post to Slack
    slack_webhook_url: SLACK_CONFIG.webhookUrl,
    slack_payload: slackMessage,

    // Also include the original data for reference
    original_data: inputData,
    workflow_summary: workflowData,

    // Metadata
    notification_timestamp: new Date().toISOString(),
    notification_type: "workflow_completion",
  },
};

console.log("=== SLACK NOTIFICATION READY ===");
console.log(
  `Status: ${
    workflowData.failedScenarios === 0 ? "SUCCESS" : "COMPLETED WITH ERRORS"
  }`
);
console.log(`Company: ${workflowData.companyName || "Unknown"}`);
console.log(`Domain: ${workflowData.companyDomain || "N/A"}`);
console.log(
  `Items: ${workflowData.successfulScenarios}/${workflowData.totalScenarios} successful`
);
console.log(`Errors: ${workflowData.errors.length}`);

return [slackPayload];
