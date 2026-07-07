# GrowEasy CSV Importer

AI-powered CSV importer that intelligently extracts CRM lead information from **any** CSV format and maps it to GrowEasy CRM schema.

**Position applied for:** Full-Time

![Tech Stack](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![Express](https://img.shields.io/badge/Express-4-green?style=flat-square&logo=express)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?style=flat-square&logo=openai)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript)

## Demo

- **Live App:** _Deploy to Vercel + Railway and add URL here_
- **Repository:** _Add your GitHub URL here_

## Features

### Core Requirements
- Drag & drop + file picker CSV upload
- Client-side CSV preview (no AI until confirmed)
- Virtualized responsive table with sticky headers
- AI-powered field mapping to GrowEasy CRM format
- Batch processing with retry mechanism
- Real-time progress via Server-Sent Events
- Imported + skipped records with summary stats

### Bonus Features
- Dark mode toggle
- Progress indicators during AI processing
- Virtualized tables for large CSVs
- Retry mechanism for failed AI batches (exponential backoff)
- Unit tests (Vitest)
- Docker + docker-compose setup
- Sample CSV files for testing
- Export results as CSV

## Architecture

```
┌─────────────────┐     POST /api/import?async=true     ┌──────────────────┐
│   Next.js UI    │ ─────────────────────────────────►│  Express API     │
│                 │◄──── SSE /jobs/:id/stream ──────────│                  │
│  1. Upload CSV  │                                     │  1. Parse CSV    │
│  2. Preview     │                                     │  2. Batch rows   │
│  3. Confirm     │                                     │  3. AI extract   │
│  4. Results     │                                     │  4. Return JSON  │
└─────────────────┘                                     └──────────────────┘
                                                               │
                                                               ▼
                                                        ┌──────────────────┐
                                                        │  OpenAI GPT-4o   │
                                                        │  (JSON mode)     │
                                                        └──────────────────┘
```

## Quick Start

### Prerequisites
- Node.js 18+
- OpenAI API key

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd groweasy-csv-importer
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
npm install
```

### 2. Run Development

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000

### 3. Test with Sample CSVs

Sample files are in `/samples`:
- `facebook-leads.csv` — Facebook Lead Ads format
- `google-ads-export.csv` — Google Ads export format
- `real-estate-crm.csv` — Real estate CRM format

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key (required) | — |
| `OPENAI_BASE_URL` | Optional alternate OpenAI-compatible API base URL | `https://api.openai.com/v1` |
| `OPENAI_SECONDARY_API_KEY` | Optional fallback API key for another provider | — |
| `OPENAI_SECONDARY_BASE_URL` | Optional secondary API base URL | `https://api.openai.com/v1` |
| `OPENAI_FALLBACK_MODE` | Use the free heuristic fallback when AI calls fail | `false` |
| `DATABASE_PATH` | Optional SQLite database file path | `./database.db` |
| `OPENAI_MODEL` | Model for extraction | `gpt-4o-mini` |
| `BATCH_SIZE` | Rows per AI batch | `15` |
| `MAX_RETRIES` | Retry attempts per batch | `3` |
| `PORT` | Backend port | `4000` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | Backend URL for frontend | `http://localhost:4000` |

## API Reference

### `POST /api/import`
Upload CSV and process synchronously.

```bash
curl -X POST http://localhost:4000/api/import \
  -F "file=@samples/facebook-leads.csv"
```

### `POST /api/import?async=true`
Start async import job. Returns `jobId`.

### `GET /api/import/jobs/:jobId`
Poll job status and result.

### `GET /api/import/jobs/:jobId/stream`
SSE stream for real-time progress.

### `GET /api/health`
Health check endpoint.

## AI Prompt Engineering

The extraction prompt is designed for maximum accuracy across messy real-world CSVs:

1. **Intelligent column mapping** — Infers fields from headers AND cell values
2. **Synonym handling** — Maps "Hot Lead" → `GOOD_LEAD_FOLLOW_UP`, "Closed Won" → `SALE_DONE`
3. **Phone splitting** — Separates country code from mobile number
4. **Multi-contact handling** — First email/phone used; extras appended to `crm_note`
5. **Validation** — Skips records missing both email and mobile
6. **Fallback extraction** — Regex-based fallback if AI fails or API key missing
7. **Post-processing** — Sanitizes status/source enums, validates dates

See `backend/src/prompts/extractionPrompt.ts` for the full prompt.

## CRM Output Fields

| Field | Description |
|-------|-------------|
| `created_at` | Lead creation date |
| `name` | Lead name |
| `email` | Primary email |
| `country_code` | Phone country code (+91) |
| `mobile_without_country_code` | Mobile number |
| `company` | Company name |
| `city`, `state`, `country` | Location |
| `lead_owner` | Assigned rep |
| `crm_status` | GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE |
| `crm_note` | Notes, extra contacts |
| `data_source` | leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots |
| `possession_time` | Property possession timeline |
| `description` | Additional context |

## Testing

```bash
npm run test
```

## Docker

```bash
cp .env.example .env
# Add OPENAI_API_KEY to .env
docker compose up --build
```

## Deployment

### Frontend (Vercel)
1. Import repo, set root to `frontend`
2. Set `NEXT_PUBLIC_API_URL` to your backend URL

### Backend (Railway / Render)
1. Deploy `backend` directory
2. Set environment variables from `.env.example`
3. Update `CORS_ORIGIN` to your Vercel URL

## Project Structure

```
groweasy-csv-importer/
├── frontend/                 # Next.js 15 app
│   └── src/
│       ├── app/              # Pages & layout
│       ├── components/       # UI components
│       ├── lib/              # API client, CSV parser
│       └── types/            # Shared types
├── backend/                  # Express API
│   └── src/
│       ├── routes/           # API routes
│       ├── services/         # CSV parser, AI extractor, batch processor
│       ├── prompts/          # AI system prompt
│       ├── middleware/       # Error handling
│       └── types/            # CRM types
├── samples/                  # Test CSV files
├── docker-compose.yml
└── Dockerfile
```

## License

MIT
