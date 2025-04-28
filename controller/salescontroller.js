
const Order = require("../model/order")
const fs = require('fs');
const PDFDocument = require('pdfkit');
const path = require('path');
const User = require("../model/user")
const ExcelJS = require('exceljs');
const statusCode = require("../utils/statuscode")


const generateInvoiceController = {
    loadsalesreport: async (req, res) => {
        try {
            const { dateRange, startDate, endDate } = req.query;
            console.log("Selected dates:", req.query);
    
            let query = { "products.status": 'Delivered' };
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
                        // Get the current date
                        const currentDate = new Date();
                        
                        // End date is today at end of day
                        const endOfWeek = new Date(currentDate);
                        endOfWeek.setHours(23, 59, 59, 999);
                        
                        // Start date is 6 days before today at start of day (7 days total including today)
                        const startOfWeek = new Date(currentDate);
                        startOfWeek.setDate(currentDate.getDate() - 6);
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
                    case 'custom':
                        if (startDate && endDate) {
                            const startDateObj = new Date(startDate);
                            startDateObj.setHours(0, 0, 0, 0);
    
                            const endDateObj = new Date(endDate);
                            endDateObj.setHours(23, 59, 59, 999);
    
                            query.createdAt = { $gte: startDateObj, $lt: endDateObj };
                        }
                        break;
                }
            } else if (startDate && endDate) {
                const startDateObj = new Date(startDate);
                startDateObj.setHours(0, 0, 0, 0);
    
                const endDateObj = new Date(endDate);
                endDateObj.setHours(23, 59, 59, 999);
    
                query.createdAt = { $gte: startDateObj, $lt: endDateObj };
            }
    
            console.log("Final query:", JSON.stringify(query));
    
            const orders = await Order.find(query)
                .populate("user", "name email phone")
                .populate("products.product", "name price image");
    
            console.log(`Found ${orders.length} orders matching criteria`);
    
            const totalSales = orders.reduce((total, order) => total + order.finalAmount, 0);
            const totalOrders = orders.length;
    
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
            console.log("Error in loadsalesreport:", error);
            res.status(statusCode.INTERNAL_SERVER_ERROR).json({ message: "Internal Server Error" });
        }
    },

    downloadInvoice: async (req, res) => {
        try {
            const { period, date, format, startDate, endDate } = req.query;
            console.log("downloadInvoice request parameters:", req.query);
            
            if (!period) {
                return res.status(statusCode.BAD_REQUEST).json({ status: "error", message: "Period is required" });
            }
            
            let queryStartDate, queryEndDate;
            const now = new Date();
            
            // Use the same date filtering logic as in loadsalesreport
            switch (period) {
                case "today":
                    queryStartDate = new Date(now);
                    queryStartDate.setHours(0, 0, 0, 0);
                    queryEndDate = new Date(now);
                    queryEndDate.setHours(23, 59, 59, 999);
                    break;
                    
                case "week":
                    // End date is today at end of day
                    queryEndDate = new Date(now);
                    queryEndDate.setHours(23, 59, 59, 999);
                    
                    // Start date is 6 days before today (7 days total including today)
                    queryStartDate = new Date(now);
                    queryStartDate.setDate(queryStartDate.getDate() - 6);
                    queryStartDate.setHours(0, 0, 0, 0);
                    break;
                    
                case "month":
                    queryStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    queryEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                    break;
                    
                case "year":
                    queryStartDate = new Date(now.getFullYear(), 0, 1);
                    queryEndDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                    break;
                    
                case "custom":
                    // For custom range, use the provided start and end dates
                    if (!startDate || !endDate) {
                        return res.status(400).json({ status: "error", message: "Both start date and end date are required for custom range" });
                    }
                    
                    queryStartDate = new Date(startDate);
                    queryStartDate.setHours(0, 0, 0, 0);
                    
                    queryEndDate = new Date(endDate);
                    queryEndDate.setHours(23, 59, 59, 999);
                    break;
                    
                default:
                    return res.status(400).json({ status: "error", message: "Invalid period specified" });
            }
            
            console.log("Using date range for query:", queryStartDate, "to", queryEndDate);
            
            // Get orders within the date range and with delivered products
            const orders = await Order.find({
                createdAt: { $gte: queryStartDate, $lt: queryEndDate },
                "products.status": "Delivered"
            }).populate("user", "name email phone")
                .populate("products.product", "name price image");
            
            console.log(`Found ${orders.length} orders matching criteria`);
            
            if (!orders || orders.length === 0) {
                return res.status(statusCode.NOT_FOUND).json({ status: "error", message: "No orders found for the selected period" });
            }
            
            // For period display in the report, use the applicable date/period
            const periodLabel = period === 'custom' ? 'custom' : period;
            const dateLabel = period === 'custom' ? startDate : (date || new Date().toISOString().split('T')[0]);
            
            if (format === "excel") {
                return await generateInvoiceController.excelGenerate(req, res, orders, periodLabel, dateLabel);
            } else {
                return await generateInvoiceController.generateInvoice(req, res, orders, periodLabel, dateLabel);
            }
        } catch (error) {
            console.log("Error in downloadInvoice:", error);
            res.status(statusCode>statusCode.INTERNAL_SERVER_ERROR).json({ status: "error", message: "Internal Server Error" });
        }
    },

    generateInvoice: async (req, res, orders, period, date) => {
        try {
            const doc = new PDFDocument();

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=sales-report-${period}-${date}.pdf`);

            doc.pipe(res);

            doc.fontSize(25).text(`Sales Report - ${period.charAt(0).toUpperCase() + period.slice(1)}`, {
                align: 'center'
            });
            doc.moveDown();

            const startDate = new Date(date);
            let endDateText = '';

            switch (period) {
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
                case 'custom':
                    // For custom, the date is the start date, and we need to get end date from the request
                    const endDateParam = req.query.endDate;
                    if (endDateParam) {
                        const endDate = new Date(endDateParam);
                        endDateText = `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;
                    } else {
                        endDateText = `Starting from ${startDate.toLocaleDateString()}`;
                    }
                    break;
                default:
                    endDateText = startDate.toLocaleDateString();
            }

            doc.fontSize(12).text(`Period: ${endDateText}`, {
                align: 'left'
            });
            doc.moveDown();

            doc.fontSize(16).text('Summary', {
                underline: true
            });
            doc.moveDown();

            const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);

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

            doc.addPage();
            doc.fontSize(16).text('Order Details', {
                underline: true
            });
            doc.moveDown();

            const tableTop = doc.y;
            const tableLeft = 50;
            const colWidths = [120, 80, 120, 80, 100];
            const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);

            const headers = ['Order ID', 'Date', 'Customer', 'Amount', 'Status'];
            let xPos = tableLeft;

            doc.fontSize(10).font('Helvetica-Bold');
            headers.forEach((header, i) => {
                doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
                xPos += colWidths[i];
            });

            doc.moveTo(tableLeft, tableTop + 20)
                .lineTo(tableLeft + tableWidth, tableTop + 20)
                .stroke();

            let yPos = tableTop + 30;

            doc.font('Helvetica');
            orders.forEach((order, index) => {
                if (yPos > doc.page.height - 100) {
                    doc.addPage();
                    yPos = 50;

                    xPos = tableLeft;
                    doc.fontSize(10).font('Helvetica-Bold');
                    headers.forEach((header, i) => {
                        doc.text(header, xPos, yPos, { width: colWidths[i], align: 'left' });
                        xPos += colWidths[i];
                    });

                    doc.moveTo(tableLeft, yPos + 20)
                        .lineTo(tableLeft + tableWidth, yPos + 20)
                        .stroke();

                    yPos += 30;
                    doc.font('Helvetica');
                }

                let orderId = order._id.toString();

                const orderDate = new Date(order.createdAt).toLocaleDateString();

                const customerName = order.user && order.user.name ? order.user.name : 'Guest';

                const amount = `₹${order.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

                const status = "Delivered";

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

                yPos += 20;
                doc.moveTo(tableLeft, yPos - 5)
                    .lineTo(tableLeft + tableWidth, yPos - 5)
                    .stroke({ opacity: 0.2 });
            });

            doc.fontSize(8)
                .text(`Generated on ${new Date().toLocaleString()}`, {
                    align: 'center',
                    bottom: 30
                });

            doc.end();
        } catch (error) {
            console.error("Error generating PDF:", error);
            res.status(statusCode.INTERNAL_SERVER_ERROR).json({ status: "error", message: "Failed to generate PDF" });
        }
    },

    excelGenerate: async (req, res, orders, period, date) => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Sales Report');

            worksheet.mergeCells('A1:E1');
            const titleCell = worksheet.getCell('A1');
            titleCell.value = `Sales Report - ${period.charAt(0).toUpperCase() + period.slice(1)}`;
            titleCell.font = {
                size: 16,
                bold: true
            };
            titleCell.alignment = { horizontal: 'center' };

            // Set period text based on period type
            let periodText = '';
            const startDate = new Date(date);
            
            switch (period) {
                case 'today':
                    periodText = startDate.toLocaleDateString();
                    break;
                case 'week':
                    const endWeek = new Date(startDate);
                    endWeek.setDate(startDate.getDate() + 6);
                    periodText = `${startDate.toLocaleDateString()} to ${endWeek.toLocaleDateString()}`;
                    break;
                case 'month':
                    periodText = `${startDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`;
                    break;
                case 'year':
                    periodText = startDate.getFullYear().toString();
                    break;
                case 'custom':
                    // For custom, the date is the start date, and we need to get end date from the request
                    const endDateParam = req.query.endDate;
                    if (endDateParam) {
                        const endDate = new Date(endDateParam);
                        periodText = `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;
                    } else {
                        periodText = `Starting from ${startDate.toLocaleDateString()}`;
                    }
                    break;
                default:
                    periodText = startDate.toLocaleDateString();
            }

            worksheet.mergeCells('A2:E2');
            const dateCell = worksheet.getCell('A2');
            dateCell.value = `Period: ${periodText}`;
            dateCell.font = {
                size: 12
            };
            dateCell.alignment = { horizontal: 'center' };

            worksheet.mergeCells('A4:B4');
            worksheet.getCell('A4').value = 'Summary';
            worksheet.getCell('A4').font = {
                bold: true,
                size: 14
            };

            const totalSales = orders.reduce((sum, order) => sum + order.finalAmount , 0);

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

            const headerRow = 10;

            worksheet.getCell(`A${headerRow}`).value = 'Order ID';
            worksheet.getCell(`B${headerRow}`).value = 'Date';
            worksheet.getCell(`C${headerRow}`).value = 'Customer';
            worksheet.getCell(`D${headerRow}`).value = 'Amount';
            worksheet.getCell(`E${headerRow}`).value = 'Status';

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

            worksheet.getColumn('A').width = 30;
            worksheet.getColumn('B').width = 15;
            worksheet.getColumn('C').width = 25;
            worksheet.getColumn('D').width = 15;
            worksheet.getColumn('E').width = 15;

            let rowIndex = headerRow + 1;
            orders.forEach(order => {
                worksheet.getCell(`A${rowIndex}`).value = order._id.toString();
                worksheet.getCell(`B${rowIndex}`).value = new Date(order.createdAt).toLocaleDateString();
                worksheet.getCell(`C${rowIndex}`).value = order.user && order.user.name ? order.user.name : 'Guest';
                worksheet.getCell(`D${rowIndex}`).value = `₹${order.finalAmount .toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
                worksheet.getCell(`E${rowIndex}`).value = 'Delivered';

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

            rowIndex += 2;
            worksheet.mergeCells(`A${rowIndex}:E${rowIndex}`);
            worksheet.getCell(`A${rowIndex}`).value = `Generated on ${new Date().toLocaleString()}`;
            worksheet.getCell(`A${rowIndex}`).alignment = { horizontal: 'center' };
            worksheet.getCell(`A${rowIndex}`).font = {
                italic: true,
                size: 10
            };

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=sales-report-${period}-${date}.xlsx`);

            await workbook.xlsx.write(res);
            res.end();
        } catch (error) {
            console.error("Error generating Excel:", error);
            res.status(statusCode.INTERNAL_SERVER_ERROR).json({ status: "error", message: "Failed to generate Excel report" });
        }
    }
};

module.exports = generateInvoiceController;
// module.exports = generateInvoiceController;