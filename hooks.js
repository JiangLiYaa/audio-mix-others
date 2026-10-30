'use strict';

const path = require('path');
const { applyBuildPatch, resolveEngineNativeFromProject } = require('./lib/patch');

function isEnabled(options) {
    const pkg = options && options.packages && options.packages['audio-mix-others'];
    if (pkg && typeof pkg.enableMix === 'boolean') {
        return pkg.enableMix;
    }
    return true;
}

function getEditorPath() {
    try {
        if (typeof Editor !== 'undefined' && Editor.App && Editor.App.path) {
            return Editor.App.path;
        }
    } catch (_e) { /* ignore */ }
    return '';
}

function getProjectPath(options) {
    try {
        if (typeof Editor !== 'undefined' && Editor.Project && Editor.Project.path) {
            return Editor.Project.path;
        }
    } catch (_e) { /* ignore */ }
    if (options && options.project) {
        return options.project;
    }
    // 扩展位于 extensions/audio-mix-others → 工程根
    return path.join(__dirname, '..', '..');
}

function isAndroid(options) {
    const platform = (options && options.platform) || '';
    return platform === 'android' || platform.indexOf('android') >= 0;
}

function runPatch(label, opts) {
    const results = applyBuildPatch(opts);
    for (const r of results) {
        const msg = `[audio-mix-others] ${label}: ${r.message}`;
        if (r.ok) {
            console.log(msg);
        } else {
            console.warn(msg);
        }
    }
    return results;
}

function patchOpts(options, extra) {
    const projectPath = getProjectPath(options);
    return Object.assign({
        editorPath: getEditorPath(),
        projectPath,
        nativeEnginePath: resolveEngineNativeFromProject(projectPath),
    }, extra || {});
}

exports.onBeforeBuild = async function (options) {
    if (!isEnabled(options)) {
        console.log('[audio-mix-others] skipped (enableMix=false)');
        return;
    }
    if (!isAndroid(options)) {
        return;
    }
    // 必须在拷贝/编译引擎 Java 之前打补丁
    runPatch('onBeforeBuild', patchOpts(options));
};

exports.onAfterBuild = async function (options, result) {
    if (!isEnabled(options)) {
        return;
    }
    if (!isAndroid(options)) {
        const platform = (options && options.platform) || '';
        if (platform === 'ios' || platform.indexOf('ios') >= 0) {
            console.log('[audio-mix-others] iOS: engine uses Ambient (already mixes); no patch needed');
        }
        return;
    }
    runPatch('onAfterBuild', patchOpts(options, {
        dest: result && result.dest ? result.dest : '',
    }));
};

exports.onBeforeMake = async function (root, options) {
    if (!isEnabled(options)) {
        return;
    }
    if (!isAndroid(options)) {
        return;
    }
    runPatch('onBeforeMake', patchOpts(options, {
        nativeRoot: root || '',
        dest: options && options.buildPath ? path.join(options.buildPath, 'android') : '',
    }));
};
