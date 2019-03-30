
/* =============================================
        IMPORTS
------------------------------------------ */

const debug = require('debug')
const chalk = require('chalk')

const redis = require('async-redis')


/* =============================================
        CONFIG
------------------------------------------ */

debug.enable('sandbox*')


/* =============================================
        CONSTANTS
------------------------------------------ */

const DOC = require('./fixtures/doc.json')

const RECORDS = 2000


/* =============================================
        CONNECTIONS
------------------------------------------ */

global.redis = global.redis || redis.createClient({
    'return_buffers': false,
})

global.redis.on('error', (error) => {
    console.error('ERROR', error)
})


/* =============================================
        SERIALIZERS
------------------------------------------ */

const serialiser = {}

serialiser.packAsync = async (object) => {
    try {
        let data = JSON.stringify(object)

        return data

    } catch (error) {
        return null
    }

}

serialiser.packAsyncImmediate = async (object) => {
    return new Promise((resolve, reject) => {
        setImmediate(() => {
            serialiser.packAsync(object)
                .then(resolve)
                .catch(reject)
        })
    })
}


/* =============================================
        CACHES
------------------------------------------ */

const cache = {}

cache.getMemoryAsync = async (namespace, key, label = 'getMemoryAsync') => {
    console.log(`${label}()`, namespace, key)

    global.cache = global.cache || {}
    global.cache.data = global.cache.data || {}
    global.cache.data[namespace] = global.cache.data[namespace] || {}

    const objectPacked = global.cache.data[namespace][key]

    let object

    try {
        object = JSON.parse(objectPacked)
    } catch (error) {
        console.log(error, objectPacked)
        object = null
    }

    return object
}

cache.getMemoryAsyncImmediate = async (namespace, key) => {
    return new Promise((resolve, reject) => {
        setImmediate(() => {
            cache.getMemoryAsync(namespace, key, 'getMemoryAsyncImmediate')
                .then(resolve)
                .catch(reject)
        })
    })
}

cache.setMemoryAsync = async (namespace, key, object, expires = 60, label = 'setMemoryAsync') => {
    console.log(`${label}()`, namespace, key)

    const objectPacked = JSON.stringify(object)

    // NOTE: `expires` not in use here

    global.cache = global.cache || {}
    global.cache.data = global.cache.data || {}
    global.cache.data[namespace] = global.cache.data[namespace] || {}
    global.cache.data[namespace][key] = objectPacked

    return true
}

cache.setMemoryAsyncImmediate = async (namespace, key, object, expires = 60) => {
    return new Promise((resolve, reject) => {
        setImmediate(() => {
            cache.setMemoryAsync(namespace, key, object, expires, 'getRedisAsyncImmediate')
                .then(resolve)
                .catch(reject)
        })
    })
}

cache.getRedisAsync = async (namespace, key, label = 'getRedisAsync') => {
    console.log(`${label}()`, namespace, key)

    global.cache = global.cache || {}
    global.cache.data = global.cache.data || {}
    global.cache.data[namespace] = global.cache.data[namespace] || {}

    const objectPacked = await global.redis.get(`${namespace}:${key}`)

    const object = JSON.parse(objectPacked)

    return object
}

cache.getRedisAsyncImmediate = async (namespace, key) => {
    return new Promise((resolve, reject) => {
        setImmediate(() => {
            cache.getRedisAsync(namespace, key, 'getRedisAsyncImmediate')
                .then(resolve)
                .catch(reject)
        })
    })
}

cache.setRedisAsync = async (namespace, key, object, expires = 60, label = 'setRedisAsync') => {
    console.log(`${label}()`, namespace, key)

    const objectPacked = JSON.stringify(object)

    global.redis.set(`${namespace}:${key}`, objectPacked, 'EX', expires)

    return true
}

cache.setRedisAsyncImmediate = async (namespace, key, object, expires = 60) => {
    return new Promise((resolve, reject) => {
        setImmediate(() => {
            cache.setRedisAsync(namespace, key, object, expires, 'setRedisAsyncImmediate')
                .then(resolve)
                .catch(reject)
        })
    })
}


/* =============================================
        EXAMPLES
------------------------------------------ */

async function example (suffix = 'Async') {
    let start = Date.now()

    let hash
    let value
    let object

    for (let index = 0; index < RECORDS; index++) {
        hash = `id-${index}`

        object = {...DOC}
        object._id = hash

        // value = serialiser[`pack${type}`](object)

        // cache.setMemoryAsync(suffix, hash, object)
        cache.setMemoryAsyncImmediate(suffix, hash, object)

        // cache.setRedisAsync(suffix, hash, object)
        cache.setRedisAsyncImmediate(suffix, hash, object)
    }

    let end = Date.now()
    let time = end - start

    return time
}


/* =============================================
        MAIN
------------------------------------------ */

async function main () {
    let runtime

    let type = 'AsyncImmediate'

    console.log('======================================')
    console.log('   TEST')
    console.log('======================================')

    // runtime = await example('packAsync')

    // console.log(`packAsync RESOLVED ~ ${runtime} ms`)

    // console.log()
    // console.log('--------------------------------------')
    // console.log()

    runtime = await example(type)

    console.log()
    console.log('......................................')
    console.log()

    console.log(`${type} RESOLVED ~ ${runtime} ms`)

    console.log()
    console.log('......................................')
    console.log()

    console.log()
    console.log('......................................')
    console.log()

    setImmediate(async () => {

        console.log()
        console.log('......................................')
        console.log()

        // console.log('packAsync LENGTH', Object.keys(global.cache.data['packAsync']).length)

        // console.log()
        // console.log('--------------------------------------')
        // console.log()

        console.log()
        console.log('......................................')
        console.log()

        type = 'AsyncImmediate'

        // console.log('packAsyncImmediate LENGTH', Object.keys(global.cache.data[namespace]).length)

        let hash

        for (let index = 0; index < RECORDS; index++) {
            hash = `id-${index}`

            // const object = await cache[`getMemory${type}`](type, hash)
            const object = await cache[`getRedis${type}`](type, hash)

            console.log(object)
        }

        console.log()
        console.log('......................................')
        console.log()

        setImmediate(() => {
            process.exit(0)
        })
    })
}

if (require.main === module) {
    process.on('uncaughtException', (error) => {
        console.error('uncaughtException', error)

        process.exit(1)
    })

    main()
}
