import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncWrap } from '../async';
import { authenticateToken } from '../oauth';
import { changePasswordHandler, changePasswordValidators } from './changepassword';
import { googleHandler, googleValidators } from './google';
import { loginHandler, loginValidators } from './login';
import { meHandler } from './me';
import { newPatientHandler, newPatientValidators } from './newpatient';
import { newProjectHandler, newProjectValidators } from './newproject';
import { newUserHandler, newUserValidators } from './newuser';
import { profileHandler, profileValidators } from './profile';
import { resetPasswordHandler, resetPasswordValidators } from './resetpassword';
import { setPasswordHandler, setPasswordValidators } from './setpassword';

export const authRouter = Router();
authRouter.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  })
);

authRouter.get('/me', authenticateToken, asyncWrap(meHandler));
authRouter.post('/newuser', newUserValidators, asyncWrap(newUserHandler));
authRouter.post('/newproject', newProjectValidators, asyncWrap(newProjectHandler));
authRouter.post('/newpatient', newPatientValidators, asyncWrap(newPatientHandler));
authRouter.post('/login', loginValidators, asyncWrap(loginHandler));
authRouter.post('/profile', profileValidators, asyncWrap(profileHandler));
authRouter.post('/changepassword', changePasswordValidators, asyncWrap(changePasswordHandler));
authRouter.post('/resetpassword', resetPasswordValidators, asyncWrap(resetPasswordHandler));
authRouter.post('/setpassword', setPasswordValidators, asyncWrap(setPasswordHandler));
authRouter.post('/google', googleValidators, asyncWrap(googleHandler));
