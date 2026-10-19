/* Copyright (c) 2026 Richard Rodger, MIT License */
'use strict'

// Validate that a checkout is ready to be published as a release.
//
// Usage:
//   node .github/scripts/validate-release.js [--tag vX.Y.Z] [--dist-tag NAME]
//        [--notes-file PATH] [--allow-dirty] [--offline]
//
// Checks:
//   * package.json has a plain semver version (X.Y.Z or X.Y.Z-pre)
//   * the git tag, when given, is "v" + that version
//   * CHANGES.md has a non-empty "## X.Y.Z" entry (copied to --notes-file)
//   * the working tree has no uncommitted changes to tracked files, so the
//     committed compiled output matches the sources (run after `npm run build`)
//   * the package contents (npm pack --dry-run) are the entry points, the
//     compiled lib files and the documents, and nothing else
//   * the version is not already on the npm registry, and the dist-tag it will
//     be published under is consistent with the published versions
//
// The script has no dependencies, so the release workflow can run it without
// `npm install`. When GITHUB_OUTPUT is set it writes the outputs version, tag,
// dist_tag, prerelease and notes_file for the following workflow steps.

const Fs = require('node:fs')
const Path = require('node:path')
const { execFileSync } = require('node:child_process')

const root = Path.resolve(__dirname, '..', '..')
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'

const failures = []
const warnings = []

function ok(msg) {
  console.log('ok       ' + msg)
}

function warn(msg) {
  warnings.push(msg)
  console.log('WARNING  ' + msg)
}

function fail(msg) {
  failures.push(msg)
  console.log('FAIL     ' + msg)
}

function usage(msg) {
  if (msg) console.error('validate-release: ' + msg)
  console.error(
    'usage: node .github/scripts/validate-release.js [--tag vX.Y.Z] ' +
      '[--dist-tag NAME] [--notes-file PATH] [--allow-dirty] [--offline]',
  )
  process.exit(2)
}

function parseArgs(argv) {
  const args = {
    tag:
      process.env.GITHUB_REF_TYPE === 'tag' ? process.env.GITHUB_REF_NAME : '',
    distTag: '',
    notesFile: '',
    allowDirty: false,
    offline: false,
  }
  for (let i = 0; i < argv.length; i++) {
    let [name, value] = argv[i].split(/=(.*)/s)
    const next = () => {
      if (value == null) value = argv[++i]
      if (value == null) usage('missing value for ' + name)
      return value
    }
    if ('--tag' === name) args.tag = next()
    else if ('--dist-tag' === name) args.distTag = next()
    else if ('--notes-file' === name) args.notesFile = next()
    else if ('--allow-dirty' === name) args.allowDirty = true
    else if ('--offline' === name) args.offline = true
    else if ('--help' === name || '-h' === name) usage()
    else usage('unknown argument ' + argv[i])
  }
  return args
}

function run(cmd, cmdArgs) {
  return execFileSync(cmd, cmdArgs, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: 'win32' === process.platform,
  })
}

// Compare the X.Y.Z parts of two versions; prerelease parts are ignored.
function compareVersions(a, b) {
  const pa = a.split('-')[0].split('.').map(Number)
  const pb = b.split('-')[0].split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i]
  }
  return 0
}

function checkVersion(pkg) {
  const version = pkg.version
  const m =
    /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.exec(
      version,
    )
  if (!m) {
    fail(
      `package.json version "${version}" is not of the form X.Y.Z or X.Y.Z-pre`,
    )
    return { version, prerelease: false }
  }
  ok(`${pkg.name}@${version}` + (m[4] ? ' (prerelease)' : ''))
  return { version, prerelease: null != m[4] }
}

function checkTag(tag, version) {
  if (!tag) {
    warn('no --tag given: the tag check is skipped')
  } else if (tag === 'v' + version) {
    ok(`tag ${tag} matches the version`)
  } else {
    fail(
      `tag ${tag} does not match package.json version ${version} (expected v${version})`,
    )
  }
}

