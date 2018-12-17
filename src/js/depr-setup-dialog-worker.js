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
  if (cmd === 'calculateTime') {
    const lessonTime = data[0],
          breakTime = data[1],
          lastLessonEnd = data[2],
          date = new Date(0),
          lastLessonEndRegExp = lastLessonEnd.match(/(\d+):(\d+)/),
          lastLessonEndUnix = date.setUTCHours(lastLessonEndRegExp[1], lastLessonEndRegExp[2]),
          startTimeUnix = lastLessonEndUnix + breakTime,
          endTimeUnix = startTimeUnix + lessonTime;
    let startTimeDate = new Date(startTimeUnix),
        startTime = startTimeDate.getUTCHours().toString().length === 1 ? '0' + startTimeDate.getUTCHours()
                                                                        : startTimeDate.getUTCHours(),
        endTimeDate = new Date(endTimeUnix),
        endTime = endTimeDate.getUTCHours().toString().length === 1 ? '0' + endTimeDate.getUTCHours()
                                                                    : endTimeDate.getUTCHours();
    startTime += ':' + (startTimeDate.getUTCMinutes().toString().length === 1 ? '0' + startTimeDate.getUTCMinutes()
                                                                              : startTimeDate.getUTCMinutes());
    endTime += ':' + (endTimeDate.getUTCMinutes().toString().length === 1 ? '0' + endTimeDate.getUTCMinutes()
                                                                          : endTimeDate.getUTCMinutes());
    e.ports[0].postMessage([startTime, endTime]);
  }
};