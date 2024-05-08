import bb from "bitbucket";

import { handleError } from "./fn.js";

export function getBitbucketClient({ accessToken }) {
  const bitbucket = new bb.Bitbucket({
    baseUrl: "https://api.bitbucket.org/2.0",
    auth: {
      token: accessToken,
    },
  });

  return { fetchPackageJsonDependencies };

  async function fetchPackageJsonDependencies({ branch, repo, workspace }) {
    const { data, headers } = await bitbucket.repositories
      .readSrc({
        path: "package.json",
        commit: branch,
        repo_slug: repo,
        workspace,
      })
      .catch(handleError);

    const { dependencies, peerDependencies, devDependencies, ...rest } =
      JSON.parse(data);

    return { dependencies, peerDependencies, devDependencies, rest };
  }
}
