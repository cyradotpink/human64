# human64
Encoding scheme and javascript implementation for representing arbitrary strings using the base64url charset while preserving as much of the input as possible.

## Project state
It works.

### To do
I would like to
- Properly document how this encoding scheme works and how to implement it (Beyond the basic descriptions of the test strings in test.js)
- Clean up my own implementation (String manipulation gets messy quickly, especially when designing and implementing an encoding scheme at the same time)
- Implement proper compression for the "unsafe part" of the encoder output