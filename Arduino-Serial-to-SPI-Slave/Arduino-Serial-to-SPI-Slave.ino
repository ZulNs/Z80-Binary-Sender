
/* -------------------------------------------- *
 * Arduino Serial to SPI Slave                  *
 * -------------------------------------------- *
 *                                              *
 * Description:                                 *
 * Due to slave mode of SPI, it can't initiate  *
 * a transmission, so it required a special     *
 * output pin to signal the master that there's *
 * a data to transmit on.                       *
 * Pins required:                               *
 *    D13 -- SCLK   (input override)            *
 *    D12 -- MISO   (user defined output)       *
 *    D11 -- MOSI   (input override)            *
 *    D10 -- SS     (input override)            *
 *    D9  -- READY  (output, active low)        *
 *                                              *
 * -------------------------------------------- *
 * By ZulNs, @Gorontalo, 25 November 2018       *
 * -------------------------------------------- *
 */

#define SCLK_PIN      5
#define MISO_PIN      4
#define MOSI_PIN      3
#define SS_PIN        2
#define READY_PIN     1

#define SLAVE_CODE        'A'
#define MASTER_CODE       'Z'

#define BUFFER_EMPTY      'B'
#define DATA              'D'
#define SEND_ERROR        'E'
#define INIT              'I'
#define MASTER_NOT_READY  'M'
#define ID_REQUEST        'R'
#define END_SENDING       'S'
#define UNKNOWN_COMMAND   'U'

#define enableSPI          (bitSet  (SPCR,  SPE))
#define disableSPI         (bitClear(SPCR,  SPE))
#define setReadyState      (bitClear(PORTB, READY_PIN))
#define setBusyState       (bitSet  (PORTB, READY_PIN))
#define isRxCompleted      (bitRead (SPSR,  SPIF))
#define isSlaveUnselected  (bitRead (PINB,  SS_PIN))
#define isSCLKhigh         (bitRead (PINB,  SCLK_PIN))
#define isRxIncompleted    (!isRxCompleted)
#define isSlaveSelected    (!isSlaveUnselected)
#define isSCLKlow          (!isSCLKhigh)

const char SPI_ID[] = "AS2SPIS";
boolean isData = false;

void setup()
{
  Serial.begin(57600);
  
  DDRB |= bit(MISO_PIN) | bit(READY_PIN);  // define MISO & READY pins to output
  PORTB |= bit(SCLK_PIN) | bit(SS_PIN) | bit(READY_PIN); // set READY pin to busy state and activate SCLK & SS pins pull-up
}

void loop()
{
}

boolean sendToMaster(uint8_t txd, uint8_t * rxd)
{
  SPDR = txd;
  setReadyState;
  while (isRxIncompleted)
  {
    if (isSCLKhigh && isSlaveUnselected)
    {
      setBusyState;
      disableSPI;
      return false;
    }
  }
  setBusyState;
  *rxd = SPDR;
  return true;
}

void serialEvent()
{
  uint8_t chr = Serial.read();
  uint8_t rxd;
  if (isData)
  {
    if (!sendToMaster(chr, &rxd))
    {
      while (Serial.available())
      {
        Serial.read();
      }
      isData = false;
      response(MASTER_NOT_READY);
      return;
    }
    if (rxd != MASTER_CODE)
    {
      disableSPI;
      isData = false;
      response(SEND_ERROR);
    }
    else if (Serial.peek() == -1)
    {
      isData = false;
      response(BUFFER_EMPTY);
    }
  }
  else
  {
    switch (chr)
    {
      case ID_REQUEST:
        Serial.println(SPI_ID);
        break;
      case INIT:
        if (isSCLKlow && isSlaveUnselected)
        {
          enableSPI;
          if (sendToMaster(SLAVE_CODE, &rxd) && rxd == MASTER_CODE)
          {
            response(INIT);
            break;
          }
          else
          {
            disableSPI;
          }
        }
        response(MASTER_NOT_READY);
        break;
      case DATA:
        isData = true;
        break;
      case END_SENDING:
        disableSPI;
        response(END_SENDING);
        break;
      default:
        response(UNKNOWN_COMMAND);
    }
  }
}

void response(char code)
{
  Serial.println(code);
}
