import React, { useEffect, useState } from 'react';
import styles from '../../Components/Approval/Approval.module.css';
import axios from 'axios';
import TableComponent from '../../Components/Table/Table.rendering';
import LogOutComponent from '../LogOut/LogOutComponent';
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import Modal from 'react-modal';
import TableEntry from '../../Components/Table/TableEntry';

// Format date function
const formatDate = (oldFormat) => {
    if (!oldFormat) return "N/A";
    const date = new Date(oldFormat);
    const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const formattedTime = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
    });
    return `${formattedDate}, ${formattedTime}`;
};

// Add a new function to format date only with year
const formatDateOnly = (oldFormat) => {
    if (!oldFormat) return "N/A";
    const date = new Date(oldFormat);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

// Add a new function to format time only
const formatTimeOnly = (oldFormat) => {
    if (!oldFormat) return "N/A";
    const date = new Date(oldFormat);
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
    });
};

export default function ViewForm({ managerType }) {
    const [visibleItem, setVisibleItem] = useState(null);
    const [combinedList, setCombinedList] = useState([]);
    const url = process.env.REACT_APP_BACKEND_URL;

    // State for search
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredCombinedList, setFilteredCombinedList] = useState([]);

    const isImageFile = (filename) => {
        if (!filename) return false;
        const extension = filename.split('.').pop().toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension);
    };
   
    const handleDownloadPDF = (index, groupIndex) => {
        const divElement = document.getElementById(`div-${index}-group-${groupIndex}`);
        if (!divElement) return;

        const partyName = combinedList[index]?.partyName || `document-${index}`;
        const sanitizedPartyName = partyName.replace(/[^a-zA-Z0-9]/g, '_');

        // Select elements to hide, including the bill details link/image wrappers
        const elementsToHide = divElement.querySelectorAll('.hide-in-pdf'); 
        const downloadButton = divElement.querySelector('.download-pdf-button');
        
        const originalDisplayValues = {
            elementsToHide: Array.from(elementsToHide).map(el => el.style.display),
            downloadButton: downloadButton ? downloadButton.style.display : null
        };

        elementsToHide.forEach(el => {
            el.style.display = 'none';
        });
        if (downloadButton) {
            downloadButton.style.display = 'none';
        }

        setTimeout(() => {
            html2canvas(divElement, { 
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            }).then((canvas) => {
                const imgData = canvas.toDataURL("image/png");
                const pdf = new jsPDF("p", "mm", "a4");
                const imgWidth = 210;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                let position = 0;
                const pageHeight = 295;
                let heightLeft = imgHeight;

                pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;

                while (heightLeft >= 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;
                }
                
                pdf.save(`${sanitizedPartyName}_Group${groupIndex + 1}_Approved.pdf`);

                // Restore display
                elementsToHide.forEach((el, i) => {
                    el.style.display = originalDisplayValues.elementsToHide[i];
                });
                if (downloadButton) {
                    downloadButton.style.display = originalDisplayValues.downloadButton;
                }
            }).catch(err => {
                console.error("Error generating PDF:", err);
                // Restore display on error
                elementsToHide.forEach((el, i) => {
                    el.style.display = originalDisplayValues.elementsToHide[i];
                });
                if (downloadButton) {
                    downloadButton.style.display = originalDisplayValues.downloadButton;
                }
            });
        }, 100);
    };
  
    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const url = process.env.REACT_APP_BACKEND_URL;
                
                const [gsnResponse, grnResponse] = await Promise.all([
                    axios.get(`${url}/gsn/getdata`, {
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        }
                    }),
                    axios.get(`${url}/entries/getdata1`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    })
                ]);

                // Sort individual lists first
                const sortedGsnData = (gsnResponse.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                const sortedGrnData = (grnResponse.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

                console.log('Sorted GSN Data:', sortedGsnData);
                console.log('Sorted GRN Data:', sortedGrnData);

                const combined = {};
                
                // Process sorted GSN documents
                (sortedGsnData).forEach(doc => {
                    if (doc.isHidden) return;

                    if (!combined[doc.partyName]) {
                        combined[doc.partyName] = {
                            partyName: doc.partyName,
                            gsnDocuments: [],
                            grnDocuments: [],
                            GeneralManagerSigned: doc.GeneralManagerSigned,
                            StoreManagerSigned: doc.StoreManagerSigned,
                            PurchaseManagerSigned: doc.PurchaseManagerSigned,
                            AccountManagerSigned: doc.AccountManagerSigned,
                            AuditorSigned: doc.AuditorSigned
                        };
                    }
                    combined[doc.partyName].gsnDocuments.push(doc);
                    if (combined[doc.partyName].GeneralManagerSigned === undefined) combined[doc.partyName].GeneralManagerSigned = doc.GeneralManagerSigned;
                    if (combined[doc.partyName].StoreManagerSigned === undefined) combined[doc.partyName].StoreManagerSigned = doc.StoreManagerSigned;
                    if (combined[doc.partyName].PurchaseManagerSigned === undefined) combined[doc.partyName].PurchaseManagerSigned = doc.PurchaseManagerSigned;
                    if (combined[doc.partyName].AccountManagerSigned === undefined) combined[doc.partyName].AccountManagerSigned = doc.AccountManagerSigned;
                    if (combined[doc.partyName].AuditorSigned === undefined) combined[doc.partyName].AuditorSigned = doc.AuditorSigned;
                });

                // Process sorted GRN documents
                (sortedGrnData).forEach(doc => {
                    if (doc.isHidden) return;

                    if (!combined[doc.partyName]) {
                        combined[doc.partyName] = {
                            partyName: doc.partyName,
                            gsnDocuments: [],
                            grnDocuments: [],
                            GeneralManagerSigned: doc.GeneralManagerSigned,
                            StoreManagerSigned: doc.StoreManagerSigned,
                            PurchaseManagerSigned: doc.PurchaseManagerSigned,
                            AccountManagerSigned: doc.AccountManagerSigned,
                            AuditorSigned: doc.AuditorSigned
                        };
                    }
                    combined[doc.partyName].grnDocuments.push(doc);
                    if (combined[doc.partyName].GeneralManagerSigned === undefined) combined[doc.partyName].GeneralManagerSigned = doc.GeneralManagerSigned;
                    if (combined[doc.partyName].StoreManagerSigned === undefined) combined[doc.partyName].StoreManagerSigned = doc.StoreManagerSigned;
                    if (combined[doc.partyName].PurchaseManagerSigned === undefined) combined[doc.partyName].PurchaseManagerSigned = doc.PurchaseManagerSigned;
                    if (combined[doc.partyName].AccountManagerSigned === undefined) combined[doc.partyName].AccountManagerSigned = doc.AccountManagerSigned;
                    if (combined[doc.partyName].AuditorSigned === undefined) combined[doc.partyName].AuditorSigned = doc.AuditorSigned;
                });

                const combinedListData = Object.values(combined);

                // Function to get the latest createdAt from a group
                const getLatestDate = (item) => {
                    const dates = [
                        ...(item.gsnDocuments || []).map(d => new Date(d.createdAt)),
                        ...(item.grnDocuments || []).map(d => new Date(d.createdAt))
                    ].filter(d => !isNaN(d)); // Filter out invalid dates
                    return dates.length > 0 ? Math.max(...dates.map(d => d.getTime())) : 0; // Use getTime() for comparison
                };

                // Sort the final combined list
                combinedListData.sort((a, b) => getLatestDate(b) - getLatestDate(a));

                console.log('Sorted Combined List Data:', combinedListData);
                setCombinedList(combinedListData);

            } catch (error) {
                console.error('Error fetching data:', error);
                console.error('Error details:', error.response?.data);
            }
        };

        fetchData();
    }, []);

    // useEffect for filtering based on searchTerm
    useEffect(() => {
        let filtered = combinedList;
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            filtered = combinedList.filter(item => {
                // Check party name
                const partyNameMatch = item.partyName.toLowerCase().includes(searchLower);
                
                // Check GRN/GRIN in both GSN and GRN documents
                const gsnMatch = item.gsnDocuments.some(doc => 
                    (doc.grinNo && doc.grinNo.toLowerCase().includes(searchLower)) ||
                    (doc.gsn && doc.gsn.toLowerCase().includes(searchLower))
                );
                
                const grnMatch = item.grnDocuments.some(doc => 
                    (doc.grinNo && doc.grinNo.toLowerCase().includes(searchLower)) ||
                    (doc.gsn && doc.gsn.toLowerCase().includes(searchLower))
                );

                return partyNameMatch || gsnMatch || grnMatch;
            });
        }
        setFilteredCombinedList(filtered);
    }, [searchTerm, combinedList]);

    const showHandler = (index) => {
        setVisibleItem(visibleItem === index ? null : index);
    };
    
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editPartyData, setEditPartyData] = useState(null);
    const [editTableData, setEditTableData] = useState([]);

    // Delete Party Handler
    const handleDeleteParty = async (partyName) => {
        if (!window.confirm(`Are you sure you want to delete all records for party: ${partyName}?`)) return;
        try {
            const token = localStorage.getItem('authToken');
            await axios.delete(`${url}/gsn/upload-data/delete-by-party/${encodeURIComponent(partyName)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            await axios.delete(`${url}/entries/delete-by-party/${encodeURIComponent(partyName)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setCombinedList(prev => prev.filter(item => item.partyName !== partyName));
            setFilteredCombinedList(prev => prev.filter(item => item.partyName !== partyName));
            alert('Party deleted successfully!');
        } catch (err) {
            let msg = 'Error deleting party.';
            if (err.response && err.response.data && err.response.data.message) {
                msg += ' ' + err.response.data.message;
            }
            alert(msg);
            console.error(err);
        }
    };
    // Edit Party Handler
    const handleEditParty = (partyName) => {
        // Find the latest GSN or GRN document for this party
        const party = combinedList.find(item => item.partyName === partyName);
        let latestDoc = null;
        if (party) {
            const allDocs = [...(party.gsnDocuments || []), ...(party.grnDocuments || [])];
            latestDoc = allDocs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        }
        setEditPartyData({ ...latestDoc });
        setEditTableData(latestDoc?.tableData ? [...latestDoc.tableData] : []);
        setEditModalOpen(true);
    };
    // Save Edit Handler
    const handleEditTableChange = (index, field, value) => {
        setEditTableData(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            // Calculate total for the row
            if (field === 'quantityNo' || field === 'price') {
                const quantityNo = parseFloat(updated[index].quantityNo) || 0;
                const price = parseFloat(updated[index].price) || 0;
                updated[index].total = quantityNo * price;
            }
            return updated;
        });
    };
    const handleSaveEdit = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const updatedData = { ...editPartyData, tableData: editTableData };
            await axios.put(`${url}/gsn/upload-data/update-by-party/${encodeURIComponent(editPartyData.partyName)}`, updatedData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            await axios.put(`${url}/entries/update-by-party/${encodeURIComponent(editPartyData.partyName)}`, updatedData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setEditModalOpen(false);
            alert('Party updated successfully!');
            window.location.reload();
        } catch (err) {
            alert('Error updating party.');
            console.error(err);
        }
    };

    const renderDocument = (item, index) => {
        const { partyName, gsnDocuments, grnDocuments, 
                GeneralManagerSigned, StoreManagerSigned, 
                PurchaseManagerSigned, AccountManagerSigned, AuditorSigned } = item;
                
        console.log(`Rendering party: ${partyName}, Signatures:`, { GeneralManagerSigned, StoreManagerSigned, PurchaseManagerSigned, AccountManagerSigned, AuditorSigned });

        const isApprovedByAllFive = !!GeneralManagerSigned && !!StoreManagerSigned && !!PurchaseManagerSigned && !!AccountManagerSigned && !!AuditorSigned;
        const statusText = isApprovedByAllFive ? "(Approved)" : "(Pending Approval)";

        return (
            <div 
                key={index} 
                id={`div-${index}`} 
                className="generated-div" 
                style={{
                   
                }}
            >
                {/* Edit/Delete Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '5px' }}>
                    <button onClick={() => handleEditParty(item.partyName)} style={{ background: '#ffc107', color: '#333', border: 'none', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => handleDeleteParty(item.partyName)} style={{ background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer' }}>Delete</button>
                </div>
                <div className={styles.show}>
                    <h2 onClick={() => showHandler(index)} style={{ cursor: 'pointer', color:'black' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ 
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '5px',
                                borderRight: '1px solid #ccc',
                                paddingRight: '15px',
                                marginRight: '15px'
                            }}>
                                <span style={{ fontSize: '0.9em', color: '#666' }}>
                                    GSN: {gsnDocuments[0]?.gsn || 'N/A'}
                                </span>
                                <span style={{ fontSize: '0.9em', color: '#666' }}>
                                    GRIN: {gsnDocuments[0]?.grinNo || 'N/A'}
                            </span>
                                <span style={{ fontSize: '0.9em', color: '#666' }}>
                                    DATE: {gsnDocuments[0]?.grinDate ? formatDateOnly(gsnDocuments[0].grinDate) : 'N/A'}
                            </span>
                                <span style={{ fontSize: '0.9em', color: '#666' }}>
                                    TIME: {gsnDocuments[0]?.grinDate ? formatTimeOnly(gsnDocuments[0].grinDate) : 'N/A'}
                            </span>
                            </div>
                            <span style={{ 
                                fontSize: '1.1em',
                                fontWeight: '500'
                            }}>
                        Party Name: {partyName}
                            </span>
                        <span style={{ marginLeft: '10px', fontSize: '0.8em', color: isApprovedByAllFive ? 'green' : 'green' }}>
                            {statusText}
                        </span>
                        </div>
                    </h2>
                    <div className={styles.completeBlock} style={{ display: visibleItem === index ? 'block' : 'none' }}>
                        {/* Group GSN and GRIN documents by their order */}
                        {(() => {
                            const maxLength = Math.max(gsnDocuments.length, grnDocuments.length);
                            const groups = [];

                            for (let i = 0; i < maxLength; i++) {
                                const gsnDoc = gsnDocuments[i];
                                const grnDoc = grnDocuments[i];
                                
                                if (gsnDoc || grnDoc) {
                                    groups.push(
                                        <div key={`group-${i}`} id={`div-${index}-group-${i}`} className={styles.grinDetails}>
                                            <h3 style={{ textAlign: 'center', margin: '0 0 20px 0' }}>
                                                Group {i + 1} Documents
                                            </h3>

                                            {/* GSN Document */}
                                            {gsnDoc && (
                                                <div style={{ backgroundColor: 'rgba(218, 216, 224, 0.2)', borderRadius: '8px', padding: '15px', marginBottom: '15px' }}>
                                                    <h4 style={{ textAlign: 'center', margin: '0 0 15px 0' }}>GSN Document</h4>
                                                    <div><label htmlFor=""><h5>GSN Details</h5></label></div>
                                                    <table>
                                                        <thead>
                                                            <tr>
                                                                <th>GRIN NO.</th>
                                                                <th>Date</th>
                                                                <th>GSN</th>
                                                                <th>Date</th>
                                                                <th>P.O. No.</th>
                                                                <th>Date</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr>
                                                                <td>{gsnDoc.grinNo}</td>
                                                                <td>{gsnDoc.grinDate}</td>
                                                                <td>{gsnDoc.gsn}</td>
                                                                <td>{gsnDoc.gsnDate}</td>
                                                                <td>{gsnDoc.poNo}</td>
                                                                <td>{gsnDoc.poDate}</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>

                                                    <div className={styles.grinDetails}>
                                                        <label htmlFor=""><h5>Party Details</h5></label>
                                                        <table>
                                                            <thead>
                                                                <tr>
                                                                    <th>Party Name</th>
                                                                    <th>Company Name</th>
                                                                    <th>Party Invoice No.</th>
                                                                    <th>Date</th>
                                                                    <th>Address</th>
                                                                    <th>GST No</th>
                                                                    <th>Mobile No</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                <tr>
                                                                    <td>{gsnDoc.partyName}</td>
                                                                    <td>{gsnDoc.companyName || 'N/A'}</td>
                                                                    <td>{gsnDoc.innoviceno}</td>
                                                                    <td>{gsnDoc.innoviceDate}</td>
                                                                    <td>{gsnDoc.address || 'N/A'}</td>
                                                                    <td>{gsnDoc.gstNo || 'N/A'}</td>
                                                                    <td>{gsnDoc.mobileNo || 'N/A'}</td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                    <div className={styles.grinDetails}>
                                                        <label htmlFor=""><h5>Transport Details</h5></label>
                                                        <table>
                                                            <thead>
                                                                <tr>
                                                                    <th>L.R. No.</th>
                                                                    <th>Transporter Name</th>
                                                                    <th>Vehicle No.</th>
                                                                    <th>L.R. Date</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                <tr>
                                                                    <td>{gsnDoc.lrNo}</td>
                                                                    <td>{gsnDoc.transName}</td>
                                                                    <td>{gsnDoc.vehicleNo}</td>
                                                                    <td>{gsnDoc.lrDate}</td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                    {gsnDoc.tableData && gsnDoc.tableData.length > 0 && (
                                                        <div style={{
                                                            border: "1px solid #ccc",
                                                            width: "90%",
                                                            margin: "2% auto",
                                                            padding: "20px",
                                                            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                                                            borderRadius: "8px",
                                                            backgroundColor: 'rgba(218, 216, 224, 0.6)',
                                                            fontFamily: "'Arial', sans-serif",
                                                            fontSize: "16px",
                                                            lineHeight: "1.6",
                                                            boxSizing: "border-box",
                                                            maxWidth: "1200px",
                                                            overflowWrap: "break-word",
                                                        }}>
                                                            <h5 style={{ textAlign: "center" }}>Material List (GSN/GRIN)</h5>
                                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                                <thead>
                                                                    <tr>
                                                                        <th>Sr. No.</th>
                                                                        <th>Item</th>
                                                                        <th>Description</th>
                                                                        <th>Qnt. No.</th>
                                                                        <th>Qnt. in Kgs</th>
                                                                        <th>Price Per Unit</th>
                                                                        <th>Total</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {gsnDoc.tableData.map((row, idx) => (
                                                                        <tr key={idx}>
                                                                            <td>{idx + 1}</td>
                                                                            <td>{row.item}</td>
                                                                            <td>{row.description}</td>
                                                                            <td>{row.quantityNo}</td>
                                                                            <td>{row.quantityKg}</td>
                                                                            <td>{row.price !== undefined ? row.price : 'N/A'}</td>
                                                                            <td>{row.total !== undefined ? row.total : ((parseFloat(row.quantityNo)||0)*(parseFloat(row.price)||0)).toFixed(2)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                    {gsnDoc && (
                                                        <div style={{ marginTop: '20px' }}>
                                                            <label><h5>Amount Details</h5></label>
                                                            <table>
                                                                <thead>
                                                                    <tr>
                                                                        <th>CGST</th>
                                                                        <th>SGST</th>
                                                                        <th>IGST</th>
                                                                        <th>GST Tax</th>
                                                                        <th>Before Tax Total</th>
                                                                        <th>Total Amount</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    <tr>
                                                                        <td>{gsnDoc.cgst || 'N/A'}</td>
                                                                        <td>{gsnDoc.sgst || 'N/A'}</td>
                                                                        <td>{gsnDoc.igst || 'N/A'}</td>
                                                                        <td>{gsnDoc.gstTax !== undefined ? gsnDoc.gstTax : 'N/A'}</td>
                                                                        <td>{gsnDoc.materialTotal !== undefined ? gsnDoc.materialTotal : 'N/A'}</td>
                                                                        <td>{gsnDoc.totalAmount || 'N/A'}</td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}

                                                    {/* CREATED AT (GSN) Card */}
                                                    <div style={{
                                                        marginTop: '20px',
                                                        padding: '10px 15px',
                                                        backgroundColor: 'rgba(252, 185, 0, 0.2)', // A light orange/pinkish background
                                                        borderRadius: '8px',
                                                        textAlign: 'center',
                                                        fontSize: '0.9em',
                                                        color: '#333',
                                                        maxWidth: '250px',
                                                        margin: '20px auto 0 auto' // Center the block
                                                    }}>
                                                        <strong>CREATED AT (GSN)</strong><br/>
                                                        {formatDate(gsnDoc.createdAt) || 'N/A'}
                                                    </div>

                                                    {/* View/Download Bill Button for GSN */}
                                                    {gsnDoc.file && (
                                                        <div style={{ textAlign: 'center', margin: '20px 0' }}>
                                                            <button
                                                                onClick={() => window.open(`${url}/${gsnDoc.file}`, '_blank')}
                                                                style={{
                                                                    padding: '10px 20px',
                                                                    backgroundColor: '#17a2b8',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    borderRadius: '5px',
                                                                    cursor: 'pointer',
                                                                    fontSize: '16px',
                                                                    transition: 'background-color 0.3s ease'
                                                                }}
                                                                onMouseEnter={(e) => e.target.style.backgroundColor = '#138496'}
                                                                onMouseLeave={(e) => e.target.style.backgroundColor = '#17a2b8'}
                                                            >
                                                                View/Download Bill (GSN)
                                                            </button>
                                                        </div>
                                                    )}

                                                    {gsnDoc.photoPath && (
                                                        <div style={{
                                                            width: "90%", margin: "20px auto", padding: "15px", 
                                                            border: "1px solid #ccc", borderRadius: "8px", textAlign: "center",
                                                            backgroundColor: 'rgba(218, 216, 224, 0.6)', 
                                                        }}>
                                                                <h2 style={{ color: "#007bff", fontSize: "24px", marginBottom: "15px" }}>Uploaded Photo (GSN)</h2>
                                                                <img src={`${url}/${gsnDoc.photoPath}`} alt="GSN Uploaded Photo" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '5px' }} />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* GRIN Document */}
                                            {grnDoc && (
                                                <div style={{ backgroundColor: 'rgba(218, 216, 224, 0.2)', borderRadius: '8px', padding: '15px', marginBottom: '15px' }}>
                                                    <h4 style={{ textAlign: 'center', margin: '0 0 15px 0' }}>GRIN Document</h4>
                                                    <div><label htmlFor=""><h5>GRIN Details</h5></label></div>
                                                    <table>
                                                        <thead>
                                                            <tr>
                                                                <th>GRIN NO.</th>
                                                                <th>Date</th>
                                                                <th>GSN</th>
                                                                <th>Date</th>
                                                                <th>P.O. No.</th>
                                                                <th>Date</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr>
                                                                <td>{grnDoc.grinNo}</td>
                                                                <td>{grnDoc.grinDate}</td>
                                                                <td>{grnDoc.gsn}</td>
                                                                <td>{grnDoc.gsnDate}</td>
                                                                <td>{grnDoc.poNo}</td>
                                                                <td>{grnDoc.poDate}</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>

                                                    <div className={styles.grinDetails}>
                                                        <label htmlFor=""><h5>Party Details</h5></label>
                                                        <table>
                                                            <thead>
                                                                <tr>
                                                                    <th>Party Name</th>
                                                                    <th>Company Name</th>
                                                                    <th>Party Invoice No.</th>
                                                                    <th>Date</th>
                                                                    <th>Address</th>
                                                                    <th>GST No</th>
                                                                    <th>Mobile No</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                <tr>
                                                                    <td>{grnDoc.partyName}</td>
                                                                    <td>{grnDoc.companyName || 'N/A'}</td>
                                                                    <td>{grnDoc.innoviceno}</td>
                                                                    <td>{grnDoc.innoviceDate}</td>
                                                                    <td>{grnDoc.address || 'N/A'}</td>
                                                                    <td>{grnDoc.gstNo || 'N/A'}</td>
                                                                    <td>{grnDoc.mobileNo || 'N/A'}</td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                    <div className={styles.grinDetails}>
                                                        <label htmlFor=""><h5>Transport Details</h5></label>
                                                        <table>
                                                            <thead>
                                                                <tr>
                                                                    <th>L.R. No.</th>
                                                                    <th>Transporter Name</th>
                                                                    <th>Vehicle No.</th>
                                                                    <th>L.R. Date</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                <tr>
                                                                    <td>{grnDoc.lrNo}</td>
                                                                    <td>{grnDoc.transName}</td>
                                                                    <td>{grnDoc.vehicleNo}</td>
                                                                    <td>{grnDoc.lrDate}</td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                    {grnDoc.tableData && grnDoc.tableData.length > 0 && (
                                                        <div style={{
                                                            border: "1px solid #ccc",
                                                            width: "90%",
                                                            margin: "2% auto",
                                                            padding: "20px",
                                                            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                                                            borderRadius: "8px",
                                                            backgroundColor: 'rgba(218, 216, 224, 0.6)',
                                                            fontFamily: "'Arial', sans-serif",
                                                            fontSize: "16px",
                                                            lineHeight: "1.6",
                                                            boxSizing: "border-box",
                                                            maxWidth: "1200px",
                                                            overflowWrap: "break-word",
                                                        }}>
                                                            <h5 style={{ textAlign: "center" }}>Material List (GSN/GRIN)</h5>
                                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                                <thead>
                                                                    <tr>
                                                                        <th>Sr. No.</th>
                                                                        <th>Item</th>
                                                                        <th>Description</th>
                                                                        <th>Qnt. No.</th>
                                                                        <th>Qnt. in Kgs</th>
                                                                        <th>Price Per Unit</th>
                                                                        <th>Total</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {grnDoc.tableData.map((row, idx) => (
                                                                        <tr key={idx}>
                                                                            <td>{idx + 1}</td>
                                                                            <td>{row.item}</td>
                                                                            <td>{row.description}</td>
                                                                            <td>{row.quantityNo}</td>
                                                                            <td>{row.quantityKg}</td>
                                                                            <td>{row.price !== undefined ? row.price : 'N/A'}</td>
                                                                            <td>{row.total !== undefined ? row.total : ((parseFloat(row.quantityNo)||0)*(parseFloat(row.price)||0)).toFixed(2)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                    {grnDoc && (
                                                        <div style={{ marginTop: '20px' }}>
                                                            <label><h5>Amount Details</h5></label>
                                                            <table>
                                                                <thead>
                                                                    <tr>
                                                                        <th>CGST</th>
                                                                        <th>SGST</th>
                                                                        <th>IGST</th>
                                                                        <th>GST Tax</th>
                                                                        <th>Before Tax Total</th>
                                                                        <th>Total Amount</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    <tr>
                                                                        <td>{grnDoc.cgst || 'N/A'}</td>
                                                                        <td>{grnDoc.sgst || 'N/A'}</td>
                                                                        <td>{grnDoc.igst || 'N/A'}</td>
                                                                        <td>{grnDoc.gstTax !== undefined ? grnDoc.gstTax : 'N/A'}</td>
                                                                        <td>{grnDoc.materialTotal !== undefined ? grnDoc.materialTotal : 'N/A'}</td>
                                                                        <td>{grnDoc.totalAmount || 'N/A'}</td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}

                                                    {/* CREATED AT (GRIN) Card */}
                                                    <div style={{
                                                        marginTop: '20px',
                                                        padding: '10px 15px',
                                                        backgroundColor: 'rgba(153, 0, 239, 0.2)', // A light purple/pinkish background
                                                        borderRadius: '8px',
                                                        textAlign: 'center',
                                                        fontSize: '0.9em',
                                                        color: '#333',
                                                        maxWidth: '250px',
                                                        margin: '20px auto 0 auto' // Center the block
                                                    }}>
                                                        <strong>CREATED AT (GRIN)</strong><br/>
                                                        {formatDate(grnDoc.createdAt) || 'N/A'}
                                                    </div>

                                                    {/* View/Download Bill Button for GRIN */}
                                                    {grnDoc.file && (
                                                        <div style={{ textAlign: 'center', margin: '20px 0' }}>
                                                            <button
                                                                onClick={() => window.open(`${url}/${grnDoc.file}`, '_blank')}
                                                                style={{
                                                                    padding: '10px 20px',
                                                                    backgroundColor: '#17a2b8',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    borderRadius: '5px',
                                                                    cursor: 'pointer',
                                                                    fontSize: '16px',
                                                                    transition: 'background-color 0.3s ease'
                                                                }}
                                                                onMouseEnter={(e) => e.target.style.backgroundColor = '#138496'}
                                                                onMouseLeave={(e) => e.target.style.backgroundColor = '#17a2b8'}
                                                            >
                                                                View/Download Bill (GRIN)
                                                            </button>
                                                        </div>
                                                    )}

                                                    {grnDoc.photoPath && (
                                                        <div style={{
                                                            width: "90%", margin: "20px auto", padding: "15px", 
                                                            border: "1px solid #ccc", borderRadius: "8px", textAlign: "center",
                                                            backgroundColor: 'rgba(218, 216, 224, 0.6)', 
                                                        }}>
                                                                <h2 style={{ color: "#007bff", fontSize: "24px", marginBottom: "15px" }}>Uploaded Photo (GRIN)</h2>
                                                                <img src={`${url}/${grnDoc.photoPath}`} alt="GRIN Uploaded Photo" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '5px' }} />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Download button for this group */}
                                            {isApprovedByAllFive && (
                                                <button 
                                                    onClick={() => handleDownloadPDF(index, i)} 
                                                    className="download-pdf-button hide-in-pdf"
                                                    style={{ 
                                                        marginTop: "10px", 
                                                        padding: "5px 10px", 
                                                        marginBottom: "20px",
                                                        background: "#17a2b8",
                                                        color: "white", 
                                                        border: "none", 
                                                        cursor: "pointer",
                                                        display: "block" 
                                                    }}
                                                >
                                                    Download Group {i + 1} PDF
                                                </button>
                                            )}
                                        </div>
                                    );
                                }
                            }

                            return groups;
                        })()}
                    </div>

                    {/* Approval Section */}
                    <div className={`${styles.sign} hide-in-pdf`} style={{ 
                        backgroundColor: 'rgba(218, 216, 224, 0.2)', 
                        border: "1px solid #ccc",
                        borderRadius: "10px",
                        marginTop: "20px",
                        padding: '10px'
                    }}>
                        <form style={{ padding: '10px', display: 'flex', justifyContent: 'space-around', alignItems: "center", flexWrap: 'wrap' }}>
                            <div className={styles.submission} style={{ display: 'flex', justifyContent: 'space-around', width: '100%' }}>
                                <div style={{ textAlign: 'center', margin: '5px' }}>
                                    <label><h6>General Manager</h6></label><br/>
                                    <input type="checkbox" checked={!!GeneralManagerSigned} readOnly disabled style={{ transform: 'scale(1.5)', cursor: 'not-allowed' }}/>
                                </div>
                                <div style={{ textAlign: 'center', margin: '5px' }}>
                                    <label><h6>Store Manager</h6></label><br/>
                                    <input type="checkbox" checked={!!StoreManagerSigned} readOnly disabled style={{ transform: 'scale(1.5)', cursor: 'not-allowed' }}/>
                                </div>
                                <div style={{ textAlign: 'center', margin: '5px' }}>
                                    <label><h6>Purchase Manager</h6></label><br/>
                                    <input type="checkbox" checked={!!PurchaseManagerSigned} readOnly disabled style={{ transform: 'scale(1.5)', cursor: 'not-allowed' }}/>
                                </div>
                                <div style={{ textAlign: 'center', margin: '5px' }}>
                                    <label><h6>Account Manager</h6></label><br/>
                                    <input type="checkbox" checked={!!AccountManagerSigned} readOnly disabled style={{ transform: 'scale(1.5)', cursor: 'not-allowed' }}/>
                                </div>
                                <div style={{ textAlign: 'center', margin: '5px' }}>
                                    <label><h6>Auditor Manager</h6></label><br/>
                                    <input type="checkbox" checked={!!AuditorSigned} readOnly disabled style={{ transform: 'scale(1.5)', cursor: 'not-allowed' }}/>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        );
    };

    console.log('Current combinedList:', combinedList);

    return (
        <>
            <LogOutComponent/>
            {/* Edit Modal */}
            <Modal
                isOpen={editModalOpen}
                onRequestClose={() => setEditModalOpen(false)}
                contentLabel="Edit Party"
                ariaHideApp={false}
                style={{
                    overlay: {
                        backgroundColor: 'rgba(30, 30, 30, 0.92)',
                        zIndex: 1000,
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        padding: 0,
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    },
                    content: {
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        width: '100vw',
                        height: '100vh',
                        minHeight: '100vh',
                        maxHeight: '100vh',
                        minWidth: '100vw',
                        maxWidth: '100vw',
                        margin: 0,
                        border: 'none',
                        borderRadius: 0,
                        background: 'linear-gradient(135deg, #fcb900 0%, #9900ef 100%)',
                        boxShadow: 'none',
                        padding: '2vw 2vw 2vw 2vw',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        transition: 'all 0.3s',
                    }
                }}
            >
                <h2 style={{
                    color: '#fff',
                    textAlign: 'center',
                    marginBottom: '24px',
                    letterSpacing: '1px',
                    fontWeight: 700,
                    textShadow: '0 2px 8px rgba(0,0,0,0.18)'
                }}>Edit Party Details</h2>
                {editPartyData && (
                    <form onSubmit={e => { e.preventDefault(); handleSaveEdit(); }}
                        style={{
                            width: '100%',
                            maxWidth: '1200px',
                            margin: '0 auto',
                            background: 'rgba(255,255,255,0.95)',
                            borderRadius: '16px',
                            boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
                            padding: '24px 18px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                        }}
                    >
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ flex: '1 1 220px', minWidth: '180px' }}>
                                <label style={{ color: '#333', fontWeight: 600 }}>Party Name:
                                    <input value={editPartyData.partyName || ''} onChange={e => setEditPartyData({ ...editPartyData, partyName: e.target.value })}
                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #bbb', marginTop: '4px' }} />
                                </label>
                            </div>
                            <div style={{ flex: '1 1 220px', minWidth: '180px' }}>
                                <label style={{ color: '#333', fontWeight: 600 }}>Company Name:
                                    <input value={editPartyData.companyName || ''} onChange={e => setEditPartyData({ ...editPartyData, companyName: e.target.value })}
                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #bbb', marginTop: '4px' }} />
                                </label>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ flex: '1 1 220px', minWidth: '180px' }}>
                                <label style={{ color: '#333', fontWeight: 600 }}>Address:
                                    <input value={editPartyData.address || ''} onChange={e => setEditPartyData({ ...editPartyData, address: e.target.value })}
                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #bbb', marginTop: '4px' }} />
                                </label>
                            </div>
                            <div style={{ flex: '1 1 220px', minWidth: '180px' }}>
                                <label style={{ color: '#333', fontWeight: 600 }}>GST No:
                                    <input value={editPartyData.gstNo || ''} onChange={e => setEditPartyData({ ...editPartyData, gstNo: e.target.value })}
                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #bbb', marginTop: '4px' }} />
                                </label>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ flex: '1 1 120px', minWidth: '120px' }}>
                                <label style={{ color: '#333', fontWeight: 600 }}>Mobile No:
                                    <input value={editPartyData.mobileNo || ''} onChange={e => setEditPartyData({ ...editPartyData, mobileNo: e.target.value })}
                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #bbb', marginTop: '4px' }} />
                                </label>
                            </div>
                            <div style={{ flex: '1 1 120px', minWidth: '120px' }}>
                                <label style={{ color: '#333', fontWeight: 600 }}>CGST:
                                    <input value={editPartyData.cgst || ''} onChange={e => setEditPartyData({ ...editPartyData, cgst: e.target.value })}
                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #bbb', marginTop: '4px' }} />
                                </label>
                            </div>
                            <div style={{ flex: '1 1 120px', minWidth: '120px' }}>
                                <label style={{ color: '#333', fontWeight: 600 }}>SGST:
                                    <input value={editPartyData.sgst || ''} onChange={e => setEditPartyData({ ...editPartyData, sgst: e.target.value })}
                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #bbb', marginTop: '4px' }} />
                                </label>
                            </div>
                            <div style={{ flex: '1 1 120px', minWidth: '120px' }}>
                                <label style={{ color: '#333', fontWeight: 600 }}>IGST:
                                    <input value={editPartyData.igst || ''} onChange={e => setEditPartyData({ ...editPartyData, igst: e.target.value })}
                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #bbb', marginTop: '4px' }} />
                                </label>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ flex: '1 1 120px', minWidth: '120px' }}>
                                <label style={{ color: '#333', fontWeight: 600 }}>GRIN NO:
                                    <input value={editPartyData.grinNo || ''} onChange={e => setEditPartyData({ ...editPartyData, grinNo: e.target.value })}
                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #bbb', marginTop: '4px' }} />
                                </label>
                            </div>
                            <div style={{ flex: '1 1 120px', minWidth: '120px' }}>
                                <label style={{ color: '#333', fontWeight: 600 }}>GRIN Date:
                                    <input type="date" value={editPartyData.grinDate ? editPartyData.grinDate.substring(0,10) : ''} onChange={e => setEditPartyData({ ...editPartyData, grinDate: e.target.value })}
                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #bbb', marginTop: '4px' }} />
                                </label>
                            </div>
                            <div style={{ flex: '1 1 120px', minWidth: '120px' }}>
                                <label style={{ color: '#333', fontWeight: 600 }}>GSN:
                                    <input value={editPartyData.gsn || ''} onChange={e => setEditPartyData({ ...editPartyData, gsn: e.target.value })}
                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #bbb', marginTop: '4px' }} />
                                </label>
                            </div>
                            <div style={{ flex: '1 1 120px', minWidth: '120px' }}>
                                <label style={{ color: '#333', fontWeight: 600 }}>GSN Date:
                                    <input type="date" value={editPartyData.gsnDate ? editPartyData.gsnDate.substring(0,10) : ''} onChange={e => setEditPartyData({ ...editPartyData, gsnDate: e.target.value })}
                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #bbb', marginTop: '4px' }} />
                                </label>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ flex: '1 1 120px', minWidth: '120px' }}>
                                <label style={{ color: '#333', fontWeight: 600 }}>P.O. No:
                                    <input value={editPartyData.poNo || ''} onChange={e => setEditPartyData({ ...editPartyData, poNo: e.target.value })}
                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #bbb', marginTop: '4px' }} />
                                </label>
                            </div>
                            <div style={{ flex: '1 1 120px', minWidth: '120px' }}>
                                <label style={{ color: '#333', fontWeight: 600 }}>P.O. Date:
                                    <input type="date" value={editPartyData.poDate ? editPartyData.poDate.substring(0,10) : ''} onChange={e => setEditPartyData({ ...editPartyData, poDate: e.target.value })}
                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #bbb', marginTop: '4px' }} />
                                </label>
                            </div>
                            <div style={{ flex: '1 1 120px', minWidth: '120px' }}>
                                <label style={{ color: '#333', fontWeight: 600 }}>Party Invoice No:
                                    <input value={editPartyData.innoviceno || ''} onChange={e => setEditPartyData({ ...editPartyData, innoviceno: e.target.value })}
                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #bbb', marginTop: '4px' }} />
                                </label>
                            </div>
                            <div style={{ flex: '1 1 120px', minWidth: '120px' }}>
                                <label style={{ color: '#333', fontWeight: 600 }}>Invoice Date:
                                    <input type="date" value={editPartyData.innoviceDate ? editPartyData.innoviceDate.substring(0,10) : ''} onChange={e => setEditPartyData({ ...editPartyData, innoviceDate: e.target.value })}
                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #bbb', marginTop: '4px' }} />
                                </label>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ flex: '1 1 120px', minWidth: '120px' }}>
                                <label style={{ color: '#333', fontWeight: 600 }}>L.R. No:
                                    <input value={editPartyData.lrNo || ''} onChange={e => setEditPartyData({ ...editPartyData, lrNo: e.target.value })}
                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #bbb', marginTop: '4px' }} />
                                </label>
                            </div>
                            <div style={{ flex: '1 1 120px', minWidth: '120px' }}>
                                <label style={{ color: '#333', fontWeight: 600 }}>L.R. Date:
                                    <input type="date" value={editPartyData.lrDate ? editPartyData.lrDate.substring(0,10) : ''} onChange={e => setEditPartyData({ ...editPartyData, lrDate: e.target.value })}
                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #bbb', marginTop: '4px' }} />
                                </label>
                            </div>
                            <div style={{ flex: '1 1 120px', minWidth: '120px' }}>
                                <label style={{ color: '#333', fontWeight: 600 }}>Transporter Name:
                                    <input value={editPartyData.transName || ''} onChange={e => setEditPartyData({ ...editPartyData, transName: e.target.value })}
                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #bbb', marginTop: '4px' }} />
                                </label>
                            </div>
                            <div style={{ flex: '1 1 120px', minWidth: '120px' }}>
                                <label style={{ color: '#333', fontWeight: 600 }}>Vehicle No:
                                    <input value={editPartyData.vehicleNo || ''} onChange={e => setEditPartyData({ ...editPartyData, vehicleNo: e.target.value })}
                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #bbb', marginTop: '4px' }} />
                                </label>
                            </div>
                        </div>
                        <div style={{ margin: '20px 0' }}>
                            <label style={{ color: '#333', fontWeight: 600, marginBottom: '8px', display: 'block' }}>Material List (Table Data):</label>
                            <TableEntry data={editTableData} handleTableChange={handleEditTableChange} />
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ flex: '1 1 120px', minWidth: '120px' }}>
                                <label style={{ color: '#333', fontWeight: 600 }}>CGST:
                                    <input value={editPartyData.cgst || ''} onChange={e => setEditPartyData({ ...editPartyData, cgst: e.target.value })}
                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #bbb', marginTop: '4px' }} />
                                </label>
                            </div>
                            <div style={{ flex: '1 1 120px', minWidth: '120px' }}>
                                <label style={{ color: '#333', fontWeight: 600 }}>SGST:
                                    <input value={editPartyData.sgst || ''} onChange={e => setEditPartyData({ ...editPartyData, sgst: e.target.value })}
                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #bbb', marginTop: '4px' }} />
                                </label>
                            </div>
                            <div style={{ flex: '1 1 120px', minWidth: '120px' }}>
                                <label style={{ color: '#333', fontWeight: 600 }}>IGST:
                                    <input value={editPartyData.igst || ''} onChange={e => setEditPartyData({ ...editPartyData, igst: e.target.value })}
                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #bbb', marginTop: '4px' }} />
                                </label>
                            </div>
                            <div style={{ flex: '1 1 120px', minWidth: '120px' }}>
                                <label style={{ color: '#333', fontWeight: 600 }}>GST Tax:
                                    <input value={editPartyData.gstTax || ''} onChange={e => setEditPartyData({ ...editPartyData, gstTax: e.target.value })}
                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #bbb', marginTop: '4px' }} />
                                </label>
                            </div>
                            <div style={{ flex: '1 1 120px', minWidth: '120px' }}>
                                <label style={{ color: '#333', fontWeight: 600 }}>Before Tax Total:
                                    <input value={editPartyData.materialTotal || ''} onChange={e => setEditPartyData({ ...editPartyData, materialTotal: e.target.value })}
                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #bbb', marginTop: '4px' }} />
                                </label>
                            </div>
                            <div style={{ flex: '1 1 120px', minWidth: '120px' }}>
                                <label style={{ color: '#333', fontWeight: 600 }}>Total Amount:
                                    <input value={editPartyData.totalAmount || ''} onChange={e => setEditPartyData({ ...editPartyData, totalAmount: e.target.value })}
                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #bbb', marginTop: '4px' }} />
                                </label>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                            <button type="button" onClick={() => setEditModalOpen(false)} style={{ background: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 18px', cursor: 'pointer', fontWeight: 600, fontSize: '1rem' }}>Cancel</button>
                            <button type="submit" style={{ background: 'linear-gradient(90deg, #ff6900 0%, #00ff07 100%)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 18px', cursor: 'pointer', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}>Save</button>
                        </div>
                    </form>
                )}
            </Modal>
            <div className={styles.outer} style={{minHeight:"150vh"}}>
                {/* Search Input */}
                <div style={{ padding: '10px 20px', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '8px', margin: '10px 0' }}>
                    <input 
                        type="text"
                        placeholder="Search by Party Name, GRN or GRIN number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ 
                            width: '100%', 
                            padding: '12px',
                            borderRadius: '5px',
                            border: '1px solid #ccc',
                            fontSize: '16px',
                            outline: 'none',
                            transition: 'border-color 0.3s ease'
                        }}
                    />
                </div>

                {/* Render Filtered List */}
                {filteredCombinedList && filteredCombinedList.length > 0 ? (
                    filteredCombinedList.map((item, index) => renderDocument(item, index))
                ) : (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <h2>{searchTerm ? 'No matching documents found' : 'No documents found'}</h2>
                        {!searchTerm && <p>Please check if the backend server is running and data is available.</p>}
                    </div>
                )}
        </div>
        </>
    );
}
