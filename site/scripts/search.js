/* eslint-disable */
const { resolve, relative } = require('path');

// fs.exists is deprecated, but sync version is still available in Node v8.8.1, so I use it.
const {
  readdirSync,
  statSync,
  existsSync,
  readFileSync,
  writeFileSync
} = require('fs');

const {
  __,
  addIndex,
  all,
  concat,
  curry,
  drop,
  filter,
  find,
  forEach,
  join,
  map,
  merge,
  nth,
  omit,
  pipe,
  prop,
  propEq,
  reject,
  replace,
  split,
  test,
  trim
} = require('ramda');
const fm = require('front-matter');
const himalaya = require('himalaya');
const md = require('markdown-it')();

const LIST_STATICS = require('../src/nav.static');
const SRC = resolve(process.cwd(), '../packages/zent/src');
const NAMES = {
  'zh-CN': 'README_zh-CN.md',
  'en-US': 'README_en-US.md'
};

const beautyConsole = meta => {
  console.log(`
=====================
${JSON.stringify(meta)}
=====================

`);
  return meta;
};

const isDir = path => {
  try {
    readdirSync(path);
  } catch (e) {
    return false;
  }
  return true;
};

const readFileToString = curry(readFileSync)(__, 'utf8');

function trimLine(longString) {
  let str = longString;
  while (/^\n/.test(str)) {
    str = str.replace(/^\n/, '');
  }
  while (/\n$/.test(str)) {
    str = str.replace(/\n$/, '');
  }
  return str;
}

function granding(str, regexp) {
  const splitByLine = str.split('\n');
  const name = trimLine(splitByLine[0]);
  splitByLine.shift();
  if (regexp) {
    const splitByReg = splitByLine.join('\n').split(regexp);
    const content = trimLine(splitByReg[0]);
    splitByReg.shift();
    const children = splitByReg;
    return children.length ? { name, content, children } : { name, content };
  }
  return { name, content: trimLine(splitByLine.join('\n')) };
}

function parseAPITable(str) {
  const result = {};

  const subKeys = pipe(
    split('\n'),
    nth(0),
    split('|'),
    filter(Boolean),
    map(trim),
    drop(1)
  )(str);

  let key;

  pipe(
    split('\n'),
    drop(2),
    map(
      pipe(
        split('|'),
        filter(Boolean),
        map(trim),
        addIndex(map)((value, index) => {
          if (index === 0) {
            result[value] = {};
            key = value;
          } else {
            result[key][subKeys[index - 1]] = value;
          }
        })
      )
    )
  )(str);

  return result;
}

function pureTable(str) {
  return pipe(split('\n'), all(test(/\|/)))(str);
}

function extractInfo(str) {
  return pipe(split('\n'), reject(test(/\|/)), join('\n'), trimLine)(str);
}

function extractTable(str) {
  return pipe(split('\n'), filter(test(/\|/)), join('\n'))(str);
}

function parseAPI(API) {
  if (API.content) {
    const content = trimLine(API.content);
    if (pureTable(content)) {
      API.content = parseAPITable(content);
    } else {
      API.info = extractInfo(content);
      API.content = parseAPITable(extractTable(content));
    }
  }

  if (API.children && API.children.length) {
    API.children = map(
      pipe(granding, obj => {
        if (obj.content && /\|/.test(obj.content)) {
          const content = trimLine(obj.content);
          if (pureTable(content)) {
            obj.content = parseAPITable(content);
          } else {
            obj.info = extractInfo(content);
            obj.content = parseAPITable(extractTable(content));
          }
        }
        return obj;
      }),
      API.children
    );
  }
  return API;
}

function jigsaw() {
  Object.keys(NAMES).forEach(i18n => {
    const list = LIST_STATICS[i18n][1].groups;
    const groups = [];
    const json = pipe(
      readdirSync,
      map(pipe(concat('/'), concat(SRC))),
      filter(isDir),
      map(pipe(concat(__, '/'), concat(__, NAMES[i18n]))),
      filter(existsSync),
      map(str =>
        pipe(
          readFileToString,
          split(/\n##\s/),
          map(
            pipe(
              replace(/<style>[^<]*<\/style>/g, ''),
              replace(/<!--[^>]*-->/g, '')
            )
          ),
          map(sub => {
            if (/\n###\s/.test(sub)) {
              const result = granding(sub, /\n###\s/);
              if (result.children && result.children.length) {
                result.children = map(
                  curry(granding)(__, /\n####\s/),
                  result.children
                );
                pipe(
                  filter(
                    block =>
                      block.name.trim() !== 'API' &&
                      block.children &&
                      block.children.length
                  ),
                  map(block => {
                    block.children = map(
                      curry(granding)(__, null),
                      block.children
                    );
                    return block;
                  })
                )(result.children);
              }
              let APIBlock = pipe(
                filter(block => block.name.trim() === 'API'),
                nth(0)
              )(result.children);
              if (APIBlock) {
                APIBlock = parseAPI(APIBlock);
              }
              return result;
            }
            return sub;
          }),
          drop(1),
          nth(0),
          beautyConsole
        )(str)
      )
    )(SRC);
    writeFileSync(
      resolve(__dirname, `./${i18n}.json`),
      JSON.stringify(json),
      'utf8'
    );
  });
}

jigsaw();
