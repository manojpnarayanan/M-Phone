const dotenv=require("dotenv")
dotenv.config()
const express=require("express")
const session = require('express-session');
// const helmet=require("helmet")
const app=express()
// app.use(helmet());
const connectDb=require("./database/connectDb")
const path = require("path")
const adminRouter=require("./router/admin")
const nocache=require("nocache")
const cookieParser=require("cookie-parser")
const userRouter=require("./router/user/user")
const passport=require("./database/passportConfig")
const flash = require('connect-flash');
const middleware=require("./middleware/admin")
const userViews=require("./controller/user/userviews")

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(session({
    secret: 'your_secret_key',
    resave: false, 
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 1000 * 60 * 60 } // 1-hour session expiry
}));


app.use(express.urlencoded({limit:"50mb",extended:true}));
app.use(express.json({limit:"50mb"}));
app.use(cookieParser())
app.use(express.static("public"))
app.use(nocache())
app.use(flash());
app.use((req, res, next) => {
    res.locals.messages = req.flash();
    next();
});


app.use(passport.initialize());
app.get("/",userViews.loadLandingpage)
app.use("/admin",adminRouter)
app.use("/user",userRouter)




// app.get("/",(req,res)=>{
//     res.send("success")
// })














connectDb();

app.listen(3000,()=>{
    console.log("server is running")
})