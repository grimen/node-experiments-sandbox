
/* =============================================
        IMPORTS
------------------------------------------ */

const debug = require('debug')
const chalk = require('chalk')

const {
    Readable,
    Writable,
    Transform,
    pipeline,
} = require('stream')


/* =============================================
        CONFIG
------------------------------------------ */

debug.enable('sandbox*')


/* =============================================
        READABLE STREAM: buffer
------------------------------------------ */

// Readable "buffer mode" stream - i.e. reads `Buffer` data
class BufferReadable extends Readable {

    constructor (options = {}) {
        super({
            // we are only processing max N bytes at a time - in object mode.
            highWaterMark: options.highWaterMark || 16 * 1024, // 16 kB (default) - @see https://github.com/nodejs/node-v0.x-archive/blob/master/lib/_stream_readable.js#L49
        })

        this.count = options.from || 1
        this.countMax = options.to || 100 * 1000

        // this.log = debug(`stream-test ${this.constructor.name}`) // much slower
        this.log = (...args) => {
            return console.log(`[${this.constructor.name}]:`, ...args)
        }
    }

    _read () {
        const object = {
            count: this.count,
        }
        const text = JSON.stringify(object, null, '')
        const buffer = Buffer.from(text, 'utf-8')
        const encoding = 'buffer'

        this.count += 1

        setImmediate(() => {
            if (this.count > this.countMax) {
                return this.push(null)
            }

            this.log('READ', `'${encoding}'`, object, '=>', buffer)

            this.push(buffer)
        })
    }

}

/* =============================================
        READABLE STREAM: object
------------------------------------------ */

// Readable "object mode" stream - i.e. reads `Object` data
class ObjectReadable extends Readable {

    constructor (options = {}) {
        super({
            // this stream is in "object mode", meaning we expect an
            // entire object to come through the stream at a time.
            objectMode: true,

            // we are only processing max N objects at a time - in object mode.
            highWaterMark: options.highWaterMark || 16, // 16 objects (default) - @see https://github.com/nodejs/node-v0.x-archive/blob/master/lib/_stream_readable.js#L49
        })

        this.count = options.from || 1
        this.countMax = options.to || 100 * 1000

        // this.log = debug(`stream-test ${this.constructor.name}`) // much slower
        this.log = (...args) => {
            return console.log(`[${this.constructor.name}]:`, ...args)
        }
    }

    _read () {
        const encoding = null
        const object = {
            count: this.count,
        }

        this.count += 1

        setImmediate(() => {
            if (this.count > this.countMax) {
                return this.push(null)
            }

            this.log('READ', 'object', object, '=>', object)

            this.push(object)
        })
    }

}


/* =============================================
        TRANSFORM STREAM: buffer
------------------------------------------ */

// Transform "buffer mode" stream - i.e. reads + writes `Buffer` data
class BufferTransform extends Transform {

    constructor (options = {}) {
        super({
            // we are only processing max N bytes at a time - in object mode.
            highWaterMark: options.highWaterMark || 16 * 1024, // 16 kB (default) - @see https://github.com/nodejs/node-v0.x-archive/blob/master/lib/_stream_readable.js#L49
        })

        // this.log = debug(`stream-test ${this.constructor.name}`) // much slower
        this.log = (...args) => {
            return console.log(`[${this.constructor.name}]:`, ...args)
        }
    }

    _transform (chunk, encoding, callback) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding) // should be conditional
        const string = buffer.toString('utf-8')

        const transformedString = `{"transform stream was here": ${string}}` // for nicer test sticking to `JSON`-ish data, though very hacky
        const transformedBuffer = Buffer.from(transformedString, 'utf-8')

        this.buffer = transformedBuffer

        this.log('TRANSFORM', `'${encoding}'`, buffer, '=>', string, '=>', transformedString, '=>', transformedBuffer)

        this.push(this.buffer)

        callback()
    }

    _flush (callback) {
        this.log('FLUSH')

        // do thing in this scenario, but if multiple `object`s are required to transform,
        // then perform the `this.push(this.object)` here

        callback()
    }

}

/* =============================================
        TRANSFORM STREAM: object
------------------------------------------ */

// Transform "object mode" stream - i.e. reads + writes `Object` data
class ObjectTransform extends Transform {

