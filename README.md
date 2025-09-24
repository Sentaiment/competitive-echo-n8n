# Competitive Echo n8n Workflow

A comprehensive competitive analysis workflow built with n8n that generates detailed HTML reports with smart company grouping and target highlighting.

## 🚀 Features

- **Smart Company Grouping**: Automatically groups similar company names (e.g., "Paris Las Vegas" and "Paris Hotel & Casino")
- **Target Company Highlighting**: Highlights the main company in both Head-to-Head and Scenario tables with blue styling and "TARGET" badges
- **Comprehensive Analysis**: Covers 12+ competitive scenarios including luxury hospitality, technology, sustainability, and more
- **Rich Data Sources**: Integrates with 100+ high-authority sources including Forbes, J.D. Power, and industry reports
- **Dynamic HTML Reports**: Generates beautiful, interactive HTML reports with detailed metrics and citations

## 📋 Prerequisites

- n8n installed locally or cloud access
- Slack workspace (for notifications)
- API keys for data sources (if needed)

## 🔧 Setup

### 1. Environment Variables

Copy the example environment file and update with your actual values:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```bash
# Slack Configuration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR_ACTUAL_WEBHOOK_URL

# Optional n8n Configuration
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your_secure_password

# Database Configuration (optional)
DB_SQLITE_POOL_SIZE=5
N8N_RUNNERS_ENABLED=true
N8N_BLOCK_ENV_ACCESS_IN_NODE=false
```

### 2. Slack Webhook Setup

1. Go to your Slack workspace
2. Create a new app or use an existing one
3. Enable "Incoming Webhooks"
4. Create a webhook for your desired channel
5. Copy the webhook URL to your `.env` file

### 3. Import Workflow

1. Start n8n: `n8n start`
2. Open n8n at `http://localhost:5678`
3. Import the workflow from the repository
4. Update any hardcoded values with environment variables

## 🏗️ Workflow Structure

The workflow consists of several key nodes:

- **Data Collection**: Gathers competitive intelligence from multiple sources
- **Company Analysis**: Processes and normalizes company data
- **Smart Grouping**: Groups similar companies using dynamic algorithms
- **Report Generation**: Creates comprehensive HTML reports
- **Slack Notification**: Sends completion notifications

## 📊 Report Features

- **Head-to-Head Analysis**: Aggregated rankings across all scenarios
- **Scenario Details**: Individual scenario breakdowns with detailed metrics
- **Evidence & Citations**: Consolidated sources with authority scores
- **Target Highlighting**: Visual emphasis on the main company being analyzed

## 🔒 Security

- Environment variables are used for all sensitive data
- `.env` file is gitignored to prevent accidental commits
- Slack webhooks and API keys are stored securely

## 🚀 Deployment

### Local Development

```bash
n8n start
```

### Cloud Deployment

- Export workflow from local n8n
- Import to n8n Cloud or your preferred platform
- Update environment variables in cloud environment
- Test and activate workflow

## 📝 Usage

1. Configure your target company in the workflow
2. Run the workflow
3. Monitor progress through Slack notifications
4. Access the generated HTML report via the provided URL

## 🛠️ Troubleshooting

### Common Issues

**GitHub Push Protection Error**: If you get a "Push cannot contain secrets" error:

- Ensure `.env` is in your `.gitignore`
- Check that no hardcoded URLs are in your code
- Use environment variables for all sensitive data

**Slack Notifications Not Working**:

- Verify your webhook URL in `.env`
- Check that the Slack app has proper permissions
- Test the webhook URL manually

**Empty Reports**:

- Check that input data is properly formatted
- Verify company name extraction logic
- Review console logs for errors

## 📄 License

This project is for internal use. Please ensure compliance with data source terms of service.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Note**: Always use environment variables for sensitive data and never commit secrets to version control.
