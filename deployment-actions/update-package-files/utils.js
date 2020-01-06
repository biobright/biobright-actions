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

module.exports = {
  promisifyCallback,
  getFileSha
}