const { Op } = require("sequelize");
const { sequelize } = require("../model");

const retrieveAllUnpaid = async (app, profileId) => {
  const { Contract, Job } = app.get("models");
  try {
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
            [Op.and]: [
              { status: "in_progress" },
              {
                [Op.or]: [{ ClientId: profileId }, { ContractorId: profileId }],
              },
            ],
          },
          attributes: ["id", "status", "ClientId", "ContractorId"],
        },
      ],
    });
    return unpaidJobs;
  } catch (err) {
    console.log(err);
    throw new Error("Failed to retrieve jobs");
  }
};

const pay = async (app, profile, jobId) => {
  const { Contract, Job, Profile } = app.get("models");
  try {
    const job = await Job.findOne({
      where: {
        [Op.and]: [{ id: jobId }],
      },
      include: [
        {
          model: Contract,
          where: { ClientId: profile.id },
          attributes: ["ClientId", "ContractorId"],
        },
      ],
    });

    // If job's contract doesn't belongs to client, job will not be found
    if (!job) {
      throw new Error("Job not found");
    }

    if (job.paid) {
      throw new Error("Job is already paid");
    }

    if (job.price > profile.balance ?? 0) {
      throw new Error("Insuficient balance");
    }

    const transaction = await sequelize.transaction();
    try {
      // Get the current date and time in the local timezone
      const now = new Date();

      // Reads contractor profile
      const contractor = await Profile.findOne({
        where: { id: job.Contract.ContractorId },
      });
      if (!contractor) {
        throw new Error("Failed to retrieve job contractor");
      }

      // Balance has to be the current database value, since it can be changed after profile was authenticated.
      const clientBalance = profile.getDataValue("balance");

      // Updates both client and contractos balance
      const clientNewBalance = parseFloat(clientBalance.toFixed(2)) - parseFloat(job.price.toFixed(2));
      const contractorNewBalance = parseFloat(contractor.balance.toFixed(2)) + parseFloat(job.price.toFixed(2));
      await Profile.update(
        { balance: clientNewBalance.toFixed(2) },
        { where: { id: profile.id } },
        transaction
      );
      await Profile.update(
        { balance: contractorNewBalance.toFixed(2) },
        { where: { id: contractor.id } },
        transaction
      );
      // Sets the Job to paid 
      await Job.update(
        { paid: true, paymentDate: now },
        { where: { id: job.id } },
        transaction
      );

      await transaction.commit();

      return {
        jobId: job.id,
        paymentDate: now.toUTCString(),
        clientBalance: clientNewBalance.toFixed(2),
        contractorBalance: contractorNewBalance.toFixed(2),
      };
    } catch (innerErr) {
      if (!transaction.finished) await transaction.rollback();
      console.log(innerErr.message);
      throw new Error("Failed to pay the job");
    }
  } catch (err) {
    console.log(err);
    throw new Error(err.message);
  }
};

module.exports = {
  retrieveAllUnpaid,
  pay
};
