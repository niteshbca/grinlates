import React, { useEffect, useState } from 'react';

export default function SupplierList() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null); // partyName of expanded row
  const [details, setDetails] = useState({}); // { [partyName]: [{gsn, grinNo}] }
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [editIdx, setEditIdx] = useState(null); // index of row being edited
  const [editData, setEditData] = useState({}); // temp data for editing
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetch('http://localhost:5000/api/suppliers')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(data => {
        // Unique filter: only by partyName (ignore case and spaces)
        const uniqueSuppliers = data.filter((supplier, index, self) => {
          const currName = (supplier.partyName || '').trim().toLowerCase();
          return index === self.findIndex(s =>
            (s.partyName || '').trim().toLowerCase() === currName
          );
        });
        setSuppliers(uniqueSuppliers);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handlePartyClick = (partyName) => {
    if (expanded === partyName) {
      setExpanded(null);
      return;
    }
    setExpanded(partyName);
    if (!details[partyName]) {
      setDetailsLoading(true);
      setDetailsError(null);
      fetch(`http://localhost:5000/api/supplier-details?partyName=${encodeURIComponent(partyName)}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch details');
          return res.json();
        })
        .then(data => {
          setDetails(prev => ({ ...prev, [partyName]: data }));
          setDetailsLoading(false);
        })
        .catch(err => {
          setDetailsError(err.message);
          setDetailsLoading(false);
        });
    }
  };

  const handleEdit = (idx) => {
    setEditIdx(idx);
    setEditData({ ...suppliers[idx] });
  };

  const handleEditChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const handleEditSave = async (oldPartyName) => {
    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/supplier/${encodeURIComponent(oldPartyName)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      });
      if (!res.ok) throw new Error('Failed to update');
      // Update local state
      setSuppliers(suppliers.map((s, i) => i === editIdx ? editData : s));
      setEditIdx(null);
    } catch (err) {
      alert('Update failed: ' + err.message);
    }
    setActionLoading(false);
  };

  const handleDelete = async (partyName) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/supplier/${encodeURIComponent(partyName)}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete');
      setSuppliers(suppliers.filter(s => s.partyName !== partyName));
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
    setActionLoading(false);
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'red' }}>Error: {error}</div>;

  // Gradient background style (copied from Gsn.js)
  const containerStyle = {
    minHeight: '100vh',
    width: '100vw',
    overflow: 'hidden',
    textAlign: 'center',
    padding: '20px',
    background: 'linear-gradient(-45deg, #fcb900, #9900ef, #ff6900, #00ff07)',
    backgroundSize: '400% 400%',
    animation: 'gradientAnimation 12s ease infinite',
    borderRadius: '10px',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
    marginLeft: 'auto',
    marginRight: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
  };

  const globalStyles = `
    @keyframes gradientAnimation {
        0% { background-position: 0% 50%; }
        25% { background-position: 50% 100%; }
        50% { background-position: 100% 50%; }
        75% { background-position: 50% 0%; }
        100% { background-position: 0% 50%; }
    }
  `;

  // Table style
  const tableStyle = {
    width: '90%',
    borderCollapse: 'collapse',
    marginTop: '2rem',
    backgroundColor: '#f5f5f5', // light gray
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  };
  const cellStyle = {
    border: '1px solid #ccc',
    padding: '8px',
    backgroundColor: '#f5f5f5', // light gray for all cells
  };
  const theadCellStyle = {
    ...cellStyle,
    backgroundColor: 'rgba(174, 145, 253, 0.8)',
    fontWeight: 'bold',
    color: '#fff', // white text
  };
  const buttonStyle = {
    backgroundColor: 'rgba(190, 190, 191, 0.8)',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 16px',
    margin: '0 4px',
    cursor: 'pointer',
    fontSize: '15px',
    fontFamily: 'inherit',
    transition: 'background 0.2s',
  };

  return (
    <div style={containerStyle}>
      <style>{globalStyles}</style>
      <h2 style={{ color: '#fff', marginTop: '2rem' }}>Supplier List</h2>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={theadCellStyle}>Party Name</th>
            <th style={theadCellStyle}>Address</th>
            <th style={theadCellStyle}>GST No</th>
            <th style={theadCellStyle}>Mobile Number</th>
            <th style={theadCellStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map((s, idx) => (
            <React.Fragment key={idx}>
              <tr>
                {editIdx === idx ? (
                  <>
                    <td style={cellStyle}>
                      <input name="partyName" value={editData.partyName} onChange={handleEditChange} />
                    </td>
                    <td style={cellStyle}>
                      <input name="address" value={editData.address} onChange={handleEditChange} />
                    </td>
                    <td style={cellStyle}>
                      <input name="gstNo" value={editData.gstNo} onChange={handleEditChange} />
                    </td>
                    <td style={cellStyle}>
                      <input name="mobileNo" value={editData.mobileNo} onChange={handleEditChange} />
                    </td>
                    <td style={cellStyle}>
                      <button style={buttonStyle} onClick={() => handleEditSave(s.partyName)} disabled={actionLoading}>Save</button>
                      <button style={buttonStyle} onClick={() => setEditIdx(null)} disabled={actionLoading}>Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ ...cellStyle, color: 'blue', cursor: 'pointer', textDecoration: 'underline', backgroundColor: '#f5f5f5' }}
                      onClick={() => handlePartyClick(s.partyName)}
                    >
                      {s.partyName}
                    </td>
                    <td style={cellStyle}>{s.address}</td>
                    <td style={cellStyle}>{s.gstNo}</td>
                    <td style={cellStyle}>{s.mobileNo}</td>
                    <td style={cellStyle}>
                      <button style={buttonStyle} onClick={() => handleEdit(idx)} disabled={actionLoading}>Edit</button>
                      <button style={buttonStyle} onClick={() => handleDelete(s.partyName)} disabled={actionLoading}>Delete</button>
                    </td>
                  </>
                )}
              </tr>
              {expanded === s.partyName && (
                <tr>
                  <td colSpan={5} style={{ ...cellStyle, background: '#f9f9f9' }}>
                    {detailsLoading && <div>Loading details...</div>}
                    {detailsError && <div style={{ color: 'red' }}>Error: {detailsError}</div>}
                    {details[s.partyName] && details[s.partyName].length > 0 ? (
                      <div>
                        <b>GSN/GRIN Numbers:</b>
                        <ul style={{ margin: '8px 0 0 0' }}>
                          {details[s.partyName].map((entry, i) => (
                            <li key={i}>
                              GSN: {entry.gsn || '-'} | GRIN: {entry.grinNo || '-'}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : details[s.partyName] && details[s.partyName].length === 0 ? (
                      <div>No GSN/GRIN numbers found for this party.</div>
                    ) : null}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
} 