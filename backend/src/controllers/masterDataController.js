const User = require('../models/User');
const { masterData } = require('../data/masterData');

const getJewellery = (req, res) => res.json({ success: true, data: masterData.jewellery });
const getRepairTypes = (req, res) => res.json({ success: true, data: masterData.repairTypes });
const getMaterials = (req, res) => res.json({ success: true, data: masterData.materials });
const getUnits = (req, res) => res.json({ success: true, data: masterData.units });
const getStones = (req, res) =>
  res.json({
    success: true,
    data: masterData.stones.map((s) => ({
      ...s,
      stone_name: s.stone_name || s.name,
    })),
  });
const getPurities = (req, res) => res.json({ success: true, data: masterData.purities });
const getRoles = (req, res) => res.json({ success: true, data: masterData.roles });
const getBranches = (req, res) => res.json({ success: true, data: masterData.branches });
const getDepartments = (req, res) => res.json({ success: true, data: masterData.departments });

const getAllRHO = async (req, res) => {
  try {
    const rhos = await User.find({ role: 'RHO', isActive: true }).select('name employeeId');
    res.json({
      success: true,
      data: rhos.map((u) => ({
        id: u._id,
        name: u.name,
        employeeId: u.employeeId,
        role_name: 'RHO',
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getAllKarigar = async (req, res) => {
  try {
    const karigars = await User.find({ role: 'KARIGAR', isActive: true }).select('name employeeId');
    res.json({
      success: true,
      data: karigars.map((u) => ({
        id: u._id,
        name: u.name,
        employeeId: u.employeeId,
        role_name: 'Int. Kaarigar',
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getEmployeesByBranchAndDept = async (req, res) => {
  try {
    const employees = await User.find({
      branchId: req.params.branchId,
      departmentId: req.params.deptId,
      isActive: true,
    }).select('name employeeId phone role');

    res.json({
      success: true,
      data: employees.map((u) => ({
        id: u._id,
        name: u.name,
        employeeId: u.employeeId,
        phone: u.phone,
        role_name: u.role,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getJewellery,
  getRepairTypes,
  getMaterials,
  getUnits,
  getStones,
  getPurities,
  getRoles,
  getBranches,
  getDepartments,
  getAllRHO,
  getAllKarigar,
  getEmployeesByBranchAndDept,
};
