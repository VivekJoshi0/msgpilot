const express = require('express');
const router = express.Router();
const { sendMessage, getMessageLogBatches, downloadBatchLogs } = require('../controllers/messageController');
const auth = require('../middlewares/auth');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/send', auth, upload.single('file'), sendMessage);
router.get('/logs', auth, getMessageLogBatches);
router.get('/logs/batch/:batchId/download', auth, downloadBatchLogs);


module.exports = router;
