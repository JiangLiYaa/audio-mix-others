# audio-mix-others

Cocos Creator 构建扩展：启用后 **自动** 让游戏音频与其它 App 混音，不再压低其它软件音量。

## 原因

引擎 `CocosAudioFocusManager` 默认请求  
`AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK`，系统会把其它音乐/视频 **duck（变小）**。

本插件改为：**不请求该焦点**，其它 App 音量保持不变。

## 使用（本工程）

1. 打开 Cocos Creator → **扩展 → 扩展管理器 → 项目**
2. 刷新后找到 **audio-mix-others** → **启用**（控制台应出现 `patched:` / `already patched:`）
3. **必须重新编译安装 Android 包**（仅启用扩展不够；Java 要进 APK）
   - 构建面板勾选 **Audio Mix Others**（默认开）
   - 建议先删 `build/android/proj/build` 或 Clean 后再 Make，避免旧 class 缓存
4. 真机验证：先开系统音乐，再进游戏，其它音乐不应被压小

若仍被压小：用 `adb logcat -s CocosAudioFocusManager` 看是否有  
`mix-with-others (skip requestAudioFocus)`；没有则说明安装的还是旧包。

## 行为说明

| 平台 | 行为 |
|------|------|
| Android | 自动替换 `CocosAudioFocusManager.java`（跳过 requestAudioFocus） |
| iOS | 引擎已用 `AVAudioSessionCategoryAmbient`，一般已可混音，无需改 |

## 注意

- 补丁会改 Creator 安装目录下引擎 Java 源码，并生成 `.audio-mix-others.bak` 备份
- **禁用扩展**时会尝试从备份还原
- 其它 App 申请强焦点时，仍可能打断本游戏（系统策略）

## 目录

```
extensions/audio-mix-others/
  package.json
  main.js / builder.js / hooks.js
  lib/patch.js
  native/android/CocosAudioFocusManager.java
```
