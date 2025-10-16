
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

// WHATSAPP MODAL ELEMENTS
const whatsappModalEl = document.getElementById("whatsappModal");
const whatsappModal = new bootstrap.Modal(whatsappModalEl);
const whatsappCustomerName = document.getElementById("whatsappCustomerName");
const whatsappMessageType = document.getElementById("whatsappMessageType");
const customMessageDiv = document.getElementById("customMessageDiv");
const customMessageInput = document.getElementById("customMessage");
const sendWhatsappBtn = document.getElementById("sendWhatsappBtn");

let currentCustomerId = null;
let currentPaymentCustomerId = null;
let currentWhatsappPhone = null;
let currentWhatsappName = null;

// ✅ Utility: safely parse JSON or return fallback
function safeParseJSON(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (!value) return fallback;
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

// helper to escape values used in attributes
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// LOAD and render rows
// LOAD CUSTOMERS
async function loadCustomers() {
  try {
    const { data: customers, error } = await supabase
    .from('customers')
    .select('*');

    if (error) throw error;

    const filter = searchInput.value.trim().toLowerCase();
    let filtered = customers;
    if (filter) {
      filtered = customers.filter(
        c =>
          (c.name && c.name.toLowerCase().includes(filter)) ||
          (c.phone && c.phone.toLowerCase().includes(filter)) ||
          (c.description && c.description.toLowerCase().includes(filter))
      );
    }

    tableBody.innerHTML = "";
    filtered.forEach(c => {
      const dateStamp = c.date || new Date().toLocaleString();
      const today = new Date();
      if (c.agreedDate) {
        const agreed = new Date(c.agreedDate);
        c.overdue = c.status === "Pending" && agreed < today;
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${dateStamp}</td>
        <td>${escapeHtml(c.phone)}</td>
        <td>${escapeHtml(c.name)}</td>
        <td>${escapeHtml(c.description)}</td>
        <td>${c.totalItems ?? ''}</td>
        <td>${c.totalAmount ?? ''}</td>
        <td>
          <span class="badge-status" style="
  background-color: ${c.status === 'Collected' ? '#28a745' : c.overdue ? '#dc3545' : '#ffc107'};
  color: white;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  display: inline-block;
  min-width: 85px;
  text-align: center;
">
  ${c.overdue && c.status === 'Pending' ? 'Overdue' : escapeHtml(c.status)}
</span>

        </td>
        <td>
          ${c.status === 'Pending' ? `<button class="btn btn-sm btn-success mb-1" data-action="collect" data-id="${c.id}">Mark Collected</button>` : ''}
          <button class="btn btn-sm btn-info mb-1 view-btn" data-id="${c.id}">View</button>
          <button class="btn btn-sm btn-warning mb-1 edit-btn" data-id="${c.id}">Edit</button>
          <button class="btn btn-sm btn-danger mb-1 delete-btn" data-id="${c.id}">Delete</button>
          <button class="btn btn-sm btn-primary mb-1 add-payment-btn" data-id="${c.id}">Add Payment</button>
          <button class="btn btn-sm btn-success mb-1 btn-whatsapp" data-phone="${escapeHtml(c.phone)}" data-name="${escapeHtml(c.name)}">WhatsApp</button>
          <button class="btn btn-sm btn-dark mb-1 clothes-btn" data-id="${c.id}">Clothes</button>
        </td>`;
      tableBody.appendChild(tr);
      if (c.overdue && c.status === "Pending") {
        tr.style.backgroundColor = "#ffe5e5";
      }
    });
  } catch (err) {
    console.error("Error loading customers", err.message);
  }
}

// VIEW DETAILS
// ✅ FIXED viewDetails
async function viewDetails(id) {
  try {
    const { data, error } = await supabase.from("customers").select("*").eq("id", id).single();
    if (error) throw error;
    const c = data;

    const payments = safeParseJSON(c.payments, []);
    const clothes = safeParseJSON(c.clothesLog, []);

    const paymentsHtml = payments.length
      ? payments.map(p => `<li>${escapeHtml(p.method)} — ₦${p.amount} (${escapeHtml(p.date)})</li>`).join('')
      : '<li>No payments yet</li>';

    const totalPaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const balance = Math.max((Number(c.totalAmount) || 0) - totalPaid, 0);
    const clothesHtml = clothes.length
      ? clothes.map(cl => `<li>${cl.num} — ${escapeHtml(cl.desc)} (${cl.date})</li>`).join('')
      : '<li>No clothes collected yet</li>';

    const overdue = c.overdue ? "Yes" : "No";
    const paid = c.paid ? "Yes" : "No";
    const remaining = c.remaining ?? 0;

    modalBody.innerHTML = `
      <p><strong>Name:</strong> ${escapeHtml(c.name)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(c.phone)}</p>
      <p><strong>Description:</strong> ${escapeHtml(c.description)}</p>
      <p><strong>Special Instruction:</strong> ${escapeHtml(c.instruction || "None")}</p>
      <p><strong>No. of Clothes:</strong> ${c.totalItems ?? ''}</p>
      <p><strong>Remaining Clothes:</strong> ${remaining}</p>
      <p><strong>Total Amount:</strong> ₦${c.totalAmount ?? ''}</p>
      <p><strong>Total Paid:</strong> ₦${totalPaid}</p>
      <p><strong>Balance:</strong> ₦${balance}</p>
      <p><strong>Paid:</strong> ${paid}</p>
      <p><strong>Status:</strong> ${escapeHtml(c.status)}</p>
      <p><strong>Agreed Date:</strong> ${escapeHtml(c.agreedDate || "—")}</p>
      <p><strong>Pickup Date:</strong> ${escapeHtml(c.pickupDate || "—")}</p>
      <p><strong>Overdue:</strong> ${overdue}</p>
      <hr>
      <p><strong>Clothes Log:</strong></p>
      <ul>${clothesHtml}</ul>
      <hr>
      <p><strong>Payments:</strong></p>
      <ul>${paymentsHtml}</ul>
    `;
    modal.show();
  } catch (err) {
    console.error("Error viewing customer", err.message);
    alert("Failed to load customer details (see console).");
  }
}

// COLLECT MODAL
function openCollectModal(id) {
  currentCustomerId = id;
  pickupDateInput.value = new Date().toISOString().split("T")[0];
  collectModal.show();
}

// HANDLE MARK COLLECTED CONFIRMATION
// HANDLE MARK COLLECTED CONFIRMATION
markPaidBtn.addEventListener("click", async () => {
  if (!currentCustomerId) {
    alert("No customer selected.");
    return;
  }

  const pickupDate = pickupDateInput.value;
  if (!pickupDate) {
    alert("Please select a pickup date.");
    return;
  }

  try {
    // Update the selected customer
    const { error } = await supabase
      .from("customers")
      .update({
        status: "Collected",
        pickupDate: pickupDate,
        remaining: 0 // ✅ set remaining clothes to 0
      })
      .eq("id", currentCustomerId);

    if (error) throw error;

    alert("✅ Customer marked as collected successfully!");
    collectModal.hide();
    loadCustomers(); // refresh table so view modal updates
  } catch (err) {
    console.error("Error marking collected:", err.message);
    alert("❌ Failed to mark as collected. See console for details.");
  }
});


// MARK collected
// ✅ Fix: Mark as collected button
tableBody.addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const id = btn.dataset.id;
  const action = btn.dataset.action;

  if (btn.classList.contains("view-btn")) {
    viewDetails(id);
  }

  
});

//EDIT CUSTOMER
async function editCustomer(id) {
  try {
    const {data:customer, error:fetchError} = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();

    if (fetchError) throw new Error("Failed to fetch customer");

    const newDescription = prompt("Update description:",customer.description);
    if (newDescription === null) return;

    const newTotalItems = Number(prompt("Update Total Items:", customer.totalItems));
    if (isNaN(newTotalItems)) {
      alert("Invalid number for Total Items.");
      return;
    }

    const newTotalAmount = Number(prompt("Update Total Amount:", customer.totalAmount));
    if (isNaN(newTotalAmount)) {
      alert("Invalid number for Total Amount.");
      return;
    }

    const {error:updateError} = await supabase
    .from("customers")
    .update({
      description:newDescription,
      totalItems:newTotalItems,
      totalAmount:newTotalAmount})
    .eq("id", id);

    if (updateError) throw updateError;

    alert("Customer updated SUCCESSFULLY!.");
    loadCustomers();
  }catch(err){
    console.error("Edit customer error:", err);
    alert("Could not edit customer (see console).");
  }
}

//OPEN PAYMENT MODAL
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
    const { data: customer, error: fetchError } = await supabase
      .from("customers")
      .select("*")
      .eq("id", currentClothesCustomerId)
      .single();

    if (fetchError) throw fetchError;

    // ✅ Parse safely in case Supabase returns text
    let clothesLog = safeParseJSON(customer.clothesLog, []);
    clothesLog.push({ num, desc, date });

    const totalCollected = clothesLog.reduce((s, l) => s + (Number(l.num) || 0), 0);
    const remaining = (customer.totalItems || 0) - totalCollected;

    const { error: updateError } = await supabase
      .from("customers")
      .update({ clothesLog, remaining })
      .eq("id", currentClothesCustomerId);

    if (updateError) throw updateError;

    clothesModal.hide();
    loadCustomers();
    alert("✅ Clothes log saved successfully.");
  } catch (err) {
    console.error("Save clothes error:", err);
    alert("Could not save clothes log. See console for details.");
  }
});


//SAVE PAYMENT
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
    const {data:customer, error:fetchError} = await supabase
    .from("customers")
    .select("*")
    .eq("id", currentPaymentCustomerId)
    .single();

    if (fetchError) throw fetchError;
    if (!customer) throw new Error("Customer not found");

    customer.payments = customer.payments || [];
    customer.payments.push({ method, amount, date });

    const totalPaid = (customer.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const paidFlag = (customer.totalAmount && !isNaN(customer.totalAmount)) ? (totalPaid >= Number(customer.totalAmount)) : totalPaid > 0;

    const {error:updateError} = await supabase
    .from("customers")
    .update({ payments: customer.payments, paid: paidFlag })
    .eq("id", currentPaymentCustomerId);

    if (updateError) throw updateError;

    paymentModal.hide();
    loadCustomers();
    alert("Payment saved SUCCESSFULLY.");
  } catch (err) {
    console.error("savePayment error:", err.message);
    alert("Could not save payment (see console).");
  }
});

// DELETE CUSTOMER
async function deleteCustomer(id) {
  const passcode = "1234"; 
  const input = prompt("Enter passcode to delete this customer:");
  if (input === passcode) {
    try {
      const {error} = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

      if (error) throw error;
      
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
  date: new Date().toISOString(),
  name,
  phone,
  description,
  totalItems,
  totalAmount,
  instruction,
  agreedDate,
  status: "Pending",
  paid: false,
  overdue: false,
  payments: [],
  clothesLog: [],  // helpful for later
  remaining: totalItems,  // ✅ Set remaining equal to total clothes at start
};

  try {
    const { data, error } = await supabase
      .from('customers')
      .insert([newCustomer]);

    if (error) throw error;

    form.reset();
    alert("Customer added SUCCESSFULLY!");
    loadCustomers(); // optional: reload table immediately
  } catch (err) {
    console.error("Error adding customer", err.message);
    alert("Error adding customer");
  }
});


// TABLE CLICK HANDLER
tableBody.addEventListener("click", function (e) {
  const btn = e.target.closest("button");
  if (!btn) return;
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
    currentWhatsappPhone = btn.dataset.phone;
    currentWhatsappName = btn.dataset.name;

    whatsappCustomerName.textContent = `Send message to ${currentWhatsappName}`;
    whatsappMessageType.value = "1";
    customMessageDiv.style.display = "none";
    customMessageInput.value = "";

    whatsappModal.show();
    return;
  }
});

// WHATSAPP MODAL LOGIC
whatsappMessageType.addEventListener("change", () => {
    if (whatsappMessageType.value === "3") {
        customMessageDiv.style.display = "block";
    } else {
        customMessageDiv.style.display = "none";
        customMessageInput.value = "";
    }
});

sendWhatsappBtn.addEventListener("click", () => {
    if (!currentWhatsappPhone || !currentWhatsappName) return;

    let message = "";
    const type = whatsappMessageType.value;

    if (type === "1") message = `Hello ${currentWhatsappName}, your clothes are ready for pickup. Thank you for choosing PASTOR PAL Laundry!`;
    else if (type === "2") message = `Hello ${currentWhatsappName}, your clothes have been marked as collected. Thank you!`;
    else if (type === "3") {
        message = customMessageInput.value.trim();
        if (!message) {
            alert("Enter a custom message.");
            return;
        }
    }
    else if (type === "4") message = `Hello ${currentWhatsappName}, this is a reminder that your laundry is ready and overdue for pickup. Kindly collect it soon.`;

    // open WhatsApp Web
    const url = `https://wa.me/${currentWhatsappPhone.replace(/\D/g,'')}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    whatsappModal.hide();
});

// SEARCH INPUT
searchInput.addEventListener("input", loadCustomers);

// INITIAL LOAD
loadCustomers();



