const fetch = require('node-fetch');
const exec = require('@actions/exec');
const github = require('@actions/github');
const core = require('@actions/core');

const URL = github.context.payload.pull_request.comments_url;
const GITHUB_TOKEN = core.getInput("token") || process.env.token;
const USER = github.context.payload.pull_request.user.login;

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
        output = `${output}`;
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
    if (GITHUB_TOKEN === undefined) {
        throw new Error('Missing auth thoken');
    }
    console.log('Generating changelog....');
    let myOutput = '';
    let myError = '';
    try {
        // get all branches
        await exec.exec('git fetch --no-tags --prune origin +refs/pull/*/head:refs/remotes/origin/pr/*');
        await exec.exec('git fetch --no-tags --prune origin +refs/heads/*:refs/remotes/origin/*');
        const options = {};
        options.listeners = {
            stdout: (data) => {
                myOutput = `${myOutput}${data.toString()}`;
            },
            stderr: (data) => {
                myError = `${myError}${data.toString()}`;
            }
        };
        // get diff between master and current branch
        await exec.exec (`git log --no-merges origin/pr/${github.context.payload.pull_request.number} ^origin/master --pretty='%s'`, [], options);
    } catch (e) {
        throw e;
    }
    if (myError !== '') {
        throw new Error(myError);
    }
    // output is quoted, so we need to remove the quotes
    const changes = myOutput.split('\n').map((c) => c.substring(1, c.length - 1));
    if (changes.length === 0) {
        return;
    }

    const majorChanges = {
        title: '<h3>Major</h3>',
        changes: changes.filter(change => isMajorChange(change)),
    }

    const minorChanges = {
        title: '<h3>Minor</h3>',
        changes: changes.filter(change => isMinorChange(change)),
    }

    const otherChanges = {
        title: '<h3>Changes</h3>',
        changes: changes.filter(change => !isMajorChange(change) && !isMinorChange(change)),
    };

    let changesTemplate = '';
    [majorChanges, minorChanges, otherChanges].forEach((changeType) => {
        const groupedChanges = groupChangelog(changeType.changes);
        if (Object.keys(groupedChanges).length > 0) {
            changesTemplate = `${changesTemplate}${changeType.title}${changesToTemplate(groupedChanges)}<br/>`;
        }
    })

    const fullTemplate = 
`
<section>
    <p>
        Hey @${USER}! Here's your changelog.
    </p>
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