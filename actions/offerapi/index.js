/*
* <license header>
*/

const fetch = require('node-fetch')
const { Core } = require('@adobe/aio-sdk')
const { errorResponse, stringParameters } = require('../utils')
const queryTemplate = require('../../query.json')

const API_ENDPOINT = 'https://publish-p80952-e699446.adobeaemcloud.com/graphql/execute.json/securbank/getOfferByPath'

function parseBody (params) {
  if (params.offerPath) {
    return params
  }

  if (!params.__ow_body) {
    return {}
  }

  const raw = params.__ow_isBase64Encoded
    ? Buffer.from(params.__ow_body, 'base64').toString('utf8')
    : params.__ow_body

  try {
    return JSON.parse(raw)
  } catch (e) {
    return {}
  }
}

async function main (params) {
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {
    logger.info('Calling offerapi proxy action')
    logger.debug(stringParameters(params))

    const body = parseBody(params)
    const offerPath = typeof body.offerPath === 'string' && body.offerPath.trim()
      ? body.offerPath.trim()
      : queryTemplate.offerPath

    const variables = {
      ...queryTemplate,
      offerPath
    }

    const upstreamPayload = {
      variables
    }

    const upstream = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(upstreamPayload)
    })

    const raw = await upstream.text()
    let data
    try {
      data = JSON.parse(raw)
    } catch (e) {
      data = { raw }
    }

    if (!upstream.ok) {
      return {
        statusCode: upstream.status,
        body: {
          error: `Upstream request failed with status ${upstream.status}`,
          details: data.errors || [{ message: raw }],
          request: { variables }
        }
      }
    }

    return {
      statusCode: 200,
      body: {
        request: { variables },
        response: data
      }
    }
  } catch (error) {
    logger.error(error)
    return errorResponse(500, error.message || 'server error', logger)
  }
}

exports.main = main
