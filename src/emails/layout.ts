export type EmailContent = { subject: string; text: string; html: string };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type EmailBlock = { kind: "paragraph"; text: string } | { kind: "button"; label: string; url: string } | { kind: "note"; text: string };

export function renderEmail(subject: string, heading: string, blocks: EmailBlock[]): EmailContent {
  const htmlBlocks = blocks
    .map((block) => {
      if (block.kind === "button") {
        return `<p style="margin:24px 0"><a href="${escapeHtml(block.url)}" style="display:inline-block;background:#0d5c63;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:6px">${escapeHtml(block.label)}</a></p>`;
      }
      if (block.kind === "note") {
        return `<p style="margin:16px 0 0;color:#5b6470;font-size:13px;line-height:1.5">${escapeHtml(block.text)}</p>`;
      }
      return `<p style="margin:0 0 12px;line-height:1.6">${escapeHtml(block.text)}</p>`;
    })
    .join("");

  const html = `<!doctype html><html lang="bg"><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#15191e">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e1e4e8;border-radius:8px">
<tr><td style="padding:20px 28px;border-bottom:1px solid #e1e4e8;font-size:20px;font-weight:700">Mobi<span style="color:#0d5c63">Ted</span></td></tr>
<tr><td style="padding:24px 28px 28px;font-size:15px">
<h1 style="font-size:19px;margin:0 0 16px">${escapeHtml(heading)}</h1>${htmlBlocks}
</td></tr></table>
<p style="color:#8a929c;font-size:12px;margin:16px 0 0">MobiTed - автомобили и авто обяви в България</p>
</td></tr></table></body></html>`;

  const text = [
    heading,
    "",
    ...blocks.map((block) => (block.kind === "button" ? `${block.label}: ${block.url}` : block.text)),
    "",
    "MobiTed",
  ].join("\n");

  return { subject, text, html };
}
