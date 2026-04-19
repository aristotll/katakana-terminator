// ==UserScript==
// @name        Katakana Terminator
// @description Convert gairaigo to English and add hiragana readings to kanji
// @author      Arnie97
// @license     MIT
// @copyright   2017-2024, Katakana Terminator Contributors (https://github.com/Arnie97/katakana-terminator/graphs/contributors)
// @namespace   https://github.com/Arnie97
// @homepageURL https://github.com/Arnie97/katakana-terminator
// @supportURL  https://greasyfork.org/scripts/33268/feedback
// @icon        https://upload.wikimedia.org/wikipedia/commons/2/28/Ja-Ruby.png
// @match       *://*/*
// @exclude     *://*.bilibili.com/video/*
// @grant       GM.xmlHttpRequest
// @grant       GM_xmlhttpRequest
// @grant       GM_addStyle
// @connect     translate.google.cn
// @connect     translate.google.com
// @connect     translate.googleapis.com
// @version     2026.04.19
// @name:ja-JP  カタカナターミネーター
// @name:zh-CN  片假名终结者
// @description:zh-CN 在网页中的日语外来语上方标注英文原词，并为汉字标注平假名读音
// ==/UserScript==

// define some shorthands
var _ = document;

var queue = {};  // {"カタカナ": [rtNodeA, rtNodeB]}
var furiganaQueue = {};  // {"漢字": [{node: rtNode, suffix: "じ"}]}
var cachedTranslations = {};  // {"ターミネーター": "Terminator"}
var cachedReadings = {};  // {"漢字": "かんじ"}
var newNodes = [_.body];
var readingSeparator = ' / ';
var readingApiHosts = ['translate.googleapis.com', 'translate.google.com'];
var katakanaPattern = /[\u30A1-\u30FA\u30FD-\u30FF][\u3099\u309A\u30A1-\u30FF]*[\u3099\u309A\u30A1-\u30FA\u30FC-\u30FF]|[\uFF66-\uFF6F\uFF71-\uFF9D][\uFF65-\uFF9F]*[\uFF66-\uFF9F]/;
var kanjiPattern = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF][\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF々〆ヵヶ]*/;

// Recursively traverse the given node and its descendants (Depth-first search)
function scanTextNodes(node) {
    // The node could have been detached from the DOM tree
    if (!node.parentNode || !_.body.contains(node)) {
        return;
    }

    // Ignore text boxes and echoes
    var excludeTags = {ruby: true, script: true, select: true, textarea: true};

    switch (node.nodeType) {
    case Node.ELEMENT_NODE:
        if (node.tagName.toLowerCase() in excludeTags || node.isContentEditable) {
            return;
        }
        return Array.from(node.childNodes).forEach(scanTextNodes);

    case Node.TEXT_NODE:
        while ((node = addRuby(node)));
    }
}

// Recursively add ruby tags to text nodes
// Inspired by http://www.the-art-of-web.com/javascript/search-highlight/
function addRuby(node) {
    var match;
    if (!node.nodeValue || !(match = findRubyMatch(node.nodeValue))) {
        return false;
    }
    var ruby = _.createElement('ruby');
    ruby.appendChild(_.createTextNode(match.text));
    var rt = _.createElement('rt');
    rt.classList.add('katakana-terminator-rt');
    ruby.appendChild(rt);

    if (match.type === 'translation') {
        // Append the ruby title node to the pending-translation queue
        queue[match.key] = queue[match.key] || [];
        queue[match.key].push(rt);
    } else {
        furiganaQueue[match.key] = furiganaQueue[match.key] || [];
        furiganaQueue[match.key].push({
            node: rt,
            suffix: match.suffix,
        });
    }

    // <span>[startカナmiddleテストend]</span> =>
    // <span>start<ruby>カナ<rt data-rt="Kana"></rt></ruby>[middleテストend]</span>
    var after = node.splitText(match.index);
    node.parentNode.insertBefore(ruby, after);
    after.nodeValue = after.nodeValue.substring(match.text.length);
    return after;
}

