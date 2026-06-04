const express = require('express')
const upload = require("../middleware/upload")
const {generateAssignment} = require("../controllers/generate")
const router = express.Router()

router.post("/generate",upload.single("pdf"),generateAssignment)

module.exports = router