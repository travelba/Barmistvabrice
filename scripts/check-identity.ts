import assert from "node:assert/strict";
import { applyMrz } from "../src/lib/identity-mrz";
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

console.log("identity checks ok");
