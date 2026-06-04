const express = require("express");
const router = express.Router();
const {sendNotification} = require("../controllers/notify.js")
router.post("/notify", sendNotification)
module.exports = router;

