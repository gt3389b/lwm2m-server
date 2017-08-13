let gulp = require('gulp');
let exec = require('child_process').exec;
let spawn = require('child_process').spawn;
let wait = require('gulp-wait2');
let open = require('gulp-open');

gulp.task('webdocs', function (cb) {
    const address = '127.0.0.1';
    const PORT = 8012;
    console.log(`Documentation running at http://${address}:${PORT}`);
    exec(`mkdocs serve --dev-addr=${address}:${PORT}`, function (err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        cb(err);
    });

    let options = {
        uri: `http://${address}:${PORT}`,
        app: 'opera'
    };

    gulp.src(__filename)
      .pipe(wait(4000))
      .pipe(open(options));
});

gulp.task('database', function (cb) {
  const proc = spawn('mongod');
  proc.stdout.on('data', function (data) {
    console.log('stdout: ' + data.toString());
  });
  proc.stderr.on('data', function (data) {
    console.log('stderr: ' + data.toString());
  });
  proc.on('exit', function (code) {
    console.log('mongod exited with code ' + code.toString());
  });
});
