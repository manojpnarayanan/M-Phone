const User=require("../../model/user")
const bcryptjs=require("bcryptjs")
const jwt=require("jsonwebtoken")
const Product=require("../../model/addproduct")

const userController={
    login: async(req,res)=>{
        try{
            const {email,password}=req.body
            const user=await User.findOne({email})

            if(!user){
                return res.status(400).send("User not found")
            }
            const isMatch=await bcryptjs.compare(password,user.password)

            if(!isMatch){
                return res.status(400).send("Invalid Credentials")
            }
                 // GENERATE TOKEN
            const token=jwt.sign({
                id:user._id,
                email:user.email},
                process.env.JWT_SECRET,
                {expiresIn:"1h",                  
            })
            // STORE TOKEN IN HTTP-ONLY COOKIE
            res.cookie("token",token,{httpOnly:true})
            res.redirect("/user/dashboard")
        }catch(error){
            console.log(error)
            res.status(500).send("Server error")
        }
    },
    loadDashboard:async (req,res)=>{
        try{
            let query={}
            if(req.query.search){
                query={
                    $or:[
                        {name:{$regex:req.query.search,$options:"i"}},
                        {description:{$regex:req.query.search,$options:"i"}}
                    ]
                }
            }
        const products=await Product.find(query);
        res.render("user/home",{products,searchQuery:req.query.search || ""})
        }catch(error){
            console.log(error)
            res.status(500).send("Error fetching Data")
        }
    }
}

module.exports=userController