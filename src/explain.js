// Optional AI explanation in beginner language. Needs the user's own Anthropic API key (Options page).
// Without a key the popup shows the built-in plain-English notes instead.

export async function explain(apiKey, info, report) {
  const prompt = `You are a patient teacher for a complete beginner investor. Explain this report card in plain English, in under 150 words. Define any jargon. Do not tell them to buy or sell; say what the numbers mean and what to check next.

Instrument: ${info.name} (${info.symbol}), ${info.type}
Investor risk comfort: ${report.profile}
Overall score: ${report.overall}/100 (${report.verdict}), confidence ${report.confidence}/100
${Object.values(report.pillars).map((p) => `${p.title} ${p.score}/100: ${p.notes.join(' ')}`).join('\n')}
Limits: ${report.caveats.join(' ')}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: 'claude-haiku-5-5', max_tokens: 400, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(`AI explanation failed (HTTP ${res.status}). Check your API key in Options.`);
  const data = await res.json();
  return data.content.map((b) => b.text || '').join('');
}
