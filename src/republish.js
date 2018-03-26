import { execFile, spawn } from 'child_process'
import EventEmitter from 'events'
import ldj from 'ldjson-stream'

export default class Republish extends EventEmitter {
	constructor(pubsub, conf) {
		super()
		this.pubsub = pubsub
		this.conf = conf
	}

	init() {
		console.log(this.conf)
		this.spawn = spawn('pg_recvlogical', [
			'--host=' + this.conf.db.host,
			'--username=' + this.conf.db.user,
			'--slot=' + this.conf.replicationOptions.slot,
			'--plugin=' + this.conf.replicationOptions.plugin,
			'--dbname=' + this.conf.db.database,
			'--start',
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

	lineToObject(line) {
		const { columnnames, columnvalues, columntypes, ...obj } = line
		for (let i = 0; i < columnnames.length; i += 1) {
			obj[columnnames[i]] = columnvalues[i]
		}
		return obj
	}

	handleDbMessage = (line) => {
		if (line.table !== 'messages') {
			return
		}
		const obj = this.lineToObject(line)
		console.log(obj)
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
