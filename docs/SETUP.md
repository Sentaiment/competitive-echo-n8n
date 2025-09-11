# Setup Guide

## Initial Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/jfrites/competitive-echo-n8n.git
   cd competitive-echo-n8n
   ```

2. **Set up N8N** (if running locally)

   ```bash
   npm install -g n8n
   n8n start
   ```

3. **Import workflows**
   - Open N8N interface (usually http://localhost:5678)
   - Go to Workflows → Import from File
   - Select workflow files from the `workflows/` directory

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# N8N Configuration
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=your_username
N8N_BASIC_AUTH_PASSWORD=your_password

# API Keys (add as needed)
OPENAI_API_KEY=your_openai_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
```

## Workflow Management

- **Export workflows**: Use N8N's export feature to save workflows to the `workflows/` directory
- **Version control**: Always commit workflow changes with descriptive commit messages
- **Testing**: Test workflows in a development environment before deploying to production

## Team Collaboration

- Use feature branches for new workflows
- Document any new workflows in the `docs/` directory
- Update this README when adding new setup requirements
