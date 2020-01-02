const core = require('@actions/core')
const { context, GitHub } = require('@actions/github')

function run() {
  try {
    const octokit = new GitHub(process.env.GITHUB_TOKEN)
    const { owner, repo } = context.repo
    const { merged, head } = context.payload.pull_request
    const { ref } = head

    if (merged) {
      octokit.repos.createRelease({
        owner,
        repo,
        tag_name: ref.split('-')[1],
        target_commitish: 'master'
      })
    }
  } catch (err) {
    core.setFailed(err)
  }
}

run()
