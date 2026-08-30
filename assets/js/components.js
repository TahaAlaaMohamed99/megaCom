async function loadComponent(selector, path) {
  const element = document.querySelector(selector);
  if (!element) return;

  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to load ${path}`);
    element.innerHTML = await response.text();
  } catch (error) {
    console.error(error);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadComponent("#navbar", "/components/navbar.html");
  await loadComponent("#footer", "/components/footer.html");
});
