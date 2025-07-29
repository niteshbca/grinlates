import React, { useEffect, useState } from 'react';
import styles from './Approval.module.css';
import axios from 'axios';
import TableComponent from '../Table/Table.rendering'
import LogOutComponent from '../LogOut/LogOutComponent';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function Sample({ managerType }) {
    const [visibleItem, setVisibleItem] = useState(null);
    const [selectedValue, setSelectedValue] = useState({});
    const [list, setList] = useState([]);
    const [gsnList, setGsnList] = useState([]);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [isHovered, setIsHovered] = useState(false);
    const [isGsnDataLoaded, setIsGsnDataLoaded] = useState(false);
    const [isListDataLoaded, setIsListDataLoaded] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredList, setFilteredList] = useState([]);
    const [combinedList, setCombinedList] = useState([]);

    //mapping
    const managerFieldMap = {
        'General Manager': 'GeneralManagerSigned',
        'Store Manager': 'StoreManagerSigned',
        'Purchase Manager': 'PurchaseManagerSigned',
        'Account Manager': 'AccountManagerSigned',
        'Auditor': 'AuditorSigned'
    };
    const fieldName = managerFieldMap[managerType];

    const url = process.env.REACT_APP_BACKEND_URL

    // Function to fetch GSN data (extracted for reusability)
        const fetchingGsnData = async () => {
            try {
            const token = localStorage.getItem('authToken');
            console.log('Fetching GSN data with token:', token);
                const resData = await axios.get(`${url}/gsn/getdata`,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                const getData = resData.data;
            console.log('Fetched GSN Data:', getData);

            const fetchedList = getData.filter((u) => !u.isHidden);

                // Set initial state of the checkboxes based on fetched data
            const initialSelectedValue = {};
            fetchedList.forEach(item => {
                if (fieldName && item.hasOwnProperty(fieldName)) {
                    initialSelectedValue[item.partyName] = item[fieldName] === true ? 'checked' : 'not_checked';
                } else {
                    console.warn(`Field ${fieldName} not found for item ${item._id} or invalid managerType ${managerType}`);
                    initialSelectedValue[item.partyName] = 'not_checked';
                }
            });

            setGsnList(fetchedList);
                setSelectedValue(initialSelectedValue);
            setIsGsnDataLoaded(true);
            } catch (err) {
            console.error("Error fetching GSN data", err);
            if (err.response) {
              console.error('GSN Fetch Error Response:', err.response.data);
            }
            }
        };

    // Function to fetch GRN data
        const fetchingGrnData = async () => {
            try {
                const token = localStorage.getItem('authToken');
                console.log('Fetching GRN data with token:', token);
            const resData = await axios.get(`${url}/getdata`, {
                        headers: { 
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
            });
                const data = resData.data;
                console.log('Fetched GRN Data:', data);
                const fetchedList = data.filter((u) => !u.isHidden);
            setList(fetchedList);
            setIsListDataLoaded(true);
            } catch (err) {
                console.error("Error fetching GRN data", err);
                 if (err.response) {
                    console.error('GRN Fetch Error Response:', err.response.data);
                 }
            }
        };

    // Fetching GSN data on initial load
    useEffect(() => {
        fetchingGsnData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [managerType]);

    // Fetching GRN data on initial load
    useEffect(() => {
        fetchingGrnData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const showHandler = (index) => {
        setVisibleItem(visibleItem === index ? null : index);
    };

    // Handle radio input change
    const handleRadioChange = (partyName) => {
        console.log(`(${managerType}) Radio change for ${partyName}`);
        setSelectedValue(prev => {
            const newValue = prev[partyName] === 'checked' ? 'not_checked' : 'checked';
            console.log(`(${managerType}) New value for ${partyName}:`, newValue);
            return { ...prev, [partyName]: newValue };
        });
    };

    // Handle form submission
    const handleSubmit = async (e, partyName) => {
        e.preventDefault();
        console.log(`(${managerType}) Current selectedValue:`, selectedValue);
        const currentStatus = selectedValue[partyName] || 'not_checked';
        console.log(`(${managerType}) Current status for ${partyName}:`, currentStatus);
        
        // Find all documents for this party
        const partyGsnDocs = gsnList.filter(doc => doc.partyName === partyName);
        const partyGrnDocs = list.filter(doc => doc.partyName === partyName);

        if (partyGsnDocs.length === 0 && partyGrnDocs.length === 0) {
            alert('Could not find any documents for this party');
            return;
        }

        const payload = {
            partyName: partyName,
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
            // Refetch both GSN and GRN data to update the UI
            await Promise.all([fetchingGsnData(), fetchingGrnData()]); 
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
    useEffect(() => {
        if (isGsnDataLoaded && isListDataLoaded) {
            if (list.length <= gsnList.length) {
                list.length = gsnList.length
                console.log("length is", gsnList.length, list.length)
            }
        }
    }, [isGsnDataLoaded, isListDataLoaded])

    // Add useEffect for search filtering
    useEffect(() => {
        if (isGsnDataLoaded && isListDataLoaded) {
            let filtered = gsnList;
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                filtered = gsnList.filter(item => 
                    (item.partyName && item.partyName.toLowerCase().includes(searchLower)) ||
                    (item.grinNo && item.grinNo.toLowerCase().includes(searchLower)) ||
                    (item.gsn && item.gsn.toLowerCase().includes(searchLower))
                );
            }
            // Sort by createdAt in descending order (latest first)
            filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setFilteredList(filtered);
        }
    }, [searchTerm, gsnList, isGsnDataLoaded, isListDataLoaded]);

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
    }

    // Add a new function to format date only with year
    const formatDateOnly = (oldFormat) => {
        if (!oldFormat) return "N/A";
        const date = new Date(oldFormat);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

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
    }

    // **** ADDED: PDF Download Handler ****
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

    const isImageFile = (filename) => {
        if (!filename) return false;
        const extension = filename.split('.').pop().toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension);
    };

    // Add function to combine GSN and GRN data
    const combineData = () => {
        if (isGsnDataLoaded && isListDataLoaded) {
            const combined = {};
            
            // Process GSN documents
            gsnList.forEach(doc => {
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
            });

            // Process GRN documents
            list.forEach(doc => {
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
            });

            const combinedListData = Object.values(combined);
            
            // Sort by latest date
            combinedListData.sort((a, b) => {
                const getLatestDate = (item) => {
                    const dates = [
                        ...(item.gsnDocuments || []).map(d => new Date(d.createdAt)),
                        ...(item.grnDocuments || []).map(d => new Date(d.createdAt))
                    ].filter(d => !isNaN(d));
                    return dates.length > 0 ? Math.max(...dates.map(d => d.getTime())) : 0;
                };
                return getLatestDate(b) - getLatestDate(a);
            });

            setCombinedList(combinedListData);
        }
    };

    // Update useEffect to use combined data
    useEffect(() => {
        if (isGsnDataLoaded && isListDataLoaded) {
            combineData();
        }
    }, [isGsnDataLoaded, isListDataLoaded, gsnList, list]);

    // Update search filtering to use combined list
    useEffect(() => {
        if (isGsnDataLoaded && isListDataLoaded) {
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
            setFilteredList(filtered);
        }
    }, [searchTerm, combinedList, isGsnDataLoaded, isListDataLoaded]);

    return (
        <>
            <LogOutComponent />
            <div className={styles.outer}>
                {/* Add Search Input */}
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

                {filteredList.map((item, index) => {
                    const { partyName, gsnDocuments = [], grnDocuments = [] } = item;
                    const isApprovedByCurrentManager = !!item[fieldName]; 
                    const statusText = isApprovedByCurrentManager ? "(Approved)" : "(Not Approved)";

                    // Add back the checkbox enabled logic
                    let isCheckboxEnabled = false;
                    if (managerType === 'Auditor') {
                        // Auditor can now approve regardless of other managers
                        isCheckboxEnabled = true; // Enable for Auditor
                    } else {
                        // For other managers, enable if there are GSN or GRN documents
                        isCheckboxEnabled = (gsnDocuments && gsnDocuments.length > 0) || (grnDocuments && grnDocuments.length > 0);
                    }

                    // Get the first GSN document for header display with safe access
                    const firstGsnDoc = gsnDocuments && gsnDocuments.length > 0 ? gsnDocuments[0] : {};
                    const firstGrnDoc = grnDocuments && grnDocuments.length > 0 ? grnDocuments[0] : {};

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
                                    <div style={{ 
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '5px',
                                        borderRight: '1px solid #ccc',
                                        paddingRight: '15px',
                                        marginRight: '15px'
                                    }}>
                                        <span style={{ fontSize: '0.9em', color: '#666' }}>
                                            GSN: {firstGsnDoc?.gsn || 'N/A'}
                                    </span>
                                        <span style={{ fontSize: '0.9em', color: '#666' }}>
                                            GRIN: {firstGsnDoc?.grinNo || 'N/A'}
                                    </span>
                                        <span style={{ fontSize: '0.9em', color: '#666' }}>
                                            DATE: {firstGsnDoc?.grinDate ? formatDateOnly(firstGsnDoc.grinDate) : 'N/A'}
                                    </span>
                                        <span style={{ fontSize: '0.9em', color: '#666' }}>
                                            TIME: {firstGsnDoc?.grinDate ? formatTimeOnly(firstGsnDoc.grinDate) : 'N/A'}
                                        </span>
                                    </div>
                                    <span style={{ 
                                        fontSize: '1.1em',
                                        fontWeight: '500'
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
                                    <div className={styles.grinDetails}>
                                                                    {/* GSN Details Table */}
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

                                                                    {/* Party Details Table */}
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

                                                                    {/* Transport Details Table */}
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

                                    {/* Amount Details */}
                                    <div className={styles.grinDetails} style={{ marginTop: '20px' }}>
                                        <label htmlFor=""><h5>Amount Details</h5></label>
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

                                                                    {/* Material List */}
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

                                                                    {/* Photo */}
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
                                </div>
                                                            </div>
                                                        )}

                                                        {/* GRIN Document */}
                                                        {grnDoc && (
                                                            <div style={{ backgroundColor: 'rgba(218, 216, 224, 0.2)', borderRadius: '8px', padding: '15px', marginBottom: '15px' }}>
                                                                <h4 style={{ textAlign: 'center', margin: '0 0 15px 0' }}>GRIN Document</h4>
                                    <div className={styles.grinDetails}>
                                                                    {/* GRIN Details Table */}
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

                                                                    {/* Party Details Table */}
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

                                    {/* GRIN Amount Details */}
                                    <div className={styles.grinDetails} style={{ marginTop: '20px' }}>
                                        <label htmlFor=""><h5>Amount Details</h5></label>
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

                                                                    {/* Transport Details Table */}
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

                                                                    {/* Material List */}
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

                                                                    {/* Photo */}
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
                                </div>
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
                                                type="checkbox"
                                                checked={selectedValue[partyName] === 'checked'}
                                                onChange={() => handleRadioChange(partyName)}
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
                                    >Submit</button>
                                </form>
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}