// require('dotenv').config({path: './env'}) --> we can use this one also but in our code we are using import instead of require()

import dotenv from 'dotenv';
import connectDB from "./db/db_connection.js";
import { app } from "./app.js";
dotenv.config({
    path: './env'
})


connectDB()
.then(() =>{
    app.listen(process.env.PORT || 8000 , () =>{
        console.log(`Server is listening at the port ${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log("MongoDb connection error..!!!" , err)
})


/*   Below is the another approch
import express from "express";

const app = express();

;( async () =>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)

        app.on("Error" , (error) => {
            console.log("App not able to connect to database")
            throw error
        })
        
        app.listen(process.env.PORT , () => {
            console.log(`App is listening on PORT: ${process.env.PORT}` )
        })
    } catch (error) {
        console.error("Error found",error);
        throw err
        
    }
   
})()

*/