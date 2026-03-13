const router = require('express').Router();
const {
  createRegistrationRequest,
  listRegistrationRequests,
  updateRegistrationRequest
} = require('../controllers/registration.controller');
const { authorize } = require('../middleware/auth.middleware');

router.post('/request', createRegistrationRequest);
router.get('/requests', authorize('ADMIN', 'SUPER_ADMIN'), listRegistrationRequests);
router.patch('/requests/:id', authorize('ADMIN', 'SUPER_ADMIN'), updateRegistrationRequest);

module.exports = router;
