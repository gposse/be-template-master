const { Op } = require("sequelize");

const findAll = async (app, profileId) => {
  const { Contract } = app.get("models");
  try {
    const contracts = await Contract.findAll({
      where: {
        [Op.or]: [{ ClientId: profileId }, { ContractorId: profileId }],
      },
    });
    return contracts;
  } catch (err) {
    console.log(err);
    throw new Error("Failed to retrieve contracts");
  }
};

const getById = async (app, profileId, id) => {
  const { Contract } = app.get("models");
  try {
    const contract = await Contract.findOne({
      where: {
        [Op.and]: [
          { id: id },
          { [Op.or]: [{ ClientId: profileId }, { ContractorId: profileId }] },
        ],
      },
    });
    return contract;
  } catch (err) {
    console.log(err);
    throw new Error("Failed to retrieve contract");
  }
};

module.exports = {
	findAll,
  getById,
};
