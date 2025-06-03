import React, { useEffect, useState } from 'react';
import styles from '../../Components/Approval/Approval.module.css';
import axios from 'axios';
import TableComponent from '../../Components/Table/Table.rendering';
import LogOutComponent from '../LogOut/LogOutComponent';
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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
                <div className={styles.show}>
                    <h2 onClick={() => showHandler(index)} style={{ cursor: 'pointer', color:'black' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ 
                                fontSize: '0.9em', 
                                color: '#666',
                                minWidth: '120px'
                            }}>
                                {gsnDocuments[0]?.grinNo ? `GRN: ${gsnDocuments[0].grinNo}` : 'GRN: N/A'}
                            </span>
                            <span style={{ 
                                fontSize: '0.9em', 
                                color: '#666',
                                minWidth: '120px'
                            }}>
                                {gsnDocuments[0]?.gsn ? `GRIN: ${gsnDocuments[0].gsn}` : 'GRIN: N/A'}
                            </span>
                            <span style={{ 
                                fontSize: '0.9em', 
                                color: '#666',
                                minWidth: '150px'
                            }}>
                                {gsnDocuments[0]?.grinDate ? `Date: ${gsnDocuments[0].grinDate}` : 'Date: N/A'}
                            </span>
                            <span style={{ 
                                borderLeft: '1px solid #ccc',
                                paddingLeft: '15px',
                                marginLeft: '5px'
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
                                                            display: "flex",
                                                            justifyContent: "center",
                                                            flexDirection: "column",
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
                                                            <h5 style={{ textAlign: "center" }}>Material List (Including Price)</h5>
                                                            <TableComponent tableData={gsnDoc.tableData} />
                                                        </div>
                                                    )}

                                                    {/* Added Tax and Total Amount Details */}
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

                                                    {/* GSN Uploaded Photo */} 
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
                                                            display: "flex",
                                                            justifyContent: "center",
                                                            flexDirection: "column",
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
                                                            <h5 style={{ textAlign: "center" }}>Material List (Including Price)</h5>
                                                            <TableComponent tableData={grnDoc.tableData} />
                                                        </div>
                                                    )}

                                                    {/* Added Tax and Total Amount Details */}
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

                                                    {/* GRN Uploaded Photo */} 
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
