const fetch = require('node-fetch');

const CHANGELOG = JSON.parse(process.env.CHANGELOG);
const URL = process.env.URL;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const USER = process.env.USER;

/**
 * Following git emoji and conventional commits to determen version bump based on commits
 * If not major or minor, then we assume it's patch
 * https://gitmoji.carloscuesta.me/
 * https://www.conventionalcommits.org/en/v1.0.0/#specification
 *  */ 

const isMajorChange = (change) => {
    const firstWord = change.split(' ')[0];
    return change.includes(':boom:') ||
            change.includes('BREAKING CHANGE') ||
            change.includes('BREAKING_CHANGE') ||
            firstWord.includes('!');
}

const isMinorChange = (change) => {
    const firstWord = change.split(' ')[0];
    return change.includes(':sparkles:') ||
            firstWord.includes('feat');
}

/***
 * @param {String} changelog: String of changes, where every line is an entry in changelog 
 * Changelog from git comes in string format, where every line 
 * represents a valid contribution to the project. This functions takes
 * string changelog and groups all changes based on the first word in change
 * Example: 
 * Input: 
 * :bug: Fixed async behavior
 * :bug: Fix flickering on mobile
 * :sparkles: Add call me button
 * 
 * Output: 
 * {
 *   ':bug:': [':bug: Fixed async behavior', ':bug: Fix flickering on mobile']
 *   ':sparkles:' : [':sparkles: Add call me button'] 
 * }
 */
const groupChangelog = (changelog) => {
    let grouping = {};
    // Split changelog on new lines
    changelog.forEach(change => {
        // find the first word and group all changes by first word
        const key = change.substring(0, change.indexOf(' '));
        if (grouping[key] === undefined) {
            grouping[key] = [];
        }
        grouping[key].push(change);
    });
    return grouping;
}

/**
 * 
 * @param {Object} changes 
 * Function takes objects grouped by keys and coverts them to concatinated string grouped by key
 * Example: 
 * Input: 
 * {
 *   ':bug:': [':bug: Fixed async behavior', ':bug: Fix flickering on mobile']
 *   ':sparkles:' : [':sparkles: Add call me button'] 
 * }
 * Output
 * ':bug: Fixed async behavior'
 * ':bug: Fix flickering on mobile'
 * 
 * ':sparkles: Add call me button'
 */
const changesToTemplate = (changes) => {
    let output = '';
    Object.keys(changes).forEach((key) => {
        changes[key].forEach((change) => {
            output = `${output}${change}<br/>`;
        });
        output = `${output}<br/>`;
    });
    return output;
}

/**
 * 
 * @param {String} url: Url to post to (PR comments in git are treated as issues) 
 * @param {String} key: Github token
 * @param {String} body: Text (HTML)
 * Output is API Response
 */
const postToGit = async (url, key, body) => {
    const rawResponse = await fetch(url, {
        method: 'POST',
        headers: {
        'Authorization': `token ${key}`,
        'Content-Type': 'application/json'
        },
        body: JSON.stringify({ body })
    });
    const content = await rawResponse.json();
    return content;
}

/**
 * Action core
 */
(async () => {
    console.log('Generating changelog....');

    const changes = CHANGELOG.body.split('\n');
    if (changes.length === 0) {
        return;
    }
    const majorChanges = changes.filter((change) => {
        return isMajorChange(change);
    });

    const minorChanges = changes.filter((change) => {
        return isMinorChange(change);
    });

    const otherChanges = changes.filter((change) => {
        return !isMajorChange(change) && !isMinorChange(change);
    });

    let changesTemplate = '';``

    const groupedMajorChanges = groupChangelog(majorChanges);
    if (Object.keys(groupedMajorChanges).length > 0) {
        changesTemplate = `${changesTemplate}<h2>Major</h2>${changesToTemplate(groupedMajorChanges)}\n`;
    }

    const groupedMinorChanges = groupChangelog(minorChanges);
    if (Object.keys(groupedMinorChanges).length > 0) {
        changesTemplate = `${changesTemplate}<h2>Minor</h2>${changesToTemplate(groupedMinorChanges)}`;
    }

    const groupedOtherChanges = groupChangelog(otherChanges);
    if (Object.keys(groupedOtherChanges).length > 0) {
        changesTemplate = `${changesTemplate}<h2>Patch/Others</h2>${changesToTemplate(groupedOtherChanges)}`;
    }

    const fullTemplate = 
`
<section>
    <p>
        Hey @${USER}, you can find your changelog underneath.
    </p>
    <h1>Changelog</h1>
    ${changesTemplate}
</section>
`;

    try {
        // we don't really need a result here...
        const result = await postToGit(URL, GITHUB_TOKEN, fullTemplate);
        console.log('Changelog successfully posted');
    } catch(e) {
        throw e;
    }
})();