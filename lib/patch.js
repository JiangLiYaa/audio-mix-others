'use strict';

const fs = require('fs');
const path = require('path');

const MARKER = 'AUDIO_MIX_OTHERS_PATCH_V1';
const BACKUP_SUFFIX = '.audio-mix-others.bak';

/** 相对 Creator 安装目录 */
const REL_FROM_EDITOR = path.join(
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

/** 相对 COCOS_ENGINE_PATH（native 根） */
const REL_FROM_NATIVE = path.join(
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

function readProp(filePath, key) {
    if (!filePath || !fs.existsSync(filePath)) {
        return '';
    }
    const text = fs.readFileSync(filePath, 'utf8');
    const re = new RegExp(`^\\s*${key}\\s*=\\s*(.+)$`, 'm');
    const m = text.match(re);
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
}

function resolveFromCmake(filePath) {
    if (!filePath || !fs.existsSync(filePath)) {
        return '';
    }
    const text = fs.readFileSync(filePath, 'utf8');
    const m = text.match(/set\s*\(\s*COCOS_X_PATH\s+"([^"]+)"\s*\)/i);
    return m ? m[1].trim() : '';
}

/**
 * 从工程内已有构建配置解析引擎 native 路径
 * @param {string} projectPath
 */
function resolveEngineNativeFromProject(projectPath) {
    if (!projectPath) {
        return '';
    }
    const candidates = [
        path.join(projectPath, 'build', 'android', 'proj', 'gradle.properties'),
        path.join(projectPath, 'build', 'google-play', 'proj', 'gradle.properties'),
        path.join(projectPath, 'build', 'android', 'proj', 'cfg.cmake'),
        path.join(projectPath, 'build', 'google-play', 'proj', 'cfg.cmake'),
    ];
    for (const p of candidates) {
        if (p.endsWith('gradle.properties')) {
            const eng = readProp(p, 'COCOS_ENGINE_PATH');
            if (eng && fs.existsSync(eng)) {
                return eng;
            }
        } else {
            const eng = resolveFromCmake(p);
            if (eng && fs.existsSync(eng)) {
                return eng;
            }
        }
    }
    return '';
}

function javaPathFromEditor(editorPath) {
    if (!editorPath) {
        return '';
    }
    return path.join(editorPath, REL_FROM_EDITOR);
}

function javaPathFromNative(nativeEnginePath) {
    if (!nativeEnginePath) {
        return '';
    }
    return path.join(nativeEnginePath, REL_FROM_NATIVE);
}

function collectJavaTargets(opts) {
    const seen = new Set();
    const out = [];
    const push = (p) => {
        if (!p) {
            return;
        }
        const norm = path.normalize(p);
        if (seen.has(norm)) {
            return;
        }
        if (fs.existsSync(norm)) {
            seen.add(norm);
            out.push(norm);
        }
    };

    push(javaPathFromEditor(opts.editorPath));
    push(javaPathFromNative(opts.nativeEnginePath));
    push(javaPathFromNative(resolveEngineNativeFromProject(opts.projectPath)));

    // 构建产物目录偶发有拷贝；再扫一层
    const roots = [opts.dest, opts.nativeRoot, opts.projectPath].filter(Boolean);
    for (const root of roots) {
        walkFind(root, 'CocosAudioFocusManager.java', out, seen, 0, 6);
    }
    return out;
}

function walkFind(dir, fileName, out, seen, depth, maxDepth) {
    if (depth > maxDepth || !dir || !fs.existsSync(dir)) {
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
            if (
                ent.name === 'node_modules' ||
                ent.name === '.git' ||
                ent.name === 'Library' ||
                ent.name === '.gradle' ||
                ent.name === 'build'
            ) {
                continue;
            }
            walkFind(full, fileName, out, seen, depth + 1, maxDepth);
        } else if (ent.isFile() && ent.name === fileName) {
            const norm = path.normalize(full);
            if (!seen.has(norm)) {
                seen.add(norm);
                out.push(norm);
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
        // 已打补丁但仍用扩展内最新源覆盖，避免旧版补丁残留
        if (cur !== patched) {
            fs.writeFileSync(targetPath, patched, 'utf8');
            return { ok: true, message: `updated patch: ${targetPath}` };
        }
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

function applyEnginePatch(editorPath) {
    return applyFile(javaPathFromEditor(editorPath));
}

function restoreEnginePatch(editorPath) {
    return restoreFile(javaPathFromEditor(editorPath));
}

/**
 * @param {{ editorPath?: string, projectPath?: string, dest?: string, nativeRoot?: string, nativeEnginePath?: string }} opts
 */
function applyBuildPatch(opts) {
    const files = collectJavaTargets(opts || {});
    if (files.length === 0) {
        return [{
            ok: false,
            message: 'CocosAudioFocusManager.java not found (check COCOS_ENGINE_PATH / Editor path)',
        }];
    }
    return files.map((f) => applyFile(f));
}

module.exports = {
    MARKER,
    applyEnginePatch,
    restoreEnginePatch,
    applyBuildPatch,
    applyFile,
    resolveEngineNativeFromProject,
    javaPathFromNative,
};