function findRubyMatch(text) {
    var katakana = katakanaPattern.exec(text),
        kanji = kanjiPattern.exec(text);

    if (!katakana && !kanji) {
        return null;
    }

    if (!kanji || (katakana && katakana.index < kanji.index)) {
        return {
            type: 'translation',
            index: katakana.index,
            text: katakana[0],
            key: katakana[0],
        };
    }

    return buildKanjiMatch(text, kanji);
}

function buildKanjiMatch(text, match) {
    var suffix = findReadingSuffix(text.substring(match.index + match[0].length));
    return {
        type: 'reading',
        index: match.index,
        text: match[0],
        key: match[0] + suffix,
        suffix: suffix,
    };
}

function findReadingSuffix(text) {
    var match = /^[\u3041-\u3096]+/.exec(text),
        suffix = match ? match[0] : '';
    if (suffix.length === 1 && isJapaneseParticle(suffix)) {
        return '';
    }
    return suffix;
}

function isJapaneseParticle(kana) {
    return kana in {
        'は': true,
        'を': true,
        'が': true,
        'に': true,
        'で': true,
        'と': true,
        'へ': true,
        'も': true,
        'や': true,
        'の': true,
        'か': true,
        'ね': true,
        'よ': true,
        'ぞ': true,
        'な': true,
    };
}

var romajiToHiraganaMap = {
    a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お',
    ka: 'か', ki: 'き', ku: 'く', ke: 'け', ko: 'こ',
    kya: 'きゃ', kyu: 'きゅ', kyo: 'きょ',
    ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご',
    gya: 'ぎゃ', gyu: 'ぎゅ', gyo: 'ぎょ',
    sa: 'さ', si: 'し', shi: 'し', su: 'す', se: 'せ', so: 'そ',
    sya: 'しゃ', syu: 'しゅ', syo: 'しょ', sha: 'しゃ', shu: 'しゅ', sho: 'しょ', she: 'しぇ',
    za: 'ざ', zi: 'じ', ji: 'じ', zu: 'ず', ze: 'ぜ', zo: 'ぞ',
    zya: 'じゃ', zyu: 'じゅ', zyo: 'じょ', ja: 'じゃ', ju: 'じゅ', jo: 'じょ', je: 'じぇ',
    ta: 'た', ti: 'ち', chi: 'ち', tu: 'つ', tsu: 'つ', te: 'て', to: 'と',
    tya: 'ちゃ', tyu: 'ちゅ', tyo: 'ちょ', cha: 'ちゃ', chu: 'ちゅ', cho: 'ちょ', che: 'ちぇ',
    da: 'だ', di: 'ぢ', du: 'づ', de: 'で', do: 'ど',
    dya: 'ぢゃ', dyu: 'ぢゅ', dyo: 'ぢょ',
    na: 'な', ni: 'に', nu: 'ぬ', ne: 'ね', no: 'の',
    nya: 'にゃ', nyu: 'にゅ', nyo: 'にょ',
    ha: 'は', hi: 'ひ', hu: 'ふ', fu: 'ふ', he: 'へ', ho: 'ほ',
    hya: 'ひゃ', hyu: 'ひゅ', hyo: 'ひょ',
    fa: 'ふぁ', fi: 'ふぃ', fe: 'ふぇ', fo: 'ふぉ',
    ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ',
    bya: 'びゃ', byu: 'びゅ', byo: 'びょ',
    pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ',
    pya: 'ぴゃ', pyu: 'ぴゅ', pyo: 'ぴょ',
    ma: 'ま', mi: 'み', mu: 'む', me: 'め', mo: 'も',
    mya: 'みゃ', myu: 'みゅ', myo: 'みょ',
    ya: 'や', yu: 'ゆ', yo: 'よ',
    ra: 'ら', ri: 'り', ru: 'る', re: 'れ', ro: 'ろ',
    rya: 'りゃ', ryu: 'りゅ', ryo: 'りょ',
    wa: 'わ', wi: 'うぃ', we: 'うぇ', wo: 'を',
    va: 'ゔぁ', vi: 'ゔぃ', vu: 'ゔ', ve: 'ゔぇ', vo: 'ゔぉ',
};

