const dotenv=require("dotenv")
dotenv.config()
const express=require("express")
const app=express()
const connectDb=require("./database/connectDb")
const path = require("path")
const adminRouter=require("./router/admin")
const nocache=require("nocache")
const cookieParser=require("cookie-parser")
const userRouter=require("./router/user/user")
const passport=require("./database/passportConfig")


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({limit:"50mb",extended:true}));
app.use(express.json({limit:"50mb"}));
app.use(cookieParser())
app.use(express.static("public"))
app.use(nocache())



app.use(passport.initialize());
app.use("/admin",adminRouter)
app.use("/user",userRouter)




// app.get("/",(req,res)=>{
//     res.send("success")
// })














connectDb();

app.listen(3000,()=>{
    console.log("server is running")
})