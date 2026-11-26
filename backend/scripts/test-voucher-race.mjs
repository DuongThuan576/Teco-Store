
const API_URL = 'http://localhost:5000/api/orders';

const tokenA = process.env.TOKEN_A;
const tokenB = process.env.TOKEN_B;
const addressA = process.env.ADDRESS_A;
const addressB = process.env.ADDRESS_B;

if (!tokenA || !tokenB || !addressA || !addressB) {
  throw new Error('Thiếu thông tin test');
}

async function checkout(name, token, addressId) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      addressId,
      paymentMethod: 'cod',
      voucherCode: 'RACETEST01',
    }),
  });

  return {
    customer: name,
    status: response.status,
    body: await response.json(),
  };
}

const results = await Promise.allSettled([
  checkout('Customer A', tokenA, addressA),
  checkout('Customer B', tokenB, addressB),
]);

for (const result of results) {
  console.log(JSON.stringify(result, null, 2));
}
