
/* =========================================
      IMPORTS
-------------------------------------- */

const debug = require('debug')
const chalk = require('chalk')

const fs = require('fs')
const { promisify } = require('util')

const sleep = promisify(setTimeout)


/* =============================================
        CONFIG
------------------------------------------ */

debug.enable('sandbox*')


/* =========================================
      BOOTSTRAP
-------------------------------------- */

let lines = ''

for (var i = 0; i < 10000; i++) {
    lines += `Lorem ipsum ${i}\n`
}

const filepath = '/tmp/lorem.txt'

fs.writeFileSync(filepath, lines, 'utf8')


/* =========================================
      GENERATORS
-------------------------------------- */

function* loremSync(size = 10) {
    for (let i = 0; i < size; i++) {
        yield i
    }
}

async function* loremAsync(size = 10, delay = 100) {
    for (let i = 0; i < size; i++) {
        await sleep(delay)

        yield i
    }
}


/* =========================================
      USAGE: generators
-------------------------------------- */

function generatorSync(size = 10) {
    console.log('\n=================================================')
    console.log('    GENERATORS 1/2: Sync')
    console.log('----------------------------------------------')

    for (const value of loremSync(size)) {
        console.log(value)
    }

    console.log('..............................................\n')
}

async function generatorAsync(size = 10) {
    console.log('\n=================================================')
    console.log('    GENERATORS 2/2: Async')
    console.log('----------------------------------------------')

    for await (const value of loremAsync(size)) {
        console.log(value)
    }

    console.log('..............................................\n')
}


/* =========================================
      USAGE: streams
-------------------------------------- */

function streamAsyncCallback () {
    console.log('\n=================================================')
    console.log('    STREAMS 1/2: Callback')
    console.log('----------------------------------------------')

    const stream = fs.createReadStream(filepath, {
        encoding: 'utf8', // null -> buffers, 'utf8' -> strings with that encoding
        highWaterMark: 1024, // maximum size of each chunk (buffer or string)
    })

    stream.on('data', (chunk) => {
        process.stdout.write('<DATA>')
        process.stdout.write(chunk)
    })

    stream.on('end', async () => {
        console.log('..............................................\n')

        // II
        streamAsyncAwaitGenerator()
    })
}

async function streamAsyncAwaitGenerator () {
    console.log('\n=================================================')
    console.log('    STREAMS 2/2: Async Generator')
    console.log('----------------------------------------------')

    const stream = fs.createReadStream(filepath, {
        encoding: 'utf8',  // null -> buffers, 'utf8' -> strings with that encoding
        highWaterMark: 1024 // maximum size of each chunk (buffer or string)
    })

    for await (const chunk of stream) {
        process.stdout.write('<DATA>')
        process.stdout.write(chunk)
    }

    console.log('..............................................\n')

    // III + IV
    generatorSync()
    generatorAsync()
}


/* =========================================
      MAIN
-------------------------------------- */

function main () {
    streamAsyncCallback() // NOTE: starts callback chain
    // streamAsyncAwaitGenerator()


    // generatorSync()
    // generatorAsync()
}

if (require.main === module) {
    process.on('uncaughtException', (error) => {
        console.error('uncaughtException', error)

        process.exit(1)
    })

    main()
}
