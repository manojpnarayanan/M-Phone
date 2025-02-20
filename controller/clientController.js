const User = require("../model/user");
const mongoosepaginate=require("mongoose-paginate-v2")
const client = {
    loadUserList: async (req,res)=>{
        try{
            const searchQuery=req.query.search||""
            const page=parseInt(req.query.page)||1
            const limit=3
            const options={
                page,
                limit,
                sort:{createdAt:-1},
                populate:[]
            }
            const query={
                email:{$regex:searchQuery,$options:"i"}
            }
        const users=await User.paginate(query,options )
        res.render("admin/page-orders-1",{
            users:users.docs,
            searchQuery,
            totalPages:users.totalPages,
            currentPage:users.page
        })
        }catch(error){
            console.log(error)
            res.status(500).send("error fetching Details")
        }
    },

    blockUser: async (req, res) => {
        try {
            const userId = req.params.id;
            // console.log("User ID:", userId);

            const user = await User.findById(userId);
            // console.log("User Found:", user);

            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            // Correct logic: isActive=true means Active, isActive=false means Blocked
            user.isActive = !user.isActive; // Toggle status
            await user.save();

            const newStatus = user.isActive ? "Active" : "Blocked";
            return res.json({ success: true, newStatus });
        } catch (error) {
            console.error("Error:", error);
            return res.status(500).json({ success: false, message: "Internal Server Error" });
        }
    }
};

module.exports = client;
