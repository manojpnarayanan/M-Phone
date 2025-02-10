const multer=require("multer")
const path=require("path")
const fs=require("fs")

const storage= multer.diskStorage({
    destination: (req,file,cb)=>{
        let uploadPath;
        if(req.originalUrl.includes('admin/dashboard/brands/addbrands')){
            uploadPath="public/uploads"
        }else{
             uploadPath="public/uploads/product-images"
        }
        // cb(null,path.join(__dirname,"../public/uploads"))
        //if file not exists create new one
        if(!fs.existsSync(uploadPath)){
            fs.mkdirSync(uploadPath,{recursive:true})
        }
        cb(null,uploadPath)
    },

    filename:(req,file,cb)=>{
        cb(null,file.fieldname+"-"+Date.now()+path.extname(file.originalname))
    }
})

const upload=multer({
    storage,
    limits:{fileSize:50*1024*1024}//50 mb limit
});

module.exports=upload

