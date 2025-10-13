
// dom refs
const tableBody = document.querySelector("#customersTable tbody");
const form = document.getElementById("addCustomerForm");
const searchInput = document.getElementById("searchInput");
const modal = new bootstrap.Modal(document.getElementById("customerModal"));
const modalBody = document.getElementById("modalBody");
const collectModalEl = document.getElementById("collectModal");
const collectModal = new bootstrap.Modal(collectModalEl);
const markPaidBtn = document.getElementById("markPaidBtn");
const pickupDateInput = document.getElementById("pickupDate");

const clothesModalEl = document.getElementById("clothesModal");
const clothesModal = new bootstrap.Modal(clothesModalEl);
const saveClothesBtn = document.getElementById("saveClothesBtn");
const collectedItemsInput = document.getElementById("collectedItems");
const collectedDescInput = document.getElementById("collectedDesc");
const collectedDateInput = document.getElementById("collectedDate");
let currentClothesCustomerId = null;

const paymentModalEl = document.getElementById("paymentModal");
const paymentModal = new bootstrap.Modal(paymentModalEl);
const savePaymentBtn = document.getElementById("savePaymentBtn");












const API_URL = "https://pastorpal-laundry-6.onrender.com/customers"
let currentCustomerId = null;         // for view/edit/collect
let currentPaymentCustomerId = null;  // for add-payment modal








// helper to escape values used in attributes
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
























