'use strict';

const fs = require('fs');
const path = require('path');

const MARKER = 'AUDIO_MIX_OTHERS_PATCH_V1';
const BACKUP_SUFFIX = '.audio-mix-others.bak';

/** 相对 Creator 安装目录 / 或引擎根 */
const REL_JAVA = path.join(
    'resources',
    'resources',
    '3d',
    'engine',
    'native',
    'cocos',
    'platform',
    'android',
    'java',
    'src',
    'com',
    'cocos',
    'lib',
    'CocosAudioFocusManager.java'
);

function getPatchedJavaSource() {
    return fs.readFileSync(
        path.join(__dirname, '..', 'native', 'android', 'CocosAudioFocusManager.java'),
        'utf8'
    );
}

function findJavaCandidates(roots) {
    const out = [];
    const seen = new Set();
    for (const root of roots) {
        if (!root || !fs.existsSync(root)) {
            continue;
        }
        const direct = path.join(root, REL_JAVA);
        if (fs.existsSync(direct) && !seen.has(direct)) {
            seen.add(direct);
            out.push(direct);
        }
        // 构建产物 / 自定义引擎：递归找同名文件（限制深度）
        walkFind(root, 'CocosAudioFocusManager.java', out, seen, 0, 8);
    }
    return out;
}

function walkFind(dir, fileName, out, seen, depth, maxDepth) {
    if (depth > maxDepth) {
        return;
    }
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (_e) {
        return;
    }
    for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === 'Library') {
                continue;
            }
            walkFind(full, fileName, out, seen, depth + 1, maxDepth);
        } else if (ent.isFile() && ent.name === fileName) {
            if (!seen.has(full)) {
                seen.add(full);
                out.push(full);
            }
        }
    }
}

function applyFile(targetPath) {
    const patched = getPatchedJavaSource();
    if (!fs.existsSync(targetPath)) {
        return { ok: false, message: `missing ${targetPath}` };
    }
    const cur = fs.readFileSync(targetPath, 'utf8');
    if (cur.indexOf(MARKER) >= 0) {
        return { ok: true, message: `already patched: ${targetPath}` };
    }
    const bak = targetPath + BACKUP_SUFFIX;
    if (!fs.existsSync(bak)) {
        fs.writeFileSync(bak, cur, 'utf8');
    }
    fs.writeFileSync(targetPath, patched, 'utf8');
    return { ok: true, message: `patched: ${targetPath}` };
}

function restoreFile(targetPath) {
    const bak = targetPath + BACKUP_SUFFIX;
    if (!fs.existsSync(bak)) {
        return { ok: false, message: `no backup: ${targetPath}` };
    }
    fs.writeFileSync(targetPath, fs.readFileSync(bak, 'utf8'), 'utf8');
    return { ok: true, message: `restored: ${targetPath}` };
}

/**
 * @param {string} editorAppPath Creator 安装目录（含 resources）
 */
function applyEnginePatch(editorAppPath) {
    const javaPath = path.join(editorAppPath, REL_JAVA);
    return applyFile(javaPath);
}

function restoreEnginePatch(editorAppPath) {
    const javaPath = path.join(editorAppPath, REL_JAVA);
    return restoreFile(javaPath);
}

/**
 * 构建期：打引擎 + 构建目录内所有命中文件
 * @param {{ editorPath?: string, dest?: string, nativeRoot?: string }} opts
 */
function applyBuildPatch(opts) {
    const roots = [];
    if (opts.editorPath) {
        roots.push(opts.editorPath);
    }
    if (opts.dest) {
        roots.push(opts.dest);
    }
    if (opts.nativeRoot) {
        roots.push(opts.nativeRoot);
    }
    const files = findJavaCandidates(roots);
    if (files.length === 0) {
        // 至少尝试标准引擎路径
        if (opts.editorPath) {
            return [applyEnginePatch(opts.editorPath)];
        }
        return [{ ok: false, message: 'CocosAudioFocusManager.java not found' }];
    }
    return files.map((f) => applyFile(f));
}

module.exports = {
    MARKER,
    applyEnginePatch,
    restoreEnginePatch,
    applyBuildPatch,
    applyFile,
};
