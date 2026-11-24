import { buildSeed } from "../lib/seed";

const state = buildSeed();
for (const product of state.products) {
  console.log(`${product.sku}\t${product.quantity}`);
}
console.log("---");
console.log("sales", state.sales.length);
console.log("purchases", state.purchases.length);
console.log("movements", state.stockMovements.length);
console.log("activities", state.activities.length);
console.log("customers", state.customers.length);
console.log("suppliers", state.suppliers.length);
