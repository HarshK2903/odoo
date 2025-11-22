const API_URL_D = "http://localhost:3000/api";
const token_D = localStorage.getItem("token");

if (!token_D) window.location.href = "/login.html";

const fetchHeaders_D = {
  Authorization: `Bearer ${token_D}`,
  "Content-Type": "application/json",
};

document.getElementById("logoutBtn").addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.removeItem("token");
  window.location.href = "/login.html";
});

let deliveries = [];
let warehouses_D = [];
let products_D = [];
let itemCount_D = 0;

async function loadData_D() {
  try {
    const [whResponse, prodResponse] = await Promise.all([
      fetch(`${API_URL_D}/warehouses`, { headers: fetchHeaders_D }),
      fetch(`${API_URL_D}/products`, { headers: fetchHeaders_D }),
    ]);

    warehouses_D = await whResponse.json();
    products_D = await prodResponse.json();

    const warehouseSelect = document.getElementById("deliveryWarehouse");
    const filterWarehouseSelect = document.getElementById("filterWarehouse");

    warehouseSelect.innerHTML =
      '<option value="">Select warehouse</option>' +
      warehouses_D
        .map((w) => `<option value="${w._id}">${w.name}</option>`)
        .join("");

    filterWarehouseSelect.innerHTML =
      '<option value="">All Warehouses</option>' +
      warehouses_D
        .map((w) => `<option value="${w._id}">${w.name}</option>`)
        .join("");
  } catch (error) {
    console.error("Error loading data:", error);
  }
}

async function loadDeliveries(status = "", warehouse = "") {
  try {
    let url = `${API_URL_D}/deliveries?`;
    if (status) url += `status=${status}&`;
    if (warehouse) url += `warehouse=${warehouse}`;

    const response = await fetch(url, { headers: fetchHeaders_D });
    deliveries = await response.json();
    renderDeliveries();
  } catch (error) {
    console.error("Error loading deliveries:", error);
  }
}

function renderDeliveries() {
  const tbody = document.getElementById("deliveriesTable");

  if (deliveries.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center">No deliveries found</td></tr>';
    return;
  }

  tbody.innerHTML = deliveries
    .map(
      (delivery) => `
        <tr>
            <td>${delivery.deliveryNumber}</td>
            <td>${delivery.customer}</td>
            <td>${delivery.warehouse?.name || "N/A"}</td>
            <td>${delivery.items?.length || 0} items</td>
            <td><span class="status-badge status-${delivery.status}">${
        delivery.status
      }</span></td>
            <td>${new Date(delivery.createdAt).toLocaleDateString()}</td>
            <td>
                ${
                  delivery.status !== "done" && delivery.status !== "canceled"
                    ? `
                    <button class="btn btn-sm btn-success" onclick="validateDelivery('${delivery._id}')">Validate</button>
                    <button class="btn btn-sm btn-danger" onclick="cancelDelivery('${delivery._id}')">Cancel</button>
                `
                    : ""
                }
            </td>
        </tr>
    `
    )
    .join("");
}

document.getElementById("addDeliveryBtn").addEventListener("click", () => {
  document.getElementById("modalTitle").textContent = "New Delivery";
  document.getElementById("deliveryForm").reset();
  document.getElementById("deliveryId").value = "";
  document.getElementById("itemsList").innerHTML = "";
  itemCount_D = 0;
  addDeliveryItem();
  document.getElementById("deliveryModal").classList.add("active");
});

document
  .getElementById("addItemBtn")
  .addEventListener("click", addDeliveryItem);

function addDeliveryItem() {
  const itemsList = document.getElementById("itemsList");
  const itemDiv = document.createElement("div");
  itemDiv.className = "item-row";
  itemDiv.id = `item-${itemCount_D}`;

  itemDiv.innerHTML = `
        <select class="form-control" data-field="product" required>
            <option value="">Select product</option>
            ${products_D
              .map(
                (p) => `<option value="${p._id}">${p.name} (${p.sku})</option>`
              )
              .join("")}
        </select>
        <input type="number" class="form-control" data-field="quantity" placeholder="Quantity" min="1" required>
        <button type="button" class="btn btn-danger btn-sm" onclick="removeItem('item-${itemCount_D}')">Remove</button>
    `;

  itemsList.appendChild(itemDiv);
  itemCount_D++;
}

function removeItem(id) {
  document.getElementById(id).remove();
}

document
  .getElementById("deliveryForm")
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

    const deliveryData = {
      customer: document.getElementById("deliveryCustomer").value,
      warehouse: document.getElementById("deliveryWarehouse").value,
      items,
      notes: document.getElementById("deliveryNotes").value,
    };

    try {
      const response = await fetch(`${API_URL_D}/deliveries`, {
        method: "POST",
        headers: fetchHeaders_D,
        body: JSON.stringify(deliveryData),
      });

      if (response.ok) {
        alert("Delivery created successfully");
        closeModal();
        loadDeliveries();
      } else {
        const data = await response.json();
        alert(data.message);
      }
    } catch (error) {
      alert("Error creating delivery");
    }
  });

async function validateDelivery(id) {
  if (!confirm("Validate this delivery? Stock will be decreased.")) return;

  try {
    const response = await fetch(`${API_URL_D}/deliveries/${id}/validate`, {
      method: "POST",
      headers: fetchHeaders_D,
    });

    if (response.ok) {
      alert("Delivery validated successfully");
      loadDeliveries();
    } else {
      const data = await response.json();
      alert(data.message);
    }
  } catch (error) {
    alert("Error validating delivery");
  }
}

async function cancelDelivery(id) {
  if (!confirm("Cancel this delivery?")) return;

  try {
    const response = await fetch(`${API_URL_D}/deliveries/${id}/cancel`, {
      method: "POST",
      headers: fetchHeaders_D,
    });

    if (response.ok) {
      alert("Delivery canceled");
      loadDeliveries();
    } else {
      const data = await response.json();
      alert(data.message);
    }
  } catch (error) {
    alert("Error canceling delivery");
  }
}

function closeModal() {
  document.getElementById("deliveryModal").classList.remove("active");
}

document.getElementById("filterStatus").addEventListener("change", (e) => {
  loadDeliveries(
    e.target.value,
    document.getElementById("filterWarehouse").value
  );
});

document.getElementById("filterWarehouse").addEventListener("change", (e) => {
  loadDeliveries(document.getElementById("filterStatus").value, e.target.value);
});

loadData_D();
loadDeliveries();
