const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const http = require('http');
const {WebSocketServer} = require('ws');
const app = express()
require('dotenv').config()
const cloudinary = require('./config/cloudinary')
const generateRoutes = require("./routes/generate.routes")
const {setWSS} = require("./websockets/socket")
const {sendNotification} = require("./controllers/notify");
const assignment = require('./model/assignment');
const {que_paper_cache} = require("./cache")
require("./worker/QuestionPaperWorker");
const get_all_papers = async ()=>{
   let papers =  await assignment.find(
    {
      status: "completed",
      questionPaper: { $ne: "" }
    },
    {
      _id: 1,
      title: 1,
      questionPaper: 1
    }
  );
  console.log(que_paper_cache.length,"this is the lenght of the initial array")
  que_paper_cache.push(...papers)
}

// middlewares 

app.use(cors())
app.use(express.json())
app.use('/api/assignment',generateRoutes)
app.use("/api/assignment",sendNotification)

app.get('/',(req,res)=>{
    res.send("hello world")
})

const server = http.createServer(app)
const wss = new WebSocketServer({server})
setWSS(wss)

wss.on("connection",(ws)=>{
    console.log("a new client connected")

    // hey we are sending the data here 
    ws.send( JSON.stringify({
    type: "INITIAL_DATA",
    data: que_paper_cache
  }))

    ws.on("message",(msg)=>{
        try{

            const data = JSON.parse(msg.toString())
             if(data.type === "generate")
        {
            console.log("generating data for client")
        }
        }
        catch(err){
            console.error("error parsing json",err)
        }

       
    })

})
const startServer = async () => {
    try {
        await connectDB();
        await get_all_papers();

        server.listen(process.env.PORT, () => {
            console.log(
                `server is running on port ${process.env.PORT}`
            );
            console.log(`cloudinary config: ${cloudinary.config().cloud_name}`)
        });
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

startServer();