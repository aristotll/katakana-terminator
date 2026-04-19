### Katakana Terminator 片假名终结者 カタカナ‌ターミネーター

#### In a nutshell 简介
A browser extension to convert *gairaigo* (Japanese loan words) back to English and add hiragana readings above kanji.

这是一个浏览器扩展插件，在网页中的日语外来语上方标注英文原词，并为汉字标注平假名读音。

#### Installation 安装
Please follow the [installation instructions](https://greasyfork.org/en) to configure your browser,
then [click here to get the user script](https://github.com/Arnie97/katakana-terminator/raw/master/katakana-terminator.user.js).

请先[阅读教程](https://greasyfork.org/zh-CN)，在浏览器中安装一个用户脚本管理器。之后[戳这里下载并安装本程序](https://github.com/Arnie97/katakana-terminator/raw/master/katakana-terminator.user.js)。

#### Limits 已知缺陷
*Gairaigo* from other source languages is also converted to English.

即便一组片假名并非源于英语，也会标注为英语中的对应词汇。

Kanji readings are generated from Google romanization and converted to hiragana locally, so long vowels, names, and context-dependent readings may be inaccurate.

汉字读音由 Google 罗马字结果在本地转换为平假名，因此长音、人名以及依赖上下文的读音可能不准确。

#### Testing 测试
Run the local tests with Node.js 18 or newer:

```sh
node --test tests/*.test.js
```

#### Thanks 致谢
Based on the Google Translate API, which was described in [this post](https://github.com/ssut/py-googletrans/issues/268).

基于谷歌翻译开发，[API 参考此处](https://github.com/ssut/py-googletrans/issues/268)。

#### Feedback 反馈
The GitHub issue tracker has been disabled to prevent duplicate comments.
Please report bugs and issues to [the Greasy Fork feedback page](http://greasyfork.org/scripts/33268/feedback).
Check whether you could visit [Google Translate](https://translate.google.com) if the extension does not work on your PC.

为避免两边重复发帖，GitHub Issues 现已关闭，敬请[访问 Greasy Fork 反馈您的问题和建议](https://greasyfork.org/zh-CN/scripts/33268-katakana-terminator/feedback)。
由于众所周知的原因，某些地区有时无法访问[谷歌翻译](https://translate.google.cn)。如果您无法使用此扩展，请先检查能否访问该网站。
