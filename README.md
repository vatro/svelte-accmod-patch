## svelte-accmod-patch

[svelte-accmod](https://github.com/vatro/svelte-accmod) patch for Svelte projects: can be used with any existing project depending on Svelte *(installed locally)*, like e.g. [SvelteKit](https://github.com/sveltejs/kit) or [standard Svelte starter](https://github.com/sveltejs/template) based projects etc.

The patch replaces original [Svelte](https://github.com/sveltejs/svelte) files (see `svelte` directory inside `node_modules`) with corresponding [svelte-accmod](https://github.com/vatro/svelte-accmod) files. This way svelte-accmod doesn't have to be installed as a dependency, it's simply 'under the hood', so there's no need to change anything concerning your existing development environment / project setup.

**Apply the patch without installing it locally:**

```bash
npx svelte-accmod-patch
```

**Install the patch locally and apply it:**

This may make more sense, because it will add an `"svelte-accmod-patch": ...` entry to `"devDependencies": {...}` in your `package.json`, so it'll be clearly visible you may not be using the original Svelte compiler etc. Otherwise there will be no obvious indication the patch has been used.

```bash
npm install svelte-accmod-patch --save-dev
npx svelte-accmod-patch
```

#### Arguments

**`-apply`** 
*default*

Replaces original Svelte files with corresponding svelte-accmod files:

```bash
npx svelte-accmod-patch -apply
```

which has the same effect as:

```bash
npx svelte-accmod-patch
```

**`-revert`**

Reverts the patch / re-installs the original Svelte:

```bash
npx svelte-accmod-patch -revert
```

