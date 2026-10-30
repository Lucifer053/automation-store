// Fetches /api/orders/{id}/pdf with the bearer token and saves it as order-{id}.pdf.
// Throws when the server doesn't return a PDF so the caller can show an error.
export async function downloadOrderPdf(orderId, token) {
  const res = await fetch(`/api/orders/${orderId}/pdf`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`PDF request failed (${res.status})`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `order-${orderId}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
