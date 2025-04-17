const Coupon = require("../model/coupon")


const couponController = {
    loadCoupon: async (req, res) => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0)
            await Coupon.updateMany({
                isActive: true,
                validUntil: { $lt: today }
            },
                { $set: { isActive: false } }
            )
            const page = parseInt(req.query.page) || 1;
            const itemPerPage = 5;
            const searchQuery = req.query.search
            let query = {}
            if (searchQuery) {
                query = {
                    $or: [
                        { name: { $regex: searchQuery, $options: "i" } },
                        { code: { $regex: searchQuery, $options: "i" } }
                    ]
                }
            }
            const totalCoupons = await Coupon.countDocuments(query)
            const totalPages = Math.ceil(totalCoupons / itemPerPage)

            const coupons = await Coupon.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * itemPerPage)
                .limit(itemPerPage)

            res.render("admin/coupon", {
                coupons,
                currentPage: page,
                totalPages,
                totalCoupons,
                search: searchQuery
            })

        } catch (error) {
            console.log(error)
        }
    },
    createCoupon: async (req, res) => {
        try {
            console.log(req.body)
            const discountValue = Number(req.body.discountValue);
            const minOrderAmount = Number(req.body.minOrderAmount);
            const maxDiscountAmount = Number(req.body.maxDiscountAmount);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const validFromDate = new Date(req.body.validFrom);
            if (validFromDate < today) {
                return res.status(400).json({
                    success: false,
                    message: "Coupon start date must be today or a future date"
                });
            }

            const validUntilDate = new Date(req.body.validUntil);
            if (validUntilDate <= validFromDate) {
                return res.status(400).json({
                    success: false,
                    message: "End date must be after start date"
                });
            }

            if (minOrderAmount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Minimum order amount must be a positive number"
                });
            }

            if (req.body.discountType === "percentage") {
                if (discountValue < 1 || discountValue > 100) {
                    return res.status(400).json({
                        success: false,
                        message: "Percentage should be between 1 and 100"
                    });
                } else if (maxDiscountAmount <= 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Maximum discount amount must be a positive number"
                    });
                }
            } else if (req.body.discountType === "fixed") {
                if (discountValue <= 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Discount value must be a positive number"
                    });
                }

                if (discountValue > minOrderAmount) {
                    return res.status(400).json({
                        success: false,
                        message: "Fixed discount value cannot exceed minimum order amount"
                    });
                }
            }

            if (maxDiscountAmount > minOrderAmount) {
                return res.status(400).json({
                    success: false,
                    message: "Maximum discount amount cannot exceed minimum order amount"
                });
            }






            const coupon = new Coupon({
                name: req.body.name,
                code: req.body.code,
                discountType: req.body.discountType,
                discountValue: req.body.discountValue,
                minOrderAmount: req.body.minOrderAmount,
                maxDiscountAmount: req.body.maxDiscountAmount,
                validFrom: req.body.validFrom,
                validUntil: req.body.validUntil,
                usageLimit: req.body.usageLimit
            })
            console.log(coupon)
            await coupon.save()
            res.status(200).json({ success: true, message: "coupon added suceesfully" })

        } catch (error) {
            console.log(error)
            res.status(500).json({ success: false, message: "Failed to add coupon" })
        }
    },
    loadeditcoupon: async (req, res) => {
        try {
            const couponId = req.params.id
            console.log(couponId)
            const coupon = await Coupon.findById(couponId)

            res.render("admin/edit-coupon", { coupon })

        } catch (error) {

        }
    },
    blockCoupon: async (req, res) => {
        try {
            const couponId = req.params.id

            if (!couponId) {
                return res.status(400).json({ success: false, message: "coupon required" })
            }
            const coupon = await Coupon.findById(couponId)

            if (!coupon) {
                return res.status(400).json({ success: false, message: "Coupon not found" })
            }
            coupon.isActive = !coupon.isActive;

            await coupon.save()

            return res.status(200).json({
                success: true,
                message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'} successfully`,
                isActive: coupon.isActive
            });

        } catch (error) {
            console.log(error)
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },
    updateEditCoupon: async (req, res) => {
        try {
            const { name, code, discountType, discountValue, minOrderAmount, maxDiscountAmount, validFrom, validUntil, usageLimit, isActive } = req.body
            console.log(req.body)
            const DiscountValue = Number(discountValue)
            const MinOrderAmount = Number(minOrderAmount)
            const couponId = req.params.id
            const coupon = await Coupon.findById(couponId)
            console.log("couponId", couponId)
            // console.log("coupon",coupon)
            if (!coupon) {
                return res.status(400).json({ success: false, message: "Coupon not found" })
            }
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const validFromDate = new Date(validFrom);
            if (validFromDate < today) {
                return res.status(400).json({
                    success: false,
                    message: "Coupon start date must be today or a future date"
                });
            }
            const validUntilDate = new Date(validUntil);
            if (validUntilDate <= validFromDate) {
                return res.status(400).json({
                    success: false,
                    message: "End date must be after start date"
                });
            }
            if (minOrderAmount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Minimum order amount must be a positive number"
                });
            }

            if (discountType === "percentage") {
                if (DiscountValue < 1 || DiscountValue > 100) {
                    return res.status(400).json({
                        success: false,
                        message: "Percentage should be between 1 and 100"
                    });
                }
            } else if (discountType === "fixed") {
                if (DiscountValue <= 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Discount value must be a positive number"
                    });
                }
            }



            // console.log(req.body)
            coupon.name = name;
            coupon.code = code;
            coupon.discountType = discountType;
            coupon.discountValue = discountValue;
            coupon.minOrderAmount = minOrderAmount;
            coupon.maxDiscountAmount = maxDiscountAmount;
            coupon.validFrom = validFrom;
            coupon.validUntil = validUntil;
            coupon.usageLimit = usageLimit || 0;
            coupon.isActive = isActive;
            await coupon.save();
            res.status(200).json({ success: true, messsage: "Coupon updated successfully" })


        } catch (error) {
            console.log(error)
            return res.status(500).json({
                success: false,
                message: "An error occurred while updating the coupon",
                error: error.message
            });

        }

    }
}
module.exports = couponController