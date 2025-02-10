const mongoose=require("mongoose")
const userSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
     password:{
        type:String,
        required:false
    },
    googleId:{
        type:String
    },
    otp:{
        type:String
    },
    otpExpiry:{
        type:Date
    },
    phonenumber:{
        type:Number,
        required:true
    }
   
});

module.exports=mongoose.model("User",userSchema)