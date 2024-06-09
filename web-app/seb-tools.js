class SebTools
{
    static sebxml2dict(xml) {
        const data = {};
        let valueOnNextElem = false;
        let keyText = "";

        xml.querySelectorAll('*').forEach(elem => {
            if (elem.tagName === "key") {
                keyText = elem.textContent;
                valueOnNextElem = true;
            } else if (valueOnNextElem) {
                valueOnNextElem = false;
                switch (elem.tagName) {
                    case "true":
                        data[keyText] = true;
                        break;
                    case "false":
                        data[keyText] = false;
                        break;
                    case "array":
                        data[keyText] = [];
                        break;
                    case "string":
                        data[keyText] = elem.textContent;
                        break;
                    case "integer":
                        data[keyText] = parseInt(elem.textContent, 10);
                        break;
                }
            }
        });

        return data;
    }
    static sortElements(data) {
        return Object.keys(data).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
            .reduce((acc, key) => ({ ...acc, [key]: data[key] }), {});
    }

    static jsonDumpsWithoutWhitespaces(data) {
        return JSON.stringify(data).replace(/\s/g, "");
    }

    static async sha256(str) {
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder("utf-8").encode(str));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    static async sebHashFromConfig(xmlString) {
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlString, "text/xml");

        const unorderedData = this.sebxml2dict(xml);
        const data = this.sortElements(unorderedData);

        const jsonStr = this.jsonDumpsWithoutWhitespaces(data);
        const configHash = await this.sha256(jsonStr);

        const url = data["startURL"];

        return [url, configHash];
    }
	
    static returnSebLinks(doc) {
        const links = doc.querySelectorAll('a');
        const sebLinks = [];
    
        for (const link of links) {
            const href = link.getAttribute('href');
            if (href && /^sebs:\/\//i.test(href)) {
                sebLinks.push(href.replace(/^sebs:\/\//i, 'https://'));
            }
        }
    
        return sebLinks; 
    }    
	
	static async fetchAndGetConfigHash(url)
	{
		const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

		const content = await response.text();
		const res = await this.sebHashFromConfig(content);
		return res;
	}
	
	static async getConfigKey(url, configHash)
	{
		return await this.sha256(url + configHash);
	}
	
	static async fetchWithHeader(url, configKey)
	{
		
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'X-SafeExamBrowser-ConfigKeyHash': configKey,
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0 SEB/3.5.0 (x64)'
			}
        });
		
		const data = await response.text();
        return data;
	}
	
}

export default SebTools;
