/****************************************************************************
 Copyright (c) 2018-2022 Xiamen Yaji Software Co., Ltd.
 Modified by audio-mix-others extension: mix with other apps (no ducking).

 AUDIO_MIX_OTHERS_PATCH_V1
 ****************************************************************************/

package com.cocos.lib;

import android.content.Context;
import android.media.AudioManager;
import android.util.Log;

/**
 * 混音版音频焦点：
 * - 不调用 requestAudioFocus(AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
 * - 因此不会压低其它 App（音乐/视频）音量
 * - 本游戏仍可正常播放；其它 App 播强焦点音频时仍可能打断游戏（系统行为）
 */
class CocosAudioFocusManager {

    private static final String _TAG = "CocosAudioFocusManager";
    /** 始终视为未丢失焦点，避免引擎把音量因子打成 0 */
    private static boolean isAudioFocusLost = false;

    private final static AudioManager.OnAudioFocusChangeListener sAfChangeListener = focusChange -> {
        // 混音模式：忽略系统焦点变化，保持游戏音量
        Log.d(_TAG, "onAudioFocusChange ignored (mix mode): " + focusChange);
        isAudioFocusLost = false;
        CocosHelper.runOnGameThreadAtForeground(() -> nativeSetAudioVolumeFactor(1.0f));
    };

    static void registerAudioFocusListener(Context context) {
        // 关键：不请求 MAY_DUCK，避免压低其它软件
        Log.d(_TAG, "registerAudioFocusListener: mix-with-others (skip requestAudioFocus)");
        isAudioFocusLost = false;
        try {
            CocosHelper.runOnGameThreadAtForeground(() -> nativeSetAudioVolumeFactor(1.0f));
        } catch (Throwable t) {
            Log.w(_TAG, "nativeSetAudioVolumeFactor skip", t);
        }
    }

    static void unregisterAudioFocusListener(Context context) {
        // 未 request 则无需 abandon；兼容旧路径仍尝试 abandon
        try {
            AudioManager am = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
            if (am != null) {
                am.abandonAudioFocus(sAfChangeListener);
            }
        } catch (Throwable t) {
            Log.d(_TAG, "abandonAudioFocus skip: " + t.getMessage());
        }
        Log.d(_TAG, "unregisterAudioFocusListener (mix mode)");
    }

    static boolean isAudioFocusLoss() {
        return isAudioFocusLost;
    }

    private static native void nativeSetAudioVolumeFactor(float focus);
}
