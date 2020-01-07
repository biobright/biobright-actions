const core = require('@actions/core')
const { GitHub } = require('@actions/github')
const { cloneDeep } = require('lodash')

async function updatePackageVersions(owner, packageFilesObject) {
  const octokit = new GitHub(process.env.ACCESS_TOKEN)
  const packages = core.getInput('packages-to-update').split(/\r?\n/)
  const returnObj = cloneDeep(packageFilesObject)

  for (let pkg of packages) {
    // getting tags for now because getting releases seems inconsistent
    const tags = await octokit.repos.listTags({
      owner, 
      repo: pkg.trim()
    })
    const latestTag = tags.data[0].name.replace('v', '')
    returnObj['package.json'].devDependencies[pkg] = `github:${owner}/${pkg}#${latestTag}`
  }
  console.log(packageFilesObject)
  return returnObj
}

module.exports = {
  updatePackageVersions
}
