const masterData = {
  jewellery: [
    { id: '1', name: 'Ring' },
    { id: '2', name: 'Earring' },
    { id: '3', name: 'Necklace' },
    { id: '4', name: 'Bracelet' },
    { id: '5', name: 'Chain' },
    { id: '6', name: 'Pendant' },
    { id: '7', name: 'Bangle' },
    { id: '8', name: 'Nose Pin' },
  ],
  repairTypes: [
    { id: '1', name: 'Size Adjustment' },
    { id: '2', name: 'Stone Setting' },
    { id: '3', name: 'Polishing' },
    { id: '4', name: 'Soldering' },
    { id: '5', name: 'Rhodium Plating' },
    { id: '6', name: 'Clasp Replacement' },
    { id: '7', name: 'Chain Repair' },
    { id: '8', name: 'Engraving' },
  ],
  materials: [
    { id: '1', name: 'Gold', purities: ['22K', '18K', '14K'] },
    { id: '2', name: 'Silver', purities: ['999', '925', '800'] },
    { id: '3', name: 'Platinum', purities: ['950', '900'] },
    { id: '4', name: 'Diamond', purities: [] },
    { id: '5', name: 'Other', purities: [] },
  ],
  units: [
    { id: '1', name: 'Gram' },
    { id: '2', name: 'Milligram' },
    { id: '3', name: 'Carat' },
    { id: '4', name: 'Piece' },
  ],
  stones: [
    { id: '1', name: 'Diamond', stone_name: 'Diamond' },
    { id: '2', name: 'Ruby', stone_name: 'Ruby' },
    { id: '3', name: 'Emerald', stone_name: 'Emerald' },
    { id: '4', name: 'Sapphire', stone_name: 'Sapphire' },
    { id: '5', name: 'Pearl', stone_name: 'Pearl' },
    { id: '6', name: 'Cubic Zirconia', stone_name: 'Cubic Zirconia' },
  ],
  purities: [
    { id: '1', name: '22K' },
    { id: '2', name: '18K' },
    { id: '3', name: '14K' },
    { id: '4', name: '925' },
    { id: '5', name: '999' },
  ],
  roles: [
    { role_id: '1', role_name: 'BRSH' },
    { role_id: '2', role_name: 'RHO' },
    { role_id: '3', role_name: 'Int. Kaarigar' },
  ],
  branches: [
    { id: '1', name: 'Main Branch', code: 'MB001' },
    { id: '2', name: 'City Center', code: 'CC002' },
  ],
  departments: [
    { id: '1', name: 'Sales', code: 'SALES' },
    { id: '2', name: 'Repair', code: 'REPAIR' },
    { id: '3', name: 'Quality', code: 'QA' },
  ],
};

const findById = (list, id) =>
  list.find((item) => String(item.id) === String(id));

const resolveJewelleryName = (value) => {
  if (!value) return '';
  const found = findById(masterData.jewellery, value);
  return found ? found.name : String(value);
};

const resolveRepairTypeName = (value) => {
  if (!value) return '';
  const found = findById(masterData.repairTypes, value);
  return found ? found.name : String(value);
};

const resolveMaterialName = (value) => {
  if (!value) return '';
  const found = findById(masterData.materials, value);
  return found ? found.name : String(value);
};

module.exports = {
  masterData,
  findById,
  resolveJewelleryName,
  resolveRepairTypeName,
  resolveMaterialName,
};
