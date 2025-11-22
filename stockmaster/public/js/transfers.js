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

let transfers = [];
let warehouses = [];
let products = [];
let itemCount = 0;

async function loadData() {
  try {
    const [whResponse, prodResponse] = await Promise.all([
      fetch(`${API_URL}/warehouses`, { headers: fetchHeaders }),
      fetch(`${API_URL}/products`, { headers: fetchHeaders }),
    ]);

    warehouses = await whResponse.json();
    products = await prodResponse.json();

    const fromSelect = document.getElementById("transferFromWarehouse");
    const toSelect = document.getElementById("transferToWarehouse");

    const options =
      '<option value="">Select warehouse</option>' +
      warehouses
        .map((w) => `<option value="${w._id}">${w.name}</option>`)
        .join("");

    fromSelect.innerHTML = options;
    toSelect.innerHTML = options;
  } catch (error) {
    console.error("Error loading data:", error);
  }
}

async function loadTransfers(status = "") {
  try {
    let url = `${API_URL}/transfers?`;
    if (status) url += `status=${status}`;

    const response = await fetch(url, { headers: fetchHeaders });
    transfers = await response.json();
    renderTransfers();
  } catch (error) {
    console.error("Error loading transfers:", error);
  }
}

function renderTransfers() {
  const tbody = document.getElementById("transfersTable");

  if (transfers.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center">No transfers found</td></tr>';
    return;
  }

  tbody.innerHTML = transfers
    .map(
      (transfer) => `
        <tr>
            <td>${transfer.transferNumber}</td>
            <td>${transfer.fromWarehouse?.name || "N/A"}</td>
            <td>${transfer.toWarehouse?.name || "N/A"}</td>
            <td>${transfer.items?.length || 0} items</td>
            <td><span class="status-badge status-${transfer.status}">${
        transfer.status
      }</span></td>
            <td>${new Date(transfer.createdAt).toLocaleDateString()}</td>
            <td>
                ${
                  transfer.status !== "done" && transfer.status !== "canceled"
                    ? `
                    <button class="btn btn-sm btn-success" onclick="validateTransfer('${transfer._id}')">Validate</button>
                    <button class="btn btn-sm btn-danger" onclick="cancelTransfer('${transfer._id}')">Cancel</button>
                `
                    : ""
                }
            </td>
        </tr>
    `
    )
    .join("");
}

document.getElementById("addTransferBtn").addEventListener("click", () => {
  document.getElementById("modalTitle").textContent = "New Transfer";
  document.getElementById("transferForm").reset();
  document.getElementById("transferId").value = "";
  document.getElementById("itemsList").innerHTML = "";
  itemCount = 0;
  addTransferItem();
  document.getElementById("transferModal").classList.add("active");
});

document
  .getElementById("addItemBtn")
  .addEventListener("click", addTransferItem);

function addTransferItem() {
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

document
  .getElementById("transferForm")
  .addEventListener("submit", async (e) => {
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

    const transferData = {
      fromWarehouse: document.getElementById("transferFromWarehouse").value,
      toWarehouse: document.getElementById("transferToWarehouse").value,
      items,
      notes: document.getElementById("transferNotes").value,
    };

    try {
      const response = await fetch(`${API_URL}/transfers`, {
        method: "POST",
        headers: fetchHeaders,
        body: JSON.stringify(transferData),
      });

      if (response.ok) {
        alert("Transfer created successfully");
        closeModal();
        loadTransfers();
      } else {
        const data = await response.json();
        alert(data.message);
      }
    } catch (error) {
      alert("Error creating transfer");
    }
  });

async function validateTransfer(id) {
  if (
    !confirm("Validate this transfer? Stock will be moved between warehouses.")
  )
    return;

  try {
    const response = await fetch(`${API_URL}/transfers/${id}/validate`, {
      method: "POST",
      headers: fetchHeaders,
    });

    if (response.ok) {
      alert("Transfer validated successfully");
      loadTransfers();
    } else {
      const data = await response.json();
      alert(data.message);
    }
  } catch (error) {
    alert("Error validating transfer");
  }
}

async function cancelTransfer(id) {
  if (!confirm("Cancel this transfer?")) return;

  try {
    const response = await fetch(`${API_URL}/transfers/${id}/cancel`, {
      method: "POST",
      headers: fetchHeaders,
    });

    if (response.ok) {
      alert("Transfer canceled");
      loadTransfers();
    } else {
      const data = await response.json();
      alert(data.message);
    }
  } catch (error) {
    alert("Error canceling transfer");
  }
}

function closeModal() {
  document.getElementById("transferModal").classList.remove("active");
}

document.getElementById("filterStatus").addEventListener("change", (e) => {
  loadTransfers(e.target.value);
});

loadData();
loadTransfers();
