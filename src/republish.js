import { execFile, spawn } from 'child_process'
import EventEmitter from 'events'
import ldj from 'ldjson-stream'

export default class Republish extends EventEmitter {
	constructor(pubsub, conf) {
		super()
		this.pubsub = pubsub
		this.conf = conf
		this.idFromObject = conf.replicationOptions.idFromObject

		// generate filter value once
		this.filter = conf.replicationOptions.filter.reduce((tables, schema) => {
			// join schema and table names in schema.table form
			const schemaTables = schema.tables.map(t => `${schema.schemaName}.${t}`)
			return tables.concat(schemaTables)
		}, []).join(',')
	}

	init() {
		console.log(this.conf)
		this.spawn = spawn('pg_recvlogical', [
			'--host=' + this.conf.host,
			'--username=' + this.conf.user,
			'--slot=' + this.conf.replicationOptions.slot,
			'--plugin=' + this.conf.replicationOptions.plugin,
			'--dbname=' + this.conf.database,
			'--start',
			'--option=add-tables=' + this.filter,
			'-f-'
		], { detached: false })

		process.on('exit', () => {
			// If the worker crashes, kill pg_recvlogical to avoid missing output
			if (this.spawn && typeof this.spawn.kill === 'function') {
				this.spawn.kill()
			}
		})

		this.spawn.stdout.setEncoding('utf8')
		this.spawn.stderr.setEncoding('utf8')

		this.spawn.stdout
			.pipe(ldj.parse())
			.on('data', (data) => {
				if (data.change.length) {
					data.change.forEach(this.handleDbMessage)
				}
			})

		// this.spawn.stderr.on('data', (data) => {
		// 	console.error(`child stderr:\n${data}`)
		// })

		this.spawn.on('close', (code) => {
			this.emit((code === 0) ? 'stop' : 'error', 'pg_recvlogical exited with code: ' + code)
		})
	}

	handleDbMessage = (line) => {
		const obj = this.lineToObject(line)
		const key = this.keyFromObject(obj)
		//console.log(key)
		this.pubsub.publish(key, JSON.stringify(obj))
	}

	lineToObject(line) {
		const { columnnames, columnvalues, columntypes, ...obj } = line
		for (let i = 0; i < columnnames.length; i += 1) {
			obj[columnnames[i]] = columnvalues[i]
		}
		return obj
	}

	keyFromObject(obj) {
		if (this.idFromObject[obj.table]) {
			// construct a pubsub key using object values from config
			return this.idFromObject[obj.table].map(k => obj[k]).join(':')
		}
		return `${obj.table}:${obj.id}`
	}

	createSlot(slot) {
		execFile(this.binPath + '/pg_recvlogical', [
			'--slot=' + slot,
			'--create-slot',
			'--plugin=' + this.decodingPlugin,
			'--dbname=' + this.database
		], {
			env: this.env,
			timeout: this.timeout
		}, (error, stdout, stderr) => {
			if (error) {
				const slotAlreadyExists = error.message.contains('already exists') === -1
				return new Error('Failed to create slot: ' + stderr)
			}
		})
	}

	dropSlot(slot) {
		execFile(this.binPath + '/pg_recvlogical', [
			'--slot=' + slot,
			'--drop-slot',
			'--dbname=' + this.database
		], {
			env: this.env,
			timeout: this.timeout
		}, (error, stdout, stderr) => {
			if (error) {
				return new Error('Failed to drop slot: ' + stderr)
			}
		})
	}
}
