import React from 'react';
import styles from './Table.module.css'; // Ensure you have the necessary CSS module

const TableComponent = ({data,handleTableChange }) => {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            margin: '20px 0'
        }}>
        <table className={styles.table}style={{
            backgroundColor: 'rgba(218, 216, 224, 0.6)',
            borderRadius: '15px',
                border: 'none',
                borderCollapse: 'collapse',
                width: '100%',
                maxWidth: '1200px'
            }}>
            <thead>
                <tr>
                        <th style={{ width: '1%', border: 'none' }}>Sr. No.</th>
                        <th style={{ width: '20%', border: 'none' }}>Item</th>
                        <th style={{ width: '35%', border: 'none' }}>Description</th>
                        <th style={{ width: '8%', border: 'none' }}>Qnt. in Kgs</th>
                        <th style={{ width: '8%', border: 'none' }}> Qnt. No.</th>
                        <th style={{ width: '8%', border: 'none' }}>Price Per Unit</th>
                        <th style={{ width: '8%', border: 'none' }}>Total</th>
                </tr>
            </thead>
            <tbody>
                    {data.map((row, index) => {
                        // Calculate total for each row
                        const quantityNo = parseFloat(row.quantityNo);
                        const price = parseFloat(row.price);
                        let total = '';
                        if (!isNaN(quantityNo) && !isNaN(price) && (quantityNo || price)) {
                            total = (quantityNo * price).toFixed(2);
                        }
                        
                        return (
                    <tr key={index}>
                                <td style={{ border: 'none' }}>{index + 1}</td>
                                <td style={{ border: 'none' }}>
                            <textarea
                            style={{
                                width:"100%",
                                marginLeft:"0px",
                                backgroundColor: 'rgba(218, 216, 224, 0.6)',
                                borderRadius: '20px',
                                        border: 'none',
                                        padding: '12px',
                                        fontSize: '14px',
                                        minHeight: '60px',
                                        resize: 'vertical',
                                        minWidth: '150px'
                            }}
                                type="text"
                                value={row.item}
                                onChange={(e) => handleTableChange(index, 'item', e.target.value)}
                            />
                        </td>
                                <td style={{ border: 'none' }}>
                                    <textarea 
                                    style={{
                                        resize:"vertical",
                                        width:"100%", 
                                        backgroundColor: 'rgba(218, 216, 224, 0.6)',
                                        borderRadius: '20px',
                                        border: 'none',
                                        padding: '12px',
                                        fontSize: '14px',
                                        minHeight: '60px',
                                        minWidth: '200px'
                                }}
                                value={row.description}
                                onChange={(e) => handleTableChange(index, 'description', e.target.value)}
                                className={styles.textarea} // Apply CSS class for textarea styling
                            />
                        </td>
                                <td style={{ border: 'none' }}>
                                    <input
                                     style={{
                                        width:"100%",
                                        marginLeft:"0px", 
                                        backgroundColor: 'rgba(218, 216, 224, 0.6)',
                                        borderRadius: '20px',
                                        border: 'none',
                                        padding: '12px',
                                        fontSize: '14px',
                                        height: '50px',
                                        minWidth: '100px'
                                     }}
                                        type="number"
                                        value={row.quantityKg}
                                        onChange={(e) => handleTableChange(index, 'quantityKg', e.target.value)}
                                    />
                                </td>
                                <td style={{ border: 'none' }}>
                            <input
                                     style={{ 
                                        backgroundColor: 'rgba(218, 216, 224, 0.6)',
                                        borderRadius: '20px',
                                        width:"100%",
                                        marginLeft:"0px",
                                        border: 'none',
                                        padding: '12px',
                                        fontSize: '14px',
                                        height: '50px',
                                        minWidth: '100px'
                             }}
                                type="number"
                                value={row.quantityNo}
                                onChange={(e) => handleTableChange(index, 'quantityNo', e.target.value)}
                            />
                        </td>
                                <td style={{ border: 'none' }}>
                            <input
                                        style={{ 
                                            backgroundColor: 'rgba(218, 216, 224, 0.6)',
                                            borderRadius: '20px',
                                            width:"100%",
                                            marginLeft:"0px",
                                            border: 'none',
                                            padding: '12px',
                                            fontSize: '14px',
                                            height: '50px',
                                            minWidth: '120px'
                                        }}
                                type="number"
                                step="0.01"
                                value={row.price}
                                onChange={(e) => handleTableChange(index, 'price', e.target.value)}
                            />
                        </td>
                                <td style={{ border: 'none' }}>
                                    <input
                                        style={{ 
                                            backgroundColor: 'rgba(218, 216, 224, 0.6)',
                                            borderRadius: '20px',
                                            width:"100%",
                                            marginLeft:"0px",
                                            border: 'none',
                                            padding: '12px',
                                            fontSize: '14px',
                                            height: '50px',
                                            minWidth: '120px',
                                            fontWeight: 'bold',
                                            color: '#333'
                                        }}
                                        type="text"
                                        value={total}
                                        readOnly
                                    />
                                </td>
                    </tr>
                        );
                    })}
            </tbody>
        </table>
        </div>
    );
};

export default TableComponent;
