const mongoose=require("mongoose")
const mongoosePaginate = require('mongoose-paginate-v2');
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
        required:false
    },
    isActive: {
        type:Boolean,
        default:true
    },
    isVerified:{
        type:Boolean,
        default:false
    },
    otp:{
        type:String,
        default:null
    },
    otpExpiry:{
        type:Date,
        default:null
    },
    photo: {
        type: String, // Store the filename of the user's profile photo
        default:"/uploads/profile-pictures/default.png" // Default profile photo
      },
   
},{timestamps:true});
userSchema.plugin(mongoosePaginate);

module.exports=mongoose.model("User",userSchema)