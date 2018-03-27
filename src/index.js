import config from 'config'
import NATS from 'nats'
import Republish from './republish.js'

console.log('connecting to PubSub server...')
const pubSubConf = config.get('pubsub')
const nats = NATS.connect(pubSubConf.host)

const dbConfig = config.get('db')
const publisher = new Republish(nats, dbConfig)
publisher.init()
console.log('done')
