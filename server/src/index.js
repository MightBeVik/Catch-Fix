import dotenv from "dotenv";

import { createApp } from "./app.js";
import { startEvaluationJob } from "./jobs/evaluationJob.js";

dotenv.config();

// Auto-triggering reload after releasing ghost port 3001
const port = Number(process.env.PORT || 3001);
const app = createApp();

app.listen(port, "127.0.0.1", () => {
  startEvaluationJob();
  console.log(`Catch-Fix server listening on http://127.0.0.1:${port}`);
});