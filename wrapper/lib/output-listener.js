class OutputListener {
  constructor() {
    this._buff = [];
  }

  get listener() {
    const listen = function listen(data) {
      this._buff.push(data);
    };

    return listen.bind(this);
  }

  get contents() {
    return this._buff.map((chunk) => chunk.toString()).join('');
  }
}

module.exports = OutputListener;
