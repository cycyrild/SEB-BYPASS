class SebTools
{
    static sebxml2dict(xml) {
        const data = {};
    
        function parseElement(elem) {
            switch (elem.tagName) {
                case "key":
                    return elem.textContent
                case "true":
                    return true;
                case "false":
                    return false;
                case "array":
                    return Array.from(elem.children).map(parseElement);
                case "string":
                    return elem.textContent;
                case "integer":
                    return parseInt(elem.textContent, 10);
                case "dict":
                    return parseDict(elem);
                case "data":
                    return elem.textContent;
                default:
                    return null;
            }
        }
    
        function parseDict(dictElem) {
            const dict = {};
            let key = "";
            for (let i = 0; i < dictElem.children.length; i++) {
                const child = dictElem.children[i];
                if (child.tagName === "key") {
                    key = child.textContent;
                } else {
                    dict[key] = parseElement(child);
                }
            }
            return dict;
        }
    
        if (xml.documentElement.tagName === "plist") {
            const rootDict = xml.documentElement.querySelector("dict");
            if (rootDict) {
                Object.assign(data, parseDict(rootDict));
            }
        }
    
        return data;
    }
    
    
    static sortElements(data) {
        return Object.keys(data).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
            .reduce((acc, key) => ({ ...acc, [key]: data[key] }), {});
    }

    static serialize(dictionary) {
        function _serialize(value) {
            if (value && typeof value === 'object') {
                if (Array.isArray(value)) {
                    return _serializeList(value);
                } else if (value instanceof Uint8Array) {
                    return `"${btoa(String.fromCharCode.apply(null, value))}"`;
                } else if (value instanceof Date) {
                    return `"${value.toISOString()}"`;
                } else {
                    return serialize(value);
                }
            } else if (typeof value === 'boolean' || typeof value === 'number') {
                return value.toString();
            } else if (typeof value === 'string') {
                return `"${value}"`;
            } else if (value === null) {
                return '""';
            }
        }
    
        function _serializeList(list) {
            return '[' + list.map(_serialize).join(',') + ']';
        }
    
        function serialize(obj) {
            let orderedByKey = Object.keys(obj).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
    
            let result = '{';
            orderedByKey.forEach((key, index) => {
                let value = obj[key];
                if (key.toLowerCase() !== 'originatorversion' && 
                    (!(value && typeof value === 'object' && !Array.isArray(value)) || Object.keys(value).length > 0)) {
                    result += `"${key}":${_serialize(value)}`;
                    if (index !== orderedByKey.length - 1) {
                        result += ',';
                    }
                }
            });
            result += '}';
            return result;
        }
    
        return serialize(dictionary);
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

        const jsonStr =  SebTools.serialize(data);
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
			}
        });
		
		const data = await response.text();
        return data;
	}
	
}

export default SebTools;
