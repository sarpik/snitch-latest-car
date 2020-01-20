# latest-car-snitcher

A freelance project for my fellow mate
to snitch the latest updated car from the seller's website.

## You might as well write a blog post about it

I managed to package all this whole thing into a single executable!

The big issue here was puppeteer - you cannot put chromium into the binary.
Thus I've created the mighty [installer.js](./installer.js), which itself gets converted into an executable binary & then installs everything that's needed.


### Why though?

We have a problem - my client is *not* a developer.

There's no nodejs, npm, yarn, git or similar goodies anywhere in his machine.

Without having an executable, the whole installation process would be a huge pain
(not to mention "it works on my machine").

With it, the whole app is just one click away from installation!

## See for yourself

[installer-win.zip](https://github.com/sarpik/snitch-latest-car/files/4084109/installer-win.zip)

[installer-linux.zip](https://github.com/sarpik/snitch-latest-car/files/4084013/installer.zip)

others coming in literally no time - I just have to write a little script to automate the compilation process.

