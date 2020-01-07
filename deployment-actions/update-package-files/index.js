const core = require('@actions/core')
const { context, GitHub } = require('@actions/github')
const fs = require('fs')
const path = require('path')
const { updatePackageVersions } = require('./package-updater')
const { promisifyCallback, getFileSha } = require('./utils')
const util = require('util')
const exec = util.promisify(require('child_process').exec)

async function updatePackageFileVersion(packageFileName) {
  const packageFilePath = path.join(
    process.env.GITHUB_WORKSPACE,
    packageFileName
  )
  const packageObj = JSON.parse(await promisifyCallback(fs.readFile, packageFilePath))
  packageObj.version = process.env.tag

  return packageObj
}

async function lockfileUpdater(packageFileObj) {
  const data = JSON.stringify(packageFileObj, undefined, 2)
  await promisifyCallback(fs.writeFile, 'package.json', data)
  //console.log(JSON.parse(await promisifyCallback(fs.readFile, 'package.json')))
  const { stdout, stderr } = await exec('npm i --package-lock-only')
  console.log('OUT', stdout)
  console.log('ERROR', stderr)
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
    let packageFilesObject = {}

    for (let fileName of packageFiles) {
      packageFilesObject[fileName] = await updatePackageFileVersion(fileName)
    }

    if (core.getInput('packages-to-update')) {
      // reassign packageFilesObject if updates are needed
      packageFilesObject = await updatePackageVersions(owner, packageFilesObject)
    }

    for (let fileName of packageFiles) {
      const fileSha = await getFileSha(fileName, octokit, owner, repo)
      const content = JSON.stringify(packageFilesObject[fileName], undefined, 2)
      await octokit.repos.createOrUpdateFile({
        owner,
        repo,
        path: fileName,
        message: `Update ${fileName} version to ${process.env.tag}`,
        content: Buffer.from(content).toString('base64'),
        sha: fileSha,
        branch: core.getInput('ref'),
        committer: userInfo,
        author: userInfo
      })
    }

    await lockfileUpdater(packageFilesObject['package.json'])
  } catch (err) {
    core.setFailed(err.message)
  }
}

run()
