import bb from "bitbucket";
import FormData from "form-data";

import { handleError } from "./fn.js";

export function getBitbucketClient({ accessToken }) {
  const baseUrl = "https://api.bitbucket.org/2.0";
  const bitbucket = new bb.Bitbucket({
    baseUrl,
    auth: {
      token: accessToken,
    },
  });

  return {
    fetchPackageJsonDependencies,
    pushPackageJson,
    createPullRequest,
    checkBranchNameExists,
    listWorkspaces,
    listRepositories,
    listBranches,
  };

  // TODO: This API is not accessible by this authentication mechanism
  async function listWorkspaces() {
    const { data, headers } = await bitbucket.workspaces
      .getWorkspaces({})
      .catch(handleError);

    return data.values;
  }

  async function listRepositories({ workspace }) {
    const { data, headers } = await bitbucket.repositories
      .list({
        workspace,
        fields:
          "values.fullname,values.slug,values.name,values.owner,values.workspace",
      })
      .catch(handleError);

    return data.values;
  }

  async function listBranches({ workspace, repo }) {
    const { data, headers } = await bitbucket.repositories
      .listBranches({
        workspace,
        repo_slug: repo,
      })
      .catch(handleError);

    return data.values;
  }

  async function checkBranchNameExists({ name, repo, workspace }) {
    const { data, headers } = await bitbucket.repositories
      .listBranches({
        repo_slug: repo,
        workspace,
        q: `name = "${name}"`,
      })
      .catch(handleError);

    return data.values && data.values.length === 1;
  }

  async function createPullRequest({
    repo,
    sourceBranch,
    destinationBranch,
    workspace,
    title,
  }) {
    try {
      const result = await bitbucket.repositories.createPullRequest({
        repo_slug: repo,
        workspace: workspace,
        _body: {
          title,
          source: {
            branch: {
              name: sourceBranch,
            },
          },
          destination: {
            branch: {
              name: destinationBranch,
            },
          },
        },
      });
      return result;
    } catch (e) {
      // TODO create exception handling with custom error types and without missing errors detail
      handleError(e);
    }
  }

  async function pushPackageJson({
    packageJson,
    branch,
    repo,
    parent,
    workspace,
  }) {
    const form = new FormData();
    const packageJsonStr = JSON.stringify(packageJson, null, 2) + "\n";
    form.append("package.json", packageJsonStr);

    console.log({
      branch,
      workspace,
      repo_slug: repo,
    });

    const { data, headers } = await bitbucket.source
      .createFileCommit({
        _body: form,

        branch,
        workspace,
        repo_slug: repo,

        parents: parent,
        author: "Automated <test@atlassian.com>",
        message: "Semi-automated dependency update",
      })
      .catch(handleError);

    return data;
  }

  async function fetchPackageJsonDependencies({ branch, repo, workspace }) {
    const { data, headers } = await bitbucket.repositories
      .readSrc({
        path: "package.json",
        commit: branch,
        repo_slug: repo,
        workspace,
      })
      .catch(handleError);

    const packageJson = JSON.parse(data);

    const { dependencies, peerDependencies, devDependencies } = packageJson;

    return {
      dependencies,
      peerDependencies,
      devDependencies,
      packageJson,
      raw: data,
    };
  }
}
