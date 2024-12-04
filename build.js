const path = require('path');
const fs = require('fs')
const uglifyJs = require("uglify-js");
const uglifyCss = require("uglifycss");

const sourceDir = 'src';
const targetDir = 'dist';
const gaId = '';

// define file list
const files = {
    "index.html": null,
    "favicon.png": null,
    "css/app.css": 'css/app.min.css',
    "js/app.js": 'js/app.min.js',
    "../node_modules/subtitle/dist/subtitle.bundle.js": 'js/subtitle.min.js'
};

Object.keys(files).forEach(file => files[file] = files[file] || file);

// clean target dir
if (fs.existsSync(targetDir)) {
    const targetDirFiles = fs.readdirSync(targetDir);
    for (const file of targetDirFiles) {
        if (file !== ".git") {
            fs.rmSync(path.join(targetDir, file), { recursive: true });
        }
    }
}

// create target dir structure
[...new Set(Object.keys(files).map(file => path.dirname(files[file])))]
    .filter(dir => dir != '.')
    .forEach(dir => fs.mkdirSync(path.join(targetDir, dir), { recursive: true }));

// process files
const htmlRewriteExts = ['.js', '.css'];
const htmlRewriteMap = {};
for (const file in files) {
    if (files[file] != file && htmlRewriteExts.indexOf(path.extname(file).toLowerCase()) >= 0) {
        htmlRewriteMap[file] = files[file];
    }
}

RegExp.escape = function (str) {
    return str.replace(/[\/\-\[\]\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

String.prototype.substitute = function (map) {
    if (!map)
        return this;

    const regExp = new RegExp('(' + Object.keys(map).map(RegExp.escape).join('|') + ')', 'g');
    return this.replace(regExp, (_, key) => map[key]);
};

const jsMinificationOptions = {
    mangle: { keep_fnames: true }
};

Object.keys(files).forEach(file => {
    const ext = path.extname(file).toLowerCase();
    let content = fs.readFileSync(path.join(sourceDir, file));

    switch (ext) {
        case '.html':
            content = content.toString('utf-8');
            content = content.substitute(htmlRewriteMap);
            if (gaId)
                content = content.replace('</head>',
`<!-- Global site tag (gtag.js) - Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=`+ gaId + `"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '` + gaId + `');
</script>
</head>`)
            content = Buffer.from(content, 'utf-8');
            break;
        case '.js':
            content = content.toString('utf-8');
            content = uglifyJs.minify(content, jsMinificationOptions).code;
            content = Buffer.from(content, 'utf-8');
            break;
        case '.css':
            content = content.toString('utf-8');
            content = uglifyCss.processString(content);
            content = Buffer.from(content, 'utf-8');
            break;
    }

    fs.writeFileSync(path.join(targetDir, files[file]), content);
});
