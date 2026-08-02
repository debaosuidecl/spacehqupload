const delay = require("../utils/delay");
const connectDB = require("../config/db");
const dotenv = require("dotenv");
dotenv.config();

// const redis = require("redis");
const process_uploads = require("../utils/process_uploads");
// const port = 6379;

(async () => {
  await connectDB();
  await delay(1000);
  await process_uploads();
  // await cidattach(client);
  // await cidattachipquality(client);
  // await downloadcustom(client);
  await delay(3000);
  process.exit(1);
})();
