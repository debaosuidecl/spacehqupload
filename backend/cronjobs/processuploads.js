const delay = require("../utils/delay");
const connectDB = require("../config/db");
const dotenv = require("dotenv");
dotenv.config();

// const redis = require("redis");
const process_uploads = require("../utils/process_uploads");
const POLL_INTERVAL_MS = Number(process.env.UPLOAD_PROCESS_INTERVAL_MS || 15000);

const run = async () => {
  await connectDB();

  while (true) {
    try {
      await delay(1000);
      await process_uploads();
    } catch (error) {
      console.error("Upload worker iteration failed:", error);
    }

    await delay(POLL_INTERVAL_MS);
  }
};

run().catch((error) => {
  console.error("Upload worker failed to start:", error);
  process.exit(1);
});
