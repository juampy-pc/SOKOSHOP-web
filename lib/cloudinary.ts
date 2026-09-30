// Cloudinary en la tienda: solo para las fotos que mandan los clientes en "Perfumes a pedido".
export const cloudinaryReady = () => Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
