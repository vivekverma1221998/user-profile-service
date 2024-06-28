import {v2 as cloudinary} from "cloudinary";
import fs from "fs";


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})


/*

below code is used to get the localfilepath and upload it to the cloudinary 

it will return the url of the uploaded file on cloudinary

if fail then it will unlink(delete) the localpath or file from the folder

*/
const uploadOnCloudinary = async (localFilePath) =>{
    try {
        if(!localFilePath) return null;

       const response = await cloudinary.uploader.upload(localFilePath , {
            resource_type: "auto"
        })

        console.log("File is uploaded on cloudinary",  response.url);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath);
        return null;
        
    }
}

export {uploadOnCloudinary}