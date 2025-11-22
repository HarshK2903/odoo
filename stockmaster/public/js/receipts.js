const API_URL = "http://localhost:3000/api";
const token = localStorage.getItem("token");

if (!token) window.location.href = "/login.html";

const fetchHeaders = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

document.getElementById("logoutBtn").addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.removeItem("token");
  window.location.href = "/login.html";
});

let receipts = [];
let warehouses = [];
let products = [];
let itemCount = 0;

// Load Warehouses and Products
async function loadData() {
  try {
    const [whResponse, prodResponse] = await Promise.all([
      fetch(`${API_URL}/warehouses`, { headers: fetchHeaders }),
      fetch(`${API_URL}/products`, { headers: fetchHeaders }),
    ]);

    warehouses = await whResponse.json();
    products = await prodResponse.json();

    const warehouseSelect = document.getElementById("receiptWarehouse");
    const filterWarehouseSelect = document.getElementById("filterWarehouse");

    warehouseSelect.innerHTML =
      '<option value="">Select warehouse</option>' +
      warehouses
        .map((w) => `<option value="${w._id}">${w.name}</option>`)
        .join("");

    filterWarehouseSelect.innerHTML =
      '<option value="">All Warehouses</option>' +
      warehouses
        .map((w) => `<option value="${w._id}">${w.name}</option>`)
        .join("");
  } catch (error) {
    console.error("Error loading data:", error);
  }
}

// Load Receipts
async function loadReceipts(status = "", warehouse = "") {
  try {
    let url = `${API_URL}/receipts?`;
    if (status) url += `status=${status}&`;
    if (warehouse) url += `warehouse=${warehouse}`;

    const response = await fetch(url, { headers: fetchHeaders });
    receipts = await response.json();
    renderReceipts();
  } catch (error) {
    console.error("Error loading receipts:", error);
  }
}

function renderReceipts() {
  const tbody = document.getElementById("receiptsTable");

  if (receipts.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center">No receipts found</td></tr>';
    return;
  }

  tbody.innerHTML = receipts
    .map(
      (receipt) => `
        <tr>
            <td>${receipt.receiptNumber}</td>
            <td>${receipt.supplier}</td>
            <td>${receipt.warehouse?.name || "N/A"}</td>
            <td>${receipt.items?.length || 0} items</td>
            <td><span class="status-badge status-${receipt.status}">${
        receipt.status
      }</span></td>
            <td>${new Date(receipt.createdAt).toLocaleDateString()}</td>
            <td>
                ${
                  receipt.status !== "done" && receipt.status !== "canceled"
                    ? `
                    <button class="btn btn-sm btn-success" onclick="validateReceipt('${receipt._id}')">Validate</button>
                    <button class="btn btn-sm btn-danger" onclick="cancelReceipt('${receipt._id}')">Cancel</button>
                `
                    : ""
                }
            </td>
        </tr>
    `
    )
    .join("");
}

// Add Receipt
document.getElementById("addReceiptBtn").addEventListener("click", () => {
  document.getElementById("modalTitle").textContent = "New Receipt";
  document.getElementById("receiptForm").reset();
  document.getElementById("receiptId").value = "";
  document.getElementById("itemsList").innerHTML = "";
  itemCount = 0;
  addReceiptItem();
  document.getElementById("receiptModal").classList.add("active");
});

// Add Item Row
document.getElementById("addItemBtn").addEventListener("click", addReceiptItem);

function addReceiptItem() {
  const itemsList = document.getElementById("itemsList");
  const itemDiv = document.createElement("div");
  itemDiv.className = "item-row";
  itemDiv.id = `item-${itemCount}`;

  itemDiv.innerHTML = `
        <select class="form-control" data-field="product" required>
            <option value="">Select product</option>
            ${products
              .map(
                (p) => `<option value="${p._id}">${p.name} (${p.sku})</option>`
              )
              .join("")}
        </select>
        <input type="number" class="form-control" data-field="quantity" placeholder="Quantity" min="1" required>
        <button type="button" class="btn btn-danger btn-sm" onclick="removeItem('item-${itemCount}')">Remove</button>
    `;

  itemsList.appendChild(itemDiv);
  itemCount++;
}

function removeItem(id) {
  document.getElementById(id).remove();
}

// Save Receipt
document.getElementById("receiptForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const items = [];
  document.querySelectorAll("#itemsList .item-row").forEach((row) => {
    const product = row.querySelector('[data-field="product"]').value;
    const quantity = parseInt(
      row.querySelector('[data-field="quantity"]').value
    );
    if (product && quantity) {
      items.push({ product, quantity });
    }
  });

  if (items.length === 0) {
    alert("Please add at least one item");
    return;
  }

  const receiptData = {
    supplier: document.getElementById("receiptSupplier").value,
    warehouse: document.getElementById("receiptWarehouse").value,
    items,
    notes: document.getElementById("receiptNotes").value,
  };

  try {
    const response = await fetch(`${API_URL}/receipts`, {
      method: "POST",
      headers: fetchHeaders,
      body: JSON.stringify(receiptData),
    });

    if (response.ok) {
      alert("Receipt created successfully");
      closeModal();
      loadReceipts();
    } else {
      const data = await response.json();
      alert(data.message);
    }
  } catch (error) {
    alert("Error creating receipt");
  }
});

async function validateReceipt(id) {
  if (!confirm("Validate this receipt? Stock will be increased.")) return;

  try {
    const response = await fetch(`${API_URL}/receipts/${id}/validate`, {
      method: "POST",
      headers: fetchHeaders,
    });

    if (response.ok) {
      alert("Receipt validated successfully");
      loadReceipts();
    } else {
      const data = await response.json();
      alert(data.message);
    }
  } catch (error) {
    alert("Error validating receipt");
  }
}

async function cancelReceipt(id) {
  if (!confirm("Cancel this receipt?")) return;

  try {
    const response = await fetch(`${API_URL}/receipts/${id}/cancel`, {
      method: "POST",
      headers: fetchHeaders,
    });

    if (response.ok) {
      alert("Receipt canceled");
      loadReceipts();
    } else {
      const data = await response.json();
      alert(data.message);
    }
  } catch (error) {
    alert("Error canceling receipt");
  }
}

function closeModal() {
  document.getElementById("receiptModal").classList.remove("active");
}

document.getElementById("filterStatus").addEventListener("change", (e) => {
  loadReceipts(
    e.target.value,
    document.getElementById("filterWarehouse").value
  );
});

document.getElementById("filterWarehouse").addEventListener("change", (e) => {
  loadReceipts(document.getElementById("filterStatus").value, e.target.value);
});

loadData();
loadReceipts();