function checkRepository(pkg) {
  const repo = process.env.GITHUB_REPOSITORY
  const url = (pkg.repository && pkg.repository.url) || ''
  if (repo && !url.includes('github.com/' + repo)) {
    fail(
      `package.json repository.url "${url}" does not name ${repo}: ` +
        'npm rejects a provenance attestation for another repository',
    )
  } else if (repo) {
    ok(`repository.url names ${repo}`)
  }
}

function checkChanges(version, notesFile) {
  const lines = Fs.readFileSync(Path.join(root, 'CHANGES.md'), 'utf8').split(
    /\r?\n/,
  )
  const heading = new RegExp(
    '^## ' + version.replace(/[.+-]/g, '\\$&') + '(\\s|$)',
  )
  const start = lines.findIndex((line) => heading.test(line))
  if (start < 0) {
    fail(`CHANGES.md has no "## ${version}" entry`)
    return
  }
  let end = lines.findIndex((line, i) => i > start && /^## /.test(line))
  if (end < 0) end = lines.length
  const body = lines
    .slice(start + 1, end)
    .join('\n')
    .trim()
  if (!body) {
    fail(`the CHANGES.md entry for ${version} is empty`)
    return
  }
  ok(`CHANGES.md entry for ${version} (${end - start - 1} lines)`)

  const date = /(\d{4}-\d{2}-\d{2})/.exec(lines[start])
  const today = new Date().toISOString().slice(0, 10)
  if (!date) {
    warn(`the CHANGES.md heading "${lines[start]}" has no YYYY-MM-DD date`)
  } else if (date[1] !== today) {
    warn(`the CHANGES.md entry is dated ${date[1]}; today is ${today}`)
  }

  if (notesFile) {
    Fs.writeFileSync(notesFile, body + '\n')
    ok(`release notes written to ${notesFile}`)
  }
}

function checkWorkingTree(allowDirty) {
  let dirty
  let untracked
  try {
    dirty = run('git', ['status', '--porcelain', '--untracked-files=no']).trim()
    untracked = run('git', [
      'ls-files',
      '--others',
      '--exclude-standard',
    ]).trim()
  } catch (e) {
    fail('git status failed: ' + e.message)
    return
  }
  if (dirty) {
    const msg =
      'uncommitted changes to tracked files (run `npm run build` and commit the result):\n' +
      dirty
    if (allowDirty) warn(msg)
    else fail(msg)
  } else {
    ok('working tree clean: the committed compiled output matches the sources')
  }
  if (untracked) {
    warn('untracked files (neither committed nor published):\n' + untracked)
  }
}

function checkContents(pkg) {
  let info
  try {
    info = JSON.parse(
      run(npm, ['pack', '--dry-run', '--json', '--ignore-scripts']),
    )[0]
  } catch (e) {
    fail('npm pack --dry-run failed: ' + (e.stderr || e.message))
    return
  }
  const files = info.files.map((f) => f.path).sort()
  ok(
    `package contents: ${files.length} files, ` +
      `${(info.size / 1024).toFixed(1)} kB packed, ` +
      `${(info.unpackedSize / 1024).toFixed(1)} kB unpacked`,
  )

  // Every TypeScript source has its compiled output and declaration file.
  const required = [
    'package.json',
    'LICENSE',
    'README.md',
    'CHANGES.md',
    pkg.main,
    pkg.types,
  ]
  const sources = ['seneca.ts'].concat(
    Fs.readdirSync(Path.join(root, 'lib'))
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'))
      .map((f) => 'lib/' + f),
  )
  for (const src of sources) {
    required.push(src.replace(/\.ts$/, '.js'), src.replace(/\.ts$/, '.d.ts'))
  }
  const missing = required.filter((f) => !files.includes(f))
  if (missing.length) {
    fail('files missing from the package: ' + missing.join(', '))
  } else {
    ok(`all ${required.length} required files are in the package`)
  }

  // Nothing but the entry points, lib, and the documents.
  const allowed =
    /^(package\.json|LICENSE|README\.md|CHANGES\.md|(seneca|lib\/[^/]+)\.(js|d\.ts|ts|js\.map))$/
  const unexpected = files.filter((f) => !allowed.test(f))
  if (unexpected.length) {
    fail('unexpected files in the package: ' + unexpected.join(', '))
  } else {
    ok('no unexpected files in the package')
  }
}

function checkRegistry(pkg, version, prerelease, requested, offline) {
  let distTag = requested

  if (offline) {
    if (!distTag) distTag = prerelease ? 'next' : 'latest'
    warn(`offline: registry checks skipped; dist-tag ${distTag}`)
  } else {
    let published = false
    try {
      const out = run(npm, [
        'view',
        `${pkg.name}@${version}`,
        'version',
        '--json',
      ]).trim()
      published = '' !== out && version === JSON.parse(out)
    } catch (e) {
      const text = String(e.stdout || '') + String(e.stderr || '')
      if (!/E404/.test(text)) {
        fail(
          `npm view ${pkg.name}@${version} failed: ` +
            text.trim().split('\n')[0],
        )
      }
    }
    if (published) fail(`${pkg.name}@${version} is already published`)
    else ok(`${pkg.name}@${version} is not yet published`)

    let distTags = {}
    try {
      distTags = JSON.parse(run(npm, ['view', pkg.name, 'dist-tags', '--json']))
    } catch (e) {
      fail(
        `npm view ${pkg.name} dist-tags failed: ` +
          String(e.stderr || e.message).trim(),
      )
      return distTag
    }
    const latest = distTags.latest

    if (prerelease) {
      if (!distTag) distTag = 'next'
      if ('latest' === distTag)
        fail('a prerelease cannot be published as latest')
    } else if (!latest || 0 < compareVersions(version, latest)) {
      if (!distTag) distTag = 'latest'
    } else if (!distTag) {
      fail(
        `${version} is not newer than the current latest (${latest}); ` +
          'pass --dist-tag (for example 3x) to publish a maintenance release',
      )
    } else if ('latest' === distTag) {
      fail(
        `${version} is not newer than the current latest (${latest}) and cannot be latest`,
      )
    }
    if (distTag)
      ok(`dist-tag ${distTag} (current dist-tags: ${JSON.stringify(distTags)})`)
  }

  // npm rejects a dist-tag that reads as a semver version or range (1.4, v2, 3.x).
  if (
    distTag &&
    (!/^[^\s/]+$/.test(distTag) ||
      /^[~^<>=v]?\d+(\.(\d+|[xX*]))*$/.test(distTag))
  ) {
    fail(`"${distTag}" is not a valid dist-tag name`)
  }
  return distTag
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const pkg = JSON.parse(
    Fs.readFileSync(Path.join(root, 'package.json'), 'utf8'),
  )

  const { version, prerelease } = checkVersion(pkg)
  checkTag(args.tag, version)
  checkRepository(pkg)
  checkChanges(version, args.notesFile)
  checkWorkingTree(args.allowDirty)
  checkContents(pkg)
  const distTag = checkRegistry(
    pkg,
    version,
    prerelease,
    args.distTag,
    args.offline,
  )

  const outputs = {
    version,
    tag: args.tag || 'v' + version,
    dist_tag: distTag || '',
    prerelease: String(prerelease),
    notes_file: args.notesFile || '',
  }
  const text = Object.entries(outputs)
    .map(([k, v]) => `${k}=${v}\n`)
    .join('')
  if (process.env.GITHUB_OUTPUT)
    Fs.appendFileSync(process.env.GITHUB_OUTPUT, text)
  console.log('\n' + text)

  if (failures.length) {
    console.log(`${failures.length} check(s) failed; not ready to release`)
    process.exit(1)
  }
  console.log(
    `ready to release ${pkg.name}@${version} as ${distTag}` +
      (warnings.length ? ` (${warnings.length} warning(s))` : ''),
  )
}

main()
