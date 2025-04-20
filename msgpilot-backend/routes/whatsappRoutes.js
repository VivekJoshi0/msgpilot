const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const auth = require('../middlewares/auth');

router.post('/init',auth, whatsappController.initClient);
router.get('/status',auth, whatsappController.getClientSessionStatus);
router.post('/logout', auth, whatsappController.logoutClient);
router.post('/cancel-init', auth, whatsappController.cancelClientInit);

module.exports = router;