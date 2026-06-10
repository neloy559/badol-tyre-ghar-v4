'use strict';

const express = require('express');
const multer = require('multer');
const mediaController = require('./media.controller');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.post('/upload', upload.single('file'), mediaController.uploadMedia);
router.get('/', mediaController.listMedia);
router.delete('/:id', mediaController.deleteMedia);

module.exports = router;
