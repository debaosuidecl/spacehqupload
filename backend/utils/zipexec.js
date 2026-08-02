const { extractZip } = require("./extractZip");
const path = require("path");
const fs = require("fs");
const connectDB = require("../config/db");
const ZipUploaded = require("../models/ZipUploaded");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
dotenv.config();
(async () => {
  await connectDB();
  // const zipUploaded = await ZipUploaded.find({
  //   status: { $ne: "deleted" },
  // });

  // console.log({ zipUploaded });

  const agg = await ZipUploaded.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId("6a4fd85c47825302086381e5"),
        status: { $ne: "deleted" },
      },
    },
    {
      $group: {
        _id: null,
        totalUploads: { $sum: 1 },
        totalSize: { $sum: "$fileSize" },
        avgSize: { $avg: "$fileSize" },
        downloadCount: { $sum: "$downloadCount" },
      },
    },
  ]);

  console.log({ agg });
})();
// (async () => {
//   // Extract ZIP to destination
//   const result = await extractZip(
//     path.join(
//       __dirname,
//       "..",
//       "zips",
//       "6a4fd85c47825302086381e5",
//       "1783619752480-53c0053187e7bff2-kyle-marketing-platform-v55.zip",
//     ),
//     path.join(__dirname, "..", "destinations", "6a4fd85c47825302086381e5"),
//   );

//   console.log(`Extracted ${result.fileCount} files`);
//   console.log(`Total size: ${result.totalSize} bytes`);
//   console.log(`Duration: ${result.duration}ms`);

//   fs.writeFileSync(
//     path.join(
//       __dirname,
//       "..",
//       "destinations",
//       "6a4fd85c47825302086381e5",
//       "kyle-marketing-platform",
//       "deploy",
//       "deployreal.sh",
//     ),
//     fs.readFileSync(path.join(__dirname, "deploy.txt"), "utf-8"),
//   );
// })();
