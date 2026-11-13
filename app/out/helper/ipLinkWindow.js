const {ipcMain, BrowserWindow} = require('electron');
const path = require('path');

(function () {
    let topWindow;
    let childWindowId;

    function showChildWindow(event, url, onReadyToShow) {
        const allWindows = BrowserWindow.getAllWindows();
        if (allWindows && allWindows.length > 1) {
            let childWindow = allWindows.find((window) => window.id === childWindowId);
            if (!childWindow) {
                childWindow =  allWindows[0];
            }
            childWindow.restore();
            childWindow.focus();
            event.sender.send('show-ip-link-opened', true);
            return;
        }

        const options = {
            parent: topWindow,
            modal: true,
            show: false,
            alwaysOnTop : true,
            frame: true,
            closable: true
        };
        if (process.platform === 'linux') {
			options.icon = path.join(__dirname, '../resources/linux/app.png'); // Windows and Mac are better off using the embedded icon(s)
		}
        let child = new BrowserWindow(options);
        child.on('closed', () => {
            child = null;
            event.sender.send('show-ip-link-opened', false);
        });

        console.log(process.platform);
        if (process.platform === 'darwin') {
            // Close with Escape or Cmd+W, even if the page is third-party
            child.webContents.on('before-input-event', (event, input) => {
                const isEscape = input.type === 'keyDown' && input.key === 'Escape';
                const isCmdW = input.type === 'keyDown' && input.meta && input.key.toLowerCase() === 'w';

                if (isEscape || isCmdW) {
                    event.preventDefault();

                    if (child && !child.isDestroyed()) {
                        child.close();
                    }
                }
            });
        }

        childWindowId = child.id;

        child.loadURL(url);
        child.once('ready-to-show', () => {
            child.maximize();
            child.show();
            child.focus();
            onReadyToShow();
        });
    }

    function init(topWin) {
        topWindow = topWin;
    }

    ipcMain.on('show-ip-link', async (event, arg) => {
        try {
            showChildWindow(event, arg.url, () => {
                event.sender.send('show-ip-link-opened', true);
            });
        } catch (e) {
            console.log(e);
        }
    });

    exports.init = init;
}());