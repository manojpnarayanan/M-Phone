// const Order = require("../model/order")
// const { generateInvoice } = require("../utils/invoiceGenerator"); // Assume you have a utility to generate invoices
// const fs = require('fs');
// const PDFDocument = require('pdfkit');
// const path = require('path');
// const User = require("../model/user")
// const ExcelJS = require('exceljs');

// const generateInvoiceController = {
//     loadsalesreport: async (req, res) => {
//         try {
//             const { dateRange, startDate, endDate } = req.query;

//             let query = {};
//             if (dateRange) {
//                 const now = new Date();
//                 switch (dateRange) {
//                     case 'today':
//                         query.createdAt = { $gte: new Date(now.setHours(0, 0, 0, 0)), $lt: new Date(now.setHours(23, 59, 59, 999)) };
//                         break;
//                     case 'week':
//                         const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())); // Corrected
//                         const endOfWeek = new Date(startOfWeek);
//                         endOfWeek.setDate(startOfWeek.getDate() + 6);
//                         endOfWeek.setHours(23, 59, 59, 999);
//                         query.createdAt = { $gte: startOfWeek, $lt: endOfWeek };
//                         break;
//                     case 'month':
//                         query.createdAt = { $gte: new Date(now.getFullYear(), now.getMonth(), 1), $lt: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999) };
//                         break;
//                     case 'year':
//                         query.createdAt = { $gte: new Date(now.getFullYear(), 0, 1), $lt: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999) };
//                         break;
//                 }
//             } else if (startDate && endDate) {
//                 query.createdAt = { $gte: new Date(startDate), $lt: new Date(endDate) };
//             }

//             const orders = await Order.find(query)
//                 .populate("user", "name email phone")
//                 .populate("products.product", "name price image");

//             const totalSales = orders.reduce((total, order) => total + order.totalAmount, 0);
//             const totalOrders = orders.length;
//             const totalCustomers = new Set(orders.map(order => order.user._id)).size;
//             const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

//             res.render("admin/salesreport", {
//                 query: req.query,
//                 totalSales,
//                 totalOrders,
//                 totalCustomers,
//                 avgOrderValue,
//                 orders,
//             });
//         } catch (error) {
//             console.log(error);
//             res.status(500).json({ message: "Internal Server Error" });
//         }
//     },
    
//     downloadInvoice: async (req, res) => {
//         try {
//             const { period, date, format } = req.query;
//             console.log("downloadInvoice", req.query);
    
//             if (!period || !date) {
//                 return res.status(400).json({ status: "error", message: "Period and date are required" });
//             }
    
//             const startDate = new Date(date);
//             const endDate = new Date(date);
            
//             // Fix here: Properly handle the week period
//             if (period === "daily") {
//                 endDate.setDate(startDate.getDate() + 1);
//             } else if (period === "week") {
//                 // Set endDate to 7 days after startDate
//                 endDate.setDate(startDate.getDate() + 7);
//             } else if (period === "monthly") {
//                 endDate.setMonth(startDate.getMonth() + 1);
//             } else if (period === "yearly") {
//                 endDate.setFullYear(startDate.getFullYear() + 1);
//             }
            
//             console.log("Date range:", startDate, endDate);
    
//             const orders = await Order.find({
//                 createdAt: { $gte: startDate, $lt: endDate },
//             }).populate("user", "name email phone")
//               .populate("products.product", "name price image");
              
//             console.log("ORDERS:", orders);
    
//             if (!orders || orders.length === 0) {
//                 return res.status(404).json({ status: "error", message: "No orders found for the selected period" });
//             }
    
//             if (format === "excel") {
//                 // Generate Excel file
//                 const workbook = new ExcelJS.Workbook();
//                 const worksheet = workbook.addWorksheet('Sales Report');
    
//                 // Add headers
//                 worksheet.columns = [
//                     { header: 'Order ID', key: 'orderId', width: 20 },
//                     { header: 'Customer', key: 'customer', width: 25 },
//                     { header: 'Date', key: 'date', width: 15 },
//                     { header: 'Total Amount', key: 'totalAmount', width: 15 },
//                     { header: 'Payment Method', key: 'paymentMethod', width: 15 }
//                 ];
    