    constructor (options = {}) {
        super({
            // this stream is in "object mode", meaning we expect an
            // entire object to come through the stream at a time.
            objectMode: true,

            // we are only processing max N objects at a time - in object mode.
            highWaterMark: options.highWaterMark || 16, // 16 objects (default) - @see https://github.com/nodejs/node-v0.x-archive/blob/master/lib/_stream_readable.js#L49
        })

        this.log = (...args) => {
            return console.log(`[${this.constructor.name}]:`, ...args)
        }
    }

    _transform (object, encoding, callback) {
        const transformedObject = {
            'transform stream was here': object,
        }

        this.log('TRANSFORM', 'object', object, '=>', transformedObject)

        this.object = transformedObject

        this.push(this.object)

        callback()
    }

    _flush (callback) {
        this.log('FLUSH')

        // do thing in this scenario, but if multiple `object`s are required to transform,
        // then perform the `this.push(this.object)` here

        callback()
    }

}


/* =============================================
        WRITABLE STREAM: buffer
------------------------------------------ */

// Writable "buffer mode" stream - i.e. writes `Buffer` data
class BufferWritable extends Writable {

    constructor (options = {}) {
        super({
            // we are only processing max N bytes at a time - in object mode.
            highWaterMark: options.highWaterMark || 16 * 1024, // 16 kB (default) - @see https://github.com/nodejs/node-v0.x-archive/blob/master/lib/_stream_writable.js#L58
        })

        this.parse = !!options.parse

        this.log = (...args) => {
            return console.log(`[${this.constructor.name}]:`, ...args)
        }
    }

    _write (chunk, encoding, callback) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding) // should be conditional
        const string = buffer.toString('utf-8')

        if (this.parse) {
            let object

            try {
                object = JSON.parse(string || 'null')

            } catch (error) {
                object = error
            }

            this.log('WRITE', `'${encoding}'`, buffer, '=>', object)

        } else {
            this.log('WRITE', `'${encoding}'`, buffer, '=>', string)
        }

        // @see https://nodejs.org/en/docs/guides/backpressuring-in-streams

        callback()
    }

}

/* =============================================
        WRITABLE STREAM: object
------------------------------------------ */

// Writable "object mode" stream - i.e. writes `Object` data
class ObjectWritable extends Writable {

    constructor (options = {}) {
        super({
            // this stream is in "object mode", meaning we expect an
            // entire object to come through the stream at a time.
            objectMode: true,

            // we are only processing max N objects at a time - in object mode.
            highWaterMark: options.highWaterMark || 16, // 16 objects (default) - @see https://github.com/nodejs/node-v0.x-archive/blob/master/lib/_stream_writable.js#L58
        })

        this.log = (...args) => {
            return console.log(`[${this.constructor.name}]:`, ...args)
        }
    }

    _write (object, encoding, callback) {
        this.log('WRITE', 'object', object, '=>', object)

        // @see https://nodejs.org/en/docs/guides/backpressuring-in-streams

        callback()
    }

}


/* =============================================
        WRITABLE HTTP STREAM: buffer
------------------------------------------ */

class HTTPBufferWritable extends Writable {

    constructor (options = {}) {
        super({
            // we are only processing max N bytes at a time - in object mode.
            highWaterMark: options.highWaterMark || 16 * 1024, // 16 kB (default) - @see https://github.com/nodejs/node-v0.x-archive/blob/master/lib/_stream_writable.js#L58
        })

        this.parse = !!options.parse

        this.log = (...args) => {
            return console.log(`[${this.constructor.name}]:`, ...args)
        }

        this.uri = options.uri
        this.request = require('request')
    }

    _write (chunk, encoding, callback) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding) // should be conditional
        const string = buffer.toString('utf-8')

        if (this.parse) {
            let object

            try {
                object = JSON.parse(string || 'null')

            } catch (error) {
                object = error
            }

            this.log('WRITE', `'${encoding}'`, buffer, '=>', object)

            this.request.post({
                uri: this.uri,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: object,
                json: true,
            }, (err, res) => {
                this.log('HTTP', (res.statusCode < 400) ? chalk.green(res.statusCode) : chalk.red(res.statusCode))

                if (err) {
                    return callback(err)
                }

                callback()
            })

        } else {
            this.log('WRITE', `'${encoding}'`, buffer, '=>', string)

            this.request.post({
                uri: this.uri,
                headers: {
                    'Content-Type': 'text/plain',
                },
                body: string,
            }, (err, res) => {
                this.log('HTTP', (res.statusCode < 400) ? chalk.green(res.statusCode) : chalk.red(res.statusCode))

                if (err) {
                    return callback(err)
                }

                callback()
            })
        }

    }

}


