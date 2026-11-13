(function () {
    "use strict";
    require('./helper/FormatString.js');
    require('./helper/secure.js');
    const ipLink = require('./helper/ipLinkWindow.js');

    const { app, BrowserWindow, Menu, ipcMain } = require('electron');
    const path = require('path');
    const url = require('url');
    const mSearch = require("./msearch.js").createMSearch();
    const { validateAKey } = require("./sda.js");
    const { removeSecureString } = require("./helper/secure.js");

    let isSdaActive = false;

    ipcMain.on('clear-storage', function(event) {
        clearStorageData(event);
    });

    ipcMain.on('stop-msearch', function() {
        mSearch.stopSearch();
    });

    ipcMain.on('start-msearch', function(event) {
        mSearch.startSearch(event);
    });

    ipcMain.on('validateAKey', (event, arg) => {
        validateAKey(event, arg.url, JSON.parse(arg.data));
    });

    ipcMain.on('setSdaActive', (event, arg) => {
        isSdaActive = JSON.parse(arg.isActive);
    });

    let win;

    const fullscreen = process.argv.some(a => /--fullscreen|--start-fullscreen/.test(a));
    const frameless = process.argv.some(a => /--frameless/.test(a));

    const options = {
        backgroundColor: "#FFF",
        width: 1024,
        height: 720,
        show: false,
        kiosk: frameless,
        fullscreen: fullscreen,
        frame: !frameless,
        title: app.name,
        nodeIntegrationInWorker: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    };

    const selectionMenu = Menu.buildFromTemplate([
        {role: 'copy'},
        {type: 'separator'},
        {role: 'selectall'},
    ]);

    const inputMenu = Menu.buildFromTemplate([
        {role: 'undo'},
        {role: 'redo'},
        {type: 'separator'},
        {role: 'cut'},
        {role: 'copy'},
        {role: 'paste'},
        {type: 'separator'},
        {role: 'selectall'},
    ]);

    configureCommandLineSwitches();

    function configureCommandLineSwitches() {
        app.commandLine.appendSwitch('disable-mojo-local-storage');
        // Force pre-Chrome-60 color profile handling
        app.commandLine.appendSwitch('disable-features', 'ColorCorrectRendering');
        app.commandLine.appendSwitch('allow-running-insecure-content');
    }

    function clearStorageData(event) {
        win.webContents.session.clearStorageData({
            storages: 'localstorage'
        }).then(() => {
            event.sender.send('clear-storage-reply', true);
        }).catch(() => {
            event.sender.send('clear-storage-reply', false);
        });
    }

    function getLocale() {
        const locale = app.getLocale();
        if (locale !== undefined && locale !== null && locale.toString().length > 2) {
            return locale.substring(0, 2);
        }
        return locale || "de";
    }

    function createWindow () {
        const locale = getLocale();
		if (process.platform === 'linux') {
			options.icon = path.join(__dirname, '../resources/linux/app.png'); // Windows and Mac are better off using the embedded icon(s)
            console.log(options.icon);
		}

        // Remove default menu
        Menu.setApplicationMenu(null);
        // Create the browser window.
        win = new BrowserWindow(options);
        ipLink.init(win);

        //create path with parameters.
        let urlWithParameters = url.format({
            pathname: path.join(__dirname, 'smart-home', 'layout.html'),
            protocol: 'file:',
            slashes: true
        }) + '?osLanguage=' + locale;

        //@@inject-debug-url
        urlWithParameters += "&version=6.0.72"

        // and load the index.html of the app.
        win.loadURL(urlWithParameters);

        win.once('ready-to-show', () => {
            //@@inject-dev-tools
            win.maximize();
            win.show(); // to reduce flicker from the default window size to maximize, we only show after maximize
            win.focus();
        });

        win.onbeforeunload = (e) => {
            //console.log('I do not want to be closed')

            // Unlike usual browsers that a message box will be prompted to users, returning
            // a non-void value will silently cancel the close.
            // It is recommended to use the dialog API to let the user confirm closing the
            // application.
            e.returnValue = true;
        };

        // Emitted when the window is closed.
        win.on('closed', () => {
            // Dereference the window object, usually you would store windows
            // in an array if your app supports multi windows, this is the time
            // when you should delete the corresponding element.
            win = null;
        });

        win.webContents.on('context-menu', (e, props) => {
            const { selectionText, isEditable } = props;
            if (isEditable) {
                inputMenu.popup(win);
            } else if (selectionText && selectionText.trim() !== '') {
                selectionMenu.popup(win);
            }
        });
    }

    function init() {
        const shouldQuit = app.requestSingleInstanceLock();
        if (!shouldQuit) {
            return app.quit();
        }

        let reConnect = function(event) {
            event.sender.send('reconnect');
        };

        app.on('second-instance', () => { // event, commandLine, workingDirectory
            // Someone tried to run a second instance, we should focus our window.
            if (win) {
                if (win.isMinimized()) {
                    win.restore();
                }
                win.focus();
            }
        });

        app.once('ready', async () => {
            let args = process.env.SMART_HOME_UNINSTALL;
            if (args == 1 ) {
                // Remove ....
                await removeSecureString();
                app.quit();
                return;
            }
            createWindow();
        });

        app.on('window-all-closed', () => {
            // On macOS it is common for applications and their menu bar
            // to stay active until the user quits explicitly with Cmd + Q
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });

        app.on('activate', () => {
            // On macOS it's common to re-create a window in the app when the
            // dock icon is clicked and there are no other windows open.
            if (win === null) {
                createWindow();
            }
        });

        // when the window is in background and comes back to life
        app.on('focus', (event) => {
            reConnect(event);
        });

        // when the app is minimized and comes back.
        app.on('restore', (event) => {
            reConnect(event);
        });

        app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
            if (isSdaActive === false) {
                // Ignore error
                event.preventDefault();
                callback(true);
            } else {
               callback(false);
            }
        });
    }

    init();
}());
