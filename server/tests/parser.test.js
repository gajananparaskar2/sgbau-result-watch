const { parseResultHtml } = require('../src/universities/sgbau/parser');

describe('SGBAU result parser', () => {
  test('detects a "not declared" response', () => {
    const html = '<html><body><p>No Record Found for this roll number.</p></body></html>';
    const parsed = parseResultHtml(html);
    expect(parsed.status).toBe('NOT_DECLARED');
  });

  test('returns UNRECOGNIZED for empty/unexpected HTML rather than guessing', () => {
    const parsed = parseResultHtml('<html><body><p>Welcome to SGBAU</p></body></html>');
    expect(parsed.status).toBe('UNRECOGNIZED');
  });

  test('extracts a declared result with a subjects table', () => {
    const html = `
      <html><body>
        <p>Student Name: JOHN DOE</p>
        <p>Roll No: 25BD310555</p>
        <p>Course: B.Tech</p>
        <p>Branch: Computer Science &amp; Engineering</p>
        <p>Semester: 4</p>
        <p>SGPA: 8.42</p>
        <p>CGPA: 8.31</p>
        <table>
          <tr><th>Subject Code</th><th>Subject</th><th>Credits</th><th>Internal</th><th>External</th><th>Total</th><th>Grade</th><th>GP</th><th>Status</th></tr>
          <tr><td>CS401</td><td>Operating Systems</td><td>4</td><td>18</td><td>60</td><td>78</td><td>A</td><td>9</td><td>PASS</td></tr>
        </table>
      </body></html>`;
    const parsed = parseResultHtml(html);
    expect(parsed.status).toBe('FOUND');
    expect(parsed.data.roll_number).toContain('25BD310555');
    expect(parsed.data.sgpa).toBeCloseTo(8.42);
    expect(parsed.data.subjects.length).toBe(1);
    expect(parsed.data.subjects[0].subject_code).toBe('CS401');
  });

  test('never fabricates values for missing fields', () => {
    const html = `<html><body><p>Roll No: 25BD310555</p><p>SGPA: 7.5</p></body></html>`;
    const parsed = parseResultHtml(html);
    expect(parsed.status).toBe('FOUND');
    expect(parsed.data.cgpa).toBeNull();
    expect(parsed.data.subjects).toEqual([]);
  });
});
