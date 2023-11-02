const core = require('@actions/core');
const { getOctokit } = require('@actions/github');
const fs = require('fs');
//const path = require('path'); // <-- Add this for path manipulations

async function run() {
  try {
    // Get authenticated GitHub client (Ocktokit): https://github.com/actions/toolkit/tree/master/packages/github#usage
    const github = getOctokit(process.env.GITHUB_TOKEN);

    // Get the inputs from the workflow file: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
    const uploadUrl = core.getInput('upload_url', { required: true });
    const assetPath = core.getInput('asset_path', { required: true });
    // Check if asset_name is provided. If not, use the filename from assetPath
    let assetName = core.getInput('asset_name',{ required: true });
    // if (!assetName) {
    //   assetName = path.basename(assetPath);
    // }
    core.setFailed(`Failed to get size of file ${assetName}`);
    const assetContentType = core.getInput('asset_content_type', { required: true });
     // Setup headers for API call, see Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-upload-release-asset for more information

    // Determine content-length for header to upload asset
    // const contentLength = filePath => fs.statSync(filePath).size;
    const contentLength = filePath => {
      core.setFailed("filePath:",filePath)
      try { 
        return fs.statSync(filePath).size;
      } catch (error) {
        core.setFailed(`Failed to get size of file ${filePath}: ${error.message}`);
        return 0;
      }
    };

    const headers = { 'content-type': assetContentType, 'content-length': contentLength(assetPath) };

    // Upload a release asset
    // API Documentation: https://developer.github.com/v3/repos/releases/#upload-a-release-asset
    // Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-upload-release-asset
    const uploadAssetResponse = await github.repos.uploadReleaseAsset({
      url: uploadUrl,
      headers,
      name: assetName,
      file: fs.readFileSync(assetPath)
    });

    // Get the browser_download_url for the uploaded release asset from the response
    const {
      data: { browser_download_url: browserDownloadUrl }
    } = uploadAssetResponse;

    // Set the output variable for use by other actions: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
    core.setOutput('browser_download_url', browserDownloadUrl);
  } catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = run;
