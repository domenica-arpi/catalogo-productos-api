const productService = require('../services/product.service');
const { asyncHandler } = require('../utils/errors');

/**
 * GET /api/products
 */
const listProducts = asyncHandler(async (req, res) => {
  const products = await productService.listProducts({
    category: req.query.category,
  });

  res.status(200).json({
    status: 'ok',
    message:
      products.length === 0
        ? 'No hay productos registrados'
        : 'Productos obtenidos correctamente',
    data: {
      count: products.length,
      products,
    },
  });
});

/**
 * GET /api/products/:id
 */
const getProduct = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id);

  res.status(200).json({
    status: 'ok',
    message: 'Producto obtenido correctamente',
    data: { product },
  });
});

/**
 * POST /api/products
 */
const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body);

  res.status(201).json({
    status: 'ok',
    message: 'Producto creado correctamente',
    data: { product },
  });
});

/**
 * PUT /api/products/:id
 */
const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body);

  res.status(200).json({
    status: 'ok',
    message: 'Producto actualizado correctamente',
    data: { product },
  });
});

/**
 * DELETE /api/products/:id
 */
const deleteProduct = asyncHandler(async (req, res) => {
  const result = await productService.deleteProduct(req.params.id);

  res.status(200).json({
    status: 'ok',
    message: 'Producto eliminado correctamente',
    data: result,
  });
});

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
