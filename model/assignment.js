const e = require("express");
const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema({
    dueDate:{
        type: String,
        required: true
    },
   additionalInfo: {
        type: String,
    },
     questionTypes: [
      {
        type: {
          type: String
        },

        questions: Number,

        marks: Number
      }
    ],
    pdfUrl: {
        type: String,
        required: true
    },
    questionPaper :{
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ["pending", "completed"], 
        default: "pending"
    }
    
},{
        timestamps: true
    }
)
module.exports = mongoose.model("Assignment", assignmentSchema)