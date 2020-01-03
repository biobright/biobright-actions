const core = require('@actions/core')
const { context, GitHub } = require('@actions/github')

async function createReleaseBranch() {
  const octokit = new GitHub(process.env.GITHUB_TOKEN)
  const { owner, repo } = context.repo
  const releaseBranch = `release-${process.env.tag}`
  core.setOutput('branch-name', releaseBranch)

  return await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${releaseBranch}`,
    sha: context.payload.head_commit.id
  })
}

async function run() {
  try {
    const createRefResponse = await createReleaseBranch()

    console.log(JSON.stringify(createRefResponse, undefined, 2))
  } catch (err) {
    core.setFailed(err.message)
  }

}

run()
