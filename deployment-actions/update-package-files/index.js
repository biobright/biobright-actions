const core = require('@actions/core')
const { context, GitHub } = require('@actions/github')
const { readFile, writeFile } = require('fs')
const path = require('path')
const { updatePackageVersions } = require('./package-updater')
const { getFileSha } = require('./utils')
const { promisify } = require('util')
const exec = promisify(require('child_process').exec)
const readFileAsync = promisify(readFile)
const writeFileAsync = promisify(writeFile)

const PACKAGE_FILE = 'package.json'
const LOCK_FILE = 'package-lock.json'

async function updatePackageFileVersion() {
  const packageFilePath = path.join(
    process.env.GITHUB_WORKSPACE,
    PACKAGE_FILE
  )
  const packageObj = JSON.parse(await readFileAsync(packageFilePath))
  packageObj.version = process.env.tag

  return packageObj
}

async function updateLockFile(packageFileObj) {
  const data = JSON.stringify(packageFileObj, undefined, 2)
  await writeFileAsync(PACKAGE_FILE, data)

  const { stdout, stderr } = await exec('npm i --package-lock-only')
  console.log('OUT', stdout)
  console.log('ERROR', stderr)
  return JSON.parse(await readFileAsync(LOCK_FILE))
}

async function run() {
  try {
    const packageFiles = [PACKAGE_FILE, LOCK_FILE]
    const octokit = new GitHub(process.env.GITHUB_TOKEN)
    const { owner, repo } = context.repo
    const { email } = context.payload.pusher
    const userInfo = {
      name: owner,
      email
    }
    let packageFilesObject = {}

    packageFilesObject[PACKAGE_FILE] = await updatePackageFileVersion()

    if (core.getInput('packages-to-update')) {
      // reassign packageFilesObject if updates are needed
      packageFilesObject = await updatePackageVersions(owner, packageFilesObject)
    }

    packageFilesObject[LOCK_FILE] = await updateLockFile(packageFilesObject[PACKAGE_FILE])

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
  } catch (err) {
    core.setFailed(err.message)
  }
}

run()
