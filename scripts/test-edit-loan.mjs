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

// Case 1: valid edit returns 200 with the updated loan
async function testValidEdit() {
  const newDate = "2026-08-01";
  const { status, data } = await patchLoan(85, { due_on: newDate });

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
  // due_on may come back as a full ISO timestamp, so just check it starts with the date
  if (!String(data.due_on).startsWith(newDate)) {
    return report(
      "valid edit returns 200",
      false,
      `due_on is ${data.due_on}, expected ${newDate}`
    );
  }
  report("valid edit returns 200 with updated loan", true);
}

// Case 2: invalid body is rejected with 400
async function testInvalidBody() {
  const { status } = await patchLoan(85, { due_on: "banana" });
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
  await testValidEdit();
  await testInvalidBody();
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
