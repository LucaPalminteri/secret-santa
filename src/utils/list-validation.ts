export function validateListDetails(name: string, amount: number | undefined) {
  const errors: { name?: string; amount?: string } = {};
  if (!name.trim() || name.trim().length > 120) errors.name = "Ingresa un nombre de hasta 120 caracteres.";
  if (amount !== undefined && (!Number.isFinite(amount) || amount < 0 || amount > 9999999999.99 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.0001)) {
    errors.amount = "Ingresa un monto válido, desde 0 y con hasta dos decimales.";
  }
  return errors;
}
