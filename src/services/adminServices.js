const { Op } = require("sequelize");
const sequelize = require("sequelize");

const findBestClients = async (app,startDate, endDate, limit) => {
	const { Contract, Job, Profile } = app.get("models");

	try {
		const clientList = await Job.findAll({
			attributes: [
				[sequelize.fn("SUM", sequelize.col("price")), "totalPrice"],
			],
			include: [
				{
					model: Contract,
					attributes: [ 'clientId' ],
					include: [
						{
							model: Profile,
							as: 'Client',
							attributes: [ 'id', 'firstName', 'lastName' ]
						}
					],
				}
			],
			where: {
				[Op.and]: [
					{ 
						createdAt: {
							[sequelize.Op.between]: [startDate, endDate],
						},
					},
					{
						paid: true
					}
				]
			},
			group: ["Contract.Client.id"],
			order: [[sequelize.literal('totalPrice'), 'DESC']],
			limit: limit
		});
		let newList = [];
		clientList.forEach(c=>{
			newList.push({
				id: c.Contract.Client.id,
//				fullName: c.Contract.Client.get("fullName"), Didn't work
				fullName: c.Contract.Client.firstName+" "+c.Contract.Client.lastName,
				paid: c.get("totalPrice")
			});
		})
		return newList;
	} catch (err) {
		console.log(err);
		throw new Error("Failed to find best clients");
	}
};

const findBestProfession = async (app,startDate, endDate) => {
	const { Contract, Job, Profile } = app.get("models");

	try {
		const professionList = await Job.findAll({
			attributes: [
				[sequelize.fn("SUM", sequelize.col("price")), "totalPrice"],
			],
			include: [
				{
					model: Contract,
					attributes: [ 'contractorId' ],
					include: [
						{
							model: Profile,
							as: 'Contractor',
							attributes: [ 'profession' ]
						}
					],
				}
			],
			where: {
				[Op.and]: [
					{ 
						createdAt: {
							[sequelize.Op.between]: [startDate, endDate],
						},
					},
					{
						paid: true
					}
				]
			},
			group: ["Contract.Contractor.profession"],
			order: [[sequelize.literal('totalPrice'), 'DESC']]
		});
		if (professionList.length==0) {
			throw new Error('There are no paid jobs');
		}
		const totalPrice = professionList[0].get("totalPrice"); 
		const result = {
			profession: professionList[0].Contract.Contractor.profession,
			totalPayments: totalPrice
		}
		return result;
	} catch (err) {
    console.log(err);
    throw new Error("Failed to find best profession");
	}

};

module.exports = {
	findBestClients,
	findBestProfession
};