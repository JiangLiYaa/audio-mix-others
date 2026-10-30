'use strict';

/**
 * 构建扩展入口：Android / iOS 构建时自动注入「与其它 App 混音」原生适配。
 * 平台名以扩展管理器 → Internal 为准；覆盖常见命名。
 */
const hooks = './hooks';

exports.configs = {
    '*': {
        hooks,
        options: {
            enableMix: {
                label: 'i18n:title',
                description: 'i18n:description',
                default: true,
                render: {
                    ui: 'ui-checkbox',
                },
            },
        },
    },
};

exports.load = function () {
    console.log('[audio-mix-others] builder loaded');
};

exports.unload = function () {
    console.log('[audio-mix-others] builder unloaded');
};
