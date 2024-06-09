class Window {
    constructor(elementSelector, containerSelector, callback) {
        this.element = document.querySelector(elementSelector);
        this.usableArea = document.querySelector(containerSelector);
		this.topBar = this.element.querySelector('.top-bar');
		this.maximizeRestoreBtn = this.element.querySelector('#maximize-restore-btn');
        this.eltWindow = this.element.querySelector('.window');
        this.windowTitle = this.topBar.querySelector(".window-title");
        this.favicon = this.topBar.querySelector(".favicon");

        this.callback = callback;

        this.active = false;
        this.currentX = 0;
        this.currentY = 0;
        this.initialX = 0;
        this.initialY = 0;
        this.xOffset = 0;
        this.yOffset = 0;

        this.isMaximized = false;

        this.configureDrag();
        this.configureActions();
    }

    resizeEvent() {
        if(this.isMaximized) {
            this.maximize();
            return;
        }
		const areaRect = this.usableArea.getBoundingClientRect();

        const actualWindowWidth = parseFloat(this.element.style.getPropertyValue("--width"));
		const actualWindowHeight = parseFloat(this.element.style.getPropertyValue("--height"));

        const actualWindowX = parseFloat(this.element.style.getPropertyValue("--xPosition"));
        const actualWindowY = parseFloat(this.element.style.getPropertyValue("--yPosition"));

        const newWidth = Math.min(actualWindowWidth, areaRect.width);
        const newHeight = Math.min(actualWindowHeight, areaRect.height);

        const maxX = areaRect.right - newWidth;
        const maxY = areaRect.bottom - newHeight;
        const newX = Math.min(Math.max(actualWindowX, areaRect.left), maxX);
        const newY = Math.min(Math.max(actualWindowY, areaRect.top), maxY);

        this.element.style.setProperty("--width", `${newWidth}px`);
        this.element.style.setProperty("--height", `${newHeight}px`);

        this.element.style.setProperty("--xPosition", `${newX}px`);
        this.element.style.setProperty("--yPosition", `${newY}px`);
    }


    configureDrag() {
        window.addEventListener('resize', this.resizeEvent.bind(this), false);

        this.topBar.addEventListener('mousedown', this.dragStart.bind(this), false);
        document.addEventListener('mouseup', this.dragEnd.bind(this), false);
        document.addEventListener('mousemove', this.drag.bind(this), false);
    }

    configureActions() {
        this.maximizeRestoreBtn.addEventListener('click', this.maximizeRestore.bind(this));
    }

    dragStart(e) {
        if (e.button === 0) {
            const elementUnderCursor = document.elementFromPoint(e.clientX, e.clientY);
            
            if(!this.isMaximized && 
                (elementUnderCursor === this.windowTitle || elementUnderCursor === this.topBar)) {
                const rect = this.element.getBoundingClientRect();
                this.initialX = e.clientX - rect.left;
                this.initialY = e.clientY - rect.top;
                this.active = true;
                this.callback('start', this.element);
            }

        }
    }

    dragEnd(e) {
        this.initialX = this.currentX;
        this.initialY = this.currentY;
        this.active = false;
        this.callback('end', this.element);
    }

    drag(e) {
        if (this.active) {
            e.preventDefault();

            let potentialNewX = e.clientX - this.initialX;
            let potentialNewY = e.clientY - this.initialY;

            const containerRect = this.usableArea.getBoundingClientRect();

            potentialNewX = Math.max(containerRect.left, Math.min(potentialNewX, containerRect.right - this.element.offsetWidth));

            if (potentialNewX + this.element.offsetWidth <= containerRect.right && potentialNewX >= containerRect.left) {
                this.currentX = potentialNewX - containerRect.left;
            }

            potentialNewY = Math.max(containerRect.top, Math.min(potentialNewY, containerRect.bottom - this.element.offsetHeight));

            if (potentialNewY + this.element.offsetHeight <= containerRect.bottom && potentialNewY >= containerRect.top) {
                this.currentY = potentialNewY - containerRect.top;
            }

            this.element.style.setProperty("--xPosition", `${this.currentX}px`);
            this.element.style.setProperty("--yPosition", `${this.currentY}px`);
        }
    }

    async sleep(time) {
        await new Promise(r => setTimeout(r, time));
    }

    maximize() {
        const areaRect = this.usableArea.getBoundingClientRect();
        this.element.style.setProperty("--width", `calc(${areaRect.width}px + var(--window-padding))`);
        this.element.style.setProperty("--height", `calc(${areaRect.height}px + var(--window-padding))`);
        
        this.element.style.setProperty("--xPosition", `calc(-0.5 * var(--window-padding))`);
        this.element.style.setProperty("--yPosition", `calc(-0.5 * var(--window-padding))`);
    }

    restore() {
        this.setInitialSize();
        this.setCenter();
    }

	
	async maximizeRestore() {
        const cssRestore = this.maximizeRestoreBtn.getAttribute("css-restore");
        const cssMaximize = this.maximizeRestoreBtn.getAttribute("css-maximize");
        const time = 250;

        switch(this.maximizeRestoreBtn.getAttribute("action"))
        {
            case "maximize":
            {

                this.element.style.setProperty("--transition-time", `${time}ms`);

                requestAnimationFrame(this.maximize.bind(this));

                await this.sleep(time);

                this.element.style.setProperty("--transition-time", "0ms");


                this.eltWindow.style.setProperty("--border-radius-size","0");
                this.eltWindow.style.setProperty("--box-shadow-size","0");

                this.maximizeRestoreBtn.setAttribute("action", "restore");
                this.maximizeRestoreBtn.setAttribute("class", cssRestore);

                this.isMaximized = true;
                break;
            }

            case "restore":
            {
                this.element.style.setProperty("--transition-time", `${time}ms`);

                requestAnimationFrame(this.restore.bind(this));

                await this.sleep(time);

                this.element.style.setProperty("--transition-time", "0ms");


                this.eltWindow.style.removeProperty("--border-radius-size");
                this.eltWindow.style.removeProperty("--box-shadow-size");

                this.maximizeRestoreBtn.setAttribute("action", "maximize");
                this.maximizeRestoreBtn.setAttribute("class", cssMaximize);

                this.isMaximized = false;
                break;
            }
        }

	}

	setInitialSize() {
		const areaRect = this.usableArea.getBoundingClientRect();
		const width = areaRect.width * 0.75;
		const height = areaRect.height * 0.75;
		
		this.element.style.setProperty("--width", `${width}px`);
		this.element.style.setProperty("--height", `${height}px`);
	}

	setCenter() {
		const areaRect = this.usableArea.getBoundingClientRect();
		const elementRect = this.element.getBoundingClientRect();

		const centerX = areaRect.width / 2;
		const centerY = areaRect.height / 2;


		const xPosition = centerX - (elementRect.width / 2);
		const yPosition = centerY - (elementRect.height / 2);

		this.element.style.setProperty("--xPosition", `${xPosition}px`);
		this.element.style.setProperty("--yPosition", `${yPosition}px`);
	}

    changeTitle(strg) {
        this.windowTitle.textContent = strg;
    }

    changeFavicon(href) {
        this.favicon.style.setProperty("--img-url", `url('${href}')`);
    }
    
}
export default Window;
