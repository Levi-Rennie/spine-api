// scripts/test-edit-loan.mjs
// Failing-first test for PATCH /items/:id (edit loan due date)
// Run with: node scripts/test-edit-loan.mjs (spine-api must be running on :3000)

const BASE = "http://localhost:3000";

let failures = 0;

function report(name, passed, detail) {
  if (passed) {
    console.log(`PASS  ${name}`);
  } else {
    failures++;
    console.log(`FAIL  ${name} — ${detail}`);
  }
}

async function patchLoan(id, body) {
  const res = await fetch(`${BASE}/items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // no JSON body, that's fine for some cases
  }
  return { status: res.status, data };
}

// Setup: create a loan to edit, so the test doesn't depend on existing data
async function createTestLoan() {
  const res = await fetch(`${BASE}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      member_id: 17,
      book_title: "Test Loan (edit script)",
      borrowed_on: "2026-07-01",
      due_on: "2026-07-21",
    }),
  });
  if (res.status !== 201 && res.status !== 200) {
    throw new Error(`Setup failed: could not create test loan (status ${res.status})`);
  }
  const loan = await res.json();
  return loan.loan_id;
}

// Case 1: valid edit returns 200 with the updated loan
async function testValidEdit(loanId) {
  const newDate = "2026-08-01";
  const { status, data } = await patchLoan(loanId, { due_on: newDate });

  if (status !== 200) {
    return report("valid edit returns 200", false, `got status ${status}`);
  }
  if (!data || data.due_on === undefined) {
    return report(
      "valid edit returns 200",
      false,
      "response has no due_on field"
    );
  }
  // due_on comes back as a JS Date serialized to UTC (pg parses DATE columns
  // as local midnight). Compare the date in local time, same as the UI does.
  const d = new Date(data.due_on);
  const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (localDate !== newDate) {
    return report(
      "valid edit returns 200",
      false,
      `due_on is ${data.due_on} (local ${localDate}), expected ${newDate}`
    );
  }
  report("valid edit returns 200 with updated loan", true);
}

// Case 2: invalid body is rejected with 400
async function testInvalidBody(loanId) {
  const { status } = await patchLoan(loanId, { due_on: "banana" });
  report(
    "invalid due_on returns 400",
    status === 400,
    `got status ${status}`
  );
}

// Case 3: nonexistent loan returns 404
async function testMissingLoan() {
  const { status } = await patchLoan(99999, { due_on: "2026-08-01" });
  report(
    "nonexistent loan returns 404",
    status === 404,
    `got status ${status}`
  );
}

try {
  const loanId = await createTestLoan();
  console.log(`(setup: created test loan ${loanId})\n`);
  await testValidEdit(loanId);
  await testInvalidBody(loanId);
  await testMissingLoan();
} catch (err) {
  console.error("Could not reach the API — is spine-api running on :3000?");
  console.error(err.message);
  process.exit(1);
}

if (failures > 0) {
  console.log(`\n${failures} case(s) failing`);
  process.exitCode = 1;
} else {
  console.log("\nAll cases passing ✓");
}
