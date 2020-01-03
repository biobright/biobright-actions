const core = require('@actions/core')
const { context, GitHub } = require('@actions/github')
const fs = require('fs')
const path = require('path')

function promisifyCallback(fn, ...args) {
  return new Promise((resolve, reject) => {
    fn(...args, (err, data) => {
      if (err) reject(err)
      resolve(data)
    })
  })
}

async function getFileSha(packageFileName, octokit, owner, repo) {
  // get repo data
  const repoResponse = await octokit.repos.get({
    owner,
    repo
  })
  // get commits for repo
  const commitsResponse = await octokit.repos.listCommits({
    owner,
    repo,
    sha: repoResponse.data.default_branch,
    per_page: 1
  })
  // get the tree from the latest commit
  const treeResponse = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: commitsResponse.data[0].commit.tree.sha
  })
  // get the file sha from the tree data
  return treeResponse.data.tree.find(({ path }) => path === packageFileName).sha
}

async function updatePackageFileVersion(packageFileName) {
  const packageFilePath = path.join(
    process.env.GITHUB_WORKSPACE,
    packageFileName
  )
  const packageObj = JSON.parse(await promisifyCallback(fs.readFile, packageFilePath))
  packageObj.version = process.env.tag
  const jsonPackage = JSON.stringify(packageObj, undefined, 2)

  return Buffer.from(jsonPackage).toString('base64')
}

async function run() {
  try {
    const packageFiles = ['package.json', 'package-lock.json']
    const octokit = new GitHub(process.env.GITHUB_TOKEN)
    const { owner, repo } = context.repo
    const { email } = context.payload.pusher
    const userInfo = {
      name: owner,
      email
    }

    for (let fileName of packageFiles) {
      const fileSha = await getFileSha(fileName, octokit, owner, repo)
      const fileContent = await updatePackageFileVersion(fileName)
      await octokit.repos.createOrUpdateFile({
        owner,
        repo,
        path: fileName,
        message: `Update ${fileName} version to ${process.env.tag}`,
        content: fileContent,
        sha: fileSha,
        branch: core.getInput('ref'),
        committer: userInfo,
        author: userInfo
      })
    }
  } catch (err) {
    core.setFailed(err.message)
  }
}

run()
