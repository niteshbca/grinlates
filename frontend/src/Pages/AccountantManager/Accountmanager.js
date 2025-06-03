import React, { useEffect, useState } from 'react';
import styles from '../../Components/Approval/Approval.module.css';
import axios from 'axios';
import TableComponent from '../../Components/Table/Table.rendering';
import LogOutComponent from '../../Components/LogOut/LogOutComponent';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function Accountant({ managerType }) {
    const [visibleItem, setVisibleItem] = useState(null);
    const [selectedValue, setSelectedValue] = useState({});
    const [combinedList, setCombinedList] = useState([]);
    const [filteredGsnList, setFilteredGsnList] = useState([]);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [isHovered, setIsHovered] = useState(false);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    managerType = 'Account Manager';
    const managerFieldMap = {
        'General Manager': 'GeneralManagerSigned',
        'Store Manager': 'StoreManagerSigned',
        'Purchase Manager': 'PurchaseManagerSigned',
        'Account Manager': 'AccountManagerSigned'
    };

    const url = process.env.REACT_APP_BACKEND_URL;
    const fieldName = managerFieldMap[managerType];

    // Function to fetch and combine data
    const fetchAndCombineData = async () => {
            try {
            const token = localStorage.getItem('authToken');
            console.log(`(${managerType}) Fetching data with token:`, token);
            
            const [gsnResponse, grnResponse] = await Promise.all([
                axios.get(`${url}/gsn/getdata`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                }),
                axios.get(`${url}/getdata`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                })
            ]);

            // Sort individual lists first
            const sortedGsnData = (gsnResponse.data || []).filter(u => !u.isHidden)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            const sortedGrnData = (grnResponse.data || []).filter(u => !u.isHidden)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            console.log(`(${managerType}) Sorted GSN Data:`, sortedGsnData);
            console.log(`(${managerType}) Sorted GRN Data:`, sortedGrnData);

            const combined = {};
            
            // Process sorted GSN documents
            sortedGsnData.forEach(doc => {
                if (!combined[doc.partyName]) {
                    combined[doc.partyName] = {
                        partyName: doc.partyName,
                        gsnDocuments: [],
                        grnDocuments: [],
                        GeneralManagerSigned: doc.GeneralManagerSigned,
                        StoreManagerSigned: doc.StoreManagerSigned,
                        PurchaseManagerSigned: doc.PurchaseManagerSigned,
                        AccountManagerSigned: doc.AccountManagerSigned
                    };
                }
                combined[doc.partyName].gsnDocuments.push(doc);
                if (combined[doc.partyName].GeneralManagerSigned === undefined) combined[doc.partyName].GeneralManagerSigned = doc.GeneralManagerSigned;
                if (combined[doc.partyName].StoreManagerSigned === undefined) combined[doc.partyName].StoreManagerSigned = doc.StoreManagerSigned;
                if (combined[doc.partyName].PurchaseManagerSigned === undefined) combined[doc.partyName].PurchaseManagerSigned = doc.PurchaseManagerSigned;
                if (combined[doc.partyName].AccountManagerSigned === undefined) combined[doc.partyName].AccountManagerSigned = doc.AccountManagerSigned;
            });

            // Process sorted GRN documents
            sortedGrnData.forEach(doc => {
                if (!combined[doc.partyName]) {
                    combined[doc.partyName] = {
                        partyName: doc.partyName,
                        gsnDocuments: [],
                        grnDocuments: [],
                        GeneralManagerSigned: doc.GeneralManagerSigned,
                        StoreManagerSigned: doc.StoreManagerSigned,
                        PurchaseManagerSigned: doc.PurchaseManagerSigned,
                        AccountManagerSigned: doc.AccountManagerSigned
                    };
                }
                combined[doc.partyName].grnDocuments.push(doc);
                if (combined[doc.partyName].GeneralManagerSigned === undefined) combined[doc.partyName].GeneralManagerSigned = doc.GeneralManagerSigned;
                if (combined[doc.partyName].StoreManagerSigned === undefined) combined[doc.partyName].StoreManagerSigned = doc.StoreManagerSigned;
                if (combined[doc.partyName].PurchaseManagerSigned === undefined) combined[doc.partyName].PurchaseManagerSigned = doc.PurchaseManagerSigned;
                if (combined[doc.partyName].AccountManagerSigned === undefined) combined[doc.partyName].AccountManagerSigned = doc.AccountManagerSigned;
            });

            const combinedListData = Object.values(combined);

            // Function to get the latest createdAt from a group
            const getLatestDate = (item) => {
                const dates = [
                    ...(item.gsnDocuments || []).map(d => new Date(d.createdAt)),
                    ...(item.grnDocuments || []).map(d => new Date(d.createdAt))
                ].filter(d => !isNaN(d));
                return dates.length > 0 ? Math.max(...dates.map(d => d.getTime())) : 0;
            };

            // Sort the final combined list
            combinedListData.sort((a, b) => getLatestDate(b) - getLatestDate(a));

            console.log(`(${managerType}) Sorted Combined List Data:`, combinedListData);
            setCombinedList(combinedListData);
            setIsDataLoaded(true);

            // Set initial state of the checkboxes based on fetched data
            const initialSelectedValue = combinedListData.reduce((acc, item) => {
                if (fieldName && item.hasOwnProperty(fieldName)) {
                    acc[item.partyName] = item[fieldName] === true ? 'checked' : 'not_checked';
                } else {
                    acc[item.partyName] = 'not_checked';
                }
                    return acc;
                }, {});

                setSelectedValue(initialSelectedValue);

            } catch (err) {
            console.error(`(${managerType}) Error fetching data`, err);
            if (err.response) {
                console.error(`(${managerType}) Fetch Error Response:`, err.response.data);
            }
            }
        };

    useEffect(() => {
        fetchAndCombineData();
    }, []);

    // useEffect for filtering based on searchTerm
    useEffect(() => {
        let filtered = combinedList;
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            filtered = combinedList.filter(item => 
                (item.partyName && item.partyName.toLowerCase().includes(searchLower)) ||
                item.gsnDocuments.some(doc => 
                    (doc.grinNo && doc.grinNo.toLowerCase().includes(searchLower)) ||
                    (doc.gsn && doc.gsn.toLowerCase().includes(searchLower))
                ) ||
                item.grnDocuments.some(doc => 
                    (doc.grinNo && doc.grinNo.toLowerCase().includes(searchLower)) ||
                    (doc.gsn && doc.gsn.toLowerCase().includes(searchLower))
                )
            );
        }
        setFilteredGsnList(filtered);
    }, [searchTerm, combinedList]);

    const formatDate = (oldFormat) => {
        if (!oldFormat) return "N/A";
        const date = new Date(oldFormat);
        return date.toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric', 
            hour: 'numeric', minute: 'numeric', second: 'numeric'
        });
    };

    const showHandler = (index) => {
        setVisibleItem(visibleItem === index ? null : index);
    };

    const handleRadioChange = (partyName, value) => {
        console.log(`(${managerType}) Radio change for ${partyName}:`, value);
        setSelectedValue(prev => ({ ...prev, [partyName]: value }));
    };

    const handleSubmit = async (e, partyName) => {
        e.preventDefault();
        const currentStatus = selectedValue[partyName] || 'not_checked';
        const payload = {
            partyName,
            managerType,
            status: currentStatus,
            fieldName: fieldName
        };
        console.log(`(${managerType}) Submitting verification status:`, payload);
        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.post(`${url}/verify`, payload, {
                 headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                 }
            });
            console.log(`(${managerType}) Verification Response:`, response.data);
            alert('Verification status saved successfully');
            await fetchAndCombineData();
        } catch (err) {
            console.error(`(${managerType}) Error saving verification status`, err);
            if (err.response) {
                console.error(`(${managerType}) Verification Error Response:`, err.response.data);
                alert(`Error: ${err.response.data.message || 'Could not save status'}`);
            } else {
                alert('An error occurred while saving the status.');
            }
        }
    };

    const isImageFile = (filename) => {
        if (!filename) return false;
        const extension = filename.split('.').pop().toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension);
    };

    const handleDownloadPDF = (index, groupIndex) => {
        const item = combinedList[index];
        if (!item) return;
        
        const divElement = document.getElementById(`item-div-${item.partyName}-group-${groupIndex}`);
        if (!divElement) return;

        const partyName = item.partyName || `document-${index}`;
        const sanitizedPartyName = partyName.replace(/[^a-zA-Z0-9]/g, '_');
        const sanitizedManagerType = managerType.replace(/[^a-zA-Z0-9]/g, '_');

        const elementsToHide = divElement.querySelectorAll('.hide-in-pdf');
        const originalDisplayStyles = [];
        elementsToHide.forEach(el => {
            originalDisplayStyles.push(el.style.display);
            el.style.display = 'none';
        });

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

                pdf.save(`${sanitizedPartyName}_Group${groupIndex + 1}_${sanitizedManagerType}.pdf`);

                elementsToHide.forEach((el, i) => {
                    el.style.display = originalDisplayStyles[i];
                });
            }).catch(err => {
                console.error("Error generating PDF:", err);
                elementsToHide.forEach((el, i) => {
                    el.style.display = originalDisplayStyles[i];
                });
            });
        }, 100);
    };

    return (
        <>
            <LogOutComponent />
            <div className={styles.outer}>
                {/* Search Input */}
                <div style={{ 
                    padding: '10px 20px', 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                    borderRadius: '8px', 
                    margin: '10px 0',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
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
                {filteredGsnList.map((item, index) => {
                    const { partyName, gsnDocuments, grnDocuments, 
                            GeneralManagerSigned, StoreManagerSigned, 
                            PurchaseManagerSigned, AccountManagerSigned } = item;

                    const isApprovedByCurrentManager = !!item[fieldName];
                    const statusText = isApprovedByCurrentManager ? "(Approved)" : "(Not Approved)";

                    // Get the first GSN document for header display
                    const firstGsnDoc = gsnDocuments[0] || {};
                    const firstGrnDoc = grnDocuments[0] || {};

                    return (
                        <div key={index} id={`item-div-${partyName}`} className={styles.show}>
                            <h2
                                style={{
                                    color: "black",
                                    cursor: "pointer",
                                    transition: "all 0.3s ease",
                                }}
                                onClick={() => showHandler(index)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <span style={{ 
                                        fontSize: '0.9em', 
                                        color: '#666',
                                        minWidth: '120px'
                                    }}>
                                        {firstGsnDoc.grinNo ? `GRN: ${firstGsnDoc.grinNo}` : 'GRN: N/A'}
                                    </span>
                                    <span style={{ 
                                        fontSize: '0.9em', 
                                        color: '#666',
                                        minWidth: '120px'
                                    }}>
                                        {firstGsnDoc.gsn ? `GRIN: ${firstGsnDoc.gsn}` : 'GRIN: N/A'}
                                    </span>
                                    <span style={{ 
                                        fontSize: '0.9em', 
                                        color: '#666',
                                        minWidth: '150px'
                                    }}>
                                        {firstGsnDoc.grinDate ? `Date: ${formatDate(firstGsnDoc.grinDate)}` : 'Date: N/A'}
                                    </span>
                                    <span style={{ 
                                        borderLeft: '1px solid #ccc',
                                        paddingLeft: '15px',
                                        marginLeft: '5px'
                                    }}>
                                        {partyName}
                                    </span>
                                    <span style={{ marginLeft: '10px', fontSize: '0.8em', color: isApprovedByCurrentManager ? 'green' : 'orange' }}>
                                        {statusText}
                                    </span>
                                </div>
                            </h2>

                            <div style={{ display: "flex", flexDirection: "row" }}>
                                {/* GSN Section */}
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
                                                    <div key={`group-${i}`} id={`item-div-${partyName}-group-${i}`} className={styles.grinDetails}>
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
                                                                            <td>{formatDate(gsnDoc.grinDate)}</td>
                                                                            <td>{gsnDoc.gsn}</td>
                                                                            <td>{formatDate(gsnDoc.gsnDate)}</td>
                                                                            <td>{gsnDoc.poNo}</td>
                                                                            <td>{formatDate(gsnDoc.poDate)}</td>
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
                                                                                <td>{formatDate(gsnDoc.innoviceDate)}</td>
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
                                                                                <td>{formatDate(gsnDoc.lrDate)}</td>
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
                                                                        <h5 style={{ textAlign: "center" }}>Material List (GSN)</h5>
                                                                        <TableComponent tableData={gsnDoc.tableData} />
                                                                    </div>
                                                                )}

                                                                <div className={styles.grinDetails} style={{ marginTop: '20px' }}>
                                                                    <label htmlFor=""><h5>Amount Details</h5></label>
                                                                    <table>
                                                                        <thead>
                                                                            <tr>
                                                                                <th>CGST</th>
                                                                                <th>SGST</th>
                                                                                <th>Total Amount</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            <tr>
                                                                                <td>{gsnDoc.cgst || 'N/A'}</td>
                                                                                <td>{gsnDoc.sgst || 'N/A'}</td>
                                                                                <td>{gsnDoc.totalAmount || 'N/A'}</td>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                </div>

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
                                                                            <td>{formatDate(grnDoc.grinDate)}</td>
                                                                            <td>{grnDoc.gsn}</td>
                                                                            <td>{formatDate(grnDoc.gsnDate)}</td>
                                                                            <td>{grnDoc.poNo}</td>
                                                                            <td>{formatDate(grnDoc.poDate)}</td>
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
                                                                                <td>{formatDate(grnDoc.innoviceDate)}</td>
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
                                                                                <td>{formatDate(grnDoc.lrDate)}</td>
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
                                                                        <h5 style={{ textAlign: "center" }}>Material List (GRIN)</h5>
                                                                        <TableComponent tableData={grnDoc.tableData} />
                                                                    </div>
                                                                )}

                                                                <div className={styles.grinDetails} style={{ marginTop: '20px' }}>
                                                                    <label htmlFor=""><h5>Amount Details</h5></label>
                                                                    <table>
                                                                        <thead>
                                                                            <tr>
                                                                                <th>CGST</th>
                                                                                <th>SGST</th>
                                                                                <th>Total Amount</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            <tr>
                                                                                <td>{grnDoc.cgst || 'N/A'}</td>
                                                                                <td>{grnDoc.sgst || 'N/A'}</td>
                                                                                <td>{grnDoc.totalAmount || 'N/A'}</td>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                </div>

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
                                                        {isApprovedByCurrentManager && (
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
                            </div>

                            {/* Approval Section */}
                            <div className={`${styles.sign} hide-in-pdf`}
                                style={{
                                    width: '90%',
                                    display: 'flex',
                                    margin: '5px',
                                    padding: '1px',
                                    flexDirection: windowWidth <= 600 ? "column" : "row",
                                    animation: 'fadeIn 1s ease',
                                    margin: windowWidth <= 600 ? '0' : '20px',
                                    justifyContent: 'center',
                                    alignItems: "center",
                                    borderRadius: "12px"
                                }}>
                                <form onSubmit={(e) => handleSubmit(e, partyName)} style={{ padding: '20px', display: 'flex', justifyContent: 'center', alignItems: "center" }}>
                                    <div className={styles.submission}>
                                        <div>
                                            <label htmlFor={`checkbox-${partyName}`}><h6>Approve ({managerType})</h6></label>
                                            <br/><center>
                                            <input
                                                id={`checkbox-${partyName}`}
                                                style={{
                                                    width: '12px',
                                                    height: '20px',
                                                    transform: 'scale(1.5)',
                                                    cursor: 'pointer',
                                                    marginLeft: '10px'
                                                }}
                                                name={`checkbox-${partyName}`}
                                                value='checked'
                                                type="checkbox"
                                                onChange={() => handleRadioChange(partyName, selectedValue[partyName] === 'checked' ? 'not_checked' : 'checked')}
                                                checked={selectedValue[partyName] === 'checked'}
                                            />
                                            </center>
                                        </div>
                                    </div>
                                    <button 
                                        type='submit'
                                        className="hide-in-pdf"
                                        style={{
                                            width: '100%',
                                            maxWidth: '100px',
                                            margin: '5px',
                                            padding: "0 10px",
                                            minWidth: "80px",
                                            borderRadius: '15px',
                                            border: '2px solid transparent',
                                            backgroundColor: 'rgba(230, 216, 224, 0.8)',
                                            color: 'black',
                                            fontSize: '1rem',
                                            transition: 'background-color 0.3s ease',
                                            cursor: 'pointer',
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = "#0056b3"}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = "rgba(218, 216, 224, 0.8)"}
                                    >
                                        Submit
                                    </button>
                                </form>
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}





