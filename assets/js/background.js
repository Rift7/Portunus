const regexQueriesKey = 'portunus-regex-queries';
const foundStringsKey = 'portunus-found-strings';

// Initialize the saved regex queries with some default examples
async function initializeQueries() {
  const queries = await getRegexQueries();
  if (!queries) {
    const defaultQueries = [
      { name: 'Example API Key 1', regex: 'example-api-key-\\w{20}' },
      { name: 'Example API Key 2', regex: 'example-api-key-\\w{32}' },
    ];
    saveRegexQueries(defaultQueries);
  }
}

async function getRegexQueries() {
  return new Promise(resolve => {
    browser.storage.local.get(regexQueriesKey, data => {
      resolve(data[regexQueriesKey]);
    });
  });
}

function saveRegexQueries(queries) {
  browser.storage.local.set({ [regexQueriesKey]: queries });
}

async function performRegexSearch() {
    const activeQuery = await browser.storage.local.get('portunus-active-query');
    if (activeQuery['portunus-active-query']) {
      await updateFoundStrings(activeQuery['portunus-active-query']);
    }
  }

async function updateFoundStrings(regexString) {
    const regex = new RegExp(regexString, 'g');
    const pageContent = await browser.tabs.executeScript({
      code: 'document.body.innerText',
    });
  
    const matches = Array.from(pageContent[0].matchAll(regex));
    const foundStrings = await browser.storage.local.get('portunus-found-strings');
    const updatedFoundStrings = Array.from(
      new Set([...(foundStrings['portunus-found-strings'] || []), ...matches.map(m => m[0])])
    );
  
    await browser.storage.local.set({ 'portunus-found-strings': updatedFoundStrings });
    browser.runtime.sendMessage({ action: 'found-strings-updated' });
  }

  async function searchPage(tabId, url, regexQuery) {
    const code = `
      (function() {
        const regex = new RegExp('${regexQuery}', 'g');
        const matches = document.documentElement.innerHTML.match(regex) || [];
        return matches;
      })()
    `;
  
    const results = await browser.tabs.executeScript(tabId, { code });
    const newFoundStrings = results[0];
  
    const storedStrings = await browser.storage.local.get(foundStringsKey);
    const existingFoundStrings = storedStrings[foundStringsKey] || [];
  
    const updatedFoundStrings = Array.from(new Set([...existingFoundStrings, ...newFoundStrings]));
    browser.storage.local.set({ [foundStringsKey]: updatedFoundStrings });
  
    // Notify popup.js to update the found strings list
    browser.runtime.sendMessage({ action: 'found-strings-updated' });
  }

async function onPageVisited(details) {
  if (details.frameId !== 0) return;

  const queries = await getRegexQueries();
  if (!queries || queries.length === 0) return;

  searchPage(details.tabId, details.url, queries[0].regex);
}

initializeQueries();
browser.webNavigation.onCompleted.addListener(onPageVisited);

// Listen for messages from popup.js to change the active regex query
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === 'change-regex-query') {
      await browser.storage.local.set({ 'portunus-active-query': message.regex });
      await updateFoundStrings(message.regex);
    }
  });
  
  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
      const activeQuery = await browser.storage.local.get('portunus-active-query');
      if (activeQuery['portunus-active-query']) {
        await updateFoundStrings(activeQuery['portunus-active-query']);
      }
    }
  });

  browser.tabs.onActivated.addListener(async activeInfo => {
    await performRegexSearch();
  });