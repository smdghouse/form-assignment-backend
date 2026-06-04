const cloudinary = require("../config/cloudinary");
const questionPaperQueue = require("../queue/questionpaper");
const Assignment = require("../models/Assignment");
const generateAssignment = async (req, res) => {
    try {
        const {
            dueDate,
            additionalInfo,
        } = req.body;
        const questionTypes = JSON.parse(req.body.questionTypes);
        console.log("Received request to generate assignment with data:", {
            dueDate,
            additionalInfo,
            questionTypes
        });
        const pdf = req.file;
        const result = await cloudinary.uploader.upload(
            pdf.path,
            {
                resource_type: "raw",
                folder: "assignments"
            }
        )
        const pdfUrl = result.secure_url;
        console.log("PDF uploaded to Cloudinary:", pdfUrl);
        const assignment = await Assignment.create({
            pdfUrl,
            dueDate,
            additionalInfo,
            questionTypes,
            status: "pending",
        });
        const job = await questionPaperQueue.add("generateAssignment", {
            pdfUrl,
            dueDate,
            additionalInfo,
            questionTypes,
            assignmentId: assignment._id
            
        })
        
        console.log("Job added to queue:", job.id);
        res.status(200).json({ message: "Assignment generation started", pdfUrl , assignmentId: assignment._id})
        // for now i am just sending the pdf to the queue and then processing it in the worker
    } catch (err) {
        console.error("Error generating assignment", err);
        res.status(500).json({ error: "Failed to generate assignment" })
    }
}
module.exports = {
    generateAssignment
}