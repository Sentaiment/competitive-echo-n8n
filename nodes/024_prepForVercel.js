const html = $json.html_content ?? $json.html ?? $json.content;
if (!html) throw new Error("No HTML content found");

const rawFilename =
  ($json.filename && String($json.filename).trim()) || "index.html";

// CHOOSE ONE. A = root (/), B = subfolder
const filePath = "index.html";
// const filePath = `reports/competitive-intelligence/${rawFilename}`;

// Get company name from form input or existing data
const companyName = $json["Company Name (Optional)"] || $json.company;

return [
  {
    json: {
      content: html,
      filePath,
      // Use fixed project name for consistent URL
      projectName: "competitive-echo-report",
    },
  },
];
