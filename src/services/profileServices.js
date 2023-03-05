const { Op } = require("sequelize");
const { sequelize } = require("../model");
const { Sequelize } = require("sequelize");

const deposit = async (app, userId, amount) => {
  const { Contract, Deposit, Job, Profile } = app.get("models");
  try {
    // Find the total price of unpaid jobs
    const unpaidJobs = await Job.findAll({
      where: {
        [Op.and]: [
          { "$Contract.status$": "in_progress" },
          {
            paid: {
              [Op.or]: [{ [Op.eq]: false }, { [Op.is]: null }],
            },
          },
        ],
      },
      include: [
        {
          model: Contract,
          where: {
            [Op.and]: [{ status: "in_progress" }, { ClientId: userId }],
          },
          attributes: [],
        },
      ],
      attributes: [
        [sequelize.fn("sum", sequelize.col("price")), "total_price"],
      ],
    });
    const totalPrice = unpaidJobs[0].dataValues.total_price;

    // Deposit amount should not be greater than 25% of total price of client's unpaid jobs
    if (amount > parseFloat(totalPrice) * 0.25) {
      throw new Error("Max deposit amount exceded");
    }

    const transaction = await sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
    });
    const now = new Date(); // Get the current date and time in the local timezone
    try {
      const deposit = await Deposit.create({
        amount: amount,
        depositDate: now,
        ProfileId: userId,
      });

      const profile = await Profile.findOne({ where: { id: userId } });
      const newBalance = parseFloat(profile.balance.toFixed(2))+parseFloat(amount.toFixed(2));
      await profile.update({ balance: newBalance.toFixed(2)});

      await deposit.save();
      await profile.save();

      await transaction.commit();

      return profile;
    } catch (innerErr) {
      if (!transaction.finished) await transaction.rollback();
      console.log(innerErr);
      throw new Error("Failed to deposit amount");
    }
  } catch (err) {
    console.log(err);
    throw new Error(err.message);
  }
};

module.exports = {
  deposit,
};
