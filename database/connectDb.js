const mongoose = require("mongoose")

const connectDb = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_HOST, {});
        console.log(`Mongodb connected:${conn.connection.host}`);
        // Drop legacy category_1 unique index if present
        mongoose.connection.collection('products').dropIndex('category_1').catch(() => {
            // Index didn't exist or already dropped, ignore
        });
    } catch (error) {
        console.log(error)
        process.exit(1)
    }
}
module.exports = connectDb