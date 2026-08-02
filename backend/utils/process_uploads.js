const ZipUploaded = require("../models/ZipUploaded");
const delay = require("./delay");
const { extractZip } = require("./extractZip");
const { exec } = require("child_process");
const fs = require("fs-extra");
const mongoose = require("mongoose");
const path = require("path");
const socket = require("socket.io-client")("http://localhost:5000/");
const util = require("util");

const execPromise = util.promisify(exec);

const progressSaver = async (latestUpload, message) => {
  console.log("Progress Saver: ", message);
  latestUpload.logs.push(message);
  await latestUpload.save();
  socket.emit("upload_update", {
    data: latestUpload,
    message: message,
  });
};
const process_uploads = async () => {
  const latestUpload = await ZipUploaded.findOne({
    status: "processing",
  }).sort("-createdAt");

  if (!latestUpload) {
    console.log("No uploads found to process.");
    return false;
  }
  console.log("Latest upload found:", latestUpload);
  try {
    // Emit the latest upload to the server
    const { fileUrl } = latestUpload;

    // console.log("Upload Process Starts...");
    // latestUpload.logs.push("Upload Process Starts...");
    // await latestUpload.save();
    // socket.emit("upload_update", {
    //   data: latestUpload,
    //   message: "Upload Process Starts...",
    // });
    await progressSaver(latestUpload, "Upload Process Starts...");
    // extract the zip file
    await delay(1000);

    // console.log("Zip Extraction Starts...");
    // latestUpload.logs.push("Zip Extraction Starts...");
    // await latestUpload.save();
    // socket.emit("upload_update", {
    //   data: latestUpload,
    //   message: "Zip Extraction Starts...",
    // });
    await progressSaver(latestUpload, "Zip Extraction Starts...");
    await delay(1000);

    let user_id_part = fileUrl.split("/")[2];
    let file_name_part = fileUrl.split("/")[3];

    fs.ensureDirSync(path.join(__dirname, "..", "destinations", user_id_part));
    const result = await extractZip(
      path.join(__dirname, "..", "zips", user_id_part, file_name_part),
      path.join(__dirname, "..", "destinations", user_id_part),
    );
    //

    console.log("Zip Extraction Done...");

    console.log(`Extracted ${result.fileCount} files`);
    console.log(`Total size: ${result.totalSize} bytes`);
    console.log(`Duration: ${result.duration}ms`);

    await progressSaver(
      latestUpload,
      `Zip Extraction Done... Extracted ${result.fileCount} files. Total size: ${result.totalSize} bytes. Duration: ${result.duration}ms`,
    );

    await delay(1000);

    await progressSaver(latestUpload, `Uploading to Server...`);
    // make a new folder called deploy inside of spacehq

    const deployDir = path.join(
      __dirname,
      "..",
      "destinations",
      user_id_part,
      "spacehq",
      "deploy",
    );
    fs.ensureDirSync(deployDir);
    const deployScriptPath = path.join(
      __dirname,
      "..",
      "destinations",
      user_id_part,
      "spacehq",
      "deploy",
      "deployreal.sh",
    );
    fs.writeFileSync(
      deployScriptPath,
      fs.readFileSync(path.join(__dirname, "deploy.txt"), "utf-8"),
    );

    try {
      fs.chmodSync(deployScriptPath, "755");
    } catch (error) {
      console.log(
        "Note: Could not set permissions, might need to run manually",
      );
      //   return false;
      throw "Error: Could not set permissions for deploy script. Please check the file path and permissions.";
    }

    console.log("🚀 Starting deployment...");
    console.log(`📁 Script: ${deployScriptPath}`);
    console.log("📂 Working directory:", path.join(__dirname, ".."));

    // Run the deploy script
    const { stdout, stderr } = await execPromise(`bash ${deployScriptPath}`, {
      cwd: path.join(__dirname, ".."),
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    if (stdout) {
      console.log(stdout);
      await progressSaver(latestUpload, stdout);
    }

    if (stderr) {
      console.error(stderr);
      throw `Deployment script error: ${stderr}`;
    }

    console.log("✅ Deployment completed successfully!");

    // await progressSaver(latestUpload, "Deployment completed successfully!");

    console.log("Updating previous deployments to not be the latest...");
    await ZipUploaded.updateMany(
      { user: new mongoose.Types.ObjectId(user_id_part) },
      { isLatestDeployment: false },
    );
    console.log("Marking the latest deployment as the latest...");
    let finalUpdate = await ZipUploaded.findByIdAndUpdate(
      latestUpload._id,
      {
        status: "completed",
        isLatestDeployment: true,
      },
      { new: true },
    );

    await progressSaver(finalUpdate, "Deployment completed successfully!");

    return { success: true, stdout, stderr };
    // const deployScriptPath = path.join(__dirname, '..', 'deploy', 'deployreal.sh');
  } catch (error) {
    console.log(error);
    await progressSaver(latestUpload, error);
    // await delay(1000);
    return false;
  }
};

module.exports = process_uploads;
