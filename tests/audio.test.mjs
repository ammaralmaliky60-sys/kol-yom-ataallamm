import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSpeech, compareSpeech, speak, stopSpeech } from '../dist/modules/audio.js';

test('normalizes curly apostrophes, case, punctuation and contractions', () => {
  assert.equal(normalizeSpeech('  I’m HAPPY! You’re my friend. '), 'i am happy you are my friend');
  assert.equal(normalizeSpeech("I can't swim; I cannot swim."), 'i can not swim i can not swim');
});

test('equivalent contracted and full transcripts match', () => {
  assert.deepEqual(compareSpeech('I am a teacher.', "I'm a teacher"), {
    score: 100, missing: [], extra: [], matched: ['i', 'am', 'a', 'teacher'],
  });
});

test('reports missing and different words without inventing phoneme results', () => {
  const compared = compareSpeech('I would like a cup of tea.', 'I like a cup of coffee.');
  assert.deepEqual(compared.missing, ['would', 'tea']);
  assert.deepEqual(compared.extra, ['coffee']);
  assert.deepEqual(compared.matched, ['i', 'like', 'a', 'cup', 'of']);
  assert.equal(compared.score, 77);
});

test('alignment respects order and repeated word counts', () => {
  assert.equal(compareSpeech('red blue', 'blue red').score, 50);
  assert.deepEqual(compareSpeech('very very good', 'very good').missing, ['very']);
  assert.deepEqual(compareSpeech('go home', 'go go home').extra, ['go']);
});

test('silence and empty target never produce a passing score', () => {
  assert.equal(compareSpeech('hello', '').score, 0);
  assert.equal(compareSpeech('', '').score, 0);
  assert.equal(compareSpeech('', 'hello').score, 0);
});

test('a server environment can import and call audio helpers safely', () => {
  let error = '';
  assert.equal(speak('hello', { onError: message => { error = message; } }), null);
  assert.match(error, /متصفحك/);
  assert.doesNotThrow(stopSpeech);
});

test('unexpected long input is bounded and still counts omitted words', () => {
  const compared = compareSpeech(Array(500).fill('hello').join(' '), 'hello');
  assert.equal(compared.missing.length, 499);
  assert.equal(compared.matched.length, 1);
});
