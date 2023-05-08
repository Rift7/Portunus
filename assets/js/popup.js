const querySelector = document.getElementById('query-selector');
const copyAllButton = document.getElementById('copy-all');
const deleteAllButton = document.getElementById('delete-all');
const resultsTableBody = document.getElementById('results-table').tBodies[0];
const downloadCSVButton = document.getElementById('download-csv');

async function getRegexQueries() {
  return new Promise(resolve => {
    browser.storage.local.get('portunus-regex-queries', data => {
      resolve(data['portunus-regex-queries']);
    });
  });
}

async function getFoundStrings() {
  return new Promise(resolve => {
    browser.storage.local.get('portunus-found-strings', data => {
      resolve(data['portunus-found-strings']);
    });
  });
}

function copyToClipboard(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
}

function downloadCSV(data, fileName) {
  const csvContent = data.map(row => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function updateQuerySelector() {
    const queries = await getRegexQueries();
    const activeQuery = await browser.storage.local.get('portunus-active-query');
    querySelector.innerHTML = '';
  
    for (const query of queries) {
      const option = document.createElement('option');
      option.value = query.regex;
      option.textContent = query.name;
      option.selected = query.regex === activeQuery['portunus-active-query'];
      querySelector.appendChild(option);
    }
  }

  async function updateFoundStringsTable() {
    const foundStrings = await getFoundStrings();
    resultsTableBody.innerHTML = '';
  
    for (const str of foundStrings) {
      const row = resultsTableBody.insertRow();
      const actionsCell = row.insertCell();
      const stringCell = row.insertCell();
  
      stringCell.textContent = str;
  
      const copyButton = document.createElement('img');
      copyButton.src = 'assets/icons/copy-96.png';
      copyButton.height = 20;
      copyButton.width = 20;
      copyButton.addEventListener('click', () => copyToClipboard(str));
      actionsCell.appendChild(copyButton);
  
      const deleteButton = document.createElement('img');
      deleteButton.src = 'assets/icons/delete-96.png';
      deleteButton.height = 20;
      deleteButton.width = 20;
      deleteButton.addEventListener('click', () => {
        row.remove();
      });
      actionsCell.appendChild(deleteButton);
    }
  }

  downloadCSVButton.addEventListener('click', async () => {
    const foundStrings = await getFoundStrings();
    const activeQuery = await browser.storage.local.get('portunus-active-query');
    const queries = await getRegexQueries();
    const queryName = queries.find(q => q.regex === activeQuery['portunus-active-query'])?.name || 'Unknown';
  
    const data = foundStrings.map(str => [queryName, str]);
    const fileName = `portunus_export_${queryName}.csv`;
  
    downloadCSV(data, fileName);
  });

  querySelector.addEventListener('change', async () => {
    const selectedRegex = querySelector.value;
    await browser.runtime.sendMessage({ action: 'change-regex-query', regex: selectedRegex });
    await updateFoundStringsTable();
  });
  
  copyAllButton.addEventListener('click', async () => {
    const foundStrings = await getFoundStrings();
    copyToClipboard(foundStrings.join('\n'));
  });
  
  deleteAllButton.addEventListener('click', () => {
    resultsTableBody.innerHTML = '';
  });

updateQuerySelector();
updateFoundStringsTable();

// Listen for messages from background.js to update the found strings list
browser.runtime.onMessage.addListener(async message => {
    if (message.action === 'found-strings-updated') {
      await updateFoundStringsTable();
    }
  });