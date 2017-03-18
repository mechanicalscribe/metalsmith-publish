'use strict';

var debug = require('debug')('metalsmith-publish');
var path = require('path');

/**
 * Expose `plugin`.
 */

module.exports = plugin;

/**
 * Metalsmith plugin that adds support for draft, private, and future-dated posts.
 *
 * In metadata:
 *     publish: draft
 *     publish: private
 *     publish: unlisted
 *     publish: 2021-12-21
 *
 * @param {Object} opts (optional)
 * @option {Boolean} draft whether to publish draft posts (default: false)
 * @option {Boolean} private whether to publish private posts (default: false)
 * @option {Boolean} unlisted whether to include unlisted posts on collections (default: false)
 * @option {Boolean} future whether to publish future-dated posts (default: false)
 * @option {string} futureMeta file meta field to check for future date if publish meta not specified (default: 'date')
 * @option {Function} futureFn callback (futureFiles, metalsmith, done) so you can future-pace rebuild via cron job or whatever
 * @return {Function}
 */

function plugin(opts) {
	opts = opts || {};
	opts.futureMeta = opts.futureMeta || 'date';

	return function (files, metalsmith, done) {
		var futureFiles = {};
		var ignoredFolders = {};

		Object.keys(files).forEach(function (file) {
			var directory = path.dirname(file).toLowerCase(),
				directories = directory.split(path.sep);

			if (opts.directories && opts.directories.indexOf(directories[0]) == -1) {
				debug('ignoring publish state for %s', file);
				return;
			}

			debug('analyzing publish state for %s', file);
			var data = files[file];
			var pub = data.publish;

			if ((pub === 'draft' && !opts.draft) || (pub === 'private' && !opts.private)) {
				ignoredFolders[directories[1]] = true;
				return delete files[file];
			}

			if (pub === 'unlisted' && !opts.unlisted) {
				ignoredFolders[directories[1]] = true;
				delete files[file].collection;
			}

			var futureDate = new Date(pub || data[opts.futureMeta]);

			if (futureDate.getTime() > Date.now() && !opts.future) {
				futureFiles[file] = data;
				return delete files[file]
			}
		});

		debug('deleting', Object.keys(ignoredFolders));

		debug('deleting', Object.keys(ignoredFolders));
		Object.keys(files).forEach(function (file) {
			var directory = path.dirname(file).toLowerCase(),
				directories = directory.split(path.sep);
			
			if (ignoredFolders[directories[1]]) {
				debug("Removing", file, "since its article is unpublished.");
				return delete files[file];
			}
		});

		if (typeof opts.futureFn == 'string') {
			opts.futureFn = new Function(opts.futureFn);
		}

		if (typeof opts.futureFn == 'function') {
			debug('calling futureFn callback for %s files', futureFiles.length);
			opts.futureFn(futureFiles, metalsmith, done);
		} else {
			done();
		}
	};
}
