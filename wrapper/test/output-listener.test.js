import OutputListener from '../lib/output-listener';

describe('output-listener', () => {
  it('receives and exposes data', () => {
    const listener = new OutputListener();
    listener.listener(Buffer.from('foo'));
    listener.listener(Buffer.from('bar'));
    listener.listener(Buffer.from('baz'));
    expect(listener.contents).toBe('foobarbaz');
  });
});
