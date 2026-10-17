const express = require('express');
const { register, login } = require('../controllers/authController');
const validate = require('../middleware/validation');
const Joi = require('joi'); // Assuming joi is installed for validation

const router = express.Router();

const registerSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('Admin', 'Branch', 'Kaarigar').optional()
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);

module.exports = router;