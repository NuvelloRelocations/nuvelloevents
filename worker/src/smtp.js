import { connect } from "cloudflare:sockets";
import { dotStuff } from "./lib.js";

// Minimal SMTP client: STARTTLS + AUTH LOGIN, then one MAIL/RCPT/DATA per message.
// shortcut: no connection reuse or retries; fine for one registration per request, upgrade if volume grows.
export async function sendMail(config, messages, timeoutMs = 20000) {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("SMTP timed out")), timeoutMs); });
  try {
    return await Promise.race([session(config, messages), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function session({ host, port, user, pass }, messages) {
  const enc = new TextEncoder();
  let socket = connect({ hostname: host, port }, { secureTransport: "starttls" });
  let io = streams(socket);

  const cmd = async (line, expect, label = line.split(" ")[0]) => {
    if (line !== null) await io.writer.write(enc.encode(line + "\r\n"));
    const { code, text } = await io.read();
    if (!expect.includes(code)) throw new Error(`SMTP ${label} failed: ${code} ${text.slice(0, 120)}`);
  };

  try {
    await cmd(null, [220], "greeting");
    await cmd("EHLO nuvello-events", [250]);
    await cmd("STARTTLS", [220]);
    io.release();
    socket = socket.startTls();
    io = streams(socket);
    await cmd("EHLO nuvello-events", [250]);
    await cmd("AUTH LOGIN", [334]);
    await cmd(btoa(user), [334], "AUTH user");
    await cmd(btoa(pass), [235], "AUTH password");
    for (const m of messages) {
      await cmd(`MAIL FROM:<${user}>`, [250]);
      await cmd(`RCPT TO:<${m.to}>`, [250, 251]);
      await cmd("DATA", [354]);
      await cmd(dotStuff(m.raw) + "\r\n.", [250], "message");
    }
    await cmd("QUIT", [221]).catch(() => {});
  } finally {
    await socket.close().catch(() => {});
  }
}

// Reads complete SMTP replies (multi-line replies end with "NNN " instead of "NNN-").
function streams(socket) {
  const reader = socket.readable.getReader();
  const writer = socket.writable.getWriter();
  const dec = new TextDecoder();
  let buf = "";
  return {
    writer,
    async read() {
      for (;;) {
        const lines = buf.split("\r\n");
        const done = lines.findIndex((l) => /^\d{3} /.test(l));
        if (done >= 0) {
          buf = lines.slice(done + 1).join("\r\n");
          const last = lines[done];
          return { code: Number(last.slice(0, 3)), text: last.slice(4) };
        }
        const { value, done: eof } = await reader.read();
        if (eof) throw new Error("SMTP connection closed");
        buf += dec.decode(value, { stream: true });
      }
    },
    release() {
      reader.releaseLock();
      writer.releaseLock();
    },
  };
}
