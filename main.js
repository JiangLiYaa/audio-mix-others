'use strict';

/**
 * 扩展启用时可选：把引擎内 CocosAudioFocusManager 打成混音版（带备份）。
 * 构建钩子也会在每次 Android 构建时再打一次补丁，保证不漏。
 */
const path = require('path');
const { applyEnginePatch, restoreEnginePatch } = require('./lib/patch');

exports.methods = {};

exports.load = function () {
    try {
        const editorPath = typeof Editor !== 'undefined' && Editor.App && Editor.App.path
            ? Editor.App.path
            : '';
        if (editorPath) {
            const r = applyEnginePatch(editorPath);
            if (r.ok) {
                console.log(`[audio-mix-others] engine patch: ${r.message}`);
            } else {
                console.warn(`[audio-mix-others] engine patch skip: ${r.message}`);
            }
        }
    } catch (e) {
        console.warn('[audio-mix-others] load patch failed', e);
    }
};

exports.unload = function () {
    try {
        const editorPath = typeof Editor !== 'undefined' && Editor.App && Editor.App.path
            ? Editor.App.path
            : '';
        if (editorPath) {
            const r = restoreEnginePatch(editorPath);
            console.log(`[audio-mix-others] unload: ${r.message}`);
        }
    } catch (e) {
        console.warn('[audio-mix-others] unload restore failed', e);
    }
};
