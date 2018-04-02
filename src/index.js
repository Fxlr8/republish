import config from 'config'
import NATS from 'nats'
import Republish from './republish.js'

console.log('connecting to PubSub server...')
const pubSubConf = config.get('pubsub')

const nats = NATS.connect(pubSubConf.host)
nats.on('disconnect', () => {
	console.log('NATS disconnected')
})
nats.on('reconnecting', () => {
	console.log('reconnecting to NATS')
})
nats.on('reconnect', (nc) => {
	console.log('reconnected to NATS')
})
nats.on('error', (err) => {
	console.log(err)
})
nats.on('close', () => {
	console.log('NATS connection closed')
})

const dbConfig = config.get('db')
console.log(dbConfig.replicationOptions.idFromObject)
const publisher = new Republish(nats, dbConfig)
publisher.dropSlot(dbConfig.replicationOptions.slot)
publisher.createSlot(dbConfig.replicationOptions.slot)
publisher.init()
console.log('done')
