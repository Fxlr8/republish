import NATS from 'nats'
import Republish from './republish.js'
import config from '../config/config.js'

console.log('connecting to PubSub server...')
const nats = NATS.connect()
const publisher = new Republish(nats, config)
publisher.init()
console.log('done')
