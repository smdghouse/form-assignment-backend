const {Queue} = require("bullmq");
const connection = require("../config/redis");
const questionPaperQueue = new Queue("questionPaperQueue", {connection});

module.exports = questionPaperQueue;
