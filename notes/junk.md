# Junklog

## Wed May 8 14:33:31 EEST 2024

```javascript
// This code sample uses the 'node-fetch' library:
// https://www.npmjs.com/package/node-fetch
const fetch = require("node-fetch");

fetch(
  "https://api.bitbucket.org/2.0/repositories/{workspace}/{repo_slug}/src/{commit}/{path}",
  {
    method: "GET",
    headers: {
      Authorization: "Bearer <access_token>",
      Accept: "application/json",
    },
  },
)
  .then((response) => {
    console.log(`Response: ${response.status} ${response.statusText}`);
    return response.text();
  })
  .then((text) => console.log(text))
  .catch((err) => console.error(err));

const packageJsonUrl = `${baseUrl}/src/${BRANCH_NAMGE}/package.json`;
//
// // https://api.bitbucket.org/1.0/repositories/michelezamuner/bpkg-test/src/master/package.json
//

async function fetchPackageJson() {
  console.log(packageJsonUrl);
  const response = await fetch(packageJsonUrl, {
    headers: {
      Authorization: `Bearer ${BITBUCKET_TOKEN}`,
    },
  }).catch(handleError);

  console.log(response, response.data);
}

fetchPackageJson();
```
