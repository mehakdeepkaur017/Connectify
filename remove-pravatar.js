const fs = require('fs');
const path = require('path');

function replacePravatar(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replacePravatar(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // regex to find things like: || `https://i.pravatar.cc/150?u=${...}`
      // and replace with: || ''
      const regex = /\|\|\s*`https:\/\/i\.pravatar\.cc\/150\?u=\$\{[^}]+\}`/g;
      
      if (regex.test(content)) {
        content = content.replace(regex, "|| ''");
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

replacePravatar('d:/Connectify/connectify-frontend/src');
