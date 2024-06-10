import SebTools from './../web-app/seb-tools.js';

const SEB_URLS_RESULT = "SEB_TOOLS_RESULT";

const MODULE_URL = chrome.runtime.getURL('web-app/seb-tools.js');
const MAIN_URL = chrome.runtime.getURL("/web-app/main.html");
const BASE_URL = chrome.runtime.getURL("/web-app/");
let UlSebLinks;

async function injectFunction(mainUrl, baseUrl, moduleUrl, startUrl, configHash ) {
    if(document.readyState === "complete")
    {
        const module = await import(moduleUrl);

        const configKey = await module.default.getConfigKey(startUrl, configHash);
        const outHTML = await module.default.fetchWithHeader(startUrl, configKey);

        fetch(mainUrl)
        .then(response => response.text())
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");
            const baseElt = doc.createElement('base');
            const meta = doc.createElement('meta');
            const head = doc.head;
            
            baseElt.setAttribute('href', baseUrl);
            meta.setAttribute('dom', outHTML);
            meta.setAttribute('startUrl', startUrl);

            if (head.firstChild) {
                head.insertBefore(baseElt, head.firstChild);
            } else {
                head.appendChild(baseElt);
            }
            
            if (baseElt.nextSibling) {
                head.insertBefore(meta, baseElt.nextSibling);
            } else {
                head.appendChild(meta);
            }
            
            document.open();
            document.write(doc.documentElement.innerHTML);
            document.close();
        
        })
        .catch(error => console.error('Error loading the page: ', error));
    }
}

async function injectJS(tabId)
{
    async function loadAndUseSebToolsModule(moduleUrl, result) {
        const module = await import(moduleUrl);
        const sebUrls = module.default.returnSebLinks(document);

        const configData = await Promise.all(sebUrls.map(async sebUrl => {
            let [startUrl, configHash] = await module.default.fetchAndGetConfigHash(sebUrl);
            return { startUrl, configHash };
        }));
        
        chrome.runtime.sendMessage({ type: result, data: configData });
    }

    await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: loadAndUseSebToolsModule,
        args: [MODULE_URL, SEB_URLS_RESULT]
    });
}

function showSebLinks(links, tabId) {
    const childLiElements = UlSebLinks.querySelectorAll('li');

    if (childLiElements.length > 0) {
        childLiElements.forEach(child => UlSebLinks.removeChild(child));
    }    

    const createLinkTemplate = (configData) => `
        <li>
            <div class="row">
                <i class="fa-regular fa-link"></i>
                <span class="text-truncate">${configData.startUrl}</span>
            </div>
            <div class="row">
                <i class="fa-regular fa-binary-circle-check"></i>
                <span class="text-truncate">${configData.configHash}</span>
            </div>
            <div class="buttons">
                <button class="btn-open-emulator">
                    <i class="fa-regular fa-mask"></i>
                    Open in SEB emulator
                </button>
                <button class="btn-open-tab">
                    <i class="fa-regular fa-arrow-up-right-from-square"></i>
                    Open in current tab
                </button>
            </div>
        </li>
    `;

    links.forEach(configData => {
        const template = document.createElement('template');
        template.innerHTML = createLinkTemplate(configData).trim();
        const li = template.content.firstChild;

        li.querySelector('.btn-open-emulator').onclick = () => {
            window.close();
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: injectFunction,
                args: [MAIN_URL, BASE_URL, MODULE_URL, configData.startUrl, configData.configHash]
            });
        };

        li.querySelector('.btn-open-tab').onclick = async () => {
            window.close();
            const configKey = await SebTools.getConfigKey(configData.startUrl, configData.configHash);
            const html = await SebTools.fetchWithHeader(configData.startUrl, configKey);
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: (dom) => {
                    document.open();
                    document.write(dom);
                    document.close();
                },
                args: [html]
            });
        };

        UlSebLinks.appendChild(li);
    });

    if (links.length === 0) {
        UlSebLinks.classList.add('empty');
    }
}


async function getSebLinks()
{
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = tab.id;
    
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        
        if (message.type === SEB_URLS_RESULT) {
            showSebLinks(message.data, tabId, UlSebLinks);
        }
    });

    try {
        await injectJS(tabId);
    }
    catch(error) {
        const errorDiv = document.createElement('li');
        errorDiv.textContent = `Error: ${error.message}`;
        errorDiv.className = "error";
        UlSebLinks.appendChild(errorDiv);
    }

}

document.addEventListener('DOMContentLoaded', async function() {
    UlSebLinks = document.querySelector('ul.seb-links');
    document.querySelector('#reload-btn').addEventListener('click', async function() {
        await getSebLinks();
    });
    await getSebLinks();
});



