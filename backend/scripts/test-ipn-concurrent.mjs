
const IPN_URL = process.env.TEST_IPN_URL;

if (!IPN_URL) {
  throw new Error('Thiếu TEST_IPN_URL');
}

async function sendIpn(name) {
  const start = performance.now();

  const response = await fetch(IPN_URL);
  const result = await response.json();

  return {
    request: name,
    httpStatus: response.status,
    rspCode: result.RspCode,
    message: result.Message,
    durationMs: Math.round(performance.now() - start),
  };
}

// Khởi chạy hai request mà không chờ request đầu hoàn tất
const results = await Promise.allSettled([
  sendIpn('IPN A'),
  sendIpn('IPN B'),
]);

for (const result of results) {
  console.log(
    result.status === 'fulfilled'
      ? result.value
      : { error: String(result.reason) },
  );
}
