
const baseUrl = 'http://localhost:5000/api';

const customerA = {
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2YjA0OTBmMmI2NDk3NjBmZDRkYTY2MWIiLCJyb2xlIjoiY3VzdG9tZXIiLCJ2ZXIiOjAsImlhdCI6MTc5NTYwMDA3MywiZXhwIjoxNzk1NjAwOTczfQ.R0ZjsgZDYiRFzzgJCB93mgeX0ky60vsExf2mhcKV3G8',
  addressId: '6b04918cb649760fd4da661d',
};

const customerB = {
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2YjA2YWU0M2EzNmRlMDE0NTY2YmNhYTMiLCJyb2xlIjoiY3VzdG9tZXIiLCJ2ZXIiOjAsImlhdCI6MTc5NTU5OTk1MiwiZXhwIjoxNzk1NjAwODUyfQ.I3WN1wM9VQTY9ugr5fAhli49D3pvIcrSWzVSogHwQmc',
  addressId: '6b06ae81a36de014566bcaa5',
};

async function checkout(customer) {
  const response = await fetch(`${baseUrl}/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${customer.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      addressId: customer.addressId,
      paymentMethod: 'cod',
      note: 'Race condition test',
    }),
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

const results = await Promise.allSettled([
  checkout(customerA),
  checkout(customerB),
]);

console.dir(results, { depth: 5 });
