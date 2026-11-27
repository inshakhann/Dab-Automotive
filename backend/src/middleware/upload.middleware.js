// FILE: src/middleware/upload.middleware.js
const multer = require('multer');
const path = require('path');

// Storage configuration (Kahan save karna hai)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // 'uploads' folder mein save karein. Ensure karein ke yeh folder backend root mein bana ho.
        cb(null, 'uploads/'); 
    },
    filename: (req, file, cb) => {
        // File ka unique naam banayein
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter (Sirf images allow karein)
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Sirf image files allowed hain!'), false);
    }
};

// Multer instance with 5MB limit
const upload = multer({ 
    storage: storage, 
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: fileFilter
});

module.exports = upload;