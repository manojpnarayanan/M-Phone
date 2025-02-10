const mongoose=require("mongoose")


const categorySchema=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    slug:{
        type:String,
        required:true,
        unique:true
    },
    parent:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Category",
        default:null
    },
    description:{
        type:String
    },
    listed:{
        type:Boolean,
        deafault:true
    },
    isActive:{
        type:Boolean,
        default:true
    } 

},{timestamps:true})
module.exports=mongoose.model("Category",categorySchema)