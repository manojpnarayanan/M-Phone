const nodemailer = require("nodemailer");

const sendMail = async (options) => {
    const user = process.env.GMAIL_USER ? process.env.GMAIL_USER.trim() : "";
    // Clean Gmail App Password by removing any spaces (e.g., "oynv nkvx yxdu fyqo" -> "oynvnkvxyxdufyqo")
    const pass = process.env.GMAIL_PASS ? process.env.GMAIL_PASS.trim().replace(/\s+/g, "") : "";

    if (!user || !pass) {
        console.error("Email Error: GMAIL_USER or GMAIL_PASS environment variable is missing.");
        throw new Error("Email configuration error: GMAIL_USER or GMAIL_PASS missing.");
    }

    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true, // SSL on port 465 prevents Railway port 587 connection timeouts (ETIMEDOUT)
        auth: {
            user: user,
            pass: pass,
        },
        tls: {
            rejectUnauthorized: false
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 15000
    });

    const mailOptions = {
        from: user,
        ...options
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully to", options.to, ":", info.response);
    return info;
};

module.exports = sendMail;
