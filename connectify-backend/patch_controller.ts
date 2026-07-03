import * as fs from 'fs';
import * as path from 'path';

const file = path.join(__dirname, 'src/controllers/post.controller.ts');
let content = fs.readFileSync(file, 'utf8');

const regex = /const formattedPosts = posts\.map\(\(post: any\) => \(\{/g;
const replacement = `const populatedPosts = await Post.populate(posts, [
      { path: 'taggedUsers', select: 'username fullName avatar' },
      { path: 'mentions.user', select: 'username fullName avatar' }
    ]);
    const formattedPosts = populatedPosts.map((post: any) => ({`;

content = content.replace(regex, replacement);
fs.writeFileSync(file, content);
console.log('Done!');
