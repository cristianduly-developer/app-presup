export async function findUserByEmail(supa, email) {
  const target = email?.toLowerCase()
  if (!target) return null
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supa.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) return null
    const found = data.users.find(u => u.email?.toLowerCase() === target)
    if (found) return found
    if (data.users.length < 1000) break
  }
  return null
}
