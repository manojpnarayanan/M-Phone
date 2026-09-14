const { Resend } = require("resend");
const nodemailer = require("nodemailer");

const sendMail = async (options) => {
    // 1. If RESEND_API_KEY is configured, use Resend HTTPS API (bypasses Render SMTP port blocking)
    if (process.env.RESEND_API_KEY) {
        try {
            const resend = new Resend(process.env.RESEND_API_KEY.trim());
            const fromAddress = process.env.EMAIL_FROM 
                ? process.env.EMAIL_FROM.trim() 
                : "M-Phone <onboarding@resend.dev>";

            const { data, error } = await resend.emails.send({
                from: fromAddress,
                to: Array.isArray(options.to) ? options.to : [options.to],
                subject: options.subject,
                html: options.html,
                text: options.text || undefined,
            });

            if (error) {
                console.error("Resend Email Error:", error);
                throw new Error(`Resend email error: ${error.message}`);
            }

            console.log("Email sent successfully via Resend to", options.to, ":", data?.id);
            return data;
        } catch (err) {
            console.error("Failed to send email via Resend:", err.message);
            throw err;
        }
    }

    // 2. Fallback to Nodemailer SMTP (for local development or environments without SMTP blocks)
    const user = process.env.GMAIL_USER ? process.env.GMAIL_USER.trim() : "";
    const pass = process.env.GMAIL_PASS ? process.env.GMAIL_PASS.trim().replace(/\s+/g, "") : "";

    if (!user || !pass) {
        console.error("Email Error: GMAIL_USER or GMAIL_PASS environment variable is missing.");
        throw new Error("Email configuration error: GMAIL_USER or GMAIL_PASS missing.");
    }

    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
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

