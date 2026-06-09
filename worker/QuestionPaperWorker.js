const { Worker } = require("bullmq");
const assignment = require("../model/assignment");
const axios = require("axios");
const connectDB = require("../config/db")
const pdfParse = require("pdf-parse");
const connection = require("../config/redis");
require("dotenv").config();
const url = process.env.BACKEND_URL
const OpenAI = require("openai");

const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
}); 
(async () => {
    await connectDB();

    console.log("Mongo connected in worker");
})();
const worker = new Worker("questionPaperQueue", async job => {
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
        console.log("PDF fetched from Cloudinary")
        const pdfBuffer = Buffer.from(response.data);
        console.log("size of the PDF buffer:", pdfBuffer.length);
        console.log(pdfParse);
        const parsedata = await pdfParse(pdfBuffer)
        console.log("PDF text content:", parsedata.text.slice(0, 500));
        console.log("hello guruji")
        const prompt = ` You are an experienced school examination paper setter.

Generate a complete professional question paper using ONLY the provided study material.


STUDY MATERIAL:
${parsedata.text.slice(0, 30000)}

ADDITIONAL INSTRUCTIONS:
${additionalInfo}

QUESTION DISTRIBUTION:
${JSON.stringify(questionTypes, null, 2)}

DUE DATE:
${dueDate}

==================================================

INSTRUCTIONS

1. Generate questions ONLY from the provided study material.

2. Follow the QUESTION DISTRIBUTION exactly.

3. For each question type:

   * Generate exactly the specified number of questions.
   * Assign exactly the specified marks.
   * Use the specified question type.

4. Maintain a balanced distribution of:

   * Easy
   * Moderate
   * Challenging

5. Question numbering must be continuous throughout the paper.

Example:

Q1
Q2
Q3
Q4
Q5

Do NOT restart numbering in new sections.

6. Generate a complete answer key.

7. Answer key numbering must match question numbering.

==================================================

QUESTION PAPER FORMAT

QUESTION PAPER

Subject: <Subject Name>

Class: <Class Name>

Time Allowed: <Time Allowed>

Maximum Marks: <Total Marks>

All questions are compulsory unless stated otherwise.

Name: _______________________

Roll Number: _________________

Class/Section: _______________

SECTION A

Instructions:
Answer all questions.

Q1. Question text here

Difficulty: Easy

Marks: 2

Q2. Question text here

Difficulty: Easy

Marks: 2

SECTION B

Instructions:
Answer all questions.

Q3. Question text here

Difficulty: Moderate

Marks: 3

Q4. Question text here

Difficulty: Moderate

Marks: 3

SECTION C

Instructions:
Answer all questions.

Q5. Question text here

Difficulty: Challenging

Marks: 5

Q6. Question text here

Difficulty: Challenging

Marks: 5

END OF QUESTION PAPER

ANSWER KEY

Q1.
Answer here

Q2.
Answer here

Q3.
Answer here

Q4.
Answer here

Q5.
Answer here

Q6.
Answer here

==================================================

STRICT FORMATTING RULES

1. Return ONLY plain text.

2. DO NOT use:

   * **
   * ###

   ---

   * Markdown
   * Bullet points
   * Tables
   * Code blocks

3. Every question MUST begin on a new line.

4. Leave one blank line between questions.

5. Leave two blank lines between sections.

6. Preserve all line breaks.

7. Do not compress the output into paragraphs.

8. Output must resemble a real printable school examination paper.

9. Generate the exact number of questions requested in QUESTION DISTRIBUTION.

10. Return ONLY the final question paper and answer key.

        `
        console.log("Prompt for question paper generator:", prompt);
        // now send this prompt to the question paper LLM api and get the generated question paper
        console.log("-----------------------Generating question paper--------------------------------");
       let generatedQuestionPaper;

for (let attempt = 1; attempt <= 3; attempt++) {
    try {
        const completion = await client.chat.completions.create({
            model: "openai/gpt-oss-120b:free",
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
        });

        generatedQuestionPaper =
            completion.choices[0].message.content;

        break; // success
    } catch (err) {
        if (err.status === 429 && attempt < 3) {
            console.log(
                `Rate limited. Waiting 30 seconds. Attempt ${attempt}`
            );

            await new Promise(resolve =>
                setTimeout(resolve, 30000)
            );

            continue;
        }

        throw err;
    }
}

if (!generatedQuestionPaper) {
    throw new Error("Failed to generate question paper");
}
        console.log("----------------------question paper --------------------------------");
        console.log("Generated question paper:", generatedQuestionPaper);
        // now we have the generated question paper in genaiResponse.text, we can save it to the database and update the status of the assignment to completed
        console.log("tyring to update database with question paper")
        const updatedAssignment = await assignment.findOneAndUpdate(
            { _id: job.data.assignmentId },
            {
                questionPaper: generatedQuestionPaper,
                status: "completed"
            },
            {
                new: true
            }
        )
        console.log("finally updated the question paper now trying hit backend")
        const notificationResponse = await axios.post(`${url}/api/assignment/notify`, {
            assignmentId: job.data.assignmentId,
            message: "Your question paper has been generated successfully"
        })
        console.log("Notification response:", notificationResponse.data);
    }
    catch (err) {
        console.error("Error processing job", err);
        throw err;
    }

}, { connection }
)
worker.on("completed", job => {
    console.log(`Job ${job.id} completed successfully`);

})
worker.on("failed", (job, err) => {
    console.error(`Job ${job.id} failed with error:`, err);
})