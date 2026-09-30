import assert from "node:assert/strict";
import { applyMrz, normalizeVisualFields } from "../src/lib/identity-mrz";
import { emptyIdentityFields, pickManifestTarget } from "../src/lib/identity-manifest";

const visual = emptyIdentityFields();
visual.lastName = "Ériksson";
visual.firstName = "Anna Maria";
visual.placeOfBirth = "Paris";

const read = applyMrz(visual, [
  "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<",
  "L898902C36UTO7408122F1204159ZE184226B<<<<<10",
]);

assert.equal(read.fields.docNumber, "L898902C3");
assert.equal(read.fields.sex, "F");
assert.equal(read.fields.nationality, "UTO");
assert.equal(read.fields.docType, "PP");
assert.equal(read.fields.dateOfBirth, "1974-08-12");
assert.equal(read.fields.expiryDate, "2012-04-15");
assert.equal(read.fields.lastName, "Ériksson");
assert.equal(read.fields.placeOfBirth, "Paris");
assert.equal(read.warnings.includes("name_mismatch"), false);

const mismatch = applyMrz({ ...visual, lastName: "Erikson" }, [
  "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<",
  "L898902C36UTO7408122F1204159ZE184226B<<<<<10",
]);
assert.equal(mismatch.fields.lastName, "Erikson");
assert.ok(mismatch.warnings.includes("name_mismatch"));

const rows = [
  { rowNumber: 7, numberCell: "1", lastName: "A", firstName: "A", dateOfBirth: "01/01/1990", docNumber: "AAA" },
  { rowNumber: 8, numberCell: "2", lastName: "", firstName: "", dateOfBirth: "", docNumber: "" },
  { rowNumber: 9, numberCell: "3", lastName: "B", firstName: "B", dateOfBirth: "02/02/1991", docNumber: "BBB" },
];
assert.deepEqual(pickManifestTarget(rows, "bbb"), { rowNumber: 9, numberToWrite: null });
assert.deepEqual(pickManifestTarget(rows, "NEW"), { rowNumber: 8, numberToWrite: null });
assert.deepEqual(pickManifestTarget([rows[0], rows[2]], "NEW"), {
  rowNumber: 10,
  numberToWrite: "4",
});
assert.deepEqual(
  pickManifestTarget(rows, "AUTRE", { lastName: "b", firstName: "B", dateOfBirth: "1991-02-02" }),
  { rowNumber: 9, numberToWrite: null },
);

const card = normalizeVisualFields({
  sex: "Féminin",
  lastName: "Martin",
  firstName: "Maëlys",
  dateOfBirth: "13 07 1990",
  placeOfBirth: "Paris",
  docType: "Carte nationale d'identité",
  docNumber: "X4RTBPFW4",
  nationality: "Française",
  expiryDate: "02 01 2031",
});
assert.equal(card.sex, "F");
assert.equal(card.docType, "CNI");
assert.equal(card.nationality, "FRA");
assert.equal(card.dateOfBirth, "1990-07-13");
assert.equal(card.expiryDate, "2031-01-02");
assert.equal(card.docNumber, "X4RTBPFW4");

function checkDigit(input: string): string {
  let code = 0;
  const factors = [7, 3, 1];
  for (let i = 0; i < input.length; i++) {
    let charCode = input.charCodeAt(i);
    if (charCode === 60) charCode = 0;
    else if (charCode >= 65) charCode -= 55;
    else charCode -= 48;
    code += charCode * factors[i % 3];
  }
  return String(code % 10);
}

const frenchLine1 = `${"IDFRA"}${"MARTIN".padEnd(25, "<")}750000`;
const frenchPrefix = "210312345678";
const frenchBirth = "900713";
const frenchBody =
  frenchPrefix +
  checkDigit(frenchPrefix) +
  "CORINNE".padEnd(14, "<") +
  frenchBirth +
  checkDigit(frenchBirth) +
  "F";
const frenchLine2 = frenchBody + checkDigit(frenchLine1 + frenchBody);
const french = applyMrz(
  normalizeVisualFields({ ...emptyIdentityFields(), expiryDate: "12 03 2031", placeOfBirth: "Lyon" }),
  [frenchLine1, frenchLine2],
);
assert.equal(frenchLine1.length, 36);
assert.equal(frenchLine2.length, 36);
assert.equal(french.fields.docType, "CNI");
assert.equal(french.fields.nationality, "FRA");
assert.equal(french.fields.sex, "F");
assert.equal(french.fields.dateOfBirth, "1990-07-13");
assert.equal(french.fields.docNumber, "210312345678");
assert.equal(french.fields.expiryDate, "2031-03-12");
assert.equal(french.fields.lastName, "MARTIN");
assert.equal(french.warnings.includes("mrz_invalid"), false);

const td1 = applyMrz(emptyIdentityFields(), [
  "I<UTOD23145890<1233<<<<<<<<<<<",
  "7408122F1204159UTO<<<<<<<<<<<2",
  "ERIKSSON<<ANNA<MARIA<<<<<<<<<<",
]);
assert.equal(td1.fields.docType, "CNI");
assert.equal(td1.fields.docNumber, "D23145890123");
assert.equal(td1.fields.nationality, "UTO");
assert.equal(td1.fields.dateOfBirth, "1974-08-12");
assert.equal(td1.fields.expiryDate, "2012-04-15");
assert.equal(td1.fields.lastName, "ERIKSSON");

const brokenComposite = applyMrz(emptyIdentityFields(), [
  "I<UTOD23145890<1233<<<<<<<<<<<",
  "7408122F1204159UTO<<<<<<<<<<<0",
  "ERIKSSON<<ANNA<MARIA<<<<<<<<<<",
]);
assert.equal(brokenComposite.fields.docNumber, "D23145890123");
assert.equal(brokenComposite.fields.dateOfBirth, "1974-08-12");
assert.ok(brokenComposite.warnings.includes("mrz_invalid"));

console.log("identity checks ok");
