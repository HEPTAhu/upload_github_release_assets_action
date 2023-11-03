import * as core from '@actions/core'
import {Inputs} from './constants'
import {UploadInputs} from './upload-inputs'

/**
 * Helper to get all the inputs for the action
 */
export function getInputs(): UploadInputs {
  const name = core.getInput(Inputs.FileName)
  const path = core.getInput(Inputs.Path, {required: true})

  const inputs = {
    artifactName: name,
    searchPath: path,
  } as UploadInputs


  return inputs
}