// LOAD and render rows
async function loadCustomers() {
  try {
    const res = await fetch(API_URL);
    let customers = await res.json();

    const filter = (searchInput.value || "").toLowerCase().trim();
    if (filter) {
      customers = customers.filter(c =>
        (c.name || "").toLowerCase().includes(filter) ||
        (c.phone || "").includes(filter) ||
        (c.description || "").toLowerCase().includes(filter)
      );
    }

    tableBody.innerHTML = "";
    customers.forEach(c => {
      const dateStamp = c.date || (new Date()).toLocaleString();

      const today =new Date();
      if(c.agreedDate){
        const agreed = new Date(c.agreedDate);
        if(c.status === "Pending" && agreed < today){
          c.overdue=true;
        }else{
          c.overdue=false;
        }
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${dateStamp}</td>
        <td>${escapeHtml(c.phone)}</td>
        <td>${escapeHtml(c.name)}</td>
        <td>${escapeHtml(c.description)}</td>
        <td>${c.totalItems ?? ''}</td>
        <td>${c.totalAmount ?? ''}</td>
        <td><span class="badge-status $ {c.status==='Collected'?'bg-success':c.overdue?'bg-danger':'bg-warning'}">${c.overdue && c.status==='Pending'?'Overdue':escapeHtml(c.status)}</span></td>
        <td>
           ${c.status==='Pending' ? `<button class="btn btn-sm btn-success mb-1" data-action="collect" data-id="${c.id}">Mark Collected</button>` : ''}
          <button class="btn btn-sm btn-info mb-1 view-btn" data-id="${c.id}">View</button>
          <button class="btn btn-sm btn-warning mb-1 edit-btn" data-id="${c.id}">Edit</button>
          <button class="btn btn-sm btn-danger mb-1 delete-btn" data-id="${c.id}">Delete</button>
          <button class="btn btn-sm btn-primary mb-1 add-payment-btn" data-id="${c.id}">Add Payment</button>
          <button class="btn btn-sm btn-success mb-1 btn-whatsapp" data-phone="${escapeHtml(c.phone)}" data-name="${escapeHtml(c.name)}">WhatsApp</button>
          <button class="btn btn-sm btn-dark mb-1 clothes-btn" data-id="${c.id}">Clothes</button>
        </td>
      `;
      tableBody.appendChild(tr);
      if(c.overdue && c.status==="Pending"){
        tr.style.backgroundColor="#ffe5e5"; // light red for overdue
      }
    });
  } catch (err) {
    console.error("Failed to load customers:", err);
  }
}
















//    VIEW DETAILS

// show details in modal, include payments and paid status
async function viewDetails(id) {
  try {
    const res = await fetch(`${API_URL}/${id}`);
    if (!res.ok) throw new Error("Failed to fetch customer");
    const c = await res.json();

    // payments list HTML
    const payments = (c.payments || []);
    const paymentsHtml = payments.length ? payments.map(p => `<li>${escapeHtml(p.method)} — ₦${p.amount} (${escapeHtml(p.date)})</li>`).join('') : '<li>No payments yet</li>';
    const totalPaid = (c.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const balance = Math.max((Number(c.totalAmount) || 0) - totalPaid);
    const clothes = (c.clothesLog || []);
const clothesHtml = clothes.length
? clothes.map(cl => `<li>${cl.num} — ${escapeHtml(cl.desc)} (${cl.date})</li>`).join('')
: '<li>No clothes collected yet</li>';
    

    modalBody.innerHTML = `
      <p><strong>Name:</strong> ${escapeHtml(c.name)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(c.phone)}</p>
      <p><strong>Description:</strong> ${escapeHtml(c.description)}</p>
      <p><strong>No. of Cloths:</strong> ${c.totalItems ?? ''}</p>
      <p><strong>Total Amount:</strong> ₦${c.totalAmount ?? ''}</p>
      <p><strong>Total Paid:</strong> ₦${totalPaid}</p>
      <p><strong>Balance:</strong> ₦${balance}</p>
      <p><strong>Status:</strong> ${escapeHtml(c.status)}</p>
      <p><strong>Agreed Date:</strong> ${c.agreedDate || 'N/A'}</p>
      <p><strong>Overdue:</strong> ${c.overdue ? 'Yes ❌ (Past Due)' : 'No ✅'}</p>
      <p><strong>Special Instruction:</strong> ${escapeHtml(c.instruction || 'N/A')}</p>
      <p><strong>Pickup Date:</strong> ${c.pickupDate || 'N/A'}</p>
      <p><strong>Paid:</strong> ${c.paid ? 'Yes ✅' : 'No ❌'}</p>
      <hr>
      <p><strong>Payments:</strong></p>
      <p><strong>Remaining Clothes:</strong> ${c.remaining ?? c.totalItems}</p>
    <hr>
    <p><strong>Clothes Log:</strong></p>
  <ul>${clothesHtml}</ul>
    <hr>
  <p><strong>Payments:</strong></p>
      <ul>${paymentsHtml}</ul>
    `;
    modal.show();
  } catch (err) {
    console.error("viewDetails error:", err);
    alert("Could not load details (see console).");
  }
}


























// COLLECT MODAL
// open collect modal for a customer (does NOT set paid=true)
function openCollectModal(id) {
  currentCustomerId = id;
  pickupDateInput.value = new Date().toISOString().split("T")[0];
  collectModal.show();
}



















// MARK collected (no auto-paid)

markPaidBtn.addEventListener("click", async () => {
  if (!currentCustomerId) return;
  const date = pickupDateInput.value;
  await fetch(`${API_URL}/${currentCustomerId}`, {
    method: "PATCH",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ status: "Collected", pickupDate: date })
  });
  collectModal.hide();
  loadCustomers();
});





















//EDIT CUSTOMER
// edit quick prompt
async function editCustomer(id) {
  try {
    const res = await fetch(`${API_URL}/${id}`);
    if (!res.ok) throw new Error("Failed to fetch");
    const customer = await res.json();

    const newDescription = prompt("Update description:", customer.description);
    if (newDescription === null) return;
    const newTotalItems = Number(prompt("Update Total Items:", customer.totalItems));
    if (isNaN(newTotalItems)) return alert("Invalid number for items.");
    const newTotalAmount = Number(prompt("Update Total Amount:", customer.totalAmount));
    if (isNaN(newTotalAmount)) return alert("Invalid number for amount.");

    await fetch(`${API_URL}/${id}`, {
      method: "PATCH",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ description: newDescription, totalItems: newTotalItems, totalAmount: newTotalAmount })
    });
    loadCustomers();
  } catch (err) {
    console.error("editCustomer error:", err);
    alert("Could not edit (see console).");
  }
}
































//OPEN PAYMENT MODAL

// open payment modal for a specific customer
function openPaymentModal(id) {
  currentPaymentCustomerId = id;
  document.getElementById("paymentMethod").value = "";
  document.getElementById("paymentAmount").value = "";
  document.getElementById("paymentDate").value = new Date().toISOString().split("T")[0];
  paymentModal.show();
}


























//SAVE CLOTHES

saveClothesBtn.addEventListener("click", async () => {
if (!currentClothesCustomerId) return;
const num = Number(collectedItemsInput.value);
const desc = collectedDescInput.value.trim();
const date = collectedDateInput.value || new Date().toISOString().split("T")[0];

if (!num || isNaN(num) || num <= 0) {
alert("Enter valid number of clothes.");
return;
}

try {
const res = await fetch(`${API_URL}/${currentClothesCustomerId}`);
const customer = await res.json();

customer.clothesLog = customer.clothesLog || [];
customer.clothesLog.push({ num, desc, date });

// update remaining clothes
const totalCollected = customer.clothesLog.reduce((s, l) => s + l.num, 0);
const remaining = (customer.totalItems || 0) - totalCollected;

await fetch(`${API_URL}/${currentClothesCustomerId}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ clothesLog: customer.clothesLog, remaining })
});

clothesModal.hide();
loadCustomers();
alert("Clothes log saved.");
} catch (err) {
console.error("Save clothes error:", err);
alert("Could not save clothes log.");
}
});











































