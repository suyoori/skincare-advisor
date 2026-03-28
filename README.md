# AI Skincare Advisor

> Busy women in their 40s complete a purchase with confidence in under 10 minutes w/o browsing required

## How to Run

1. Clone the project
2. .Create a .env file and add the following values:
```bash
OPENAI_API_KEY=Enter your issued API key
PORT=3000
```

3. Run the server
```bash
npm install
npm run dev
```

## Service Link

https://suyeol-ji-20260326.vercel.app

## Tech Stack

- Frontend: React (JavaScript)
- Backend: Node.js + Express
- AI: OpenAI
- Crawling: Olive Young reviews
- Hosting: Vercel (frontend) + Render (backend)

## Core Features

1. **AI Skin Condition Diagnosis** — Analyzes user input (age / skin type / recent changes / concerns) in the context of hormonal changes common in women in their 40s
2. **Same-Persona Review Filtering** — Extracts only reviews from similar age groups from crawled Olive Young data
3. **Single Recommendation** — Presents the single most suitable product with clear reasoning, rather than multiple options

## Design Intent

The core persona defined in this MVP is a woman in her mid-40s at the team lead or C-level, whose key pain point is:
"I need to decide quickly, but I can't commit without confidence."

To address this, the AI Agent handles all the browsing on behalf of the user, so the user only needs to confirm.

---

## Problem-Solving During Implementation

In the initial implementation, AI responses were passed directly to the user. This led to two issues:

- Response formats were inconsistent, making stable UI rendering difficult
- Longer explanations actually slowed down user decision-making

The following improvements were applied:

- Output format enforced as JSON at the prompt level
- Response structure constrained to "single product recommendation + 3 supporting reasons"
- Responses parsed and cleaned server-side before being sent to the frontend

This ensured consistency in AI output and UI stability, while enabling users to understand and decide quickly.

During crawling, data extraction became unstable due to site structure changes. A fallback data structure was designed alongside the main pipeline to prevent service interruptions.

During real-world testing, users encountered errors after long loading times when clicking "Start AI Analysis," caused by delays from external APIs and crawling. Request timeouts and a fallback response strategy were introduced to ensure users are redirected to the results screen quickly even in failure cases. This was a deliberate design choice: prioritizing an uninterrupted user experience over a perfect single response.

---

## AI Design Principles

In this service, AI is designed not merely to provide information, but to **assist users in making decisions**.

The following principles guided the design:

- **Role assignment**: Configured as an expert who understands skin concerns of women in their mid-to-late 30s and 40s
- **Minimizing choices**: Only a single product is recommended, never multiple options
- **Providing reasoning**: Recommendation rationale is clearly structured and presented
- **Context integration**: User input is combined with reviews from the same persona

The core belief driving this design is that **reducing choices actually improves the user experience** by cutting out browsing and focusing the UX around building confidence.

---

## System Architecture Intent

The service is structured with a clear separation between frontend, backend, and AI calls.

- **Frontend**: Handles user input and result display (UI/UX)
- **Backend**: Manages crawling, data processing, AI calls, and response refinement
- **AI**: Focused solely on generating recommendations

This structure provides:

- Security by managing API keys server-side
- Consistent output by controlling AI responses on the server
- Flexibility to swap models or extend features in the future

---

## Limitations & Improvement Directions

Given the focus on MVP delivery, the following limitations exist:

- Crawling-based data is vulnerable to site structure changes
- Product data is limited, resulting in lower recommendation variety
- No mechanism to improve recommendations based on user feedback

Planned improvements include:

- Building a batch pipeline for periodic review data collection
- Incorporating user feedback into the recommendation loop (effectiveness, satisfaction ratings)

This is currently an MVP, but it has been designed with a clear path toward scaling into a production service.
