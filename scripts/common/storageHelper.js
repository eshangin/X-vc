var StorageHelper = {
    getLocal,
    setLocal,
    removeLocal
};

function removeLocal(keys) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.remove(keys, function (result) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}

function getLocal(key) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(key === null ? null : [key], function (result) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(key === null ? result : result[key]);
            }
        });
    });
}

function setLocal(storageData) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set(storageData, function (result) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}
