const core = require('@actions/core')
const { context, GitHub } = require('@actions/github')

function run() {
  try {
    const octokit = new GitHub(process.env.GITHUB_TOKEN)
    const { owner, repo } = context.repo
    const branches = ['master', 'develop']
    const ref = core.getInput('ref')

    branches.forEach(branch => {
      octokit.pulls.create({
        owner,
        repo,
        title: `Merge ${ref} into ${branch}`,
        head: ref,
        base: branch
      })
    })
  } catch (err) {
    core.setFailed(err.message)
  }
}

run()