/* =============================================
        WRITABLE HTTP STREAM: object
------------------------------------------ */

class HTTPObjectWritable extends Writable {

    constructor (options = {}) {
        super({
            // this stream is in "object mode", meaning we expect an
            // entire object to come through the stream at a time.
            objectMode: true,

            // we are only processing max N bytes at a time - in object mode.
            highWaterMark: options.highWaterMark || 16, // 16 objects (default) - @see https://github.com/nodejs/node-v0.x-archive/blob/master/lib/_stream_writable.js#L58
        })

        this.log = (...args) => {
            return console.log(`[${this.constructor.name}]:`, ...args)
        }

        this.uri = options.uri
        this.request = require('request')
    }

    _write (object, encoding, callback) {
        this.log('WRITE', 'object', object, '=>', object)

        // @see https://nodejs.org/en/docs/guides/backpressuring-in-streams

        this.request.post({
            uri: this.uri,
            headers: {
                'Content-Type': 'application/json',
            },
            body: object,
            json: true,
        }, (err, res) => {
            this.log('HTTP', (res.statusCode < 400) ? chalk.green(res.statusCode) : chalk.red(res.statusCode))

            if (err) {
                // REVIEW: backpressure behaviour on error
                return callback(err)
            }

            callback()
        })
    }

}


/* =============================================
        MAIN
------------------------------------------ */

function main () {
    const JSONStream = require('JSONStream')

    const express = require('express')
    const expressBodyParser = require('body-parser')

    const app = express()

    process.env.PORT = process.env.PORT || 5000

    app.use(expressBodyParser.json())

    app.use('/', (req, res) => {
        const data = (typeof req.body === 'string') ? req.body : JSON.stringify(req.body)

        res.end(data)
    })

    app.listen(process.env.PORT, () => {
        debug('sandbox http')(`listening on ${process.env.PORT}`)
    })


    /* ------ */


    // 1. Stream Pipe API: Buffer (read/write/transform)

    const readableBufferStream = new BufferReadable({to: 1000}).on('end', process.exit)
    const transformBufferStream = new BufferTransform()
    const writableBufferStream = new BufferWritable()

    // readableBufferStream.pipe(process.stdout) // will also work
    // readableBufferStream.pipe(writableBufferStream)
    // readableBufferStream.pipe(transformBufferStream).pipe(writableBufferStream)


    // 2. Stream Pipe API: Object (read/write/transform)

    const readableObjectStream = new ObjectReadable({to: 1000}).on('end', process.exit)
    const transformObjectStream = new ObjectTransform()
    const writableObjectStream = new ObjectWritable()

    // readableBufferStream.pipe(process.stdout) // will not work...
    // readableBufferStream.pipe(JSONStream.stringify()).pipe(process.stdout) // ...unless piped to transform/serializer stream first
    // readableObjectStream.pipe(writableObjectStream)
    // readableObjectStream.pipe(transformObjectStream).pipe(writableObjectStream)


    // 3. Stream Pipe API: Buffer/Object network examples

    const writableHTTPBufferStream = new HTTPBufferWritable({uri: `http://localhost:${process.env.PORT}/`})
    const writableHTTPObjectStream = new HTTPObjectWritable({uri: `http://localhost:${process.env.PORT}/`})

    // readableBufferStream.pipe(writableHTTPBufferStream)
    readableObjectStream.pipe(writableHTTPObjectStream)

    // 4. Stream Pipeline API

    // pipeline(
    //     readableObjectStream,
    //     transformObjectStream,
    //     writableObjectStream,
    //     (err) => {
    //         if (err) {
    //             return console.error('Pipeline failed!', err)
    //         }

    //         console.log('Pipeline succeeded!')
    //     }
    // )
}

if (require.main === module) {
    process.on('uncaughtException', (error) => {
        console.error('uncaughtException', error)

        process.exit(1)
    })

    main()
 }
