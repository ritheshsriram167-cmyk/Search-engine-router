# Relay — Key Routing Search Engine Rotor

A high-performance, multi-layer API key rotation search routing engine designed for zero-cost deployment on **Render**, permanent storage on **Supabase**, and real-time **Server-Sent Events (SSE)** streaming.

---

## Architecture Overview

1. **Client Access Layer**: Permanent client API keys (`rk_live_...`) and permanent endpoint URL (`/api/v1/search`). Once generated, the key and URL stay constant forever and never expire.
2. **Brain Classification Layer (Layer 1)**: Rotates across a pool of Google Gemini API keys. Utilizes ultra-low token generation (max 4 tokens, temperature 0) to rapidly classify search queries into appropriate provider categories in <50ms with near-zero quota usage. Automatically rotates and applies cooldowns on HTTP 429 rate limits.
3. **Provider Execution Layer (Layer 2)**: Categorized provider pools (News, Search, Data, Database, etc.) with unlimited rotating API keys per provider. Rotates keys automatically if any key encounters rate limits.
4. **Zero-Cost Streaming**: Delivers streaming search results chunk-by-chunk using native HTTP Server-Sent Events (SSE) directly from Express on Render, incurring $0 in external broker costs.

---

## Quick Setup Guide

### 1. Set Up Permanent Database on Supabase (Free Tier)
1. Go to [Supabase](https://supabase.com) and create a free project.
2. In your project dashboard, navigate to **SQL Editor** $\rightarrow$ **New Query**.
3. Copy and paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
4. Navigate to **Project Settings** $\rightarrow$ **API** and copy:
   - **Project URL** (`SUPABASE_URL`)
   - **service_role** or **anon** key (`SUPABASE_KEY`)

---

### 2. Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
# Copy .env.example to .env and fill in your Supabase credentials:
cp .env.example .env

# 3. Build the frontend dashboard
npm run build

# 4. Start the server
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the Relay Dashboard.

---

### 3. Push to GitHub

The repository is pre-configured with `.gitignore` to keep it clean and prevent leaking credentials.

```bash
git init
git add .
git commit -m "Initial commit: Relay search engine rotor"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

---

### 4. Deploy to Render (Zero Cost)

1. Log into [Render](https://render.com) and click **New** $\rightarrow$ **Web Service**.
2. Connect your GitHub repository.
3. Configure the service settings:
   - **Name**: `relay-search-rotor` (or your chosen name)
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
4. Under **Environment Variables**, add:
   - `SUPABASE_URL`: Your Supabase Project URL (`https://xyz.supabase.co`)
   - `SUPABASE_KEY`: Your Supabase API Key
5. Click **Create Web Service**.

Render will automatically install dependencies, build the React dashboard, and launch the server.

---

## Permanent Client Integration ("APK" / API Key Endpoint)

Once you generate your client key in the dashboard, the URL and key stay constant permanently.

### Endpoint
- **URL**: `https://<your-render-app>.onrender.com/api/v1/search`
- **Method**: `POST` (or `GET` for browser EventSource)
- **Headers**:
  - `Authorization: Bearer <YOUR_PERMANENT_CLIENT_KEY>`
  - `Content-Type: application/json`
  - `Accept: text/event-stream`

### Example: cURL
```bash
curl -N -X POST "https://your-service.onrender.com/api/v1/search" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "quantum computing breakthroughs"}'
```

### Example: JavaScript / Web / React
```javascript
const response = await fetch('https://your-service.onrender.com/api/v1/search', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: 'latest tech news' })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value);
  console.log('Stream chunk:', chunk);
}
```

### Example: Python
```python
import requests

url = "https://your-service.onrender.com/api/v1/search"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}
payload = {"query": "deep learning architectures"}

with requests.post(url, json=payload, headers=headers, stream=True) as r:
    for line in r.iter_lines():
        if line:
            print(line.decode('utf-8'))
```
