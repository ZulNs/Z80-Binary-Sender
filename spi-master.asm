
;*******************************************
;                                          *
;  Z80 PIO as SPI Master                   *
;                                          *
;  Extended with Slave READY (active low)  *
;                                          *
;  By ZulNs, @Gorontalo, 25 November 2018  *
;                                          *
;*******************************************

; Port B7 as SCLK
; Port B6 as MISO
; Port B5 as MOSI
; Port B4 as SS
; Port B3 as READY

SCLK_pin	equ	7
MISO_pin	equ	6
MOSI_pin	equ	5
SS_pin		equ	4
READY_pin	equ	3
master_code	equ	'Z'
slave_code	equ	'A'
PIO_B_data	equ	81h
PIO_B_cont	equ	83h
PIO_B_mode	equ	0CFh	; mode 3 (bit independent control mode)
PIO_B_dir	equ	4Fh	; Port B7, B5 & B4 to output, Port B6 & B3 to input
scan		equ	05FEh

	org	3F68h
	
	ld	a,90h
	out	(3),a		; PPI Control Word: Port A as input, Port B & Port C as output, both groups are Mode 0
	ld	a,40h
	out	(1),a		; Select decimal point to out to PPI Port B
	ld	a,0ffh
	out	(2),a		; Turn on all Seven Segment cathodes
	
	ld	a,PIO_B_mode
	out	(PIO_B_cont),a
	ld	a,PIO_B_dir
	out	(PIO_B_cont),a
	ld	a,10h
	out	(PIO_B_data),a	; deactivate SS
	
chk_slave:
	call	receive_byte
	ld	a,slave_code
	cp	d
	jr	nz,chk_slave
	
get_length:
	call	receive_byte
	ld	e,d
	call	receive_byte
	xor	a
	cp	e
	jr	nz,get_dest
	cp	d
	jr	nz,get_dest
end_receive:
	ld	a,PIO_B_mode
	out	(PIO_B_cont),a
	ld	a,0FFh
	out	(PIO_B_cont),a
	ld	ix,done_text
	call	scan
	jp	0		; end
get_dest:
	push	de
	call	receive_byte
	ld	l,d
	call	receive_byte
	ld	h,d
	pop	de
get_next_byte:
	push	de
get_next_byte2:
	call	receive_byte
	ld	(hl),d
	inc	hl
	pop	de
	dec	de
	xor	a
	cp	e
	jr	nz,get_next_byte
	cp	d
	jr	nz,get_next_byte
	jr	get_length
	
done_text:
	defb	000h
	defb	000h
	defb	08Fh
	defb	03Dh
	defb	0BDh
	defb	0B3h
	
receive_byte:
	in	a,(PIO_B_data)
	bit	READY_pin,a
	jr	nz,receive_byte
	ld	c,master_code
	
;***************************************
; Send Byte routine
; Input:   C data to transmit
; Output:  D data received
; Destroy: AF BC D
send_byte:
	ld	b,8		; 8-bit to transfer
	xor	a
	out	(PIO_B_data),a  ; activate SS
begin_send:
	set	MOSI_pin,a
	sla	c
	jr	c,send_bit
	res	MOSI_pin,a
send_bit:
	out	(PIO_B_data),a  ; send bit data to MOSI
	in	a,(PIO_B_data)	; get bit data from MISO
	scf
	bit	MISO_pin,a
	jr	nz,save_bit
	ccf
save_bit:
	rl	d		; save received bit data to D register
	set	SCLK_pin,a
	out	(PIO_B_data),a  ; set SCLK low to high
	res	SCLK_pin,a
	out	(PIO_B_data),a  ; set SCLK high to low
	djnz	begin_send
	ld	a,10h
	out	(PIO_B_data),a	; deactivate SS
	ret
;***************************************
