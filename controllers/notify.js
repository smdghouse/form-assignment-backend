const { getWSS } = require("../websockets/socket")
const {que_paper_cache }= require("../cache")
const Assignment = require("../model/assignment");
const sendNotification = async (req, res) => {
    try {
        const wss = getWSS();
        const { assignmentId, message } = req.body;
        console.log("Received notification request for assignmentId:", assignmentId);
        console.log("Message:", message);
        // Here you can implement the logic to send the notification to the user
        // For example, you can use a service like Firebase Cloud Messaging (FCM) or OneSignal to send push notifications
        // Or you can simply log the message to the console for now
        console.log(`Notification for assignment ${assignmentId}: ${message}`);
        const asg = await Assignment.findById(assignmentId);
        if (!asg) {
            return res.status(404).json({
                error: "Assignment not found"
            });
        }
        else {
            console.log("this is what iam going to save",{ _id: asg._id,
                title: asg.title,
                questionPaper: asg.questionPaper},que_paper_cache.length)
            que_paper_cache.push({
                _id: asg._id,
                title: asg.title,
                questionPaper: asg.questionPaper
            });
            wss.clients.forEach(client => {
                if (client.readyState === 1) {
                    client.send(JSON.stringify({
                        type: "generated",
                        title:asg.title,
                        assignmentId,
                        questionPaper: asg.questionPaper,
                    }))
                }
            });
        }
        res.status(200).json({ message: "Notification sent successfully" });
    } catch (err) {
        console.error("Error sending notification", err);
        res.status(500).json({ error: "Failed to send notification" });
    }
}
module.exports = {
    sendNotification
}   