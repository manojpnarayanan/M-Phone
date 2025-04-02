const otpgenerator = require("otp-generator")
const nodemailer = require("nodemailer")
const jwt = require("jsonwebtoken")
const User = require("../../model/user")
const bcryptjs = require("bcryptjs");

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

const createOtp = () => {
    return {
        otp: generateOTP(),
        otpExpires: new Date(Date.now() + 2 * 60 * 1000), // OTP valid for 2 mins
    };
};

const generator = {


    otpValidate: async (req, res) => {
        try {
            const { otpToken, otp } = req.body
            const email = req.params.email;
            console.log("vaalidate body", req.body)
            const user = await User.findOne({ email })


            console.log(user)
            if (!user || user.otp !== otp || user.otpExpiry < new Date()) {
                return res.status(401).json({ message: "Invalid OTP" })

            }
            await User.updateOne({ email }, {
                $set: { otp: null, otpExpiry: null, isVerified: true }
            })
            if (user.referredBy) {

                const referrer = await User.findById(user.referredBy)
                if (referrer) {

                    if (!referrer.referrals) {
                        referrer.referrals = [];
                    }
                    referrer.referrals.push(user._id);


                    if (!referrer.referralDetails) {
                        referrer.referralDetails = [];
                    }

                    referrer.referralDetails.push({
                        userId: user._id,
                        name: user.name,
                        email: user.email,
                        joinedAt: new Date(),
                        status: 'active'
                    });


                    referrer.referralRewards = (referrer.referralRewards || 0) + 1;

                    await referrer.save();

                }
            }
            return res.json({ message: "OTP Verified! Redirecting to login...", redirect: "/user/login" });
        } catch (error) {
            console.log("err", error);
            res.status(500).send("Error signing up")
        }
    },
    resendOtp: async (req, res) => {
        try {
            if (!req.body || !req.body.email) {
                return res.status(400).json({ message: "Email missing" })
            }

            const { email } = req.body
            const user = await User.findOne({ email })
            if (!user) {
                return res.status(400).json({ message: "User not Found" })
            }
            const otp = Math.floor(100000 + Math.random() * 900000)
            console.log("resend otp:", otp)
            const otpExpiry = new Date()
            otpExpiry.setMinutes(otpExpiry.getMinutes() + 1);
            await User.findOneAndUpdate({ email }, { otp, otpExpiry })

            user.otp = otp;
            user.otpExpiry = otpExpiry;
            await user.save()

            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: process.env.GMAIL_USER,
                    pass: process.env.GMAIL_PASS,
                },
            });
            const mailOptions = {
                from: process.env.GMAIL_USER,
                to: email,
                subject: "Your OTP for Verification",
                text: `Your OTP is: ${otp}`,
            };

            await transporter.sendMail(mailOptions);
            console.log("OTP resent successfully");

            return res.json({ message: "OTP resent successfully" });
        } catch (error) {
            console.log(error)
            return res.status(500).json({ message: "Failed to resend OTP" });

        }
    }



}
module.exports = generator