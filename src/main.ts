import {
  parseConfig,
  isTag,
  uploadUrl,
} from "./util";
import { release, upload, GitHubReleaser } from "./github";
import { getOctokit } from "@actions/github";
import { setFailed, setOutput } from "@actions/core";
import {findFilesToUpload} from './search'
import * as core from '@actions/core'
import { GitHub, getOctokitOptions } from "@actions/github/lib/utils";

import { env } from "process";
import {getInputs} from "./input-helper";
import {NoFileOptions} from "./constants";

async function run() {
  try {
    const config = parseConfig(env);
    if (
      !config.input_tag_name &&
      !isTag(config.github_ref) &&
      !config.input_draft
    ) {
      throw new Error(`⚠️ GitHub Releases requires a tag`);
    }
    const inputs = getInputs()

    // const oktokit = GitHub.plugin(
    //   require("@octokit/plugin-throttling"),
    //   require("@octokit/plugin-retry")
    // );

    const gh = getOctokit(config.github_token, {
      //new oktokit(
      throttle: {
        onRateLimit: (retryAfter, options) => {
          console.warn(
            `Request quota exhausted for request ${options.method} ${options.url}`
          );
          if (options.request.retryCount === 0) {
            // only retries once
            console.log(`Retrying after ${retryAfter} seconds!`);
            return true;
          }
        },
        onAbuseLimit: (retryAfter, options) => {
          // does not retry, only logs a warning
          console.warn(
            `Abuse detected for request ${options.method} ${options.url}`
          );
        },
      },
    });
    //);
    const rel = await release(config, new GitHubReleaser(gh));

    const searchResult = await findFilesToUpload(inputs.searchPath)
    if (searchResult.filesToUpload.length === 0) {
      // No files were found, different use cases warrant different types of behavior if nothing is found
      switch (inputs.ifNoFilesFound) {
        case NoFileOptions.warn: {
          core.warning(
              `No files were found with the provided path: ${inputs.searchPath}. No artifacts will be uploaded.`
          )
          break
        }
        case NoFileOptions.error: {
          core.setFailed(
              `No files were found with the provided path: ${inputs.searchPath}. No artifacts will be uploaded.`
          )
          break
        }
        case NoFileOptions.ignore: {
          core.info(
              `No files were found with the provided path: ${inputs.searchPath}. No artifacts will be uploaded.`
          )
          break
        }
      }
    } else {
      const s = searchResult.filesToUpload.length === 1 ? '' : 's'
      core.info(
          `With the provided path, there will be ${searchResult.filesToUpload.length} file${s} uploaded`
      )
      core.debug(`Root artifact directory is ${searchResult.rootDirectory}`)

      if (searchResult.filesToUpload.length > 10000) {
        core.warning(
            `There are over 10,000 files in this artifact, consider creating an archive before upload to improve the upload performance.`
        )
      }

      if (searchResult.filesToUpload.length == 0) {
        console.warn(`🤔 ${config.input_files} not include valid file.`);
      }

        const files = searchResult.filesToUpload;
        const currentAssets = rel.assets;
        const assets = await Promise.all(
            files.map(async (path) => {
              const json = await upload(
                  config,
                  gh,
                  uploadUrl(rel.upload_url),
                  path,
                  currentAssets
              );
              delete json.uploader;
              return json;
            })
        ).catch((error) => {
          throw error;
        });
        setOutput("assets", assets);

      console.log(`🎉 Release ready at ${rel.html_url}`);
      setOutput("url", rel.html_url);
      setOutput("id", rel.id.toString());
      setOutput("upload_url", rel.upload_url);
    }


  } catch (error) {
    setFailed(error.message);
  }
}

run();
