const passport = require("passport")
const googleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../model/user")
const dotenv = require("dotenv")

dotenv.config();

const callbackURL = process.env.GOOGLE_CALLBACK_URL || "https://www.m-phone.auction-hub.online/user/google/callback";

passport.use(new googleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: callbackURL,
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            const existingUser = await User.findOne({ googleId: profile.id });
            if (existingUser) {
                return done(null, existingUser)
            }
            const newUser = new User({
                googleId: profile.id,
                name: profile.displayName,
                email: profile.emails[0].value,
                phonenumber: "",
                isVerified:true,
            })
            await newUser.save();
            done(null, newUser)
        } catch (error) {
            done(error)
        }
    }


))

module.exports = passport