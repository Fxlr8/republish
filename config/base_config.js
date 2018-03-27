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
			{
				schemaName: 'public',
				tables: ['messages', 'users']
			}
		],
		idFromObject: {
			messages:	['table', 'id', 'peer_user_id', 'user_id'],
			users: ['table', 'id']
		}
	},
	pubsub: {
		host: 'nats://localhost:4222'
	}
}

export default config
