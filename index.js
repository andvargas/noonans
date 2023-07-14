const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const resizedPath = "./images/resized/"; // specify the output folder
const maxSizeInMb = 0.9; // Specify file size in Mb

// Helper function to convert bytes to megabytes
const convertToMb = (bytes) => bytes / (1024 * 1024);

// If folder doesn't exist, create it.
if (!fs.existsSync(resizedPath)) {
  fs.mkdirSync(resizedPath);
}

// Check if image size is greater than the specified limit
function isSizeGreaterThanLimit(imagePath, limitInMb) {
  const stats = fs.statSync(imagePath);
  const sizeInMb = convertToMb(stats.size);
  return sizeInMb > limitInMb;
}

// Swap the original file extension with jpeg
const generateFileName = (fileName, sequence) => {
  const newName = fileName.split(".")[0] + "-" + sequence + ".jpeg";
  return newName;
};

// Resize image and save - checks if the newly created file is still over the limit, and recursively modifies it, making smaller and smaller
async function resizeImage(imagePath, fileName, size, sequence = 1) {
  const metadata = await sharp(imagePath).metadata();
  const longEdge = metadata.width > metadata.height ? "width" : "height";
  const outputPath = path.resolve(resizedPath, generateFileName(fileName, sequence));

  try {
    await sharp(imagePath)
      .resize({
        [longEdge]: size,
      })
      .toFormat("jpeg")
      .jpeg({ quality: 90, force: true })
      .toFile(outputPath);

    console.log("Image resized, original: ", fileName);
    // re-check if new size is over the limit
    const isLarge = isSizeGreaterThanLimit(outputPath, maxSizeInMb);
    if (isLarge) {
      sequence += 1;
      size -= 500;
      await resizeImage(outputPath, fileName, size, sequence);
      const prevFile = outputPath.split("."[0] + "-" + sequence - 1 + ".jpeg")[0];
      console.log("delete old file", prevFile);
      await fs.unlink(prevFile, (error) => {
        if (error) {
          console.log(`Failed to delete the original file: ${error}`);
        }
      });
    }
  } catch (error) {
    console.log(error);
  }
}

// Process image
async function processImage(imagePath, fileName) {
  try {
    await resizeImage(imagePath, fileName, 2500);
  } catch (error) {
    console.log(`An error occurred during processing: ${error}`);
  }
}

async function iteration(folderPath) {
  const filesToProcess = fs.readdirSync(folderPath).filter((file) => !file.startsWith("."));
  console.log(filesToProcess);

  for (const file of filesToProcess) {
    const imagePath = path.resolve(folderPath, file);
    const isLarge = isSizeGreaterThanLimit(imagePath, maxSizeInMb);

    if (isLarge) {
      const resizedImageFileName = generateFileName(file, 1);
      const resizedImagePath = path.resolve(resizedPath, resizedImageFileName);
      if (!fs.existsSync(resizedImagePath)) {
        await processImage(imagePath, file);
      }
    }
  }
}

iteration("images").catch((error) => {
  console.log(`An error occurred: ${error}`);
});