function normalizeRomaji(text) {
    return text.toLowerCase()
        .replace(/[āâ]/g, 'aa')
        .replace(/[īî]/g, 'ii')
        .replace(/[ūû]/g, 'uu')
        .replace(/[ēê]/g, 'ee')
        .replace(/[ōô]/g, 'ou');
}

function romajiToHiragana(text) {
    var romaji = normalizeRomaji(text),
        result = '',
        i = 0,
        piece,
        found,
        length;

    while (i < romaji.length) {
        if (!isRomajiLetter(romaji.charAt(i))) {
            i++;
            continue;
        }

        if (romaji.substring(i, i + 3) === 'tch') {
            result += 'っ';
            i++;
            continue;
        }

        if (isDoubleConsonant(romaji, i)) {
            result += 'っ';
            i++;
            continue;
        }

        if (romaji.charAt(i) === 'n' && isStandaloneN(romaji, i)) {
            result += 'ん';
            i += romaji.charAt(i + 1) === "'" ? 2 : 1;
            continue;
        }

        found = false;
        for (length = 3; length > 0; length--) {
            piece = romaji.substring(i, i + length);
            if (piece in romajiToHiraganaMap) {
                result += romajiToHiraganaMap[piece];
                i += length;
                found = true;
                break;
            }
        }

        if (!found) {
            i++;
        }
    }

    return result;
}

function isRomajiLetter(ch) {
    return ch >= 'a' && ch <= 'z';
}

function isDoubleConsonant(romaji, i) {
    var ch = romaji.charAt(i);
    return ch === romaji.charAt(i + 1) && ch !== 'n' && !isRomajiVowel(ch) && isRomajiLetter(ch);
}

function isStandaloneN(romaji, i) {
    var next = romaji.charAt(i + 1);
    return !next || next === "'" || (!isRomajiVowel(next) && next !== 'y');
}

function isRomajiVowel(ch) {
    return ch === 'a' || ch === 'i' || ch === 'u' || ch === 'e' || ch === 'o';
}

// Split word list into chunks to limit the length of API requests
function translateTextNodes() {
    var apiRequestCount = 0;
    var phraseCount = 0;
    var chunkSize = 200;
    var chunk = [];

    for (var phrase in queue) {
        phraseCount++;
        if (phrase in cachedTranslations) {
            updateRubyByCachedTranslations(phrase);
            continue;
        }

        chunk.push(phrase);
        if (chunk.length >= chunkSize) {
            apiRequestCount++;
            translate(chunk, apiList);
            chunk = [];
        }
    }

    if (chunk.length) {
        apiRequestCount++;
        translate(chunk, apiList);
    }

    var readingStats = translateFuriganaNodes();
    if (phraseCount || readingStats.phraseCount) {
        console.debug(
            'Katakana Terminator:',
            phraseCount, 'katakana phrases and',
            readingStats.phraseCount, 'kanji readings processed in',
            apiRequestCount + readingStats.apiRequestCount, 'requests, frame',
            window.location.href
        );
    }
}

function translateFuriganaNodes() {
    var apiRequestCount = 0;
    var phraseCount = 0;
    var chunkSize = 100;
    var chunk = [];

    for (var phrase in furiganaQueue) {
        phraseCount++;
        if (phrase in cachedReadings) {
            updateRubyByCachedReadings(phrase);
            continue;
        }

        chunk.push(phrase);
        if (chunk.length >= chunkSize) {
            apiRequestCount++;
            requestReadings(chunk);
            chunk = [];
        }
    }

    if (chunk.length) {
        apiRequestCount++;
        requestReadings(chunk);
    }

    return {
        apiRequestCount: apiRequestCount,
        phraseCount: phraseCount,
    };
}