//                 // Add rows
//                 orders.forEach(order => {
//                     worksheet.addRow({
//                         orderId: order._id,
//                         customer: order.user.name,
//                         date: order.createdAt.toLocaleDateString(),
//                         totalAmount: order.totalAmount.toFixed(2),
//                         paymentMethod: order.paymentMethod || 'N/A'
//                     });
//                 });
    
//                 // Save the file
//                 const dir = './invoices';
//                 if (!fs.existsSync(dir)){
//                     fs.mkdirSync(dir, { recursive: true });
//                 }
                
//                 const excelPath = `${dir}/invoice-${period}-${date}.xlsx`;
//                 await workbook.xlsx.writeFile(excelPath);
    
//                 // Send the file as a response
//                 res.download(excelPath, `invoice-${period}-${date}.xlsx`, (err) => {
//                     if (err) {
//                         console.error("Error downloading Excel invoice:", err);
//                         res.status(500).json({ status: "error", message: "Failed to download Excel invoice" });
//                     }
//                     // Optionally delete the file after sending
//                     // fs.unlinkSync(excelPath);
//                 });
//             } else {
//                 // Generate PDF file
//                 const invoicePath = await generateInvoiceController.generateInvoice(orders, period, date);
//                 res.download(invoicePath, `invoice-${period}-${date}.pdf`, (err) => {
//                     if (err) {
//                         console.error("Error downloading PDF invoice:", err);
//                         res.status(500).json({ status: "error", message: "Failed to download PDF invoice" });
//                     }
//                     // Optionally delete the file after sending
//                     // fs.unlinkSync(invoicePath);
//                 });
//             }
//         } catch (error) {
//             console.log(error);
//             res.status(500).json({ status: "error", message: "Internal Server Error" });
//         }
//     },
    
//     generateInvoice: async (orders, period, date) => {
//         // Ensure the invoices directory exists
//         const dir = './invoices';
//         if (!fs.existsSync(dir)){
//             fs.mkdirSync(dir, { recursive: true });
//         }
        
//         const doc = new PDFDocument();
//         const invoicePath = `${dir}/invoice-${period}-${date}.pdf`;
//         doc.pipe(fs.createWriteStream(invoicePath));
    
//         // Add title and header
//         doc.fontSize(25).text(`Sales Report: ${period.charAt(0).toUpperCase() + period.slice(1)}`, 100, 80);
//         doc.fontSize(14).text(`Period starting: ${new Date(date).toLocaleDateString()}`, 100, 120);
        
//         // Add summary
//         const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);
//         doc.fontSize(12)
//             .text(`Total Orders: ${orders.length}`, 100, 150)
//             .text(`Total Amount: $${totalAmount.toFixed(2)}`, 100, 170)
//             .moveDown();
    
//         // Add table header
//         let y = 200;
//         doc.fontSize(10)
//             .text('Order ID', 50, y)
//             .text('Customer', 150, y)
//             .text('Date', 300, y)
//             .text('Amount', 380, y)
//             .moveDown();
        
//         y += 20;
//         doc.moveTo(50, y).lineTo(500, y).stroke();
//         y += 10;
    
//         // Add order details
//         orders.forEach((order, index) => {
//             const orderDate = new Date(order.createdAt).toLocaleDateString();
            
//             doc.fontSize(9)
//                 .text(order._id.toString().substring(0, 10) + '...', 50, y)
//                 .text(order.user.name, 150, y)
//                 .text(orderDate, 300, y)
//                 .text(`$${order.totalAmount.toFixed(2)}`, 380, y);
            
//             y += 20;
            
//             // Start a new page if needed
//             if (y > 700 && index < orders.length - 1) {
//                 doc.addPage();
//                 y = 80;
//                 // Add table header to new page
//                 doc.fontSize(10)
//                     .text('Order ID', 50, y)
//                     .text('Customer', 150, y)
//                     .text('Date', 300, y)
//                     .text('Amount', 380, y)
//                     .moveDown();
                
//                 y += 20;
//                 doc.moveTo(50, y).lineTo(500, y).stroke();
//                 y += 10;
//             }
//         });
//         //now added
//         const doc = new PDFDocument();
// res.setHeader('Content-Type', 'application/pdf');
// res.setHeader('Content-Disposition', `attachment; filename=sales-report-${date}.pdf`);
// doc.pipe(res);

