import array
import serial
import struct

DIRECT_COMMAND_REPLY = 0x00
opINPUT_READ = 0x9A
PRIMPAR_VALUE = 0x3F
PRIMPAR_SHORT = 0x00
PRIMPAR_CONST = 0x00
PRIMPAR_VARIABEL = 0x40
PRIMPAR_GLOBAL = 0x20
PRIMPAR_INDEX = 0x1F

LC0 = lambda v: ((v & PRIMPAR_VALUE) | PRIMPAR_SHORT | PRIMPAR_CONST)
GV0 = lambda i: ((i & PRIMPAR_INDEX) | PRIMPAR_SHORT | PRIMPAR_VARIABEL | PRIMPAR_GLOBAL)

chan = serial.Serial('/dev/tty.EV3-SerialPort')
chan.baudrate = 115200

def make_read_command(seq, port):
  return ''.join(chr(c) for c in [11, 0, seq, 0,
      DIRECT_COMMAND_REPLY,
      1, 0,
      opINPUT_READ, LC0(0), LC0(port), LC0(0), LC0(0), GV0(0)
      ])

def write_command(command):
  chan.write(command)

def read_sensors(n):
  ret = {}
  for i in range(n):
    size_bytes = chan.read(2)
    (size, ) = struct.unpack('<H', size_bytes)
    payload = chan.read(size)

    # Extreeeemely cheap :)
    try:
      ret[ord(payload[0])] = ord(payload[3])
    except IndexError:
      pass
  return ret

# Command == size (2), serial (2), type (1), params(N)

try:
  while True:
    write_command(make_read_command(0, 0) +
                  make_read_command(1, 1) +
                  make_read_command(2, 2) +
                  make_read_command(3, 3))
    print read_sensors(4)
except KeyboardInterrupt:
  pass
