# Z80-Binary-Sender
Z80 binary sender from Windows PC to Z80 Trainer through Arduino.
The sender it self was coded with Node.js by the help of serialport NPM package.
Z80 binary file, eg. produced by [Z80-Assembler.exe](../Z80-Assembler/blob/master/VisualBasic2005.NET/obj/Release/Z80_Assembler.exe)
is sent to Arduino through serial port, and by Arduino which is
programmed as an SPI Slave, is sent to Z80 Trainer which is programmed as an SPI Master.
