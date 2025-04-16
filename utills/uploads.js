const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the 'uploads' directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
console.log('Uploads directory path:', uploadsDir); // Debug log
if (!fs.existsSync(uploadsDir)) {
  console.error('Uploads directory does not exist. Creating it now.'); // Debug log
  fs.mkdirSync(uploadsDir, { recursive: true });
} else {
  console.log('Uploads directory already exists.'); // Debug log
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir); // Save files in the 'uploads' directory
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

exports.upload = multer({ storage: storage });

