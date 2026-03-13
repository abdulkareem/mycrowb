const prisma = require('../config/prisma');
const { normalizeMobile } = require('../utils/mobile');

async function createRegistrationRequest(req, res, next) {
  try {
    const payload = req.body || {};
    const mobile = normalizeMobile(payload.mobile);
    const whatsapp = normalizeMobile(payload.whatsapp || payload.whatsappNumber);

    if (!mobile || !payload.name || !payload.shopName || !payload.address || !payload.district || !payload.state || Number.isNaN(Number(payload.latitude)) || Number.isNaN(Number(payload.longitude)) || !whatsapp) {
      return res.status(400).json({ message: 'All registration fields are required.' });
    }

    const request = await prisma.registrationRequest.create({
      data: {
        mobile,
        name: String(payload.name).trim(),
        shopName: String(payload.shopName).trim(),
        address: String(payload.address).trim(),
        district: String(payload.district).trim(),
        state: String(payload.state).trim(),
        latitude: Number(payload.latitude),
        longitude: Number(payload.longitude),
        whatsapp,
        status: 'pending'
      }
    });

    return res.status(201).json({ success: true, id: request.id, message: 'Registration submitted. Waiting for admin approval.' });
  } catch (error) {
    return next(error);
  }
}

async function listRegistrationRequests(req, res, next) {
  try {
    const status = req.query.status;
    const requests = await prisma.registrationRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ requests });
  } catch (error) {
    return next(error);
  }
}

async function updateRegistrationRequest(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid request id.' });

    const action = String(req.body.action || '').toLowerCase();
    const edits = req.body.edits || {};

    const request = await prisma.registrationRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ message: 'Request not found.' });

    if (action === 'edit') {
      const updated = await prisma.registrationRequest.update({ where: { id }, data: edits });
      return res.json({ success: true, request: updated });
    }

    if (action === 'reject') {
      const updated = await prisma.registrationRequest.update({ where: { id }, data: { status: 'rejected' } });
      return res.json({ success: true, request: updated });
    }

    if (action === 'approve') {
      const existing = await prisma.user.findFirst({ where: { mobile: request.mobile } });
      if (existing) return res.status(409).json({ message: 'User already exists for this mobile number.' });

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            mobile: request.mobile,
            name: request.name,
            role: 'BARBER',
            firstLogin: true,
            shopName: request.shopName,
            address: request.address,
            district: request.district,
            state: request.state
          }
        });

        const updatedRequest = await tx.registrationRequest.update({ where: { id }, data: { status: 'approved' } });
        return { user, updatedRequest };
      });

      return res.json({ success: true, user: result.user, request: result.updatedRequest });
    }

    return res.status(400).json({ message: 'action must be edit, approve, or reject.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createRegistrationRequest,
  listRegistrationRequests,
  updateRegistrationRequest
};
