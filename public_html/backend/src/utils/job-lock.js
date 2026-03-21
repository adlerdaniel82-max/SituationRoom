const fs = require('fs');
const os = require('os');
const path = require('path');

function acquireJobLock(jobName) {
  const safeName = String(jobName || 'job').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
  const lockPath = path.join(os.tmpdir(), `situation-room-${safeName}.lock`);
  const fd = fs.openSync(lockPath, 'wx');
  fs.writeFileSync(fd, String(process.pid));

  return {
    lockPath,
    release() {
      try {
        fs.closeSync(fd);
      } catch {}
      try {
        fs.unlinkSync(lockPath);
      } catch {}
    }
  };
}

function isLockError(error) {
  return error && error.code === 'EEXIST';
}

module.exports = { acquireJobLock, isLockError };
