# audio-mix-others

Cocos Creator 构建扩展：启用后 **自动** 让游戏音频与其它 App 混音，不再压低其它软件音量。

## 原因

引擎 `CocosAudioFocusManager` 默认请求  
`AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK`，系统会把其它音乐/视频 **duck（变小）**。

本插件改为：**不请求该焦点**，其它 App 音量保持不变。

## 使用（本工程）

1. 打开 Cocos Creator → **扩展 → 扩展管理器 → 项目**
2. 刷新后找到 **audio-mix-others** → **启用**
3. 重新构建 Android（建议清一次 `build/android` 或勾选重新生成）
4. 真机验证：先开系统音乐，再进游戏播 BGM/音效，其它音乐不应被压小

构建面板里本扩展选项 **Audio Mix Others** 默认勾选；取消勾选则本次构建不打补丁。

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
