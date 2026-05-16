import pytest

from core.crypto import (
    CryptoError,
    ciphertext_fingerprint,
    decrypt_payload,
    encrypt_payload,
)


def test_round_trip():
    blob = encrypt_payload(b"hello world", "u_alice")
    assert decrypt_payload(blob, "u_alice") == b"hello world"


def test_round_trip_unicode():
    msg = "₹52,000 — tier=Bronze".encode("utf-8")
    blob = encrypt_payload(msg, "u_alice")
    assert decrypt_payload(blob, "u_alice") == msg


def test_wrong_user_fails():
    blob = encrypt_payload(b"secret", "u_alice")
    with pytest.raises(CryptoError):
        decrypt_payload(blob, "u_bob")


def test_tampered_ciphertext_fails():
    blob = encrypt_payload(b"secret", "u_alice")
    version, nonce, ct = blob.split(".", 2)
    flipped = ct[:-2] + ("A" if ct[-2] != "A" else "B") + ct[-1]
    tampered = f"{version}.{nonce}.{flipped}"
    with pytest.raises(CryptoError):
        decrypt_payload(tampered, "u_alice")


def test_unsupported_version():
    with pytest.raises(CryptoError):
        decrypt_payload("v9.aaaa.bbbb", "u_alice")


def test_malformed_blob():
    with pytest.raises(CryptoError):
        decrypt_payload("not-a-blob", "u_alice")


def test_fingerprint_is_stable_for_same_blob():
    blob = encrypt_payload(b"hello", "u_alice")
    assert ciphertext_fingerprint(blob) == ciphertext_fingerprint(blob)


def test_fingerprint_changes_per_encryption():
    a = encrypt_payload(b"hello", "u_alice")
    b = encrypt_payload(b"hello", "u_alice")
    assert ciphertext_fingerprint(a) != ciphertext_fingerprint(b)


def test_nonce_is_random():
    a = encrypt_payload(b"x", "u_alice")
    b = encrypt_payload(b"x", "u_alice")
    assert a != b
