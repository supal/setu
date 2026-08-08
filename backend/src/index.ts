import cron from "node-cron";
import { createApp } from "./app";
import { env } from "./config/env";
import { cleanupOrphanFiles } from "./jobs/cleanupOrphanFiles";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`SiteTracker API listening on port ${env.PORT} (${env.NODE_ENV})`);
});

// Daily at 03:00 Asia/Dhaka — low-traffic hour, pinned explicitly so it doesn't silently
// shift if Render's default timezone (UTC) ever changes. Only meaningful while this process
// is running; on Render's free plan the service sleeping through 03:00 just means that day's
// sweep is skipped, which is fine since it's a low-stakes cleanup that catches up next run.
cron.schedule("0 3 * * *", cleanupOrphanFiles, { timezone: "Asia/Dhaka" });
