import Window from './window.js';

var usableArea = null;
var metaTagSettings = null;
var initialBase = null;
var startUrl = null;
var configKey = null;

document.addEventListener('DOMContentLoaded', function() {
	usableArea = document.querySelector('.usable-area');
	metaTagSettings = document.querySelector('meta');

	startUrl = metaTagSettings.getAttribute('startUrl');
	configKey = metaTagSettings.getAttribute('configKey');
	
	initialBase = document.querySelector('base').href;

	const windowElt = new Window('.resizable-window', '.usable-area', handleDragEvent);
	const iframeOfWindow = windowElt.element.querySelector('#window');
	const taskbar = document.querySelector('.task-bar');
	const datetime = taskbar.querySelector('.datetime');
	const browserTop = windowElt.element.querySelector('.browser-top');
	const spinner = browserTop.querySelector('.spinner');
	const exitBtn = taskbar.querySelector('#exit-seb');
	const refreshBtn = windowElt.element.querySelector('.fa-refresh');

	exitBtn.addEventListener('click', exitSeb, false);

	updateTimeAndDate(datetime);
	setInterval(() => updateTimeAndDate(datetime), 1000);

	setCurrentLang(taskbar);

	windowElt.restore();

	iframeOfWindow.src = startUrl;

	refreshBtn.addEventListener('click', function() {
		iframeOfWindow.contentWindow.location.reload();
	});
	
    iframeOfWindow.addEventListener('load', async function() {
		const doc = this.contentDocument;

		spinner.classList.remove('show');

		this.contentWindow.addEventListener('beforeunload',  function() {
			spinner.classList.add('show');
		});

		windowElt.changeTitle(this.contentWindow.document.title);
		let iconLink = doc.querySelector("link[rel*='icon']");
		if (iconLink) {
			windowElt.changeFavicon(iconLink.href);
		} else {
			console.warn("Favicon link not found");
		}
		updateBrowserHistory(this);
    });


	setTimeout(() => document.documentElement.requestFullscreen().catch(err => {
		console.error(`Error trying to enable fullscreen mode: ${err.message} (${err.name})`);
	}), 250);
});

function setCurrentLang(taskbar) {
	const fullLangCode = navigator.language;
    const shortLangCode = fullLangCode.toUpperCase().substring(0, 2);
	taskbar.querySelector('#current-lang').textContent = shortLangCode;
}

function updateTimeAndDate(elt) {
    const now = new Date();
    const locale = navigator.language;

    const timeOptions = { hour: '2-digit', minute: '2-digit'};
    const dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };

    const time = now.toLocaleTimeString(locale, timeOptions);
    const date = now.toLocaleDateString(locale, dateOptions);

    elt.querySelector('#time').textContent = time;
    elt.querySelector('#date').textContent = date;
}


function updateBrowserHistory(iframe) {
	const parsedUrl = new URL(iframe.contentWindow.location.href);
    const relativeUrl = parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;
	
	document.querySelector('base').href = parsedUrl.hostname;
    history.replaceState({}, "", relativeUrl);
	document.querySelector('base').href = initialBase;
}

function handleDragEvent(status, element) {
    if(status === "start") {
        element.querySelector('#window').style.pointerEvents = "none";
    }

    if(status === "end"){
        element.querySelector('#window').style.pointerEvents = "";
    }
}

function exitSeb()
{
	window.location.reload();
}



