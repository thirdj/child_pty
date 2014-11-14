var assert = require('assert');
var child_pty = require('../index');

describe('child_pty.spawn()', function(){
	var child;
	function spawn_client() {
		child = child_pty.spawn(process.argv[0],
			Array.prototype.concat.apply([ __dirname + '/libexec/client.js'],
			   arguments));
	}

	it('should exit', function(done){
		spawn_client();

		child.on('exit', function() {
			done();
		});
	});
	it('should print to stdout', function(done){
		spawn_client('print');
		var d = '';

		child.stdout.on('data', function(data) {
			d += data.toString();
		});

		child.on('exit', function() {
			assert('print\r\n', d, 'should receive data');
			done();
		});
	});
	it('should read from stdin', function(done) {
		spawn_client('echo');
		var d;

		child.stdout.on('data', function(data) {
			d = data;
			child.kill();
		});

		child.on('exit', function() {
			assert('data\r\n', d, 'received data should be ok');
			done();
		});

		child.stdin.write('data\n');
	});
	it('should fire event on resize', function(done) {
		spawn_client();
		var resized = false;

		child.on('resize', function() {
			resized = true;
		}).on('exit', function() {
			assert.ok(resized, 'resize should be emitted');
			done();
		});

		child.resize({columns: 80, rows: 80});
	});
	it('should send sigwinch on resize', function(done) {
		spawn_client('print', 'echo', 'sigwinch');

		child.stdout.once('data', function(data) {
			if(data.toString() !== 'print\r\n') {
				assert.ok(false, 'received wrong data');
				child.kill();
				return done();
			}
			child.resize({ columns:80, rows: 80 });
			child.stdout.once('data', function(data) {
				assert('sigwinch\r\n', data);
				child.kill();
			});
		});
		child.on('exit', function() {
			done();
		});
	});
	afterEach(function(){
		child.kill();
	});
});
