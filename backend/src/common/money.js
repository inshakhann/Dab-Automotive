// All money crossing the API is a decimal string. Arithmetic uses integer paisa.
function toMinor(value) {
  if (typeof value !== "string" || !/^-?[0-9]+(?:\.[0-9]{1,2})?$/.test(value))
    throw new Error("Invalid decimal money value.");
  const negative = value.startsWith("-");
  const [whole, fraction = ""] = value.replace(/^-/, "").split(".");
  const amount = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return negative ? -amount : amount;
}
function fromMinor(value) {
  const negative = value < 0n;
  const n = negative ? -value : value;
  return `${negative ? "-" : ""}${n / 100n}.${String(n % 100n).padStart(2, "0")}`;
}
module.exports = { toMinor, fromMinor };
