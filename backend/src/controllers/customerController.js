const Customer = require('../models/Customer');
const { formatCustomerForMobile } = require('../utils/mobileFormat');

const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

const searchCustomers = async (req, res) => {
  try {
    const { query } = req.params;

    const term = String(query || '').trim();
    if (!term) {
      return res.json({ success: true, customers: [], data: [] });
    }

    const customers = await Customer.find({
      $or: [
        { name: { $regex: term, $options: 'i' } },
        { mobile: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
      ],
    }).limit(20);

    const data = customers.map(formatCustomerForMobile);
    res.json({
      success: true,
      customers: data,
      data,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createCustomer = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const mobile = String(req.body.mobile || req.body.customer_phone_number || '').trim();
    const email = String(req.body.email || '').trim();
    const location = String(req.body.location || req.body.address || req.body.customer_address || '').trim();
    const whatsappEnabled = Boolean(req.body.whatsappEnabled ?? req.body.is_whatsapp_enabled);

    if (!name) {
      return res.status(400).json({ success: false, message: 'Customer name is required' });
    }

    if (!INDIAN_MOBILE_REGEX.test(mobile)) {
      return res.status(400).json({ success: false, message: 'Valid Indian mobile number is required' });
    }

    if (!location) {
      return res.status(400).json({ success: false, message: 'Customer location is required' });
    }

    const existingCustomer = await Customer.findOne({ mobile });
    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'Customer with this mobile number already exists',
      });
    }

    const customer = await Customer.create({
      name,
      mobile,
      email: email || undefined,
      location,
      whatsappEnabled,
    });

    const formatted = formatCustomerForMobile(customer);

    res.status(201).json({
      success: true,
      status: true,
      customer: formatted,
      data: formatted,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCustomerDetails = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const formatted = formatCustomerForMobile(customer);
    res.json({ success: true, data: formatted, customer: formatted });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  searchCustomers,
  createCustomer,
  getCustomerDetails,
};
