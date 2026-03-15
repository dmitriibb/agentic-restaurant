package domain

import (
	"crypto/rand"
	"encoding/binary"
	"sync"
	"time"
)

const crockfordBase32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

var (
	ulidMu   sync.Mutex
	ulidPrev uint64
)

// NewULID generates a new ULID string (26 characters, Crockford Base32).
func NewULID() string {
	now := uint64(time.Now().UnixMilli())

	ulidMu.Lock()
	if now <= ulidPrev {
		now = ulidPrev + 1
	}
	ulidPrev = now
	ulidMu.Unlock()

	var buf [16]byte
	// Timestamp: 6 bytes (48 bits) big-endian
	buf[0] = byte(now >> 40)
	buf[1] = byte(now >> 32)
	buf[2] = byte(now >> 24)
	buf[3] = byte(now >> 16)
	buf[4] = byte(now >> 8)
	buf[5] = byte(now)

	// Randomness: 10 bytes
	var rnd [10]byte
	if _, err := rand.Read(rnd[:]); err != nil {
		// Fallback: use timestamp-based entropy (should never happen)
		binary.BigEndian.PutUint64(rnd[:8], now)
	}
	copy(buf[6:], rnd[:])

	// Encode 16 bytes (128 bits) into 26 Crockford Base32 characters
	return encode(buf)
}

func encode(b [16]byte) string {
	out := make([]byte, 26)
	// Encode timestamp (48 bits = 10 chars)
	out[0] = crockfordBase32[(b[0]&224)>>5]
	out[1] = crockfordBase32[b[0]&31]
	out[2] = crockfordBase32[(b[1]&248)>>3]
	out[3] = crockfordBase32[((b[1]&7)<<2)|((b[2]&192)>>6)]
	out[4] = crockfordBase32[(b[2]&62)>>1]
	out[5] = crockfordBase32[((b[2]&1)<<4)|((b[3]&240)>>4)]
	out[6] = crockfordBase32[((b[3]&15)<<1)|((b[4]&128)>>7)]
	out[7] = crockfordBase32[(b[4]&124)>>2]
	out[8] = crockfordBase32[((b[4]&3)<<3)|((b[5]&224)>>5)]
	out[9] = crockfordBase32[b[5]&31]
	// Encode randomness (80 bits = 16 chars)
	out[10] = crockfordBase32[(b[6]&248)>>3]
	out[11] = crockfordBase32[((b[6]&7)<<2)|((b[7]&192)>>6)]
	out[12] = crockfordBase32[(b[7]&62)>>1]
	out[13] = crockfordBase32[((b[7]&1)<<4)|((b[8]&240)>>4)]
	out[14] = crockfordBase32[((b[8]&15)<<1)|((b[9]&128)>>7)]
	out[15] = crockfordBase32[(b[9]&124)>>2]
	out[16] = crockfordBase32[((b[9]&3)<<3)|((b[10]&224)>>5)]
	out[17] = crockfordBase32[b[10]&31]
	out[18] = crockfordBase32[(b[11]&248)>>3]
	out[19] = crockfordBase32[((b[11]&7)<<2)|((b[12]&192)>>6)]
	out[20] = crockfordBase32[(b[12]&62)>>1]
	out[21] = crockfordBase32[((b[12]&1)<<4)|((b[13]&240)>>4)]
	out[22] = crockfordBase32[((b[13]&15)<<1)|((b[14]&128)>>7)]
	out[23] = crockfordBase32[(b[14]&124)>>2]
	out[24] = crockfordBase32[((b[14]&3)<<3)|((b[15]&224)>>5)]
	out[25] = crockfordBase32[b[15]&31]
	return string(out)
}
