const gsnEntries = require('../models/gsnInventry.Schema');

// GET /api/suppliers
exports.getSuppliers = async (req, res) => {
  try {
    const suppliers = await gsnEntries.find({}, {
      partyName: 1,
      address: 1,
      gstNo: 1,
      mobileNo: 1,
      _id: 0
    });
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
};

// GET /api/supplier-details?partyName=...
exports.getSupplierDetails = async (req, res) => {
  try {
    const { partyName } = req.query;
    if (!partyName) return res.status(400).json({ error: 'partyName is required' });
    const entries = await gsnEntries.find({ partyName }, { gsn: 1, grinNo: 1, _id: 0 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch supplier details' });
  }
};

// PUT /api/supplier/:partyName
exports.updateSupplier = async (req, res) => {
  try {
    const { partyName } = req.params;
    const { partyName: newPartyName, address, gstNo, mobileNo } = req.body;
    const result = await gsnEntries.updateMany(
      { partyName },
      { $set: { partyName: newPartyName, address, gstNo, mobileNo } }
    );
    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: 'No supplier found to update' });
    }
    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Failed to update supplier' });
  }
};

// DELETE /api/supplier/:partyName
exports.deleteSupplier = async (req, res) => {
  try {
    const { partyName } = req.params;
    const result = await gsnEntries.deleteMany({ partyName });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
}; 