// // Add content to the PDF
// doc.fontSize(25).text('Sales Report', {
//     align: 'center'
// });
// doc.moveDown();
// doc.fontSize(12).text(`Period: ${period}`, {
//     align: 'left'
// });
// doc.moveDown();

// // Add summary section
// doc.fontSize(16).text('Summary', {
//     underline: true
// });
// doc.moveDown();
// const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
// doc.text(`Total Sales: ₹${totalSales.toLocaleString()}`);
// doc.text(`Total Orders: ${orders.length}`);
// // Add more summary data...

// // Add orders table
// doc.addPage();
// doc.fontSize(16).text('Order Details', {
//     underline: true
// });
// doc.moveDown();

// // Create table headers
// let yPosition = doc.y;
// const tableHeaders = ['Order ID', 'Date', 'Customer', 'Amount', 'Status'];
// // Draw table...

// // End the document
// doc.end();
    
//         // Add footer
//         doc.fontSize(10)
//             .text(`Generated on ${new Date().toLocaleString()}`, 50, doc.page.height - 50, {
//                 align: 'center'
//             });
    
//         doc.end();
//         return invoicePath;
//     },
    
//     excelGenerate:async (req,res)=>{
//         const workbook = new Excel.Workbook();
// const worksheet = workbook.addWorksheet('Sales Report');

// // Add headers
// worksheet.columns = [
//     { header: 'Order ID', key: 'id', width: 20 },
//     { header: 'Date', key: 'date', width: 15 },
//     { header: 'Customer', key: 'customer', width: 30 },
//     { header: 'Amount', key: 'amount', width: 15 },
//     { header: 'Status', key: 'status', width: 15 }
// ];

// // Add rows
// Order.forEach(order => {
//     worksheet.addRow({
//         id: order._id,
//         date: order.createdAt.toLocaleDateString(),
//         customer: order.user ? `${order.user.name}` : 'Guest',
//         amount: `₹${order.totalAmount.toLocaleString()}`,
//         status: order.status
//     });
// });

// // Set response headers
// res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
// res.setHeader('Content-Disposition', `attachment; filename=sales-report-${date}.xlsx`);

// // Write to response
// await workbook.xlsx.write(res);
// res.end();
//     }


// };

// module.exports = generateInvoiceController;

const Order = require("../model/order")
const fs = require('fs');
const PDFDocument = require('pdfkit');
const path = require('path');
const User = require("../model/user")
const ExcelJS = require('exceljs');

