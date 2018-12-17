importScripts('/node_modules/dexie/dist/dexie.js');

// Set required functions
self.onmessage = e => {
  if (!e.data.cmd) return;
  switch (e.data.cmd) {
    case 'setupDexie':
      if (typeof db !== 'undefined')
        e.ports[0].postMessage(true)
      if (!e.data.uid) {
        e.ports[0].postMessage({ error: { message: 'No uid provided!', name: 'NoUID' } });
        break;
      } 
      self.db = new Dexie(e.data.uid);
      db.version(1).stores({
        data: '' // TODO: Not best practise
      })
      e.ports[0].postMessage(true);
      break;
      
    case 'readData':
      if (self.db) {
        db.data.get('data').then(data => e.ports[0].postMessage(data));
      } else {
        e.ports[0].postMessage({ error: { message: 'Dexie is unavailable', name: 'RequiresSetup' } });
      }
      break;
    
    case 'pushToDB':
      pushToDB(e);
      break;
      
    case 'deleteDexie':
      if (self.db) {
        e.waitUntil(new Promise(r => {
          db.destroy().then(() => {
            db = undefined;
            e.ports[0].postMessage(true);
            r();
          }, err => {
            e.ports[0].postMessage({ error: err });
            r();
          });
        }));
      } else {
        e.ports[0].postMessage(true);
      }
      break;
      
    default:
      console.warn(`Unknown message sent to Service Worker - command: ${e.data.action}`, e);
      e.ports[0].postMessage({ error: 'Unknown command '});
  }
};

function pushToDB(e) {
  const data = e.data.data;
  db.data.get('data').catch(err => {
    if (err.name === 'NotFoundError') {
      throw err;
    } else {
      return data;
    }
  }).then(() => {
    const output = {};
    output.config = data.config;
    output.settings = data.settings;
    output.timetable = data.timetable;
    output.events = data.events;
    output.lastEdit = Date.now();
    return db.data.put(output, 'data');
  });
}