class SiteManagerE621 extends SiteManager
{
    constructor(sitesManager, pageLimit)
    {
		super(sitesManager, SITE_E621, 'https://e621.net', pageLimit);
    }
    
    buildPingRequestUrl()
	{
		return this.url + '/posts.json?limit=1';
    }
    
    buildRequestUrl(searchText, pageNumber)
	{
		var query = this.buildSiteSpecificQuery(searchText);
		let possibleLogin = this.sitesManager.model.e621ApiKey && this.sitesManager.model.e621Login ? '&login=' + this.sitesManager.model.e621Login + '&api_key=' + this.sitesManager.model.e621ApiKey : '';
		return this.url + '/posts.json?tags=' + query + '&page=' + pageNumber + '&limit=' + this.pageLimit + possibleLogin;
	}

	doesResponseTextIndicateOnline(responseText)
	{
		var jsonPosts;
		
		try
		{
			jsonPosts = JSON.parse(responseText);
		}
		catch(error)
		{
			console.log("JSON failed to parse.");
			console.log(error);
			return false;
		}
		
		// e621 now returns a bare array of posts. Older responses wrapped the
		// array in a "posts" property, so support both shapes.
		var posts = Array.isArray(jsonPosts) ? jsonPosts : (jsonPosts != null ? jsonPosts.posts : null);
		
		return (posts != null && posts.length > 0);
	}

	addSlides(responseText)
	{
		this.addJsonSlides(responseText);
	}

	condenseTags(jsonPostTags)
	{
		if (Array.isArray(jsonPostTags))
			return jsonPostTags.join(" ");

		var condensedTagArray = [];

		for(var prop in jsonPostTags)
		{
			condensedTagArray = condensedTagArray.concat(jsonPostTags[prop]);
		}

		return condensedTagArray.join(" ");
	}

	addSlide(jsonPost)
	{
		if (jsonPost == null ||
			!jsonPost.hasOwnProperty('id') ||
			!jsonPost.hasOwnProperty('files') ||
			!jsonPost.hasOwnProperty('created_at') ||
			!jsonPost.hasOwnProperty('tags'))
			return;

		var files = jsonPost.files;
		var original = files.original;
		var preview = files.preview;
		var meta = files.meta;

		if (original == null || preview == null || meta == null || !original.hasOwnProperty('url'))
			return;

		var fileUrl = original.url;

		if (fileUrl == null)
		{
			// TODO: Make this into an option (though will need to figure out all the cases in which it happens to get a proper name for it)
			console.log("The file URL was null for post " + jsonPost.id + ". (This is caused by a global blacklist perhaps from not being logged in. Trying to recreate from md5.");

			fileUrl = this.RecreateUrlFromMd5(meta.md5, meta.ext);

			if (fileUrl == null)
			{
				return;
			}
			else
			{
				console.log("New URL is: " + fileUrl);
			}
		}

		if (!this.isPathForSupportedMediaType(fileUrl))
			return;
		
		if (!this.isRatingAllowed(jsonPost.rating))
			return;

		var tags = this.condenseTags(jsonPost.tags);
		
		if (this.areSomeTagsAreBlacklisted(tags))
			return;
		
		var previewUrl = preview.jpg != null ? preview.jpg : preview.webp;

		if (previewUrl == null)
			previewUrl = fileUrl;
		
		var postUrl = this.url + '/posts/' + jsonPost.id;
		
		var urlPrefix = '';
		
		if (fileUrl.substring(0, 4) != 'http')
			urlPrefix = 'https://';

		logForDev(urlPrefix + fileUrl + " ; " + urlPrefix + previewUrl + " ; " + postUrl)
		
		var score = (jsonPost.stats != null && jsonPost.stats.score != null) ? jsonPost.stats.score.total : jsonPost.score;
		
		var newSlide = new Slide(
			SITE_E621,
			jsonPost.id,
			urlPrefix + fileUrl,
			urlPrefix + previewUrl,
			postUrl,
			original.width,
			original.height,
			new Date(jsonPost.created_at),
			score,
			this.getMediaTypeFromPath(fileUrl),
			meta.md5,
			tags
		);

		this.allUnsortedSlides.push(newSlide);
	}

	RecreateUrlFromMd5(md5, ext)
	{
		// Ref: Discord > e621.net > Donovan DMC
		// Take the md5 (as an example: AABBCCCCCCCCCCCCCCCCCCCCCCCCCCCC)
		// and convert it to
		// https://static1.e621.net/data/AA/BB/AABBCCCCCCCCCCCCCCCCCCCCCCCCCCCC.{ext}
		
		const BASE_PATH = 'https://static1.e621.net/data';

		if (md5 == null || md5.length < 4 || ext == null)
		{
			return null;
		}

		let firstTwoCharacters = md5.substring(0, 2);
		let secondTwoCharacters = md5.substring(2, 4);

		return `${BASE_PATH}/${firstTwoCharacters}/${secondTwoCharacters}/${md5}.${ext}`
	}
}
