const API_URL = "http://localhost:3000/api";
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "/login.html";
}

// Logout
document.getElementById("logoutBtn").addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/login.html";
});

// Load user info
const user = JSON.parse(localStorage.getItem("user"));
if (user) {
  document.getElementById("userName").textContent = user.name;
}

// Fetch headers with auth
const fetchHeaders = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

// Load Dashboard KPIs
async function loadKPIs() {
  try {
    const response = await fetch(`${API_URL}/dashboard/kpis`, {
      headers: fetchHeaders,
    });
    const data = await response.json();

    document.getElementById("totalProducts").textContent = data.totalProducts;
    document.getElementById("lowStock").textContent = data.lowStockItems;
    document.getElementById("outOfStock").textContent = data.outOfStockItems;
    document.getElementById("pendingReceipts").textContent =
      data.pendingReceipts;
    document.getElementById("pendingDeliveries").textContent =
      data.pendingDeliveries;
    document.getElementById("internalTransfers").textContent =
      data.internalTransfers;
  } catch (error) {
    console.error("Error loading KPIs:", error);
  }
}

// Load Recent Activities
async function loadActivities(type = "") {
  try {
    let url = `${API_URL}/dashboard/activities?limit=20`;
    if (type) url += `&type=${type}`;

    const response = await fetch(url, { headers: fetchHeaders });
    const activities = await response.json();

    const tbody = document.getElementById("activitiesTable");

    if (activities.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="text-center">No activities found</td></tr>';
      return;
    }

    tbody.innerHTML = activities
      .map(
        (activity) => `
            <tr>
                <td>${new Date(activity.createdAt).toLocaleDateString()}</td>
                <td><span class="status-badge">${activity.type}</span></td>
                <td>${activity.product?.name || "N/A"}</td>
                <td>${activity.warehouse?.name || "N/A"}</td>
                <td style="color: ${
                  activity.quantityChange >= 0 ? "green" : "red"
                }">
                    ${activity.quantityChange >= 0 ? "+" : ""}${
          activity.quantityChange
        }
                </td>
                <td>${activity.referenceDoc || "-"}</td>
                <td>${activity.createdBy?.name || "System"}</td>
            </tr>
        `
      )
      .join("");
  } catch (error) {
    console.error("Error loading activities:", error);
    document.getElementById("activitiesTable").innerHTML =
      '<tr><td colspan="7" class="text-center">Error loading activities</td></tr>';
  }
}

// Filter activities
document.getElementById("activityType").addEventListener("change", (e) => {
  loadActivities(e.target.value);
});

// Initial load
loadKPIs();
loadActivities();

// Refresh every 30 seconds
setInterval(() => {
  loadKPIs();
  loadActivities();
}, 30000);
