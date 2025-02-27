import Toucan from 'toucan-js'
import { DBClient } from './db-client.js'
import { S3BackupClient } from './s3-backup-client.js'
import { getServiceConfig } from '../config.js'
import { Logging } from './logs.js'
import pkg from '../../package.json'
import { Service } from 'ucan-storage/service'

const config = getServiceConfig()
const db = new DBClient(config.DATABASE_URL, config.DATABASE_TOKEN)

const backup = config.S3_ACCESS_KEY_ID
  ? new S3BackupClient(
      config.S3_REGION,
      config.S3_ACCESS_KEY_ID,
      config.S3_SECRET_ACCESS_KEY,
      config.S3_BUCKET_NAME,
      { endpoint: config.S3_ENDPOINT, appName: 'nft' }
    )
  : undefined

if (!backup) {
  console.warn('⚠️ AWS S3 backups disabled')
}

const sentryOptions = {
  dsn: config.SENTRY_DSN,
  allowedHeaders: ['user-agent', 'x-client'],
  allowedSearchParams: /(.*)/,
  debug: false,
  environment: config.ENV,
  rewriteFrames: {
    root: '/',
  },
  release: config.VERSION,
  pkg,
}

/**
 * Obtains a route context object.
 *
 * @param {FetchEvent} event
 * @param {Record<string, string>} params Parameters from the URL
 * @returns {Promise<import('../bindings').RouteContext>}
 */
export async function getContext(event, params) {
  const sentry = new Toucan({
    event,
    ...sentryOptions,
  })
  const log = new Logging(event, {
    token: config.LOGTAIL_TOKEN,
    debug: config.DEBUG,
    sentry,
  })

  const ucanService = await Service.fromPrivateKey(config.PRIVATE_KEY)
  return { params, db, backup, log, ucanService }
}
