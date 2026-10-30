'use strict';

const path = require('path');
const { applyBuildPatch } = require('./lib/patch');

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
}

exports.onAfterBuild = async function (options, result) {
    if (!isEnabled(options)) {
        console.log('[audio-mix-others] skipped (enableMix=false)');
        return;
    }
    const platform = options.platform || '';
    if (platform !== 'android' && platform.indexOf('android') < 0) {
        // iOS 引擎默认 Ambient 已可混音；此处仅打日志
        if (platform === 'ios' || platform.indexOf('ios') >= 0) {
            console.log('[audio-mix-others] iOS: engine uses Ambient (already mixes); no patch needed');
        }
        return;
    }
    runPatch('onAfterBuild', {
        editorPath: getEditorPath(),
        dest: result && result.dest ? result.dest : '',
    });
};

exports.onBeforeMake = async function (root, options) {
    if (!isEnabled(options)) {
        return;
    }
    const platform = (options && options.platform) || '';
    if (platform !== 'android' && platform.indexOf('android') < 0) {
        return;
    }
    runPatch('onBeforeMake', {
        editorPath: getEditorPath(),
        nativeRoot: root || '',
        dest: options && options.buildPath ? path.join(options.buildPath, 'android') : '',
    });
};
