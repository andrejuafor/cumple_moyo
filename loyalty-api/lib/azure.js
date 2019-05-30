'use strict'

const azure = require('azure-storage')
const config = require('../../loyalty-db/config')
const blobSvc = azure.createBlobService(config.azure.AZURE_STORAGE_ACCOUNT, config.azure.AZURE_STORAGE_ACCESS_KEY)

function uploadAzure (container, name, _blob, header = null) {
  return new Promise(function (resolve, reject) {
    let buffer = new Buffer(_blob, 'base64')
    blobSvc.createContainerIfNotExists(container, async function (error, _container, response) {
      if (!error) {
        blobSvc.createBlockBlobFromText(container, `${name}`, buffer, { contentType: !header? 'data:image/png;base64' : header, contentDisposition: 'inline'}, async function (err, blob, res) {
          if (!err) {
            let url = blobSvc.getUrl(_container.name, blob.name)
            resolve(url)
          } else {
            reject(err)
          }
        })
      } else {
        reject(error)
      }
    })
  })
}

function deleteAzure(container, blob) {
  return new Promise((resolve, reject) => {
    blobSvc.deleteBlobIfExists(container, blob, err => {
      if(err) reject(err)
      resolve({messafe: `Se elimino correctamente.`})
    })
  })
}

module.exports = {
  uploadAzure,
  deleteAzure
}