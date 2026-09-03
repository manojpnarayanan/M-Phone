const MESSAGES = Object.freeze({
    PRODUCT: {
        TITLE_REQUIRED: "Product title must be at least 3 characters long.",
        DESC_REQUIRED: "Product description must be at least 10 characters long.",
        PRICE_INVALID: "Price must be a valid number greater than 0.",
        STOCK_INVALID: "Stock must be a non-negative whole number.",
        DISCOUNT_INVALID: "Discount must be between 0 and 100%.",
        CATEGORY_REQUIRED: "Please select a valid category.",
        BRAND_REQUIRED: "Please select a valid brand.",
        MIN_IMAGES_REQUIRED: "Minimum 3 cropped images are required.",
        NO_IMAGES: "Product adding Failed: No images uploaded. Add at least 3 images.",
        CORRUPTED_IMAGES: "Product adding Failed: Corrupted image data received.",
        INVALID_IMAGE_FILE: "Invalid image files. Add only jpg/png.",
        ADD_SUCCESS: "Product added successfully.",
        ADD_FAIL: "Failed to add product.",
        UPDATE_SUCCESS: "Product updated successfully.",
        UPDATE_FAIL: "Failed to update product.",
        NOT_FOUND: "Product not found.",
        FETCH_FAIL: "Error fetching products."
    },
    CATEGORY: {
        NAME_REQUIRED: "Category name must be at least 3 characters long.",
        ALREADY_EXISTS: "Category already exists.",
        NOT_FOUND: "Category not found.",
        ADD_SUCCESS: "Category created successfully.",
        UPDATE_SUCCESS: "Category updated successfully.",
        FETCH_FAIL: "Error fetching categories."
    },
    ORDER: {
        NOT_FOUND: "Order not found.",
        STATUS_UPDATED: "Order status updated successfully.",
        PRODUCT_STATUS_UPDATED: "Product status updated successfully.",
        STATUS_UPDATE_FAIL: "Failed to update order status.",
        FETCH_ERROR: "Error fetching order details.",
        INVALID_INDEX: "Invalid product index.",
        ID_MISMATCH: "Product ID mismatch.",
        WALLET_NOT_FOUND: "Wallet not found."
    },
    COMMON: {
        SERVER_ERROR: "Internal Server Error. Please try again later.",
        INVALID_INPUT: "Invalid input data provided.",
        UNAUTHORIZED: "Unauthorized access."
    }
});

module.exports = MESSAGES;