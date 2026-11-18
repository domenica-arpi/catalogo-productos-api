/**
 * Ruta de prueba exclusiva para administradores.
 * No implementa lógica de negocio; solo valida autorización por rol.
 */
function getAdminPing(_req, res) {
  res.status(200).json({
    status: 'ok',
    message: 'Acceso de administrador concedido',
    data: {
      resource: 'admin-ping',
      roleRequired: 'admin',
    },
  });
}

module.exports = {
  getAdminPing,
};
