const fs = require("fs")
const path = require("path")

const filesToCopy = ["index.html", "style.css"]

for (const file of filesToCopy) {
    const from = path.join(__dirname, "src", file)
    const to = path.join(__dirname, "dist", file)
    fs.copyFileSync(from, to)
    console.log(`Copied ${file} -> dist/${file}`)
}

const assetsFrom = path.join(__dirname, "src", "assets")
const assetsTo = path.join(__dirname, "dist", "assets")

if (fs.existsSync(assetsFrom)) {
    fs.cpSync(assetsFrom, assetsTo, { recursive: true })
    console.log("Coppied assets/ -> dist/assets/")
}