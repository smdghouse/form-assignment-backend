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

// middlewares 

app.use(cors())
app.use(express.json())
app.use('/api/assignment',generateRoutes)

app.get('/',(req,res)=>{
    res.send("hello world")
})

const server = http.createServer(app)
const wss = new WebSocketServer({server})
setWSS(wss)

wss.on("connection",(ws)=>{
    console.log("a new client connected")
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
server.listen(process.env.PORT,()=>{
    connectDB()
    console.log(`server is running on port http://localhost:${process.env.PORT}`)
    console.log(`cloudinary config: ${cloudinary.config().cloud_name}`)
})