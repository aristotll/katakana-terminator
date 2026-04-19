'use strict';

var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var test = require('node:test');
var vm = require('node:vm');

var scriptPath = path.resolve(__dirname, '..', 'katakana-terminator.user.js');

function createTextNode(text) {
    return {
        nodeType: 3,
        nodeValue: text,
        parentNode: null,
        splitText: function(index) {
            var after = createTextNode(this.nodeValue.substring(index));
            after.parentNode = this.parentNode;
            this.nodeValue = this.nodeValue.substring(0, index);
            return after;
        },
    };
}

function createElement(tagName) {
    var element = {
        nodeType: 1,
        tagName: tagName.toUpperCase(),
        childNodes: [],
        classNames: [],
        dataset: {},
        isContentEditable: false,
        appendChild: function(child) {
            child.parentNode = this;
            this.childNodes.push(child);
            return child;
        },
    };
    element.classList = {
        add: function(name) {
            element.classNames.push(name);
        },
    };
    return element;
}

function createParentNode() {
    return {
        inserted: [],
        insertBefore: function(newNode, refNode) {
            newNode.parentNode = this;
            this.inserted.push({
                newNode: newNode,
                refNode: refNode,
            });
        },
    };
}

function loadScript() {
    function NodeList() {}
    NodeList.prototype = {};

    var document = {
        body: {
            contains: function() {
                return true;
            },
        },
        createElement: createElement,
        createTextNode: createTextNode,
        getElementsByTagName: function() {
            return [];
        },
    };
    var context = {
        console: {
            debug: function() {},
            error: function() {},
            log: function() {},
        },
        document: document,
        window: {
            location: {
                href: 'https://example.test/',
            },
        },
        Node: {
            ELEMENT_NODE: 1,
            TEXT_NODE: 3,
        },
        NodeList: NodeList,
        MutationObserver: function() {},
        GM_xmlhttpRequest: function() {},
        GM_addStyle: function() {},
    };
    var code = fs.readFileSync(scriptPath, 'utf8').replace(/\nmain\(\);\s*$/, '\n');

    vm.createContext(context);
    vm.runInContext(code, context, {
        filename: scriptPath,
    });
    return context;
}

function collectMatches(context, text) {
    var matches = [];
    var rest = text;
    var match;

    while ((match = context.findRubyMatch(rest))) {
        matches.push({
            type: match.type,
            text: match.text,
            key: match.key,
            suffix: match.suffix || '',
        });
        rest = rest.substring(match.index + match.text.length);
    }

    return matches;
}

test('converts Google-style romaji readings to hiragana', function() {
    var context = loadScript();

    assert.equal(context.normalizeKanaReading(context.romajiToHiragana('Nihongo')), 'にほんご');
    assert.equal(context.normalizeKanaReading(context.romajiToHiragana('benkyō')), 'べんきょう');
    assert.equal(context.normalizeKanaReading(context.romajiToHiragana('gakkō')), 'がっこう');
    assert.equal(context.normalizeKanaReading(context.romajiToHiragana('Matcha')), 'まっちゃ');
    assert.equal(context.normalizeKanaReading(context.romajiToHiragana("Shin'ya")), 'しんや');
});

test('finds kanji readings and katakana translations in scan order', function() {
    var context = loadScript();

    assert.deepEqual(collectMatches(context, '日本語を勉強しています。カタカナもあります。'), [
        {type: 'reading', text: '日本語', key: '日本語', suffix: ''},
        {type: 'reading', text: '勉強', key: '勉強しています', suffix: 'しています'},
        {type: 'translation', text: 'カタカナ', key: 'カタカナ', suffix: ''},
    ]);
    assert.deepEqual(collectMatches(context, '今日は学校へ行きます。'), [
        {type: 'reading', text: '今日', key: '今日', suffix: ''},
        {type: 'reading', text: '学校', key: '学校', suffix: ''},
        {type: 'reading', text: '行', key: '行きます', suffix: 'きます'},
    ]);
});

test('cacheReadings writes hiragana rt data and strips okurigana', function() {
    var context = loadScript();
    var nihongo = {dataset: {}};
    var benkyo = {dataset: {}};
    var iku = {dataset: {}};

    context.furiganaQueue['日本語'] = [{node: nihongo, suffix: ''}];
    context.furiganaQueue['勉強しています'] = [{node: benkyo, suffix: 'しています'}];
    context.furiganaQueue['行きます'] = [{node: iku, suffix: 'きます'}];

    context.cacheReadings(
        ['日本語', '勉強しています', '行きます'],
        [[[null, null, null, 'Nihongo/ benkyō shite imasu/ Ikimasu']]]
    );

    assert.equal(nihongo.dataset.rt, 'にほんご');
    assert.equal(benkyo.dataset.rt, 'べんきょう');
    assert.equal(iku.dataset.rt, 'い');
    assert.equal(context.furiganaQueue['日本語'], undefined);
    assert.equal(context.furiganaQueue['勉強しています'], undefined);
    assert.equal(context.furiganaQueue['行きます'], undefined);
});

test('addRuby queues kanji readings and katakana translations', function() {
    var context = loadScript();
    var parent = createParentNode();
    var textNode = createTextNode('学校へ行きます。テスト');
    var after;

    textNode.parentNode = parent;

    after = context.addRuby(textNode);
    assert.equal(textNode.nodeValue, '');
    assert.equal(after.nodeValue, 'へ行きます。テスト');
    assert.equal(parent.inserted[0].newNode.childNodes[0].nodeValue, '学校');
    assert.equal(context.furiganaQueue['学校'].length, 1);

    after = context.addRuby(after);
    assert.equal(after.nodeValue, 'きます。テスト');
    assert.equal(parent.inserted[1].newNode.childNodes[0].nodeValue, '行');
    assert.equal(context.furiganaQueue['行きます'].length, 1);

    after = context.addRuby(after);
    assert.equal(after.nodeValue, '');
    assert.equal(parent.inserted[2].newNode.childNodes[0].nodeValue, 'テスト');
    assert.equal(context.queue['テスト'].length, 1);
});
