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
		filter: [
			'schema.table_1',
			'schema.table_2'
		]
	},
	pubsub: {
		host: 'nats://localhost:4222'
	}
}

export default config
