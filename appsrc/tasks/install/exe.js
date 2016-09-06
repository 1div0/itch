
import StreamSearch from 'streamsearch'
import os from '../../util/os'
import sf from '../../util/sf'
import spawn from '../../util/spawn'

import mklog from '../../util/log'
const log = mklog('installers/exe')

import {partial} from 'underline'

let self = {
  validInstallers: ['inno', 'nsis', 'air', 'archive'],

  install: async function (out, opts) {
    let installer = await self.findInstaller(opts)
    await installer.install(out, opts)
  },

  uninstall: async function (out, opts) {
    let installer = await self.findInstaller(opts)
    await installer.uninstall(out, opts)
  },

  findInstaller: async function (opts) {
    if (os.platform() !== 'win32') {
      throw new Error('Exe installers are only supported on Windows')
    }

    let archivePath = opts.archivePath
    let type = self.retrieveCachedType(opts)

    if (type) {
      log(opts, `using cached installer type ${type} for ${archivePath}`)
    } else {
      type = await self.identify(opts)

      if (type) {
        log(opts, `found exe installer type ${type} for ${archivePath}`)
        self.cacheType(opts, type)
      } else {
        // don't cache that, we might find better later
        log(opts, `falling back to 'naked exe' for ${archivePath}`)
        type = 'naked'
      }
    }

    return require(`./${type}`).default
  },

  retrieveCachedType: function (opts) {
    let cave = opts.cave
    if (!cave) return
    log(opts, `got cave: ${JSON.stringify(cave, null, 2)}`)

    let installerExeCache = cave.installerExeCache || {}
    let type = installerExeCache[cave.uploadId]
    log(opts, `found cached installer type ${type}`)

    if (self.validInstallers.indexOf(type) === -1) {
      log(opts, `invalid exe installer type stored: ${type} - discarding`)
      return null
    }

    return type
  },

  cacheType: function (opts, type) {
    let cave = opts.cave
    if (!cave) return

    let installerExeCache = {}
    installerExeCache[cave.uploadId] = type

    const {globalMarket} = opts
    globalMarket.saveEntity('caves', cave.id, {installerExeCache})
  },

  identify: async function (opts) {
    let kind = await self.builtinSniff(opts, self.builtinNeedles)
    if (!kind) {
      kind = await self.externalSniff(opts, self.externalNeedles)
    }

    return kind
  },

  builtinSniff: async function (opts, needles) {
    const {archivePath} = opts
    let result = null
    let searches = []

    let onInfo = (needle, format, isMatch, data, start, end) => {
      if (!isMatch) return
      log(opts, `builtinSniff: found needle ${needle}`)
      result = format
    }

    for (const needle of Object.keys(needles)) {
      const format = needles[needle]
      const search = new StreamSearch(needle)
      search.on('info', onInfo::partial(needle, format))
      searches.push(search)
    }

    const reader = sf.createReadStream(archivePath, {encoding: 'binary'})
    reader.on('data', (buf) => {
      for (let search of searches) {
        search.push(buf)
      }
    })

    await sf.promised(reader)
    return result
  },

  builtinNeedles: {
    // Boyer-Moore - longer strings means search is more efficient. That said,
    // we don't really use it to skip forward, it just allows us not to scan
    // entire buffers nodes gives us while reading the whole file
    'Inno Setup Setup Data': 'inno',
    'Nullsoft.NSIS.exehead': 'nsis',
    'META-INF/AIR/application.xml': 'air'
  },

  externalSniff: async function (opts, needles) {
    const {archivePath} = opts

    let detail

    try {
      const contents = await spawn.getOutput({
        command: 'lsar',
        args: ['-j', archivePath]
      })
      const lsarInfo = JSON.parse(contents)
      detail = lsarInfo.lsarFormatName
    } catch (e) {
      log(opts, `Could not run external sniff: ${e.message}`)
    }

    log(opts, `lsar format name: '${detail}'`)

    if (!detail) return null

    const format = needles[detail]
    if (format) {
      log(opts, `recognized archive format ${format} (from ${detail})`)
      return format
    }

    return null
  },

  externalNeedles: {
    // Just plain old regex being run on file(1)'s output
    'Self-extracting CAB': 'archive'
  }
}

export default self
