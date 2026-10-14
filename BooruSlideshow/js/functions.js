function enableDevMode()
{
	LOGGING_MODE = LOGGING_MODE_DEV;
}

function disableDevMode()
{
	LOGGING_MODE = LOGGING_MODE_PROD;
}

function logForDev(text)
{
	if (LOGGING_MODE != LOGGING_MODE_DEV)
	{
		return;
	}

	console.log(text);
}

function getXmlElementStringValueSafe(xml, elementName)
{
	var elements = xml.getElementsByTagName(elementName);

	if (elements.length == 0)
	{
		return '';
	}

	return elements[0].textContent;
}

function doesXmlContainElement(xml, elementName)
{
	var elements = xml.getElementsByTagName(elementName);

	return elements.length > 0;
}

function getDownloadFilenameForSlide(slide)
{
	var basename = slide.fileUrl.substring(slide.fileUrl.lastIndexOf('/') + 1).split('?')[0].split('#')[0];

	if (!basename)
		basename = slide.id + '.jpg';

	return 'bs/' + basename;
}

function downloadSlideFile(fileUrl, filename)
{
	// Fetch the bytes first (as opposed to handing the remote URL to
	// chrome.downloads directly). The fetch goes through the extension's
	// declarativeNetRequest Referer rules, while in Chromium the downloads
	// pipeline does not, so Gelbooru's hotlink protection would otherwise
	// redirect the download to the HTML post page (saved as a .htm file).
	fetch(fileUrl).then(function (response) {
		if (!response.ok)
			throw new Error('HTTP ' + response.status);

		return response.blob();
	}).then(function (blob) {
		var objectUrl = URL.createObjectURL(blob);

		chrome.downloads.download({
			url: objectUrl,
			filename: filename,
			conflictAction: 'overwrite'
		}, function (downloadId) {
			if (chrome.runtime.lastError)
			{
				console.log('Blob download failed, falling back to direct URL: ' + chrome.runtime.lastError.message);
				URL.revokeObjectURL(objectUrl);
				downloadSlideFileDirect(fileUrl, filename);
				return;
			}

			var onChanged = function (delta) {
				if (delta.id === downloadId && delta.state &&
					(delta.state.current === 'complete' || delta.state.current === 'interrupted'))
				{
					chrome.downloads.onChanged.removeListener(onChanged);
					URL.revokeObjectURL(objectUrl);
				}
			};

			chrome.downloads.onChanged.addListener(onChanged);

			// Safety net in case the completion event is missed.
			setTimeout(function () {
				chrome.downloads.onChanged.removeListener(onChanged);
				URL.revokeObjectURL(objectUrl);
			}, 300000);
		});
	}).catch(function (error) {
		console.log('Fetch-and-download failed, falling back to direct URL: ' + error);
		downloadSlideFileDirect(fileUrl, filename);
	});
}

function downloadSlideFileDirect(fileUrl, filename)
{
	chrome.downloads.download({
		url: fileUrl,
		filename: filename,
		conflictAction: 'overwrite'
	});
}