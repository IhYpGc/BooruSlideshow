chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [{
        "id": 3,
        "priority": 1,
        "action": {
            "type": "modifyHeaders",
            "requestHeaders": [
                { "header": "Sec-Fetch-Mode", "operation": "set", "value": "same-origin" }
            ]
        },
        "condition": {
            "urlFilter": "https://*.e621.net/*",
            "resourceTypes": ["main_frame", "sub_frame", "xmlhttprequest", "image", "media"] // see available https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-ResourceType
        }
    }],
})

browser.webRequest.onBeforeSendHeaders.addListener(
  function(details) {
    for (var i = 0; i < details.requestHeaders.length; ++i) {
      if (details.requestHeaders[i].name === 'User-Agent') {
        details.requestHeaders.splice(i, 1);
        break;
      }
    }
    return {requestHeaders: details.requestHeaders};
  },
  {urls: ["<all_urls>"]},
  ["blocking", "requestHeaders"]
);
