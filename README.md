# Changelog Generator Github Action

Github action that creates a changelog upon PR opening. The changelog will contain all the commit messages grouped by type and change level (major, minor, patch).

## Dependencies

To use this action, you need to use it together with `action/checkout` from github. 
We need that to access git changes. See usage example under.

## How it works

Whenever you open a PR to `master` branch, action will compare `master` branch with your branch and 
post a comment to PR with all the changes that are going to be merged to `master` branch.

There are a few assumptions that you should be aware, when you're using this action.

## Assumption

- You're release branch is `master`
- You keep clean commit history (ideally squashing your changes so each commit correspond to single change/feature)
- You follow one of the following conventions when writing your commit messages - [gitmoji](https://gitmoji.carloscuesta.me/) or [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/#specification). It will work also without that, but your grouping for minor and major changes might be off. For more details, see how we detect changes below.
- Besides grouping per change severity, we also sub-group based on change type. That means that first word in commit will be also used to group the changes and order them.

## Change level

### Major change

Major change is considered every commit that: 
- includes emoji `:boom:` or
- includes key work `BREAKING CHANGE` or `BREAKING_CHANGE` or
- first word of the commit contains `!`

### Minor change

Minor change is considered every commit that: 
- includes emoji `:sparkles:` or
- first word of the commit contains `feat`

### Other changes

Every change that is not `MAJOR` or `MINOR` falls under other changes.


## Example setup

```yml
name: Changelog Generator
on:
  # Trigger the workflow on pull request,
  # but only for the master branch
  pull_request:
    branches:
      - master
    types: [opened, reopened, synchronize]

jobs:
  changelog:
    # Job name is Chanegelog
    name: Chanegelog Generator
    # This job runs on Linux
    runs-on: ubuntu-latest
    steps:
        - uses: actions/checkout@v2
        - uses: actions/setup-node@v1
          with:
            node-version: '10.x' 
        - uses: homeday-de/github-action-changelog-generator
          with:
            token: ${{ secrets.GITHUB_TOKEN }}
```

## Example output

<section>
    <p>
        Hey @SinisaG! Here's your changelog.
    </p>
    <h3>Major</h3>:boom: group by change severity and subtype
    <br/><br/>
    <h3>Minor</h3>
    :sparkles: whitelist actions and use dynamic branch
    <br/>
    :sparkles: create changelog action
    <br/><br/>
    <h3>Changes</h3>
    :recycle: refactor JS
    <br/>
    :bug: use dynamic branch
    <br/><br/>
</section>


## Questions? 
Feel free to open an [issue](https://github.com/homeday-de/github-action-changelog-generator/issues). 

## Contribution or feature request? 
Please open a [PR](https://github.com/homeday-de/github-action-changelog-generator/pulls) or [issue](https://github.com/homeday-de/github-action-changelog-generator/issues).

## You like the project? 
Why not giving us a star. ;)