import CryptoJS from 'crypto-js';
import polyline from '@mapbox/polyline';

const PRIVACY_KEY = 'tudou_run_map_privacy_key';
const ciphertext = "U2FsdGVkX1942Z2dCbjXYBYoE9+DyIgVEbPSaTIaewwe72wvQj2/Rh3BS2VwaQfP1SeuuCDRmY4lTrYYKBftjTBRfwVRGOWUbLF5M3XbkIzEfz8EnbmfK821+0MF4Gfr4kW8AvF0mbFnM+3X3STZjYNSaSufYCOlvn3oey2DyrXvFFNSEFCJlICeIJy7Ca+rarGM3yR/WQDVC5cR2IYMW3hd+GzrhkUocW9LyhlWLuPJoZl42RZJqqm/NdPnwdpAPOL5zln+0XmjKaH5pv0D3Rq5WVrof/a625Rwyab+VZEf9aW56HPe0J1FkC78EEzNWcJPLyYJB7APVXSHqMQKphtbmBGAl0a670IUqdWNX3BeRu/IHPAurhRWi4kJIGhs3ZOIgablO8FMg1qTmmiXmj6ocHRm1VzmHHSD2yyA+pPbTItyeRMpvdKudjiquUKS5SoXA+l7YDhX69L4elOq26QMIDmxuo3R2bd+ULJojfJnGx73EcNQ5lsmQXP3HlaApSVjjQ81oRahf5EKVF4Kgzje4YUfZeGwqIz5Q9BuEbfUsk52FPBn78Mde1MimptSC/+VSLF0/22cSjUu4Zao2xaahgDO5Z745RBQBQw/+1OsOfIGmqGl70gA/swJOhEZNqjjA5V702ZOx6SvO/NdCySqL/X4y7EO8O0KXq9xwItHJf1P/xwJnUCE6trg+eDJXjsqHg1T3gqEDeMyIm4DOIq234wzDStjF3x1zhrxcSrAscDgMfhFbjjUlO+q41XaTmODXsUglBAe2d2kVGje3CYX43DBhnNyqqOcYuGS3fpVyHgIC2ALb0myZwZcn2Ehicnsihfi1Yb29ppWWPjaTXNeAZ0x9tT6cRdWI46APXb/nMqFWRHRGpJ2/hpiZM1y+mLCJ3r2/dd5v/107pToOKn2c1vX9XO/09jPVTZKL6d6Kl+kr3Ks5uPCKKCDFiN5UWaZej3nAyWtuM1TEFNEzw32niEQ8ArkBekhhzL8qHd/8MtoNITBBGRxf3ydgl/o9tUlHLKghfG1CwCo1CVNz/pZJvUa3A4BNQ2v5LZB0rzURuuxJnARk57i63/9HodriIup/rp5suoTsCt5lgC1eYKNCl/yEkAUFpvVFk9dtXW3RnbRPc7cg+1XVjfJIxU65q0RVIN+9uzd2eNkLRHQbw==";

try {
    console.log("Attempting decryption...");
    const bytes = CryptoJS.AES.decrypt(ciphertext, PRIVACY_KEY);
    console.log("Bytes sig bytes:", bytes.sigBytes);

    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    console.log("Decrypted length check:", decrypted.length);
    // Log hex of first few characters to debug encoding
    // console.log("Hex snippet:", Buffer.from(decrypted).toString('hex').substring(0, 50));

    if (decrypted.length > 0) {
        if (decrypted.startsWith("?")) {
            console.log("WARNING: Decrypted string starts with '?' - bad encoding likely.");
        }

        const decoded = polyline.decode(decrypted);
        console.log("Decoded points count:", decoded.length);
        console.log("First point:", decoded[0]);
    } else {
        console.log("Decrypted string is empty.");
    }
} catch (e) {
    console.error("Error:", e);
}
