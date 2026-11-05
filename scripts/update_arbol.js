import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
    const rootDir = path.resolve(__dirname, '..');
    const logOutput = execSync(
        'git log --graph --pretty=format:"%h %ad | %s%d [%an]" --date=format:"%Y-%m-%d %H:%M:%S" --all',
        { cwd: rootDir, encoding: 'utf8' }
    );
    const dest = path.join(rootDir, 'ARBOL_GIT.txt');
    fs.writeFileSync(dest, logOutput.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n'), 'utf8');
} catch (e) {
    // Silently ignore
}
