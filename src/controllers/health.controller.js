/**
 * Controlador de comprobación de estado del servidor.
 */
function getHealth(_req, res) {
  res.status(200).json({
    status: 'ok',
    message: 'El servidor está funcionando correctamente',
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  getHealth,
};
