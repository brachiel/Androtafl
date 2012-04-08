function generateRandomString(entropy) {
	if (! entropy) { entropy = 8; }

	var characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
	var randStr = '';
	for (var i = 0; i < entropy; ++i) {
		randStr += characters[Math.floor(Math.random() * characters.length)];
	}

	return randStr;
}

var exports = {};
exports.generateRandomString = generateRandomString;
