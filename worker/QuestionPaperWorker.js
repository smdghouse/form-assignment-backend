const {Worker}  = require("bullmq");
const assignment = require("../models/Assignment");
const axios = require("axios");
const axios   = require("axios");
const pdfParse = require("pdf-parse");
const connection = require("../config/redis");
const { GoogleGenAI } = require("@google/genai");
require("dotenv").config(); 
const geminiApiKey = process.env.GEMINI_API_KEY;   
const worker= new Worker("questionPaperQueue", async job => {
    console.log("Processing job:", job.id);
    const {
        pdfUrl,
        dueDate,
        additionalInfo,
        questionTypes

    } = job.data;
    try {
        // getting the pdf from cloudinary and then sending it to the question paper generator api
        const response = await axios.get(
            pdfUrl
            , {
                responseType: "arraybuffer"
            }
        )
        console.log ("PDF fetched from Cloudinary")
        const pdfBuffer = Buffer.from(response.data);
        console.log("size of the PDF buffer:", pdfBuffer.length);
        console.log(pdfParse);
        const parsedata = await pdfParse(pdfBuffer)
        console.log("PDF text content:",parsedata.text.slice(0, 500));
        console.log("hello guruji")
        const prompt = `your are a epxert teacher ,generate a question paper with the following details:
        format : You are an experienced school examination paper setter.

Your task is to generate a professional question paper from the provided study material.

STUDY MATERIAL:
{{PDF_TEXT}}

ADDITIONAL INSTRUCTIONS:
{{ADDITIONAL_INFO}}

QUESTION DISTRIBUTION:
{{QUESTION_TYPES}}

Requirements:

1. Generate a complete question paper in a professional school examination format.

2. Include the following header:

   * Subject Name
   * Class
   * Time Allowed
   * Maximum Marks
   * Instruction: "All questions are compulsory unless stated otherwise."

3. Include student details section:

   * Name: ____________
   * Roll Number: ____________
   * Class/Section: ____________

4. Organize the paper into sections:

   * Section A
   * Section B
   * Section C
   * Additional sections if required

5. For every section:

   * Display section title
   * Display section instructions
   * Mention marks per question

6. For every question include:

   * Question number
   * Difficulty level:
     [Easy]
     [Moderate]
     [Challenging]
   * Marks allocation
   * Clear and grammatically correct wording

7. Questions must be generated only from the supplied study material.

8. Maintain a balanced distribution of:

   * Easy questions
   * Moderate questions
   * Challenging questions

9. Generate a complete answer key after the question paper.

10. Answer key must:

    * Follow the same numbering as the questions
    * Provide accurate answers
    * Include explanations where necessary

11. Output Format:

Question Paper

Subject: <subject>

Time Allowed: <time>
Maximum Marks: <marks>

All questions are compulsory unless stated otherwise.

Name: ___________________

Roll Number: _____________

Class/Section: ____________

SECTION A

<Section Instructions>

1. [Easy] Question text here [2 Marks]

2. [Moderate] Question text here [2 Marks]

...

SECTION B

...

END OF QUESTION PAPER

ANSWER KEY

1. Answer

2. Answer

3. Answer

...

Important:

* Return only the final formatted question paper and answer key.
* Do not include explanations about how the paper was generated.
* Ensure the formatting resembles a real school examination paper.

        additional info: ${additionalInfo}      
        question types: ${questionTypes}
        due date: ${dueDate}
        the content of the pdf is : ${parsedata.text}
        `
        console.log("Prompt for question paper generator:", prompt);
        // now send this prompt to the question paper LLM api and get the generated question paper
        const genai = new GoogleGenAI({apiKey: geminiApiKey});
        console.log("-----------------------Generating question paper--------------------------------");
        const genaiResponse = await genai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        })
        console.log("----------------------question paper --------------------------------");
        console.log("Generated question paper:", genaiResponse.text);
        // now we have the generated question paper in genaiResponse.text, we can save it to the database and update the status of the assignment to completed
        const updatedAssignment = await assignment.findOneAndUpdate(
            { _id: job.data.assignmentId },
            {
                questionPaper: genaiResponse.text,
                status: "completed"
            },
            {
                new: true
            }
        )
        const notificationResponse = await axios.post("http://localhost:3000/api/assignment/notify", {
            assignmentId: job.data.assignmentId,
            message: "Your question paper has been generated successfully"
        })
        console.log("Notification response:", notificationResponse.data);
    }
    catch(err)
    {
        console.error("Error processing job", err);
    }
   
},{connection}
)
worker.on("completed", job => {
    console.log(`Job ${job.id} completed successfully`);

})
worker.on("failed", (job, err) => {
    console.error(`Job ${job.id} failed with error:`, err);
})  