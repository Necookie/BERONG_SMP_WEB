export function initTableSorting() {
  const tables = document.querySelectorAll<HTMLTableElement>('table');
  
  tables.forEach(table => {
    const headers = table.querySelectorAll<HTMLTableCellElement>('th.sortable');
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    
    headers.forEach(header => {
      const sortKey = header.getAttribute('data-sort-key');
      if (!sortKey) return;
      
      header.addEventListener('click', () => {
        const currentDir = header.getAttribute('data-sort-dir') || 'none';
        let newDir: 'asc' | 'desc' = 'asc';
        
        if (currentDir === 'asc') {
          newDir = 'desc';
        }
        
        // Reset all headers in this table
        headers.forEach(h => {
          h.classList.remove('sorted-asc', 'sorted-desc');
          h.removeAttribute('data-sort-dir');
        });
        
        // Set new state on clicked header
        header.classList.add(newDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
        header.setAttribute('data-sort-dir', newDir);
        
        // Sort the rows
        const rows = Array.from(tbody.querySelectorAll('tr'));
        
        rows.sort((a, b) => {
          const valA = a.getAttribute(`data-sort-${sortKey}`) ?? '';
          const valB = b.getAttribute(`data-sort-${sortKey}`) ?? '';
          
          // Check if both values are numbers
          const numA = Number(valA);
          const numB = Number(valB);
          
          if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
            return newDir === 'asc' ? numA - numB : numB - numA;
          }
          
          // Fallback to string comparison
          return newDir === 'asc' 
            ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
            : valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
        });
        
        // Re-append rows to the tbody
        rows.forEach(row => tbody.appendChild(row));
        
        // Trigger a custom event
        table.dispatchEvent(new CustomEvent('table-sorted', { detail: { sortKey, direction: newDir } }));
      });
    });
  });
}
