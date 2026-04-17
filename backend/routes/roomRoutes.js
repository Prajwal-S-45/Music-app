const express = require('express');
const roomController = require('../controllers/roomController');

const router = express.Router();

router.post('/create', roomController.createRoom);
router.post('/join', roomController.joinRoom);
router.get('/:roomId', roomController.getRoomState);
router.put('/:roomId/state', roomController.updateRoomState);

module.exports = router;
