onmessage = e => {
  const data = e.data,
        cmd = data.shift();
    if (cmd === 'find') {
    const lesson = data[0],
          info = data[1],
          output = {};
    info.forEach(item => {
      if (item.name === lesson) {
        if (item.teacher) {
          output.teacher = item.teacher;
        }
        if (item.class) {
          output.class = item.class;
        }
        e.ports[0].postMessage(output);
        return;
      }
    });
  }
  if (cmd === 'push') {
    const lesson = data[0],
          type = data[1],
          input = data[2],
          info = data[3];
    info.forEach((item, index) => {
      if (item.name === lesson) {
        info[index][type] = input;
        return;
      }
    });
    e.ports[0].postMessage(info);
  }
};