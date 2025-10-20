const cloudinary = require('cloudinary').v2;
const fs = require('fs');

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

async function uploadFile(filePath, folder = 'trochung') {
  try {
    // Default to letting Cloudinary auto-detect resource type if caller doesn't pass explicit option
    const result = await cloudinary.uploader.upload(filePath, { folder, resource_type: 'auto' });
    // remove local file if exists
    try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
    return result;
  } catch (err) {
    throw err;
  }
}

// Upload from memory buffer (for multer.memoryStorage)
function uploadBuffer(buffer, folder = 'trochung', resource_type = 'auto') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, resource_type }, (error, result) => {
      if (error) return reject(error);
      return resolve(result);
    });
    // write buffer to stream
    stream.end(buffer);
  });
}
module.exports = { uploadFile };
