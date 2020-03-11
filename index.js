const fetch = require('node-fetch');

const CHANGELOG = JSON.parse(process.env.CHANGELOG);
const URL = process.env.URL;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const USER = process.env.USER;

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
    changelog.split('\n').forEach(change => {
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
    const groupedChanges = groupChangelog(CHANGELOG.body);
    const changesTemplate = changesToTemplate(groupedChanges);

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
        const result = await postToGit(URL, GITHUB_TOKEN, fullTemplate);
        console.log(result);
    } catch(e) {
        throw e;
    }
})();