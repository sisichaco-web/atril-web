import fs from 'fs'
import path from 'path'

const file = path.join(process.cwd(), 'packages', 'tokens', 'tokens.css')
let content = fs.readFileSync(file, 'utf8')

// Light theme colors
content = content.replace(/--gc-primary: #1F84C9;/g, '--gc-primary: #d9822b;')
content = content.replace(/--gc-primary-hover: #1A72B0;/g, '--gc-primary-hover: #c47223;')
content = content.replace(/--gc-danger: #FF3B30;/g, '--gc-danger: #e8362b;')
content = content.replace(/--gc-text-accent: #15619A;/g, '--gc-text-accent: #b06219;')

// Make bg slightly darker, or dark theme the default
// Actually, they want "negro/gris oscuro de fondo" - which implies Dark Mode by default!
// Let's swap the bg colors or just change the light theme to be dark as well, or just change the dark theme.
// We can just rely on dark mode and make sure it's the default in the app.

// Dark theme overrides
content = content.replace(/--gc-primary: #4EA6E6;/g, '--gc-primary: #d9822b;')
content = content.replace(/--gc-primary-hover: #7EC1EF;/g, '--gc-primary-hover: #e89947;')
content = content.replace(/--gc-text-accent: #7EC1EF;/g, '--gc-text-accent: #e89947;')

fs.writeFileSync(file, content, 'utf8')

console.log('tokens.css updated with orange and red accents')