//   SAVE PAYMENT
// save payment and update customer's payments array + paid flag if total covered
savePaymentBtn.addEventListener("click", async () => {
  if (!currentPaymentCustomerId) {
    alert("No customer selected for payment.");
    return;
  }
  const method = document.getElementById("paymentMethod").value.trim();
  const amount = Number(document.getElementById("paymentAmount").value);
  const date = document.getElementById("paymentDate").value || new Date().toISOString().split("T")[0];

  if (!method || !amount || isNaN(amount) || amount <= 0) {
    alert("Please enter a valid method and amount.");
    return;
  }

  try {
    // fetch customer
    const res = await fetch(`${API_URL}/${currentPaymentCustomerId}`);
    if (!res.ok) throw new Error("Failed to load customer");
    const customer = await res.json();

    // add payment
    customer.payments = customer.payments || [];
    customer.payments.push({ method, amount, date });

    // compute total paid so far
    const totalPaid = (customer.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const paidFlag = (customer.totalAmount && !isNaN(customer.totalAmount)) ? (totalPaid >= Number(customer.totalAmount)) : totalPaid > 0;

    // patch back payments and paid flag
    const patchRes = await fetch(`${API_URL}/${currentPaymentCustomerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payments: customer.payments, paid: paidFlag })
    });

    if (!patchRes.ok) throw new Error("Failed to save payment");

    paymentModal.hide();
    loadCustomers();
    alert("Payment saved.");
  } catch (err) {
    console.error("savePayment error:", err);
    alert("Could not save payment (see console).");
  }
});

































// DELETE PROMPT/CUSTOMER

// delete with passcode prompt (delegated handler will call this)
async function deleteCustomer(id) {
  const passcode = "1234"; // your hardcoded passcode
  const input = prompt("Enter passcode to delete this customer:");
  if (input === passcode) {
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      alert("✅ Customer deleted successfully!");
      loadCustomers();
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Delete failed (see console).");
    }
  } else {
    alert("❌ Incorrect passcode. Customer not deleted.");
  }
}





































// ADD NEW CUSTOMER

// Add new customer
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const description = document.getElementById("description").value.trim();
  const totalItems = Number(document.getElementById("totalItems").value);
  const totalAmount = Number(document.getElementById("totalAmount").value);
  const instruction = document.getElementById("instruction").value;
  const agreedDate = document.getElementById("agreedDate").value;

const newCustomer = {
id: Date.now().toString(),
date: new Date().toLocaleString(),
name, phone, description,
totalItems, totalAmount,
instruction,
agreedDate,        // ✅ Save the agreed date
status: "Pending",
paid: false,
overdue: false,    // ✅ track overdue
payments: []
};

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCustomer)
    });
    if (!res.ok) throw new Error("Create failed");
    form.reset();
    loadCustomers();
  } catch (err) {
    console.error("Add customer error:", err);
    alert("Could not add customer (see console).");
  }
});


















































// delegated click handler for the table (view / edit / delete / whatsapp / add-payment / collect)
tableBody.addEventListener("click", function (e) {
  const btn = e.target.closest("button");
  if (!btn) return;
  // dataset.id holds the id set when rendering
  const id = btn.dataset.id;

  if (btn.classList.contains("view-btn")) {
    viewDetails(id);
    return;
  }
  if (btn.classList.contains("edit-btn")) {
    editCustomer(id);
    return;
  }
  if (btn.classList.contains("delete-btn")) {
    deleteCustomer(id);
    return;
  }
  if (btn.classList.contains("add-payment-btn")) {
    openPaymentModal(id);
    return;
  }
  if (btn.classList.contains("clothes-btn")) {
    currentClothesCustomerId = id;
    collectedItemsInput.value = "";
    collectedDescInput.value = "";
    collectedDateInput.value = new Date().toISOString().split("T")[0];
    clothesModal.show();
    return;
  }
  if (btn.dataset.action === "collect") {
    openCollectModal(id);
    return;
  }
  if (btn.classList.contains("btn-whatsapp")) {
    const phone = btn.dataset.phone;
    const name = btn.dataset.name;
    const choice = prompt("Type:\n1 - Clothes Ready\n2 - Clothes Collected\n3 - Custom Message");
    let message = "";
    if (choice === "1") message = `Hello ${name}, your clothes are ready for pickup. Thank you for choosing PASTOR PAL Laundry!`;
    else if (choice === "2") message = `Hello ${name}, your clothes have been marked as collected. Thank you!`;
    else if (choice === "3") message = prompt("Enter your custom message:") || "";
    if(choice === "4")message=`Hello ${name}, this is a reminder that your laundry is ready and overdue for pickup. Kindly Collect it Soon.`
    else { alert("Cancelled."); return; }
    sendWhatsApp(phone, message);
    return;
  }
  
});





































//WHATSAPP
// whatsapp opener
function sendWhatsApp(rawPhone, message) {
  let phone = (rawPhone || "").replace(/\s|[\(\)\-\.]/g, "");
  phone = phone.replace(/^\+/, "");
  if (/^0\d{9,}$/.test(phone)) phone = "234" + phone.slice(1);
  if (!/^\d{7,15}$/.test(phone)) { alert("Invalid phone format. Use international format like 2348012345678."); return; }
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}








// search live
searchInput.addEventListener("input", loadCustomers);





// initial
loadCustomers();







// expose (useful if something else calls them)
window.openCollectModal = openCollectModal;
window.viewDetails = viewDetails;
window.editCustomer = editCustomer;
