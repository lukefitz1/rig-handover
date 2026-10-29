import type { DigestRow } from '../digest/types.js';

function ownerCell(owner: string | null) {
  return owner ?? '—';
}

function rowMarked(row: DigestRow): boolean {
  return row.retries >= 3 || row.lastStatus === 'fail';
}

export function DigestPage({
  night,
  rows,
  empty,
}: {
  night: string;
  rows: DigestRow[];
  empty: boolean;
}) {
  const sorted = [...rows].sort((a, b) => a.job.localeCompare(b.job));
  return (
    <>
      <h1>digest · {night}</h1>
      {empty ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last</th>
              <th>error</th>
              <th>first</th>
              <th>last at</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr class={rowMarked(row) ? 'warn' : undefined}>
                <td>{row.job}</td>
                <td>{ownerCell(row.owner)}</td>
                <td>{row.runs}</td>
                <td>{row.retries}</td>
                <td class={rowMarked(row) ? 'warn' : undefined}>{row.lastStatus}</td>
                <td>{row.lastError ?? '—'}</td>
                <td>{row.firstAt}</td>
                <td>{row.lastAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
