const config = {
	db: {
		host: 'localhost',
		user: 'user',
		database: 'database',
		password: 'password'
	},
	replicationOptions: {
		plugin: 'wal2json',
		slot: 'mySlot',
		filter: 'public.messages'
	},
	pubsub: {
		host: 'nats://localhost:4222'
	}
}

export default config