const generateInvoiceController = {
    loadsalesreport: async (req, res) => {
        try {
            const { dateRange, startDate, endDate } = req.query;
            console.log("seleceted dates",req.query)

            let query = {"products.status": 'Delivered'};
            if (dateRange) {
                const now = new Date();
                switch (dateRange) {
                    case 'today':
                        query.createdAt = {
                            $gte: new Date(now.setHours(0, 0, 0, 0)),
                            $lt: new Date(now.setHours(23, 59, 59, 999))
                        };
                        break;
                    case 'week':
                        
                        const endOfWeek = new Date(now);
                        endOfWeek.setHours(23, 59, 59, 999);
                        const startOfWeek = new Date(endOfWeek);
                        startOfWeek.setDate(endOfWeek.getDate() - 6);
                        startOfWeek.setHours(0, 0, 0, 0);
                        query.createdAt = { 
                            $gte: startOfWeek, 
                            $lt: endOfWeek 
                        };

                        break;
                    case 'month':
                        query.createdAt = {
                            $gte: new Date(now.getFullYear(), now.getMonth(), 1),
                            $lt: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
                        };
                        break;
                    case 'year':
                        query.createdAt = {
                            $gte: new Date(now.getFullYear(), 0, 1),
                            $lt: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
                        };
                        break;
                }
            } else if (startDate && endDate) {
                const startDateObj = new Date(startDate);
                startDateObj.setHours(0, 0, 0, 0);

                const endDateObj = new Date(endDate);
                endDateObj.setHours(23, 59, 59, 999);

                query.createdAt = { $gte: startDateObj, $lt: endDateObj };
            }

            const orders = await Order.find(query)
                .populate("user", "name email phone")
                .populate("products.product", "name price image");

            const totalSales = orders.reduce((total, order) => total + order.finalAmount, 0);
            const totalOrders = orders.length;

            // Handle cases where user might be null
            const customersSet = new Set();
            orders.forEach(order => {
                if (order.user && order.user._id) {
                    customersSet.add(order.user._id.toString());
                }
            });
            const totalCustomers = customersSet.size;

            const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

            res.render("admin/salesreport", {
                query: req.query,
                totalSales,
                totalOrders,
                totalCustomers,
                avgOrderValue,
                orders,
            });
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    },
    
    downloadInvoice: async (req, res) => {
        try {
            const { period, date, format } = req.query;
            console.log(req.query.startDate)
            console.log(req.query.endDate)
            console.log("downloadInvoice", req.query);
    
            if (!period || !date) {
                return res.status(400).json({ status: "error", message: "Period and date are required" });
            }
    
            const selectedDate = new Date(date);
            selectedDate.setHours(0, 0, 0, 0); // Start of the day
            
            let startDate, endDate;
            
            // Set date range based on period
            switch(period) {
                case "today":
                    startDate = new Date(selectedDate);
                    endDate = new Date(selectedDate);
                    endDate.setHours(23, 59, 59, 999);
                    break;
                    
                case "week":
                    startDate = new Date(selectedDate);
                    // If selectedDate is not already the start of week, adjust it
                    if (startDate.getDay() !== 0) { // 0 is Sunday
                        startDate.setDate(startDate.getDate() - startDate.getDay());
                    }
                    endDate = new Date(startDate);
                    endDate.setDate(startDate.getDate() + 6);
                    endDate.setHours(23, 59, 59, 999);
                    break;
                    
                case "month":
                    startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                    endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59, 999);
                    break;
                    
                case "year":
                    startDate = new Date(selectedDate.getFullYear(), 0, 1);
                    endDate = new Date(selectedDate.getFullYear(), 11, 31, 23, 59, 59, 999);
                    break;
                    
                default:
                    // Default to daily if no valid period is specified
                    startDate = new Date(selectedDate);
                    endDate = new Date(selectedDate);
                    endDate.setHours(23, 59, 59, 999);
            }
            
            console.log("Date range:", startDate, endDate);
    
            const orders = await Order.find({
                createdAt: { $gte: startDate, $lt: endDate },
                "products.status":"Delivered"
            }).populate("user", "name email phone")
              .populate("products.product", "name price image");
              
            console.log("ORDERS:", orders);
    
            if (!orders || orders.length === 0) {
                return res.status(404).json({ status: "error", message: "No orders found for the selected period" });
            }
    
            if (format === "excel") {
                return await generateInvoiceController.excelGenerate(req, res, orders, period, date);
            } else {
                return await generateInvoiceController.generateInvoice(req, res, orders, period, date);
            }
        } catch (error) {
            console.log(error);
            res.status(500).json({ status: "error", message: "Internal Server Error" });
        }
    },
    
    generateInvoice: async (req, res, orders, period, date) => {
        try {
            // Create a new PDF document
            const doc = new PDFDocument();
            
            // Set response headers for inline PDF
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=sales-report-${period}-${date}.pdf`);
            
            // Pipe the PDF directly to the response
            doc.pipe(res);
            
            // Add title and branding
            doc.fontSize(25).text(`Sales Report - ${period.charAt(0).toUpperCase() + period.slice(1)}`, {
                align: 'center'
            });
            doc.moveDown();
            
            // Add date range
            const startDate = new Date(date);
            let endDateText = '';
            
            switch(period) {
                case 'today':
                    endDateText = startDate.toLocaleDateString();
                    break;
                case 'week':
                    const endWeek = new Date(startDate);
                    endWeek.setDate(startDate.getDate() + 6);
                    endDateText = `${startDate.toLocaleDateString()} to ${endWeek.toLocaleDateString()}`;
                    break;
                case 'month':
                    endDateText = `${startDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`;
                    break;
                case 'year':
                    endDateText = startDate.getFullYear().toString();
                    break;
                default:
                    endDateText = startDate.toLocaleDateString();
            }
            
            doc.fontSize(12).text(`Period: ${endDateText}`, {
                align: 'left'
            });
            doc.moveDown();
            
            // Add summary section
            doc.fontSize(16).text('Summary', {
                underline: true
            });
            doc.moveDown();
            
            const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
            
            // Create a Set to count unique customers
            const uniqueCustomers = new Set();
            orders.forEach(order => {
                if (order.user && order.user._id) {
                    uniqueCustomers.add(order.user._id.toString());
                }
            });
            
            doc.text(`Total Sales: ₹${totalSales.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
            doc.text(`Total Orders: ${orders.length}`);
            doc.text(`Total Customers: ${uniqueCustomers.size}`);
            
            const avgOrderValue = orders.length > 0 ? totalSales / orders.length : 0;
            doc.text(`Average Order Value: ₹${avgOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
            
            // Add orders table on a new page
            doc.addPage();
            doc.fontSize(16).text('Order Details', {
                underline: true
            });
            doc.moveDown();
            
            // Define table layout
            const tableTop = doc.y;
            const tableLeft = 50;
            const colWidths = [120, 80, 120, 80, 100];
            const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);
            
            // Draw table headers
            const headers = ['Order ID', 'Date', 'Customer', 'Amount', 'Status'];
            let xPos = tableLeft;
            
            doc.fontSize(10).font('Helvetica-Bold');
            headers.forEach((header, i) => {
                doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
                xPos += colWidths[i];
            });
            
            // Draw header line
            doc.moveTo(tableLeft, tableTop + 20)
               .lineTo(tableLeft + tableWidth, tableTop + 20)
               .stroke();
            
            // Set starting position for table data
            let yPos = tableTop + 30;
            
            // Draw table rows
            doc.font('Helvetica');
            orders.forEach((order, index) => {
                // Check if we need a new page
                if (yPos > doc.page.height - 100) {
                    doc.addPage();
                    yPos = 50;
                    
                    // Redraw headers on new page
                    xPos = tableLeft;
                    doc.fontSize(10).font('Helvetica-Bold');
                    headers.forEach((header, i) => {
                        doc.text(header, xPos, yPos, { width: colWidths[i], align: 'left' });
                        xPos += colWidths[i];
                    });
                    
                    // Draw header line
                    doc.moveTo(tableLeft, yPos + 20)
                       .lineTo(tableLeft + tableWidth, yPos + 20)
                       .stroke();
                    
                    yPos += 30;
                    doc.font('Helvetica');
                }
                
                // Truncate ID to fit
                let orderId = order._id.toString();
                if (orderId.length > 10) {
                    orderId = orderId.substring(0, 10) + '...';
                }
                
                // Format date
                const orderDate = new Date(order.createdAt).toLocaleDateString();
                
                // Get customer name (handle null case)
                const customerName = order.user && order.user.name ? order.user.name : 'Guest';
                
                // Format amount
                const amount = `₹${order.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
                
                // Get status
                const status = "Delivered";
                
                // Draw the row
                xPos = tableLeft;
                doc.text(orderId, xPos, yPos, { width: colWidths[0], align: 'left' });
                xPos += colWidths[0];
                
                doc.text(orderDate, xPos, yPos, { width: colWidths[1], align: 'left' });
                xPos += colWidths[1];
                
                doc.text(customerName, xPos, yPos, { width: colWidths[2], align: 'left' });
                xPos += colWidths[2];
                
                doc.text(amount, xPos, yPos, { width: colWidths[3], align: 'left' });
                xPos += colWidths[3];
                
                doc.text(status, xPos, yPos, { width: colWidths[4], align: 'left' });
                
                // Draw row divider
                yPos += 20;
                doc.moveTo(tableLeft, yPos - 5)
                   .lineTo(tableLeft + tableWidth, yPos - 5)
                   .stroke({ opacity: 0.2 });
            });
            
            // Add footer
            doc.fontSize(8)
               .text(`Generated on ${new Date().toLocaleString()}`, {
                   align: 'center',
                   bottom: 30
               });
            
            // Finalize the PDF and end the stream
            doc.end();
        } catch (error) {
            console.error("Error generating PDF:", error);
            res.status(500).json({ status: "error", message: "Failed to generate PDF" });
        }
    },
    
    excelGenerate: async (req, res, orders, period, date) => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Sales Report');
            
            // Add report title
            worksheet.mergeCells('A1:E1');
            const titleCell = worksheet.getCell('A1');
            titleCell.value = `Sales Report - ${period.charAt(0).toUpperCase() + period.slice(1)}`;
            titleCell.font = {
                size: 16,
                bold: true
            };
            titleCell.alignment = { horizontal: 'center' };
            
            // Add date information
            worksheet.mergeCells('A2:E2');
            const dateCell = worksheet.getCell('A2');
            dateCell.value = `Period: ${new Date(date).toLocaleDateString()}`;
            dateCell.font = {
                size: 12
            };
            dateCell.alignment = { horizontal: 'center' };
            
            // Add summary section
            worksheet.mergeCells('A4:B4');
            worksheet.getCell('A4').value = 'Summary';
            worksheet.getCell('A4').font = {
                bold: true,
                size: 14
            };
            
            const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
            
            // Count unique customers
            const uniqueCustomers = new Set();
            orders.forEach(order => {
                if (order.user && order.user._id) {
                    uniqueCustomers.add(order.user._id.toString());
                }
            });
            
            worksheet.getCell('A5').value = 'Total Sales:';
            worksheet.getCell('B5').value = `₹${totalSales.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
            
            worksheet.getCell('A6').value = 'Total Orders:';
            worksheet.getCell('B6').value = orders.length;
            
            worksheet.getCell('A7').value = 'Total Customers:';
            worksheet.getCell('B7').value = uniqueCustomers.size;
            
            const avgOrderValue = orders.length > 0 ? totalSales / orders.length : 0;
            worksheet.getCell('A8').value = 'Average Order Value:';
            worksheet.getCell('B8').value = `₹${avgOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
            
            // Add space before detail section
            const headerRow = 10;
            
            // Add headers
            worksheet.getCell(`A${headerRow}`).value = 'Order ID';
            worksheet.getCell(`B${headerRow}`).value = 'Date';
            worksheet.getCell(`C${headerRow}`).value = 'Customer';
            worksheet.getCell(`D${headerRow}`).value = 'Amount';
            worksheet.getCell(`E${headerRow}`).value = 'Status';
            
            // Style the header row
            ['A', 'B', 'C', 'D', 'E'].forEach(col => {
                worksheet.getCell(`${col}${headerRow}`).font = {
                    bold: true
                };
                worksheet.getCell(`${col}${headerRow}`).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFEEEEEE' }
                };
                worksheet.getCell(`${col}${headerRow}`).border = {
                    bottom: { style: 'thin' }
                };
            });
            
            // Set column widths
            worksheet.getColumn('A').width = 30;
            worksheet.getColumn('B').width = 15;
            worksheet.getColumn('C').width = 25;
            worksheet.getColumn('D').width = 15;
            worksheet.getColumn('E').width = 15;
            
            // Add rows
            let rowIndex = headerRow + 1;
            orders.forEach(order => {
                worksheet.getCell(`A${rowIndex}`).value = order._id.toString();
                worksheet.getCell(`B${rowIndex}`).value = new Date(order.createdAt).toLocaleDateString();
                worksheet.getCell(`C${rowIndex}`).value = order.user && order.user.name ? order.user.name : 'Guest';
                worksheet.getCell(`D${rowIndex}`).value = `₹${order.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
                worksheet.getCell(`E${rowIndex}`).value = 'Delivered';
                
                // Add alternating row colors for better readability
                if (rowIndex % 2 === 0) {
                    ['A', 'B', 'C', 'D', 'E'].forEach(col => {
                        worksheet.getCell(`${col}${rowIndex}`).fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFF9F9F9' }
                        };
                    });
                }
                
                rowIndex++;
            });
            
            // Add footer
            rowIndex += 2;
            worksheet.mergeCells(`A${rowIndex}:E${rowIndex}`);
            worksheet.getCell(`A${rowIndex}`).value = `Generated on ${new Date().toLocaleString()}`;
            worksheet.getCell(`A${rowIndex}`).alignment = { horizontal: 'center' };
            worksheet.getCell(`A${rowIndex}`).font = {
                italic: true,
                size: 10
            };
            
            // Set response headers for the Excel file
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=sales-report-${period}-${date}.xlsx`);
            
            // Write to response
            await workbook.xlsx.write(res);
            res.end();
        } catch (error) {
            console.error("Error generating Excel:", error);
            res.status(500).json({ status: "error", message: "Failed to generate Excel report" });
        }
    }
};

module.exports = generateInvoiceController;