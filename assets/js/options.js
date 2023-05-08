const regexForm = document.getElementById('regex-form');
const regexNameInput = document.getElementById('regex-name');
const regexQueryInput = document.getElementById('regex-query');
const regexTableBody = document.getElementById('regex-table').tBodies[0];

async function getRegexQueries() {
  return new Promise(resolve => {
    browser.storage.local.get('portunus-regex-queries', data => {
      resolve(data['portunus-regex-queries']);
    });
  });
}

async function saveRegexQueries(queries) {
  return new Promise(resolve => {
    browser.storage.local.set({ 'portunus-regex-queries': queries }, resolve);
  });
}

async function updateRegexTable() {
  const regexQueries = await getRegexQueries();
  regexTableBody.innerHTML = '';

  for (const query of regexQueries) {
    const row = regexTableBody.insertRow();
    const nameCell = row.insertCell();
    const regexCell = row.insertCell();
    const actionsCell = row.insertCell();

    nameCell.textContent = query.name;
    regexCell.textContent = query.regex;

    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.addEventListener('click', () => {
      regexNameInput.value = query.name;
      regexQueryInput.value = query.regex;
    });
    actionsCell.appendChild(editButton);

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', async () => {
      const updatedQueries = regexQueries.filter(q => q.name !== query.name);
      await saveRegexQueries(updatedQueries);
      updateRegexTable();
    });
    actionsCell.appendChild(deleteButton);
  }
}

regexForm.addEventListener('submit', async event => {
  event.preventDefault();
  const name = regexNameInput.value.trim();
  const regex = regexQueryInput.value.trim();

  if (!name || !regex) return;

  const regexQueries = await getRegexQueries();
  const existingQuery = regexQueries.find(q => q.name === name);

  if (existingQuery) {
    existingQuery.regex = regex;
  } else {
    regexQueries.push({ name, regex });
  }

  await saveRegexQueries(regexQueries);
  updateRegexTable();

  regexNameInput.value = '';
  regexQueryInput.value = '';
});

updateRegexTable();
