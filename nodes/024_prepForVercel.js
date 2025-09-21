const html = $json.html_content ?? $json.html ?? $json.content;
if (!html) throw new Error("No HTML content found");

const rawFilename =
  ($json.filename && String($json.filename).trim()) || "index.html";

// CHOOSE ONE. A = root (/), B = subfolder
const filePath = "index.html";
// const filePath = `reports/competitive-intelligence/${rawFilename}`;

return [
  {
    json: {
      content: html,
      filePath,
      // if project already exists use its name; if not, this will create it
      projectName: "sentaiment-reports",
    },
  },
];
