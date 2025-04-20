
async function downloadBatch(batchId) {
    const token = localStorage.getItem('authToken');
  
    try {
      const res = await fetch(`http://localhost:5001/api/message/logs/batch/${encodeURIComponent(batchId)}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
  
      if (!res.ok) {
        const error = await res.json();
        alert(`❌ Error: ${error.msg}`);
        return;
      }
  
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Batch_${batchId}_Logs.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('❌ Download failed:', err);
      alert('Download failed.');
    }
  }
  