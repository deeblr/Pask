const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const User    = require('../models/User');
const auth    = require('../middleware/auth');

const router = express.Router();

/* ── storage ───────────────────────────────────────────── */
const mkStorage = (subdir) => multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, `../uploads/${subdir}`);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = (['.jpg','.jpeg','.png','.webp','.gif'].includes(
      path.extname(file.originalname).toLowerCase()
    ) ? path.extname(file.originalname).toLowerCase() : '.jpg');
    cb(null, `${subdir.replace('/','-')}_${req.user._id}_${Date.now()}${ext}`);
  },
});

const imageFilter = (req, file, cb) => {
  const allowed = ['image/jpeg','image/png','image/webp','image/gif'];
  if (!allowed.includes(file.mimetype)) {
    return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only JPEG/PNG/WebP/GIF allowed'));
  }
  cb(null, true);
};

const avatarUpload = multer({
  storage: mkStorage('avatars'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: imageFilter,
});

const deleteFile = (filePath) => {
  if (filePath && filePath.startsWith('/uploads/')) {
    fs.unlink(path.join(__dirname, '..', filePath), () => {});
  }
};

/* ── POST /api/upload/avatar ───────────────────────────── */
router.post('/avatar', auth, (req, res, next) => {
  avatarUpload.single('avatar')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE')
        return res.status(400).json({ message: 'File too large (max 5 MB)' });
      return res.status(400).json({ message: err.message });
    }
    if (err) return res.status(400).json({ message: err.message });
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const oldUser   = await User.findById(req.user._id);

    // Delete old avatar
    deleteFile(oldUser.avatar);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: avatarUrl },
      { new: true }
    ).select('-password');

    res.json({ avatarUrl, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── DELETE /api/upload/avatar ─────────────────────────── */
router.delete('/avatar', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    deleteFile(user.avatar);
    const updated = await User.findByIdAndUpdate(
      req.user._id, { avatar: null }, { new: true }
    ).select('-password');
    res.json({ user: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
