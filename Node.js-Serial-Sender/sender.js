

console.log();
console.log("*** Z80 Binary Sender through Arduino SPI Slave ***");
console.log();
console.log("[ by ZulNs, Gorontalo, 26 November 2018 ]");
console.log();

if (process.argv.length < 3)
{
	console.log("There's no Z80 binary file to send, exiting...");
	process.exit(0);
}

const SPI_ID = "AS2SPIS";
const BUFFER_EMPTY     = 'B';
const DATA             = 'D';
const SEND_ERROR       = 'E';
const INIT             = 'I';
const MASTER_NOT_READY = 'M';
const ID_REQUEST       = 'R';
const END_SENDING      = 'S';

const fs = require('fs');
const SerialPort = require('serialport');
const readline = require('readline');

const rl = readline.createInterface(
{
	input: process.stdin,
	output: process.stdout
});

var buffer;
var serialport;
var portName;
var rxData = "";
var isArduino = false;
var bufferTo = 0;

rl.pause();

fs.readFile(process.argv[2], function(err, data)
{
	if (err)
	{
		throw err;
	}
	var str = data.toString();
	var len = data.length - 88;
	if (len > 0 && str.substr(0,22) === '<Z80_Executable_Codes>' && str.substr(-66) === '<ZulNs#05-11-1970#Viva_New_Technology_Protocol#Gorontalo#Feb-2005>')
	{
		buffer = data.slice(22, len + 22);
		SerialPort.list(listSerialPort);
	}
	else
	{
		console.log(process.argv[2] + "isn't a valid Z80 binary file, exiting...");
		process.exit(0);
	}
});

rl.on('SIGINT', function()
{
	console.log('\nHave a nice day!');
	process.exit(0);
});

rl.on('close', function()
{
	console.log('\nHave a nice day!');
	process.exit(0);
});

function listSerialPort(err, ports)
{
	if (ports.length == 0)
	{
		console.log("Sorry, there's no available serial port on this machine!");
		process.exit(0);
	}
	if (ports.length == 1)
	{
		portName = ports[0].comName;
		setSerialPort();
	}
	else
	{
		console.log("Please select the serial port you want to use:");
		ports.forEach(function(port, index)
		{
			index++;
			console.log('  [' + index + ']', port.comName + ',', port.manufacturer);
		});
		rl.question("Your choice: ", function(answer)
		{
			answer = parseInt(answer);
			if (!(1 <= answer && answer <= ports.length))
			{
				console.log("Wrong choice, exiting...");
				process.exit(0);
			}
			console.log();
			portName = ports[answer - 1].comName;
			setSerialPort();
		});
	}
}

function setSerialPort()
{
	serialport = new SerialPort(portName,
	{
		baudRate: 57600,
		parser: new SerialPort.parsers.Readline('\n')
	});
	serialport.on('open', onOpenPort);
	serialport.on('data', onDataPort);

	// open errors will be emitted as an error event
	serialport.on('error', function(err)
	{
		console.log('Error:', err.message);
		process.exit(0);
	});
}

function onOpenPort()
{
	setTimeout(function()
	{
		writePort(ID_REQUEST); // Request to identify Arduino SPI Slave, it must be replied with SPI_ID
		console.log("Identifying Arduino Board...");
	}, 1600);
}

function onDataPort(oridata)
{
	var data = oridata.toString();
	var slen;
	rxData = rxData + data;
	slen = rxData.search("\r\n");
	if (slen == -1)
	{
		return;
	}
	data = rxData.substr(0, slen);
	rxData = rxData.substr(slen + 2);
	if (isArduino)
	{
		switch (data)
		{
			case MASTER_NOT_READY:
				console.log("SPI Master was not ready, exiting...");
				process.exit(0);
			case SEND_ERROR:
				console.log("Error on sending, exiting...");
				process.exit(0);
			case INIT:
				console.log("Start to send %d bytes...", buffer.length);
			case BUFFER_EMPTY:
				if (bufferTo < buffer.length)
				{
					if (bufferTo > 0)
					{
						console.log("%d bytes to send...", bufferTo)
					}
					var bufferFrom = bufferTo;
					bufferTo += 32;
					if (bufferTo > buffer.length)
					{
						bufferTo = buffer.length;
					}
					writePort(DATA);
					writePort(buffer.slice(bufferFrom, bufferTo));
				}
				else
				{
					console.log("%d bytes sent successfully!!!", buffer.length);
					writePort(END_SENDING);
				}
				break;
			case END_SENDING:
				console.log("Completed, exiting...");
				process.exit(0);
			default:
				console.log("Unknown error on Arduino side, exiting...");
				process.exit(0);
		}
	}
	else
	{
		if (data == SPI_ID)
		{
			isArduino = true;
			console.log("Found Arduino SPI Slave, initializing...");
			writePort(INIT); // Request to initialize Arduino SPI Slave, it must be replied with INIT if success or MASTER_NOT_READY
		}
		else
		{
			console.log("Unrecognized SPI Slave Device, exiting... (" + data + ") " + data.length);
			process.exit(0);
		}
	}
}

function writePort(data)
{
	serialport.write(data, function(err)
	{
		if (err)
		{
			console.log("Error on write:", err.message);
			process.exit(0);
		}
	});
}
