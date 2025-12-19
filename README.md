<h2 align="center">
    <img width="240" src=".github/logo.png">
    <br><br>
<a href="https://npm.im/poof"><img src="https://badgen.net/npm/v/poof"></a> <a href="https://npm.im/poof"><img src="https://badgen.net/npm/dm/poof"></a> <a href="https://packagephobia.now.sh/result?p=poof"><img src="https://packagephobia.now.sh/badge?p=poof"></a>
</h2>

Ever `rm -rf`'d a large directory and sat there waiting for it to finish? With `poof` you no longer need to wait:

```sh
$ poof ./large-file ./large-directory "**/globs"
```

### What's "poof"?
`poof` is a fast, non-blocking CLI alternative to `rm -rf`, designed for deleting large files and directories without waiting for cleanup to complete.

It works by quickly moving files and directories out of the way, then deleting them in the background.
This means large deletions finish instantly from your perspective, even when there's a lot of data to clean up.

On a large filesystem (4.7 GB, 190k files), `poof` returns control in ~0.6s while `rm -rf` takes ~28s and `rimraf` ~12s. Full benchmarks below.

### Features
* ⚡ **Immediate return**: deletion doesn't block your shell
* 🗂 **Move-then-delete**: fast, atomic rename before cleanup
* 🛡 **Built-in safeguards**: root protection and directory scoping
* 🖥 **Cross-platform**: macOS, Linux, and Windows

## Install

```sh
npm install -g poof
```

## CLI Usage

```sh
# Delete files or directories
$ poof node_modules dist

# Use glob patterns
$ poof "*.log" "temp-*"

# Recursive match with ** (searches all subdirectories)
$ poof "**/node_modules" "**/dist"

# Verbose output
$ poof --verbose ./large-directory
```

### Options

| Flag          | Alias | Description                                    |
| ------------- | ----- | ---------------------------------------------- |
| `--dry`       | `-d`  | Preview files without deleting                 |
| `--verbose`   | `-v`  | Log each file as it's deleted                  |
| `--dangerous` |       | Allow deleting paths outside current directory |
| `--version`   |       | Show version                                   |
| `--help`      |       | Show help                                      |

## File matching

`poof` accepts explicit paths or [glob patterns](https://en.wikipedia.org/wiki/Glob_%28programming%29) for flexible file matching.

> [!TIP]
> When using glob patterns, start with `--dry` to preview what will match before deleting.

### Quick refresher: shell quoting

How unquoted glob patterns are expanded depends on your shell's settings (`dotglob`, `globstar`, etc.).  
To get consistent behavior, quote the pattern so `poof` handles the matching itself.

```sh
# The shell expands the glob before poof runs
$ poof **/node_modules

# Recommended: poof expands the glob
$ poof "**/node_modules"
```

### Basic patterns

```sh
# Explicit paths
$ poof node_modules

# Multiple paths
$ poof dist coverage

# Wildcards in current directory
$ poof "*.log"
$ poof "temp-*"
```

### Recursive patterns

Use `**` to match across nested directories:

```sh
# All node_modules in a monorepo
$ poof "**/node_modules"

# All .log files recursively
$ poof "**/*.log"

# Multiple patterns
$ poof "**/dist" "**/coverage" "**/*.tmp"
```

### Dotfiles (hidden files)

By default, glob wildcards (`*`, `**`) don't match dotfiles (files starting with `.`). This helps avoid accidentally deleting `.git`, `.env`, or other hidden files.

To target dotfiles, explicitly include the `.` in your pattern:

```sh
# Delete all dotfiles in current directory
$ poof ".*"

# Delete .cache directories (not inside hidden dirs)
$ poof "**/.cache"

# Delete a specific dotfile
$ poof .env.local
```

#### Searching inside hidden directories

`**/.cache` finds `.cache` directories in regular directories, but does **not** scan inside other hidden directories like `.git`. This is intentional—scanning hidden directories is slow and rarely useful.

To search inside hidden directories, start your pattern with `.*`:

```sh
# Find .cache inside any hidden directory
$ poof ".*/**/.cache"
```

Or use brace expansion to target specific directories:

```sh
# Search inside .config and src
$ poof "{.config,src}/**/.cache"
```

### Negation patterns

Extglob negations like `!(pattern)` match everything *except* the specified pattern:

```sh
# Delete everything except .gitkeep
$ poof "!(.gitkeep)"
```

> [!WARNING]
> Negations match dotfiles. `!(important.txt)` will match `.env`, `.git`, and other hidden files. Always use `--dry` first.

## Safety

`poof` includes guards to help prevent common accidents:

- **Root protection**: refuses to delete the filesystem root
- **Directory scoping**: won't delete paths outside `cwd` unless `--dangerous` is passed
- **Typo protection**: explicit paths that don't exist are reported as errors, so `poof ndoe_modoules` won't silently succeed
- **Script-friendly globs**: glob patterns with no matches exit silently, so `poof "*.log"` won't break your scripts

## How it works

Traditional `rm -rf` blocks until every file is unlinked.
For large directories, this means waiting on thousands of filesystem operations.

`poof` uses a different strategy:

1. Resolve glob patterns and validate paths
2. Spawn a detached cleanup process
3. Rename files to a temp directory (constant-time, atomic)
4. Stream renamed paths to the cleanup process as renames complete
5. Exit process to return your shell while cleanup process continues in the background

### Cross-device fallback

If the target is on a different filesystem (`EXDEV`), `poof` falls back to renaming in place with a hidden prefix (e.g., `.poof-uuid-large-directory`) and streams it directly to the cleaner.

## Benchmarks

Deleting `**/node_modules` directories from a synthetic fixture:

| Tool     | Time    | vs poof    |
| -------- | ------- | ---------- |
| `poof`   | 0.59s   | —          |
| `rimraf` | 12.32s  | 21x slower |
| `rm -rf` | 27.82s  | 48x slower |

Fixture: 4.7 GB, 190k files

Environment: macOS 15.2, Apple M2 Max, SSD

> [!NOTE]
> These benchmarks measure how long it takes to return control of your terminal, not actual deletion time. Background deletion continues after `poof` exits. `rm -rf` and `rimraf` measure actual deletion time.

## JS API

`poof` can also be used programmatically:

```ts
import poof from 'poof'

await poof('./large-directory')
await poof(['**/dist', 'coverage'])

const { deleted, errors } = await poof('./large-directory', { dry: true })
```

### Types

```ts
type Options = {
    cwd?: string
    dry?: boolean
    dangerous?: boolean
}

type Failure = {
    path: string
    error: Error
}

type Result = {
    deleted: string[]
    errors: Failure[]
}
```

## Alternatives

Some tools provide fast, non-blocking removal by moving files to the system trash:

- [trash](https://formulae.brew.sh/formula/trash) (macOS)
- [trash-cli](https://github.com/sindresorhus/trash-cli) (cross-platform)

These are useful for recoverable deletes, but large directories can accumulate in the trash and consume disk space.

`poof` permanently deletes files, freeing space immediately.

## Requirements

Node.js >= 20.19.6

## License

MIT