// {"keyA": 1, "keyB": 2} => "?keyA=1&keyB=2"
function buildQueryString(params) {
    return '?' + Object.keys(params).map(function(k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');
}

function translate(phrases) {
    if (!apiList.length) {
        console.error('Katakana Terminator: fallbacks exhausted', phrases);
        phrases.forEach(function(phrase) {
            delete cachedTranslations[phrase];
        });
        return;
    }

    // Prevent duplicate HTTP requests before the request completes
    phrases.forEach(function(phrase) {
        cachedTranslations[phrase] = null;
    });

    var api = apiList[0];
    GM_xmlhttpRequest({
        method: "GET",
        url: 'https://' + api.hosts[0] + api.path + buildQueryString(api.params(phrases)),
        onload: function(dom) {
            try {
                api.callback(phrases, JSON.parse(dom.responseText.replace("'", '\u2019')));
            } catch (err) {
                console.error('Katakana Terminator: invalid response', err, dom.responseText);
                apiList.shift();
                return translate(phrases);
            }
        },
        onerror: function() {
            console.error('Katakana Terminator: request error', api.url);
            apiList.shift();
            return translate(phrases);
        },
    });
}

function requestReadings(phrases, hostIndex) {
    hostIndex = hostIndex || 0;
    if (!hostIndex) {
        phrases.forEach(function(phrase) {
            cachedReadings[phrase] = null;
        });
    }

    if (hostIndex >= readingApiHosts.length) {
        console.error('Katakana Terminator: reading fallbacks exhausted', phrases);
        phrases.forEach(function(phrase) {
            delete cachedReadings[phrase];
        });
        return;
    }

    GM_xmlhttpRequest({
        method: "GET",
        url: 'https://' + readingApiHosts[hostIndex] + '/translate_a/single' + buildQueryString({
            sl: 'ja',
            tl: 'en',
            dt: 'rm',
            client: 'gtx',
            q: phrases.join(readingSeparator),
        }),
        onload: function(dom) {
            try {
                cacheReadings(phrases, JSON.parse(dom.responseText.replace("'", '\u2019')));
            } catch (err) {
                console.error('Katakana Terminator: invalid reading response', err, dom.responseText);
                return requestReadings(phrases, hostIndex + 1);
            }
        },
        onerror: function() {
            console.error('Katakana Terminator: reading request error', phrases);
            return requestReadings(phrases, hostIndex + 1);
        },
    });
}

function cacheReadings(phrases, resp) {
    var romanized = extractRomanization(resp),
        readings;

    if (!romanized) {
        throw [phrases, resp];
    }

    readings = romanized.split('/');
    if (readings.length !== phrases.length) {
        throw [phrases, resp, romanized];
    }

    readings.forEach(function(reading, i) {
        var phrase = phrases[i];
        cachedReadings[phrase] = normalizeKanaReading(romajiToHiragana(reading));
        updateRubyByCachedReadings(phrase);
    });
}

function extractRomanization(resp) {
    if (!resp || !resp[0]) {
        return null;
    }

    for (var i = resp[0].length - 1; i >= 0; i--) {
        if (resp[0][i] && resp[0][i][3]) {
            return resp[0][i][3];
        }
    }
    return null;
}

var apiList = [
    {
        // https://github.com/Arnie97/katakana-terminator/pull/8
        name: 'Google Translate',
        hosts: ['translate.googleapis.com'],
        path: '/translate_a/single',
        params: function(phrases) {
            var joinedText = phrases.join('\n').replace(/\s+$/, '');
            return {
                sl: 'ja',
                tl: 'en',
                dt: 't',
                client: 'gtx',
                q: joinedText,
            };
        },
        callback: function(phrases, resp) {
            resp[0].forEach(function(item) {
                var translated = item[0].replace(/\s+$/, ''),
                    original   = item[1].replace(/\s+$/, '');
                cachedTranslations[original] = translated;
                updateRubyByCachedTranslations(original);
            });
        },
    },
    {
        // https://github.com/ssut/py-googletrans/issues/268
        name: 'Google Dictionary',
        hosts: ['translate.google.cn'],
        path: '/translate_a/t',
        params: function(phrases) {
            var joinedText = phrases.join('\n').replace(/\s+$/, '');
            return {
                sl: 'ja',
                tl: 'en',
                dt: 't',
                client: 'dict-chrome-ex',
                q: joinedText,
            };
        },
        callback: function(phrases, resp) {
            // ["katakana\nterminator"]
            if (!resp.sentences) {
                var translated = resp[0].split('\n');
                if (translated.length !== phrases.length) {
                    throw [phrases, resp];
                }
                translated.forEach(function(trans, i) {
                    var orig = phrases[i];
                    cachedTranslations[orig] = trans;
                    updateRubyByCachedTranslations(orig);
                });
                return;
            }

            resp.sentences.forEach(function(s) {
                if (!s.orig) {
                    return;
                }
                var original = s.orig.trim(),
                    translated = s.trans.trim();
                cachedTranslations[original] = translated;
                updateRubyByCachedTranslations(original);
            });
        },
    },
];

// Clear the pending-translation queue
function updateRubyByCachedTranslations(phrase) {
    if (!cachedTranslations[phrase]) {
        return;
    }
    (queue[phrase] || []).forEach(function(node) {
        node.dataset.rt = cachedTranslations[phrase];
    });
    delete queue[phrase];
}

function updateRubyByCachedReadings(phrase) {
    if (!cachedReadings[phrase]) {
        return;
    }
    (furiganaQueue[phrase] || []).forEach(function(item) {
        var reading = stripReadingSuffix(cachedReadings[phrase], item.suffix);
        item.node.dataset.rt = reading || cachedReadings[phrase];
    });
    delete furiganaQueue[phrase];
}

function stripReadingSuffix(reading, suffix) {
    var normalizedSuffix = normalizeKanaReading(suffix);
    if (normalizedSuffix && reading.substring(reading.length - normalizedSuffix.length) === normalizedSuffix) {
        return reading.substring(0, reading.length - normalizedSuffix.length);
    }
    return reading;
}

function normalizeKanaReading(text) {
    return kanaToHiragana(text).replace(/[^\u3041-\u3096]/g, '');
}

function kanaToHiragana(text) {
    return text.replace(/[\u30A1-\u30F6]/g, function(ch) {
        return String.fromCharCode(ch.charCodeAt(0) - 0x60);
    });
}

// Watch newly added DOM nodes, and save them for later use
function mutationHandler(mutationList) {
    mutationList.forEach(function(mutationRecord) {
        mutationRecord.addedNodes.forEach(function(node) {
            newNodes.push(node);
        });
    });
}

function main() {
    GM_addStyle("rt.katakana-terminator-rt::before { content: attr(data-rt); }");

    var observer = new MutationObserver(mutationHandler);
    observer.observe(_.body, {childList: true, subtree: true});

    function rescanTextNodes() {
        // Deplete buffered mutations
        mutationHandler(observer.takeRecords());
        if (!newNodes.length) {
            return;
        }

        console.debug('Katakana Terminator:', newNodes.length, 'new nodes were added, frame', window.location.href);
        newNodes.forEach(scanTextNodes);
        newNodes.length = 0;
        translateTextNodes();
    }

    // Limit the frequency of API requests
    rescanTextNodes();
    setInterval(rescanTextNodes, 500);
}

// Polyfill for Greasemonkey 4
if (typeof GM_xmlhttpRequest === 'undefined' &&
    typeof GM === 'object' && typeof GM.xmlHttpRequest === 'function') {
    GM_xmlhttpRequest = GM.xmlHttpRequest;
}

if (typeof GM_addStyle === 'undefined') {
    GM_addStyle = function(css) {
        var head = _.getElementsByTagName('head')[0];
        if (!head) {
            return null;
        }

        var style = _.createElement('style');
        style.setAttribute('type', 'text/css');
        style.textContent = css;
        head.appendChild(style);
        return style;
    };
}

// Polyfill for ES5
if (typeof NodeList.prototype.forEach === 'undefined') {
    NodeList.prototype.forEach = function(callback, thisArg) {
        thisArg = thisArg || window;
        for (var i = 0; i < this.length; i++) {
            callback.call(thisArg, this[i], i, this);
        }
    };
}

main();
