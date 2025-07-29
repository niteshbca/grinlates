const Entries = require('../models/inventory.schema')
const jwt = require('jsonwebtoken')
const gsnEntries = require('../models/gsnInventry.Schema')

require("dotenv").config()

const handler = {

    uploaddata:
        async function (req, res) {
            try { 
                console.log("=== Starting uploaddata handler ===");
                console.log("Request body:", req.body);
                console.log("Request files:", req.files ? Object.keys(req.files) : "No files");
                
                // Extract data from request
                const { 
                    grinNo, grinDate, gsn, gsnDate, poNo, poDate, 
                    partyName, innoviceno, innoviceDate, receivedFrom, 
                    lrNo, lrDate, transName, vehicleNo, 
                    materialInfo, tableData,
                    // Extract new fields
                    gstNo, cgst, sgst, companyName, address, mobileNo,
                    totalAmount, isNewEntry // Add isNewEntry flag
                } = req.body;
                
                // Log extracted new fields
                console.log("Backend Extracted - GST:", gstNo, "CGST:", cgst, "SGST:", sgst);
                console.log("Backend Extracted - Company:", companyName, "Address:", address, "Mobile:", mobileNo);
                console.log("Backend Extracted - Total Amount:", totalAmount);
                console.log("Is New Entry:", isNewEntry);

                // Parse totalAmount as a number
                const parsedTotalAmount = parseFloat(totalAmount) || 0;
                console.log("Parsed Total Amount:", parsedTotalAmount);

                // Validate required fields
                if (!grinNo || !partyName) {
                    console.error("Missing required fields");
                    return res.status(400).json({ message: 'Missing required fields' });
                }
                
                // Handle optional bill file
                let billFilePath = null;
                if (req.files && req.files.file && req.files.file.length > 0) {
                    const billFile = req.files.file[0];
                    billFilePath = `files/${billFile.filename}`;
                    console.log("Bill file path:", billFilePath);
                }

                // Check for the optional photo file
                let photoPath = null;
                if (req.files.photo && req.files.photo.length > 0) {
                    const photoFile = req.files.photo[0];
                    photoPath = `Entryphotos/${photoFile.filename}`;
                    console.log("Photo file path:", photoPath);
                } else {
                    console.log("No photo file uploaded");
                }

                // Parse tableData if it's a string
                let parsedTableData;
                try {
                    parsedTableData = typeof tableData === 'string' ? JSON.parse(tableData) : tableData;
                    console.log("Table data parsed successfully");
                } catch (parseError) {
                    console.error("Error parsing tableData:", parseError);
                    return res.status(400).json({ message: 'Invalid tableData format', error: parseError.message });
                }

                // Always create a new entry
                console.log("Creating new inventory entry");
                const newInventory = new Entries({
                    grinNo,
                    grinDate,
                    gsn,
                    gsnDate,
                    poNo,
                    poDate,
                    partyName,
                    innoviceno,
                    innoviceDate,
                    receivedFrom,
                    lrNo,
                    lrDate,
                    transName,
                    vehicleNo,
                    file: billFilePath,
                    photoPath: photoPath,
                    materialInfo,
                    tableData: parsedTableData,
                    gstNo, cgst, sgst, companyName, address, mobileNo,
                    totalAmount: parsedTotalAmount
                });

                // Log parsed table data before saving new entry
                console.log("Backend: parsedTableData before save (new entry):", parsedTableData);
                console.log("Backend Saving (GRIN - New):", newInventory);

                await newInventory.save();
                console.log("Entry saved successfully");
                res.status(201).json({ message: 'Inventory added successfully', inventory: newInventory });
                
            } catch (err) {
                console.error("Error in adding details:", err);
                if (err.name === 'ValidationError') {
                    console.error("Validation error details:", err.errors);
                    return res.status(400).json({ 
                        message: 'Validation error', 
                        error: err.message,
                        details: Object.keys(err.errors).map(key => ({
                            field: key,
                            message: err.errors[key].message
                        }))
                    });
                }
                
                if (err.name === 'MongoError' || err.name === 'MongoServerError') {
                    console.error("MongoDB error:", err.code);
                    return res.status(500).json({ 
                        message: 'Database error', 
                        error: err.message 
                    });
                }
                
                res.status(500).json({ message: 'Server error', error: err.message });
            }
        },
    getting: async function (req, res) {
        try {
            const data = await Entries.find()

            if (!data) {
                return res.send(404).send("data not found")
            }
            const token = jwt.sign({ data }, process.env.SECRET_KEY, { expiresIn: "1hr" })

            return res.status(200).send(data);
        } catch (err) {
            return res.status(404).send("error in fetching")
        }
    },

    updateVerificationStatus: async function (req, res) {
        console.log("Request from the frontend coming........", req.body);
        const { partyName, managerType, status, fieldName } = req.body;

        if (!partyName) {
            return res.status(400).json({ message: 'Party name is required' });
        }

    const managerFieldMap = {
      'General Manager': 'GeneralManagerSigned',
      'Store Manager': 'StoreManagerSigned',
      'Purchase Manager': 'PurchaseManagerSigned',
      'Account Manager': 'AccountManagerSigned',
      'Auditor': 'AuditorSigned'
    };
  
    try {
            // Determine the field to update based on the managerType
            const updateField = fieldName || managerFieldMap[managerType];
      if (!updateField) {
                return res.status(400).json({ message: 'Invalid manager type' });
      }

            console.log('Updating field:', updateField);
            console.log('Party Name:', partyName);
            console.log('Status:', status);
      
            // Prepare update payload
            const updatePayload = {
        [updateField]: status === 'checked'
      };
  
            // First check if documents exist
            const [gsnDocs, grnDocs] = await Promise.all([
                gsnEntries.find({ partyName: partyName }),
                Entries.find({ partyName: partyName })
            ]);

            console.log('Found GSN documents:', gsnDocs.length);
            console.log('Found GRN documents:', grnDocs.length);
  
            // Update both GSN and GRN documents
            const [gsnResult, grnResult] = await Promise.all([
                gsnEntries.updateMany(
                    { partyName: partyName },
                    { $set: updatePayload }
                ),
                Entries.updateMany(
                    { partyName: partyName },
                    { $set: updatePayload }
                )
            ]);

            console.log('GSN Update Result:', gsnResult);
            console.log('GRN Update Result:', grnResult);

            // Check if at least one type of document was found and updated
            const totalUpdated = gsnResult.modifiedCount + grnResult.modifiedCount;
            const totalMatched = gsnResult.matchedCount + grnResult.matchedCount;

            if (totalMatched === 0) {
                return res.status(404).json({ 
                    message: 'No documents found for this party',
                    partyName: partyName,
                    gsnCount: gsnDocs.length,
                    grnCount: grnDocs.length
                });
            }
  
            return res.status(200).json({ 
                message: 'Verification status updated successfully',
                gsnUpdated: gsnResult.modifiedCount,
                grnUpdated: grnResult.modifiedCount,
                totalUpdated: totalUpdated,
                partyName: partyName
            });
    } catch (err) {
      console.error("Error updating verification status", err);
            return res.status(500).json({ 
                message: 'Server error', 
                error: err.message,
                partyName: partyName
            });
    }
  }
}

module.exports = handler
