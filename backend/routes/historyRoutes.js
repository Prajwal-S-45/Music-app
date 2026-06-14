const express = require('express');
const historyController = require('../controllers/historyController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, historyController.getHistory);
router.post('/', authMiddleware, historyController.createHistoryItem);
router.delete('/', authMiddleware, historyController.clearHistory);
router.delete('/:id', authMiddleware, historyController.deleteHistoryItem);

module.exports = router;
