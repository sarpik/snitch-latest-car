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

[installer-win.zip](https://github.com/sarpik/snitch-latest-car/files/4084109/installer-win.zip)

[installer-linux.zip](https://github.com/sarpik/snitch-latest-car/files/4084013/installer.zip)

others coming in literally no time - I just have to write a little script to automate the compilation process for various platforms.

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

## Notes

### The `pkg` field in [./package.json](./package.json)

See https://github.com/zeit/pkg/issues/830 and https://github.com/zeit/pkg/issues/829
