importScripts('service-worker.js');

self.onmessage = e => {
  switch(e.data.cmd) {
    case 'downloadPouchDB':
      importScripts('bower_components/pouchdb/dist/pouchdb.min.js');
      e.ports[0].postMessage(true);
      break;
      
    case 'setupPouchDB':
      db = new PouchDB(e.data.uid);
      e.ports[0].postMessage(true);
      break;
      
    case 'deletePouchDB':
      if(typeof db != 'undefined') {
        db.destroy()
      };
      break;
      
    case 'processChangeRecord':
      let data = e.data.value.value,
          path = e.data.value.path,
          uid = e.data.uid,
          token = e.data.token,
          syncId = e.data.syncId,
          skipLocal = e.data.skipLocal;
      self.addEventListener('sync', event => {
        if (event.tag == syncId) {
          event.waitUntil(uploadData(data, path, uid, token));
        }
      });
      e.ports[0].postMessage(true);
      if(!skipLocal) {
        if(typeof db == 'undefined') {
          checkPouch(uid)
        };
        if(typeof isLocalUploadRunnig == 'undefined') {
          isLocalUploadRunnig = false
        };
        if(typeof dataToSync == 'undefined') {
          dataToSync = []
        };
        dataToSync.push({
          data: data,
          path: path
        });
        if(!isLocalUploadRunnig) {
          uploadToLocal();
        }
      }
      break;
      
    case 'giveTimetable':
      if(typeof db == 'undefined') {
        e.ports[0].postMessage({ err: 'PouchDB not set up!' });
        break;
      };
      db.get('data')
        .then(doc => e.ports[0].postMessage(doc))
        .catch(err => e.ports[0].postMessage({ lastEdit: 0 }))
      break;
      
    default:
      e.ports[0].postMessage({ err: 'No command specyfied!' });
      throw 'No command specyfied!'
  }
}

function uploadData(data, path, uid, token) {
  return new Promise((resolve, reject) => {
    function url(paste, uid, token) {
      return [
        'https://your-timetable.firebaseio.com/users/',
        uid,
        paste,
        '.json?auth=',
        token
      ].join('');
    };
    switch(path) {
      case 'data':
        data.lastEdit = new Date().getTime();
        request(url(null, uid, token), data)
          .then(() => resolve())
        break;
      case 'data.timetable':
        request(url('/timetable', uid, token), data)
          .then(() => {
            request(url('/lastEdit', uid, token), new Date().getTime())
          }).then(() => resolve())
        break;
      case 'data.settings':
        request(url('/settings', uid, token), data)
          .then(() => {
            request(url('/lastEdit', uid, token), new Date().getTime())
          }).then(() => resolve())
        break;
      case 'data.config':
        request(url('/config', uid, token), data)
          .then(() => {
            request(url('/lastEdit', uid, token), new Date().getTime())
          }).then(() => resolve())
        break;
    }
    resolve()
  })
}


function request(url, body) {
  return fetch(url, {
    method: 'put',
    headers: {
      'type': 'application/json'
    },
    body: JSON.stringify(body)
  })
}


function uploadToLocal() {
  return new Promise((resolveRoot, reject) => {
    function resolve() {
      isLocalUploadRunnig = false;
      resolveRoot()
    };
    isLocalUploadRunnig = true;
    while(dataToSync.length > 0) {
      let job = dataToSync.pop();
      let data = job.data;
      (() => {
        switch(job.path) {
          case 'data':
            db.get('data').then(doc => {
              doc.timetable = data.timetable;
              doc.settings = data.settings;
              doc.config = data.config;
              doc.lastEdit = new Date().getTime();
              db.put(doc).then(() => { return });
            }, err => {
              if(err.status == 404) {
                let doc = {
                  _id: 'data',
                  timetable: data.timetable,
                  settings: data.settings,
                  config: data.config,
                  lastEdit: new Date().getTime()
                };
                db.put(doc).then(() => { return })
              } else {
                throw err
              }
            });
            break;
          case 'data.timetable':
            db.get('data').then(doc => {
              doc.timetable = data;
              doc.lastEdit = new Date().getTime();
              db.put(doc).then(() => { return });
            }, err => {
              if(err.status == 404) {
                let doc = {
                  _id: 'data',
                  timetable: data,
                  settings: null,
                  config: null,
                  lastEdit: new Date().getTime()
                };
                db.put(doc).then(() => { return })
              } else {
                throw err
              }
            });
            break;
          case 'data.settings':
            db.get('data').then(doc => {
              doc.settings = data;
              doc.lastEdit = new Date().getTime();
              db.put(doc).then(() => { return });
            }, err => {
              if(err.status == 404) {
                let doc = {
                  _id: 'data',
                  timetable: null,
                  settings: data,
                  config: null,
                  lastEdit: new Date().getTime()
                };
                db.put(doc).then(() => { return })
              } else {
                throw err
              }
            });
            break;
          case 'data.config':
            db.get('data').then(doc => {
              doc.config = data;
              doc.lastEdit = new Date().getTime();
              db.put(doc).then(() => { return });
            }, err => {
              if(err.status == 404) {
                let doc = {
                  _id: 'data',
                  timetable: null,
                  settings: null,
                  config: data,
                  lastEdit: new Date().getTime()
                };
                db.put(doc).then(() => { return })
              } else {
                throw err
              }
            });
            break;
        }
      })()
    }
  })
}


function checkPouch(uid) {
  if(typeof PouchDB == 'undefined') {
    importScripts('bower_components/pouchdb/dist/pouchdb.min.js');
  };
  db = new PouchDB(uid)
};