import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import * as companyController from '../controllers/company.controller';

const router = Router();

router.use(authenticate);

router.get('/', companyController.listCompanies);
router.get('/my', companyController.myCompanies);
router.get('/:id', companyController.getCompany);
router.post('/', authorize('super_admin', 'admin'), companyController.createCompany);
router.patch('/:id', authorize('super_admin', 'admin'), companyController.updateCompany);
router.delete('/:id', authorize('super_admin'), companyController.deleteCompany);
router.post('/:id/users', authorize('super_admin', 'admin'), companyController.addUserToCompany);
router.delete('/:id/users/:userId', authorize('super_admin', 'admin'), companyController.removeUserFromCompany);

export default router;
