const fs = require('fs')

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log('Skipping (not found): ' + filePath)
    return
  }
  let content = fs.readFileSync(filePath, 'utf8')
  // Replace any garbled em-dash variants with clean ASCII alternative
  content = content.replace(/\u00e2\u0080\u0094/g, ' - ')
  content = content.replace(/\u2014/g, ' - ')
  content = content.replace(/\uFFFD/g, ' - ')
  // Replace ??? which is how garbled em-dashes appear in browser
  content = content.replace(/\?\?\?/g, ' - ')
  fs.writeFileSync(filePath, content, 'utf8')
  console.log('Fixed: ' + filePath)
}

const pages = [
  'src/pages/Landing.jsx',
  'src/pages/Admin.jsx', 
  'src/pages/Issues.jsx',
  'src/pages/IssueDetail.jsx',
  'src/pages/Layout.jsx',
  'src/components/Layout.jsx',
]

pages.forEach(fixFile)
console.log('All done!')
