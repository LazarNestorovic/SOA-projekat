const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'apps', 'web', 'package-lock.json');
let j;
try {
	j = JSON.parse(fs.readFileSync(p, 'utf8'));
} catch (e) {
	console.error('ERR_PARSE', e.message);
	process.exit(2);
}
let bad = [];
function check(obj, keyPath = '') {
	if (obj && typeof obj === 'object') {
		if (Object.prototype.hasOwnProperty.call(obj, 'version')) {
			const v = obj.version;
			if (!v || String(v).trim() === '')
				bad.push({ path: keyPath || '.', version: v });
		}
		for (const k of Object.keys(obj)) {
			check(obj[k], keyPath ? keyPath + '.' + k : k);
		}
	}
}
check(j);
if (bad.length === 0) {
	console.log('No empty version fields found');
	process.exit(0);
} else {
	console.log('Found empty/missing version fields:', bad.slice(0, 50));
	process.exit(1);
}
