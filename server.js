const dotenv=require("dotenv")
dotenv.config()
console.log("KEY_ID exists:", !!process.env.KEY_ID);
console.log("KEY_SECRET exists:", !!process.env.KEY_SECRET);
console.log("MONGO_HOST exists:", !!process.env.MONGO_HOST);
const express=require("express")
const session = require('express-session');
// const helmet=require("helmet")
const app=express()
app.set("trust proxy", 1);
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
    cookie: { secure: false,  maxAge: Number(process.env.SESSION_MAX_AGE) }
}));


app.use(express.urlencoded({limit:"50mb",extended:true}));
app.use(express.json({limit:"50mb"}));
app.use(cookieParser())
app.use(express.static("public"))
app.use(nocache())
app.use(flash());
app.use((req, res, next) => {
    res.locals.messages = req.flash();
    // Helper: works for both old local paths and new Cloudinary URLs
    res.locals.imgSrc = (imgPath) => {
        if (!imgPath) return '/images/placeholder.jpg';
        if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
            return imgPath; // Cloudinary URL — use as-is
        }
        return '/' + imgPath; // Old local path — prepend /
    };
    next();
});


app.use(passport.initialize());
app.get("/",userViews.loadLandingpage)
app.get("/home",userViews.loadLandingHomePage)
app.get("/shop",userViews.loadlandingShop)
app.get("/products/:id",userViews.landingProductdetails)

app.use("/admin",adminRouter)
app.use("/user",userRouter)


connectDb();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`)
})