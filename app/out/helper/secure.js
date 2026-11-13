const {app, ipcMain, safeStorage} = require('electron');
const fs = require('fs');
const path = require('path');
const keytar = require('keytar');

const SERVICE_ID = 'gira-smart-home.login';
const SERVICE_ID_NEW = 'gira-smart-home.data';

ipcMain.on('get-secure-key', async (event, arg) => {
    try {
        await getSecureString(event, arg);
    } catch (e) {
        event.sender.send('get-secure-key-response', {key: arg.key, data: ""});
    }
});

ipcMain.on('save-secure-key', async (event, arg) => {
    try {
        await saveSecureString(event, arg);
    } catch (e) {
        event.sender.send('save-secure-key-response', {key: arg.key, data: false});
    }
});

// MIGRATION BEGIN
function migratetoSafeStorage(key, credentials) {
    console.log("migratetoSafeStorage");
    const buffer = JSON.stringify(safeStorage.encryptString(credentials));
    saveToDisk(SERVICE_ID_NEW + '.' + key, buffer.toString());
}
// MIGRATION END

function loadFromDisk(fullKey) {
    try {
        const userData = app.getPath('userData');
        const fullPath = path.join(userData, fullKey);
        console.log("loadFromDisk");
        if (fs.existsSync(fullPath)) {
            const data = fs.readFileSync(fullPath);
            return data.toString();
        }
    } catch (e) {
        console.log("loadFromDisk", e);
    }

    return "";
}

function saveToDisk(fullKey, data) {
    try {
        const userData = app.getPath('userData');
        const fullPath = path.join(userData, fullKey);
        console.log("saveToDisk", fullPath);
        fs.writeFileSync(fullPath, Buffer.from(data), {flag: "w", flush: true});
        return true;
    } catch (e) {
        console.log("saveToDisk", e);
    }
    return false;
}

function getSecureStorageData(key) {
    try {
        const encryptedData = loadFromDisk(SERVICE_ID_NEW + '.' + key);
        if (encryptedData) {
            const parsedValue = JSON.parse(encryptedData);
            const bufferToDecrypt = Buffer.from(parsedValue.data);
            const buffer = safeStorage.decryptString(bufferToDecrypt);
            return buffer;
        }
    } catch(e) {
        console.log("getSecureStorageData", e);
    }
    return "";
}

function setSecureStorageData(event, key, credentials) {
    try {
        console.log("setSecureStorageData");
        const buffer = JSON.stringify(safeStorage.encryptString(credentials));
        const success = saveToDisk(SERVICE_ID_NEW + '.' + key, buffer);
        event.sender.send('save-secure-key-response', {key: key, data: success});
    } catch(e) {
        console.log(e);
        event.sender.send('save-secure-key-response', {key: key, data: false});
    }
}

async function getSecureString(event, arg) {
    console.log("getSecureString");
    const credentials = await keytar.findCredentials(SERVICE_ID);
    if (credentials && credentials.length > 0) {
        if (credentials.length > 1 || !(credentials[0].account === "connections")) {
            let collection = [];
            credentials.forEach((data) => {
                collection.push(JSON.parse(data.password));
            });
            migratetoSafeStorage(arg.key, JSON.stringify(collection));
            event.sender.send('get-secure-key-response', {key: arg.key, data: credentials ? JSON.stringify(collection) : ""});
        } else {
            await getSecureStringTheOldWay(event, arg);
        }
        await removeSecureString();
    } else {
        const data = getSecureStorageData(arg.key);
        event.sender.send('get-secure-key-response', {key: arg.key, data: data});
    }
}

async function getSecureStringTheOldWay(event, arg) {
    const result = await keytar.getPassword(SERVICE_ID, arg.key);
    if (result) {
        migratetoSafeStorage(arg.key, result);
        event.sender.send('get-secure-key-response', {key: arg.key, data: result});
    } else {
        const data = getSecureStorageData(arg.key);
        event.sender.send('get-secure-key-response', {key: arg.key, data: data});
    }
}

async function saveSecureString(event, arg) {
    await removeSecureString();
    setSecureStorageData(event, arg.key, arg.data);
}

async function removeSecureString() {
    let credentialArray = await keytar.findCredentials(SERVICE_ID);
    let deletePromises = [];
    if (credentialArray) {
        deletePromises = credentialArray.map((credential) => {
            return keytar.deletePassword(SERVICE_ID, credential.account);
        });
    }
    await Promise.all(deletePromises);
}

exports.removeSecureString = removeSecureString;