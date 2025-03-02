const mongoose=require("mongoose")
const {Schema}=require("mongoose")

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
    category:{
         type: mongoose.Schema.Types.ObjectId, 
         ref: "Category",
          unique: true 
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
    discount:{
         type: Number, 
         min: 0, 
         max: 100, 
         default: 0 
    },
    availability:{ 
        type: String, 
        enum: ['in_stock', 'out_of_stock', 'pre_order'], 
        default: 'in_stock' 
    },
    deliveryTime:{
         type: Number, 
         min: 1 
    }

    
},{timestamps:true})

module.exports=mongoose.model("Product",productSchema)