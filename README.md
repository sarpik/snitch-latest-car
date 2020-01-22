# snitch-latest-car

A freelance project to snitch the latest updated car from a seller's website.

## You might as well write a blog post about it

I managed to package all this whole thing into a single executable!

The big issue here was puppeteer (& cross-platform compatability) - you cannot put chromium into the binary. Thus I've created the mighty [installer.js](./installer.js), which itself gets converted into an executable binary & then installs everything that's needed.

### Why though?

We have a problem - my client is _not_ a developer.

There's no nodejs, npm, yarn, git or similar goodies anywhere in his machine.

Without having an executable, the whole installation process would be a huge pain (not to mention "it works on my machine" etc.).

With it, the whole app is just one click away from reality!

## See for yourself

> Note - after installing, you'll need to add your credentials into the [config.js](./config.example.js) file for authentication.

Latest sources & binaries always available at https://github.com/sarpik/snitch-latest-car/releases/latest

* [installer-linux](https://github.com/sarpik/snitch-latest-car/releases/latest/download/installer-linux)
* [installer-macos](https://github.com/sarpik/snitch-latest-car/releases/latest/download/installer-macos)
* [installer-win.exe](https://github.com/sarpik/snitch-latest-car/releases/latest/download/installer-win.exe)

## Development

### Installing

```sh
git clone https://github.com/sarpik/snitch-latest-car.git
# or:   git clone git@github.com:sarpik/snitch-latest-car.git

cd snitch-latest-car

yarn
```

### Compiling an executable

```sh
yarn build-installer
```

### Creating a new version + release

See https://yarnpkg.com/lang/en/docs/cli/version

```sh
# choose one
yarn version --patch
yarn version --minor
yarn version --major

# push the new version commit + the new tag
git push --follow-tags
```

that's it!

The release, combined with compiled installer binaries,
will be automatically created by github actions 🎉

See [./.github/workflows/create-release-with-assets.yml](./.github/workflows/create-release-with-assets.yml)

## Notes

### The `pkg` field in [./package.json](./package.json)

See https://github.com/zeit/pkg/issues/830 and https://github.com/zeit/pkg/issues/829

---

Copyright © Kipras Melnikovas  — [@sarpik](https://github.com/sarpik) — https://kipras.org — <kipras@kipras.org>
