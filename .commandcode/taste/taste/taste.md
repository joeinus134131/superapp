# Taste
- Writes in Indonesian and expects replies in Indonesian. Confidence: 0.85
- Gives terse, high-level instructions (e.g. "continue the previous implementation") and expects the agent to infer scope and proceed. Confidence: 0.5
- Works in a plan-driven way: expects implementation to follow and stay aligned with existing plan documents ("sesuaikan dengan plan yg ada nya"). Confidence: 0.6
- Expects long tasks to be resumable across interruptions (e.g. hitting model/context limits) by continuing previously started work. Confidence: 0.5
- Asks for deep, comprehensive project audits/evaluations from multiple perspectives (security, architecture, data, quality, CI) — explicitly wants "review secara penuh" (full reviews) of sub-projects; thorough depth, not surface-level summaries. Confidence: 0.8
- Expects analysis/evaluation deliverables to be saved as durable reference documents in the project's `docs/` folder, organized into per-sub-project folders (e.g. `docs/mobile/` for the mobile app) and written in markdown, so they can guide later improvement work. Confidence: 0.85
