'use strict';

/**
 * 扩展启用时立刻给本机 Creator 引擎打补丁（带备份）。
 * 构建钩子还会在每次 Android 构建前再打一次，避免漏打。
 */
const path = require('path');
const {
    applyEnginePatch,
    restoreEnginePatch,
    applyBuildPatch,
    resolveEngineNativeFromProject,
} = require('./lib/patch');

function getEditorPath() {
    try {
        if (typeof Editor !== 'undefined' && Editor.App && Editor.App.path) {
            return Editor.App.path;
        }
    } catch (_e) { /* ignore */ }
    return '';
}

function getProjectPath() {
    try {
        if (typeof Editor !== 'undefined' && Editor.Project && Editor.Project.path) {
            return Editor.Project.path;
        }
    } catch (_e) { /* ignore */ }
    return path.join(__dirname, '..', '..');
}

exports.methods = {};

exports.load = function () {
    try {
        const editorPath = getEditorPath();
        const projectPath = getProjectPath();
        const results = applyBuildPatch({
            editorPath,
            projectPath,
            nativeEnginePath: resolveEngineNativeFromProject(projectPath),
        });
        if (!results.length) {
            console.warn('[audio-mix-others] no target found on load');
            return;
        }
        for (const r of results) {
            if (r.ok) {
                console.log(`[audio-mix-others] ${r.message}`);
            } else {
                console.warn(`[audio-mix-others] ${r.message}`);
            }
        }
        // 兼容旧路径：仅 Editor 安装目录
        if (editorPath && results.every((r) => !r.ok)) {
            const r = applyEnginePatch(editorPath);
            console.warn(`[audio-mix-others] fallback: ${r.message}`);
        }
    } catch (e) {
        console.warn('[audio-mix-others] load patch failed', e);
    }
};

exports.unload = function () {
    try {
        const editorPath = getEditorPath();
        if (editorPath) {
            const r = restoreEnginePatch(editorPath);
            console.log(`[audio-mix-others] unload: ${r.message}`);
        }
    } catch (e) {
        console.warn('[audio-mix-others] unload restore failed', e);
    }
};
