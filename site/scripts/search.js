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
  flatten,
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
const transliteration = require('transliteration');

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

function parseAPITable(str) {
  const result = [];

  const subKeys = pipe(
    split('\n'),
    nth(0),
    split('|'),
    filter(Boolean),
    map(trim),
    drop(1)
  )(str);

  let pos;

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
            result.push({
              APIKey: value
            });
            pos = result.length - 1;
          } else {
            result[pos][subKeys[index - 1]] = value;
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

function extractContent(str) {
  return pipe(split('\n'), reject(test(/\|/)), join('\n'), trimLine)(str);
}

function extractTable(str) {
  return pipe(split('\n'), filter(test(/\|/)), join('\n'))(str);
}

function jigsaw() {
  const groups = [];
  let path;
  let objectID = 100000;
  const extractPath = function(str) {
    path = pipe(fm, prop('attributes'), prop('path'))(str);
    return str;
  };
  Object.keys(NAMES).forEach(i18n => {
    const json = [];
    const list = LIST_STATICS[i18n][1].groups;
    const granding = curry(function(str, regexp, saveCompName) {
      const base = split('\n', str);
      let name = saveCompName ? nth(0, base) : `${compName} ${nth(0, base)}`;
      if (saveCompName) {
        compName = name;
      }
      const anchorPath = `${pipe(split('-'), nth(0))(
        i18n
      )}/${path}#${transliteration.slugify(name)}`;
      const intermediate = pipe(
        drop(1),
        join('\n'),
        split(regexp),
        map(trimLine)
      )(base);
      let content = test(/#{3,}\s/, nth(0, intermediate))
        ? ''
        : trimLine(nth(0, intermediate));
      if (test(/\|/, content)) {
        const contentCopy = content;
        content = extractContent(content) || '';
        const API = pipe(extractTable, parseAPITable)(contentCopy);
        json.push({
          name,
          anchorPath,
          content,
          objectID: objectID++,
          compName,
          API
        });
      } else if (content) {
        json.push({
          name,
          anchorPath,
          content,
          objectID: objectID++,
          compName
        });
      }
      return test(/#{3,}\s/, nth(0, intermediate))
        ? intermediate
        : drop(1, intermediate);
    });
    pipe(
      readdirSync,
      map(pipe(concat('/'), concat(SRC))),
      filter(isDir),
      map(pipe(concat(__, '/'), concat(__, NAMES[i18n]))),
      filter(existsSync),
      map(str =>
        pipe(
          readFileToString,
          extractPath,
          split(/\n##\s/),
          drop(1),
          nth(0),
          replace(/<style>[^<]*<\/style>/g, ''),
          replace(/<!--[^>]*-->/g, ''),
          trimLine,
          granding(__, /\n###\s/, true),
          map(granding(__, /\n####\s/, false)),
          flatten,
          map(granding(__, /\n#####\s/, false)),
          flatten,
          map(granding(__, /\n######\s/, false))
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
