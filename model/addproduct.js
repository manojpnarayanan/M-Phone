const mongoose=require("mongoose")

const productSchema= new mongoose.Schema({
    name:{
        type:String,
        required:true,
        trim:true
    },
    description:{
        type:String,
        required:true
    },
    price:{
        type:Number,
        required:true,
        min:0
    },
    brand:{
        type:String,
        required:true,
    },
    image:{
        type:[String],
        required:true,
        validate:{
            validator:function(v){
                return v.length>=3;
            },
            message:"A Product must have Atleast 3 images"
        }
        
    },
      isActive:{
        type:Boolean,
        default:true
    },
    stock:{
        type:Number,
        required:true
    },

    
},{timestamps:true})

module.exports=mongoose.model("Product",productSchema)