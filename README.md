# senecajs.org
This branch contains the static documentation website for [Seneca][]. It is built
using [MetalSmith][] and can be built and served via npm scripts.

Get the dependencies:

```
npm install
```

Build the site:

```
npm run build
```

Build and serve the site to port `4000`:

```
npm run docs
```

## Making changes

Please make all content changes to the [/src/pages](https://github.com/rjrodger/seneca/tree/gh-pages/src/pages)
folder.  After this, you can either submit a pull request or run `npm run build`
before submitting a pull request.  Since the site uses metalsmith and not jekyll
there is a two stage process where we must manually build before a change is live.  

[Seneca]: http://seneca.org
[Metalsmith]: http://metalsmith.io
