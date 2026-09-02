async function main() {
  const movement = {
    bottleTypeId: 1, 
    quantity: 2,
    type: 'CUSTOMER_BORROW',
    customerId: 1, 
    description: 'test'
  };

  console.log("Posting movement:", movement);
  let res;
  try {
    res = await fetch('http://localhost:3001/api/bottles/movement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(movement)
    });
    console.log("Movement Response:", await res.json());
  } catch (e) {
    console.log("Error posting:", e.message);
  }

  const resCust = await fetch('http://localhost:3001/api/customers');
  const customers = await resCust.json();
  
  const c = customers.find(c => c.id === 1);
  console.log("Customer 1:", JSON.stringify(c, null, 2));
}

main().catch(console.error);
